"""
Blog and knowledge site scraper for FPV content.

Crawls sitemaps and scrapes article content from FPV knowledge sites
like Oscar Liang, Propwashed, and GetFPV Learn. These are high-quality,
curated sources of FPV knowledge.
"""

import logging
import time
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup

from config import BLOGS_CONFIG, RAW_DIR
from utils.storage import save_items
from utils.text import clean_html, normalize_whitespace, extract_fpv_terms

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "FPVBrainCollector/1.0 (training data for FPV knowledge base)"
}


def get_urls_from_sitemap(sitemap_url: str) -> list[str]:
    """Parse a sitemap XML to extract page URLs."""
    try:
        resp = requests.get(sitemap_url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch sitemap {sitemap_url}: {e}")
        return []

    urls = []
    try:
        root = ET.fromstring(resp.content)
        # Handle both sitemap index and regular sitemaps
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

        # Check if this is a sitemap index
        sitemap_refs = root.findall(".//sm:sitemap/sm:loc", ns)
        if sitemap_refs:
            # It's a sitemap index — recurse into each sub-sitemap
            for ref in sitemap_refs:
                sub_url = ref.text.strip()
                urls.extend(get_urls_from_sitemap(sub_url))
                time.sleep(0.5)
        else:
            # Regular sitemap — extract URLs
            for url_elem in root.findall(".//sm:url/sm:loc", ns):
                urls.append(url_elem.text.strip())

            # Try without namespace (some sitemaps don't use it)
            if not urls:
                for url_elem in root.findall(".//url/loc"):
                    urls.append(url_elem.text.strip())

    except ET.ParseError as e:
        logger.error(f"Failed to parse sitemap XML: {e}")

    return urls


def scrape_article(url: str, content_selector: str) -> dict | None:
    """Scrape a single article page."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
        return None

    resp.encoding = resp.apparent_encoding or "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    # Get title
    title_tag = soup.find("h1") or soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Get main content
    content_elem = soup.select_one(content_selector) if content_selector else soup.find("article")
    if not content_elem:
        content_elem = soup.find("main") or soup.find("body")

    if not content_elem:
        return None

    # Remove script, style, nav, footer elements
    for tag in content_elem.find_all(["script", "style", "nav", "footer", "aside", "iframe"]):
        tag.decompose()

    # Extract text preserving some structure
    paragraphs = []
    for elem in content_elem.find_all(["p", "h2", "h3", "h4", "li", "pre", "code"]):
        text = elem.get_text(strip=True)
        if text:
            if elem.name in ("h2", "h3", "h4"):
                paragraphs.append(f"\n## {text}\n")
            elif elem.name == "li":
                paragraphs.append(f"- {text}")
            elif elem.name in ("pre", "code"):
                paragraphs.append(f"```\n{text}\n```")
            else:
                paragraphs.append(text)

    content = "\n\n".join(paragraphs)
    content = normalize_whitespace(content)

    if len(content) < 100:
        return None

    # Try to get meta description
    meta_desc = ""
    meta_tag = soup.find("meta", {"name": "description"}) or soup.find("meta", {"property": "og:description"})
    if meta_tag:
        meta_desc = meta_tag.get("content", "")

    # Try to get published date
    date = ""
    time_tag = soup.find("time")
    if time_tag:
        date = time_tag.get("datetime", time_tag.get_text(strip=True))

    return {
        "title": title,
        "content": content,
        "description": meta_desc,
        "url": url,
        "published_at": date,
    }


def scrape_site(site_config: dict) -> list[dict]:
    """Scrape all articles from a configured site."""
    name = site_config["name"]
    logger.info(f"Scraping {name}")

    urls = get_urls_from_sitemap(site_config["sitemap_url"])
    logger.info(f"  Found {len(urls)} URLs in sitemap")

    # Filter out non-article URLs (pagination, tags, categories, etc.)
    skip_patterns = [
        "/tag/", "/category/", "/page/", "/author/",
        "/wp-json/", "/feed/", "/comments/", "/cart/",
        "/checkout/", "/my-account/", "/wp-admin/",
    ]
    urls = [
        u for u in urls
        if not any(p in u for p in skip_patterns)
    ]
    logger.info(f"  {len(urls)} article URLs after filtering")

    items = []
    for url in urls:
        article = scrape_article(url, site_config.get("content_selector", "article"))
        if article:
            article["id"] = f"blog_{name.lower().replace(' ', '_')}_{len(items)}"
            article["type"] = "blog_article"
            article["site"] = name
            article["tags"] = extract_fpv_terms(article["content"])
            items.append(article)

        time.sleep(1)  # be respectful

        if len(items) % 50 == 0 and items:
            logger.info(f"  Scraped {len(items)} articles so far...")

    return items


def run():
    """Run the blog scraper across all configured sites."""
    logger.info("Starting blog scraper")
    total_new = 0

    for site_config in BLOGS_CONFIG["sites"]:
        try:
            items = scrape_site(site_config)
            safe_name = site_config["name"].lower().replace(" ", "_")
            new_count = save_items(items, "blogs", safe_name, RAW_DIR)
            total_new += new_count
            logger.info(f"{site_config['name']}: {new_count} new items ({len(items)} total)")
        except Exception as e:
            logger.error(f"Failed to scrape {site_config['name']}: {e}")

    logger.info(f"Blog scraper complete: {total_new} new items total")
    return total_new


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
