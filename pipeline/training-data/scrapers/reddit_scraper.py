"""
Reddit scraper for FPV subreddits.

Uses PRAW (Python Reddit API Wrapper) to collect posts and comment threads
from FPV-related subreddits. Extracts Q&A pairs, build logs, troubleshooting
threads, and gear discussions.
"""

import logging
import time

import praw
from praw.models import MoreComments

from config import REDDIT_CONFIG, RAW_DIR
from utils.storage import save_items
from utils.text import clean_reddit_markdown, extract_fpv_terms

logger = logging.getLogger(__name__)


def create_client() -> praw.Reddit:
    """Create an authenticated Reddit client."""
    return praw.Reddit(
        client_id=REDDIT_CONFIG["client_id"],
        client_secret=REDDIT_CONFIG["client_secret"],
        user_agent=REDDIT_CONFIG["user_agent"],
    )


def extract_comment_thread(comment, depth=0, max_depth=5) -> list[dict]:
    """Recursively extract a comment thread into a flat list with depth info."""
    if depth >= max_depth:
        return []

    items = []
    if isinstance(comment, MoreComments):
        return []

    body = clean_reddit_markdown(comment.body)
    if len(body) < REDDIT_CONFIG["min_comment_length"]:
        return []

    items.append({
        "text": body,
        "score": comment.score,
        "depth": depth,
        "author": str(comment.author) if comment.author else "[deleted]",
    })

    for reply in comment.replies:
        items.extend(extract_comment_thread(reply, depth + 1, max_depth))

    return items


def scrape_subreddit(reddit: praw.Reddit, subreddit_name: str) -> list[dict]:
    """Scrape posts and comments from a single subreddit."""
    sub = reddit.subreddit(subreddit_name)
    items = []
    seen_ids = set()

    def process_posts(post_listing):
        for post in post_listing:
            if post.id in seen_ids:
                continue
            seen_ids.add(post.id)

            if post.score < REDDIT_CONFIG["min_score"]:
                continue

            # Build the training item
            title = post.title.strip()
            body = clean_reddit_markdown(post.selftext) if post.selftext else ""
            content = f"{title}\n\n{body}" if body else title

            item = {
                "id": f"reddit_{subreddit_name}_{post.id}",
                "type": "reddit_post",
                "title": title,
                "content": content,
                "url": f"https://reddit.com{post.permalink}",
                "score": post.score,
                "num_comments": post.num_comments,
                "created_utc": post.created_utc,
                "flair": post.link_flair_text,
                "subreddit": subreddit_name,
                "tags": extract_fpv_terms(content),
            }

            # Extract comment threads as conversation data
            if REDDIT_CONFIG["include_comments"] and post.num_comments > 0:
                try:
                    post.comments.replace_more(limit=3)
                    threads = []
                    for top_comment in post.comments:
                        thread = extract_comment_thread(
                            top_comment,
                            max_depth=REDDIT_CONFIG["max_comment_depth"],
                        )
                        if thread:
                            threads.append(thread)
                    item["comment_threads"] = threads
                except Exception as e:
                    logger.warning(f"Failed to get comments for {post.id}: {e}")
                    item["comment_threads"] = []

            items.append(item)

    # Collect from multiple sort modes
    logger.info(f"Scraping r/{subreddit_name} — hot")
    process_posts(sub.hot(limit=REDDIT_CONFIG["posts_per_request"]))

    logger.info(f"Scraping r/{subreddit_name} — new")
    process_posts(sub.new(limit=REDDIT_CONFIG["posts_per_request"]))

    for time_filter in REDDIT_CONFIG["top_time_filters"]:
        logger.info(f"Scraping r/{subreddit_name} — top/{time_filter}")
        process_posts(sub.top(time_filter=time_filter, limit=REDDIT_CONFIG["posts_per_request"]))
        time.sleep(1)  # rate limit courtesy

    return items


def run():
    """Run the Reddit scraper across all configured subreddits."""
    logger.info("Starting Reddit scraper")
    reddit = create_client()
    total_new = 0

    for subreddit_name in REDDIT_CONFIG["subreddits"]:
        try:
            items = scrape_subreddit(reddit, subreddit_name)
            new_count = save_items(items, "reddit", subreddit_name, RAW_DIR)
            total_new += new_count
            logger.info(f"r/{subreddit_name}: {new_count} new items ({len(items)} total scraped)")
            time.sleep(2)  # be nice to Reddit
        except Exception as e:
            logger.error(f"Failed to scrape r/{subreddit_name}: {e}")

    logger.info(f"Reddit scraper complete: {total_new} new items total")
    return total_new


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
