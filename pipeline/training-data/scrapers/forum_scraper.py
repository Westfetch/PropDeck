"""
Forum scraper for FPV communities.

Handles two forum types:
- vBulletin (RCGroups)
- Discourse (IntoFPV and similar)

Forums contain some of the deepest FPV knowledge — long-form build logs,
detailed troubleshooting threads, and years of accumulated wisdom.
"""

import logging
import time
import re

import requests
from bs4 import BeautifulSoup

from config import FORUMS_CONFIG, RAW_DIR
from utils.storage import save_items
from utils.text import clean_html, normalize_whitespace, extract_fpv_terms

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "FPVBrainCollector/1.0 (training data for FPV knowledge base)"
}


def scrape_vbulletin_forum(base_url: str, max_pages: int = 100) -> list[dict]:
    """
    Scrape a vBulletin forum (like RCGroups).
    Gets thread listings, then scrapes individual threads.
    """
    items = []
    thread_urls = set()

    # Collect thread URLs from listing pages
    for page in range(1, max_pages + 1):
        url = f"{base_url}" if page == 1 else f"{base_url}page{page}/"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code != 200:
                break
        except Exception as e:
            logger.warning(f"Failed to fetch page {page}: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # Find thread links — RCGroups uses various class patterns
        links = soup.find_all("a", href=True)
        found_any = False
        for link in links:
            href = link["href"]
            if "/forums/showthread.php" in href or "/forums/threads/" in href:
                if href.startswith("/"):
                    href = base_url.split("/forums/")[0] + href
                thread_urls.add(href)
                found_any = True

        if not found_any:
            break

        logger.info(f"  Page {page}: {len(thread_urls)} threads found so far")
        time.sleep(2)  # be very respectful to forum servers

    logger.info(f"  Collected {len(thread_urls)} thread URLs, now scraping...")

    # Scrape individual threads
    for thread_url in list(thread_urls)[:500]:  # cap to avoid hammering
        thread = scrape_vbulletin_thread(thread_url)
        if thread:
            items.append(thread)
        time.sleep(2)

    return items


def scrape_vbulletin_thread(url: str) -> dict | None:
    """Scrape a single vBulletin thread."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return None
    except Exception:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Get thread title
    title_tag = soup.find("h1") or soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Get all posts in thread
    posts = []
    post_containers = soup.find_all("div", class_=re.compile(r"post|message"))
    if not post_containers:
        post_containers = soup.find_all("td", class_=re.compile(r"post|message"))

    for container in post_containers:
        # Remove quotes to avoid duplication
        for quote in container.find_all(class_=re.compile(r"quote|bbcode_quote")):
            quote.decompose()

        text = container.get_text(strip=True)
        text = normalize_whitespace(text)
        if len(text) > 30:
            posts.append(text)

    if not posts:
        return None

    content = f"{title}\n\n" + "\n\n---\n\n".join(posts)

    return {
        "id": f"forum_rcgroups_{hash(url) % 10**8}",
        "type": "forum_thread",
        "title": title,
        "content": content,
        "posts": posts,
        "url": url,
        "post_count": len(posts),
        "tags": extract_fpv_terms(content),
    }


def scrape_discourse_forum(base_url: str, max_pages: int = 100) -> list[dict]:
    """
    Scrape a Discourse forum (like IntoFPV).
    Discourse has a nice JSON API we can use.
    """
    items = []

    # Discourse exposes /latest.json, /top.json, etc.
    endpoints = [
        f"{base_url}/latest.json",
        f"{base_url}/top/all.json",
        f"{base_url}/top/yearly.json",
    ]

    topic_ids = set()
    for endpoint in endpoints:
        page = 0
        while page < max_pages:
            url = f"{endpoint}?page={page}"
            try:
                resp = requests.get(url, headers=HEADERS, timeout=30)
                if resp.status_code != 200:
                    break
                data = resp.json()
            except Exception:
                break

            topics = data.get("topic_list", {}).get("topics", [])
            if not topics:
                break

            for topic in topics:
                topic_ids.add(topic["id"])

            page += 1
            time.sleep(1)

    logger.info(f"  Found {len(topic_ids)} topics")

    # Fetch individual topics
    for topic_id in list(topic_ids)[:1000]:
        topic = scrape_discourse_topic(base_url, topic_id)
        if topic:
            items.append(topic)
        time.sleep(1)

    return items


def scrape_discourse_topic(base_url: str, topic_id: int) -> dict | None:
    """Scrape a single Discourse topic via JSON API."""
    try:
        resp = requests.get(f"{base_url}/t/{topic_id}.json", headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return None
        data = resp.json()
    except Exception:
        return None

    title = data.get("title", "")
    posts_data = data.get("post_stream", {}).get("posts", [])

    posts = []
    for post in posts_data:
        raw = post.get("cooked", "")
        text = clean_html(raw)
        text = normalize_whitespace(text)
        if len(text) > 30:
            posts.append({
                "author": post.get("username", ""),
                "text": text,
            })

    if not posts:
        return None

    content = f"{title}\n\n" + "\n\n---\n\n".join(
        f"{p['author']}: {p['text']}" for p in posts
    )

    return {
        "id": f"forum_discourse_{topic_id}",
        "type": "forum_thread",
        "title": title,
        "content": content,
        "posts": [p["text"] for p in posts],
        "url": f"{base_url}/t/{topic_id}",
        "post_count": len(posts),
        "category": data.get("category_id", ""),
        "tags": extract_fpv_terms(content),
    }


def run():
    """Run the forum scraper across all configured forums."""
    logger.info("Starting forum scraper")
    total_new = 0

    for site_config in FORUMS_CONFIG["sites"]:
        try:
            logger.info(f"Scraping {site_config['name']}")

            if site_config["type"] == "vbulletin":
                items = scrape_vbulletin_forum(
                    site_config["base_url"],
                    max_pages=site_config.get("max_pages", 100),
                )
            elif site_config["type"] == "discourse":
                items = scrape_discourse_forum(
                    site_config["base_url"],
                    max_pages=site_config.get("max_pages", 100),
                )
            else:
                logger.warning(f"Unknown forum type: {site_config['type']}")
                continue

            safe_name = site_config["name"].lower().replace(" ", "_").replace("-", "_")
            new_count = save_items(items, "forums", safe_name, RAW_DIR)
            total_new += new_count
            logger.info(f"{site_config['name']}: {new_count} new items ({len(items)} total)")
        except Exception as e:
            logger.error(f"Failed to scrape {site_config['name']}: {e}")

    logger.info(f"Forum scraper complete: {total_new} new items total")
    return total_new


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
