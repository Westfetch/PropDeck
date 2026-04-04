"""
GitHub scraper for FPV firmware repositories.

Collects issues, discussions, and wiki content from Betaflight, INAV,
ExpressLRS, EdgeTX, and other FPV firmware projects. These contain
rich troubleshooting data, feature explanations, and configuration help.
"""

import logging
import time

import requests

from config import GITHUB_CONFIG, RAW_DIR
from utils.storage import save_items
from utils.text import clean_html, extract_fpv_terms

logger = logging.getLogger(__name__)

API_BASE = "https://api.github.com"


def get_headers() -> dict:
    """Build request headers with optional auth."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_CONFIG["token"]:
        headers["Authorization"] = f"token {GITHUB_CONFIG['token']}"
    return headers


def fetch_paginated(url: str, params: dict = None, max_items: int = 2000) -> list[dict]:
    """Fetch paginated results from the GitHub API."""
    headers = get_headers()
    params = params or {}
    params["per_page"] = 100
    params["page"] = 1

    all_items = []
    while len(all_items) < max_items:
        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 403:
            # Rate limited — wait and retry
            reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
            wait = max(reset_time - time.time(), 60)
            logger.warning(f"Rate limited. Waiting {wait:.0f}s")
            time.sleep(wait)
            continue

        if response.status_code != 200:
            logger.error(f"GitHub API error {response.status_code}: {url}")
            break

        data = response.json()
        if not data:
            break

        all_items.extend(data)
        params["page"] += 1

        # Check if there are more pages
        link_header = response.headers.get("Link", "")
        if 'rel="next"' not in link_header:
            break

        time.sleep(0.5)  # rate limit courtesy

    return all_items[:max_items]


def scrape_issues(repo: str) -> list[dict]:
    """Scrape issues and their comments from a repo."""
    logger.info(f"Scraping issues from {repo}")
    url = f"{API_BASE}/repos/{repo}/issues"
    params = {
        "state": GITHUB_CONFIG["issue_state"],
        "sort": "comments",  # most discussed first = most valuable
        "direction": "desc",
    }

    raw_issues = fetch_paginated(url, params, max_items=GITHUB_CONFIG["max_issues_per_repo"])
    items = []

    for issue in raw_issues:
        # Skip pull requests (they show up in issues endpoint)
        if "pull_request" in issue:
            continue

        if issue.get("comments", 0) < GITHUB_CONFIG["min_comments"]:
            continue

        # Fetch comments for this issue
        comments_data = []
        if issue["comments"] > 0:
            comments_url = issue["comments_url"]
            try:
                resp = requests.get(comments_url, headers=get_headers(), params={"per_page": 100})
                if resp.status_code == 200:
                    for c in resp.json():
                        comments_data.append({
                            "author": c["user"]["login"] if c.get("user") else "[deleted]",
                            "body": c["body"],
                            "created_at": c["created_at"],
                        })
                time.sleep(0.3)
            except Exception as e:
                logger.warning(f"Failed to fetch comments for {repo}#{issue['number']}: {e}")

        body = issue.get("body", "") or ""
        title = issue.get("title", "")
        content = f"{title}\n\n{body}"

        # Build comment thread text
        comment_text = "\n\n---\n\n".join(
            f"{c['author']}: {c['body']}" for c in comments_data
        )
        full_content = f"{content}\n\n{comment_text}" if comment_text else content

        labels = [l["name"] for l in issue.get("labels", [])]

        item = {
            "id": f"github_{repo.replace('/', '_')}_{issue['number']}",
            "type": "github_issue",
            "title": title,
            "content": full_content,
            "body": body,
            "comments": comments_data,
            "url": issue["html_url"],
            "repo": repo,
            "issue_number": issue["number"],
            "state": issue["state"],
            "labels": labels,
            "created_at": issue["created_at"],
            "comment_count": issue["comments"],
            "tags": extract_fpv_terms(full_content),
        }
        items.append(item)

    return items


def scrape_discussions(repo: str) -> list[dict]:
    """
    Scrape GitHub Discussions via the GraphQL API.
    Discussions are where a lot of Q&A and help happens.
    """
    if not GITHUB_CONFIG["token"]:
        logger.warning(f"Skipping discussions for {repo} — requires auth token")
        return []

    logger.info(f"Scraping discussions from {repo}")
    owner, name = repo.split("/")

    query = """
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            title
            body
            url
            createdAt
            category { name }
            comments(first: 20) {
              nodes {
                author { login }
                body
                createdAt
              }
            }
          }
        }
      }
    }
    """

    headers = get_headers()
    headers["Content-Type"] = "application/json"
    items = []
    cursor = None

    for _ in range(20):  # max 2000 discussions
        variables = {"owner": owner, "name": name, "cursor": cursor}
        resp = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={"query": query, "variables": variables},
        )

        if resp.status_code != 200:
            logger.error(f"GraphQL error {resp.status_code} for {repo}")
            break

        data = resp.json().get("data", {}).get("repository", {}).get("discussions", {})
        nodes = data.get("nodes", [])
        if not nodes:
            break

        for disc in nodes:
            comments_data = []
            for c in disc.get("comments", {}).get("nodes", []):
                comments_data.append({
                    "author": c["author"]["login"] if c.get("author") else "[deleted]",
                    "body": c["body"],
                    "created_at": c["createdAt"],
                })

            body = disc.get("body", "") or ""
            title = disc.get("title", "")
            content = f"{title}\n\n{body}"
            comment_text = "\n\n---\n\n".join(
                f"{c['author']}: {c['body']}" for c in comments_data
            )
            full_content = f"{content}\n\n{comment_text}" if comment_text else content

            item = {
                "id": f"github_{repo.replace('/', '_')}_disc_{disc['number']}",
                "type": "github_discussion",
                "title": title,
                "content": full_content,
                "body": body,
                "comments": comments_data,
                "url": disc["url"],
                "repo": repo,
                "discussion_number": disc["number"],
                "category": disc.get("category", {}).get("name", ""),
                "created_at": disc["createdAt"],
                "tags": extract_fpv_terms(full_content),
            }
            items.append(item)

        page_info = data.get("pageInfo", {})
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info["endCursor"]
        time.sleep(0.5)

    return items


def run():
    """Run the GitHub scraper across all configured repos."""
    logger.info("Starting GitHub scraper")
    total_new = 0

    for repo in GITHUB_CONFIG["repos"]:
        try:
            items = []

            if GITHUB_CONFIG["collect_issues"]:
                items.extend(scrape_issues(repo))

            if GITHUB_CONFIG["collect_discussions"]:
                items.extend(scrape_discussions(repo))

            safe_name = repo.replace("/", "_")
            new_count = save_items(items, "github", safe_name, RAW_DIR)
            total_new += new_count
            logger.info(f"{repo}: {new_count} new items ({len(items)} total)")
            time.sleep(2)
        except Exception as e:
            logger.error(f"Failed to scrape {repo}: {e}")

    logger.info(f"GitHub scraper complete: {total_new} new items total")
    return total_new


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
