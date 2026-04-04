#!/usr/bin/env python3
"""
FPV Brain — Training Data Collection Runner

Main entry point for running scrapers and processing data.
Can run all scrapers, individual scrapers, or just processing.

Usage:
    python run.py                    # run everything
    python run.py --scrapers         # run all scrapers only
    python run.py --reddit           # run Reddit scraper only
    python run.py --youtube          # run YouTube scraper only
    python run.py --github           # run GitHub scraper only
    python run.py --blogs            # run blog scraper only
    python run.py --forums           # run forum scraper only
    python run.py --process          # process raw data only
    python run.py --stats            # show collection stats
    python run.py --schedule         # run on schedule (continuous)
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timezone

from config import SCHEDULE_CONFIG, RAW_DIR
from utils.storage import get_stats

logger = logging.getLogger("fpv_brain")


def run_scrapers(which: list[str] = None):
    """Run specified scrapers (or all if none specified)."""
    all_scrapers = ["reddit", "youtube", "github", "blogs", "forums"]
    to_run = which or all_scrapers

    results = {}

    if "reddit" in to_run:
        try:
            from scrapers.reddit_scraper import run as run_reddit
            results["reddit"] = run_reddit()
        except Exception as e:
            logger.error(f"Reddit scraper failed: {e}")
            results["reddit"] = f"ERROR: {e}"

    if "youtube" in to_run:
        try:
            from scrapers.youtube_scraper import run as run_youtube
            results["youtube"] = run_youtube()
        except Exception as e:
            logger.error(f"YouTube scraper failed: {e}")
            results["youtube"] = f"ERROR: {e}"

    if "github" in to_run:
        try:
            from scrapers.github_scraper import run as run_github
            results["github"] = run_github()
        except Exception as e:
            logger.error(f"GitHub scraper failed: {e}")
            results["github"] = f"ERROR: {e}"

    if "blogs" in to_run:
        try:
            from scrapers.blog_scraper import run as run_blogs
            results["blogs"] = run_blogs()
        except Exception as e:
            logger.error(f"Blog scraper failed: {e}")
            results["blogs"] = f"ERROR: {e}"

    if "forums" in to_run:
        try:
            from scrapers.forum_scraper import run as run_forums
            results["forums"] = run_forums()
        except Exception as e:
            logger.error(f"Forum scraper failed: {e}")
            results["forums"] = f"ERROR: {e}"

    return results


def run_processing():
    """Run data processing pipeline."""
    from processor import run as process_data
    return process_data()


def show_stats():
    """Display collection statistics."""
    stats = get_stats(RAW_DIR)
    print("\n=== FPV Brain Collection Stats ===\n")
    for source, count in sorted(stats.items()):
        if source != "total":
            print(f"  {source:>10}: {count:>6} items")
    print(f"  {'TOTAL':>10}: {stats.get('total', 0):>6} items")
    print()


def run_scheduled():
    """Run scrapers on schedule continuously."""
    logger.info("Starting scheduled collection mode")
    logger.info(f"Schedule: Reddit every {SCHEDULE_CONFIG['reddit_interval_hours']}h, "
                f"YouTube every {SCHEDULE_CONFIG['youtube_interval_hours']}h, "
                f"GitHub every {SCHEDULE_CONFIG['github_interval_hours']}h, "
                f"Blogs every {SCHEDULE_CONFIG['blogs_interval_hours']}h, "
                f"Forums every {SCHEDULE_CONFIG['forums_interval_hours']}h")

    last_run = {
        "reddit": 0, "youtube": 0, "github": 0,
        "blogs": 0, "forums": 0, "process": 0,
    }
    intervals = {
        "reddit": SCHEDULE_CONFIG["reddit_interval_hours"] * 3600,
        "youtube": SCHEDULE_CONFIG["youtube_interval_hours"] * 3600,
        "github": SCHEDULE_CONFIG["github_interval_hours"] * 3600,
        "blogs": SCHEDULE_CONFIG["blogs_interval_hours"] * 3600,
        "forums": SCHEDULE_CONFIG["forums_interval_hours"] * 3600,
    }

    while True:
        now = time.time()
        ran_something = False

        for scraper, interval in intervals.items():
            if now - last_run[scraper] >= interval:
                logger.info(f"[{datetime.now(timezone.utc).isoformat()}] Running {scraper} scraper")
                run_scrapers([scraper])
                last_run[scraper] = now
                ran_something = True

        # Process after any scraper run
        if ran_something:
            logger.info("Running data processor")
            run_processing()
            show_stats()

        # Check every 5 minutes
        time.sleep(300)


def main():
    parser = argparse.ArgumentParser(description="FPV Brain Training Data Collector")

    parser.add_argument("--scrapers", action="store_true", help="Run all scrapers")
    parser.add_argument("--reddit", action="store_true", help="Run Reddit scraper")
    parser.add_argument("--youtube", action="store_true", help="Run YouTube scraper")
    parser.add_argument("--github", action="store_true", help="Run GitHub scraper")
    parser.add_argument("--blogs", action="store_true", help="Run blog scraper")
    parser.add_argument("--forums", action="store_true", help="Run forum scraper")
    parser.add_argument("--process", action="store_true", help="Process raw data")
    parser.add_argument("--stats", action="store_true", help="Show collection stats")
    parser.add_argument("--schedule", action="store_true", help="Run on schedule")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if args.stats:
        show_stats()
        return

    if args.schedule:
        run_scheduled()
        return

    # Determine what to run
    specific_scrapers = []
    if args.reddit: specific_scrapers.append("reddit")
    if args.youtube: specific_scrapers.append("youtube")
    if args.github: specific_scrapers.append("github")
    if args.blogs: specific_scrapers.append("blogs")
    if args.forums: specific_scrapers.append("forums")

    if specific_scrapers:
        results = run_scrapers(specific_scrapers)
        for scraper, result in results.items():
            print(f"  {scraper}: {result}")
    elif args.scrapers:
        results = run_scrapers()
        for scraper, result in results.items():
            print(f"  {scraper}: {result}")
    elif args.process:
        pass  # will process below
    else:
        # Run everything
        print("Running all scrapers...")
        results = run_scrapers()
        for scraper, result in results.items():
            print(f"  {scraper}: {result}")

    # Always process after scraping (unless --stats only)
    if not args.stats:
        print("\nProcessing collected data...")
        count = run_processing()
        print(f"\nProcessed {count} items")
        show_stats()


if __name__ == "__main__":
    main()
