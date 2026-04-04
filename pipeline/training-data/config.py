"""
FPV Brain — Training Data Collection Config

Central configuration for all scrapers feeding the FPV brain.
This is a standalone data pipeline for an FPV garage/social app.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# === Paths ===
BASE_DIR = Path(__file__).parent

# Load .env from the same directory as this config
load_dotenv(BASE_DIR / ".env")
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# === Reddit ===
REDDIT_CONFIG = {
    "client_id": os.environ.get("REDDIT_CLIENT_ID", ""),
    "client_secret": os.environ.get("REDDIT_CLIENT_SECRET", ""),
    "user_agent": os.environ.get("REDDIT_USER_AGENT", "FPVBrainCollector/1.0"),
    "subreddits": [
        "fpv",
        "TinyWhoop",
        "Multicopter",
        "fpvracing",
        "diydrones",
        "radiocontrol",
    ],
    "sort_modes": ["hot", "top", "new"],
    "top_time_filters": ["week", "month", "year", "all"],
    "posts_per_request": 100,
    "min_score": 2,           # filter out noise
    "min_comment_length": 20, # skip one-liners
    "include_comments": True,
    "max_comment_depth": 5,
}

# === YouTube ===
YOUTUBE_CONFIG = {
    "api_key": os.environ.get("YOUTUBE_API_KEY", ""),
    "channels": [
        # Channel IDs for major FPV creators
        {"name": "Joshua Bardwell", "id": "UCX3eufnI7A2I7IkKHZn8KSQ"},
        {"name": "Mr Steele", "id": "UCQEqPV0AwJ6mQYLmSO0rcNA"},
        {"name": "Rotor Riot", "id": "UCemG3VoNCmjP8ucHR2YY7hw"},
        {"name": "UAVfutures", "id": "UC3ioIOr3tH6Yz8qzr418R-g"},
        {"name": "Nick Burns FPV", "id": "UCBGpbEe0G9EchyGYCRRd4hg"},
        {"name": "Chris Rosser", "id": "UCnJyFn_66GMfAbz1AW9MqbQ"},
        {"name": "Kabab FPV", "id": "UCy1BIhpiUOYkMFsyLBpYEYQ"},
        {"name": "Oscar Liang", "id": "UCsP4fwGlsNVORbP6wviNEsw"},
        {"name": "BOTGRINDER", "id": "UCNh49U-22mx1MElHbdz7WHA"},
    ],
    "max_results_per_channel": 200,
    "search_queries": [
        "FPV tuning tutorial",
        "betaflight setup guide",
        "FPV build guide",
        "PID tuning FPV",
        "tiny whoop setup",
        "FPV freestyle tips",
        "FPV racing setup",
        "ELRS setup guide",
        "FPV antenna guide",
        "FPV motor selection",
    ],
    "max_results_per_query": 50,
}

# === GitHub ===
GITHUB_CONFIG = {
    "token": os.environ.get("GITHUB_TOKEN", ""),  # optional, increases rate limits
    "repos": [
        "betaflight/betaflight",
        "betaflight/betaflight-configurator",
        "iNavFlight/inav",
        "iNavFlight/inav-configurator",
        "ExpressLRS/ExpressLRS",
        "EdgeTX/edgetx",
        "rotorflight/rotorflight-firmware",
    ],
    "collect_issues": True,
    "collect_discussions": True,
    "collect_wiki": True,
    "issue_state": "all",    # open + closed = more knowledge
    "max_issues_per_repo": 2000,
    "min_comments": 1,       # issues with responses are more useful
}

# === Blogs & Knowledge Sites ===
BLOGS_CONFIG = {
    "sites": [
        {
            "name": "Oscar Liang",
            "base_url": "https://oscarliang.com",
            "sitemap_url": "https://oscarliang.com/sitemap.xml",
            "content_selector": "article.post",
            "category_filter": None,  # grab everything, it's all FPV
        },
        {
            "name": "Propwashed",
            "base_url": "https://www.propwashed.com",
            "sitemap_url": "https://www.propwashed.com/sitemap.xml",
            "content_selector": "article",
            "category_filter": None,
        },
        {
            "name": "GetFPV Learn",
            "base_url": "https://www.getfpv.com/learn",
            "sitemap_url": "https://www.getfpv.com/learn/sitemap.xml",
            "content_selector": "article",
            "category_filter": None,
        },
        {
            "name": "FPV Know-It-All",
            "base_url": "https://www.fpvknowitall.com",
            "sitemap_url": "https://www.fpvknowitall.com/page-sitemap.xml",
            "content_selector": "article, .entry-content, .page-content, main",
            "category_filter": None,  # Bardwell's curated gear picks with reasoning
        },
    ],
}

# === Forums ===
FORUMS_CONFIG = {
    "sites": [
        {
            "name": "RCGroups - Multirotor",
            "base_url": "https://www.rcgroups.com/mini-multirotors-pair-quads-and-more-702/",
            "type": "vbulletin",
            "max_pages": 100,
        },
        {
            "name": "RCGroups - FPV Racing",
            "base_url": "https://www.rcgroups.com/fpv-racing-pair-quads-and-more-1007/",
            "type": "vbulletin",
            "max_pages": 100,
        },
        {
            "name": "IntoFPV",
            "base_url": "https://intofpv.com",
            "type": "discourse",
            "max_pages": 100,
        },
    ],
}

# === Data Processing ===
PROCESSING_CONFIG = {
    "min_content_length": 50,        # chars — skip tiny posts
    "max_content_length": 50000,     # chars — skip dumps/logs
    "deduplicate": True,
    "output_formats": ["jsonl", "parquet"],
    "categories": [
        "build_guide",
        "pid_tuning",
        "troubleshooting",
        "gear_recommendation",
        "flight_controller",
        "esc",
        "motors",
        "propellers",
        "frame",
        "vtx",
        "antenna",
        "radio_link",
        "battery",
        "camera",
        "goggles",
        "firmware",
        "software",
        "regulations",
        "freestyle",
        "racing",
        "cinematic",
        "tiny_whoop",
        "long_range",
        "dji",
        "hdzero",
        "walksnail",
        "analog",
        "general",
    ],
}

# === Scheduler ===
SCHEDULE_CONFIG = {
    "reddit_interval_hours": 6,
    "youtube_interval_hours": 24,
    "github_interval_hours": 24,
    "blogs_interval_hours": 168,     # weekly
    "forums_interval_hours": 48,
}
