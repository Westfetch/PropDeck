"""
YouTube scraper for FPV channels and tutorials.

Uses the YouTube Data API v3 to find videos, then youtube-transcript-api
to pull transcripts. Captures video metadata + full transcript text
for training data.
"""

import logging
import time

from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi

from config import YOUTUBE_CONFIG, RAW_DIR
from utils.storage import save_items
from utils.text import clean_youtube_transcript, extract_fpv_terms

logger = logging.getLogger(__name__)


def create_client():
    """Create YouTube API client."""
    return build("youtube", "v3", developerKey=YOUTUBE_CONFIG["api_key"])


def get_channel_videos(youtube, channel_id: str, max_results: int = 200) -> list[dict]:
    """Get video metadata from a channel."""
    videos = []
    next_page_token = None

    while len(videos) < max_results:
        request = youtube.search().list(
            part="snippet",
            channelId=channel_id,
            maxResults=min(50, max_results - len(videos)),
            order="date",
            type="video",
            pageToken=next_page_token,
        )
        response = request.execute()

        for item in response.get("items", []):
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "published_at": item["snippet"]["publishedAt"],
                "channel_title": item["snippet"]["channelTitle"],
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break
        time.sleep(0.5)

    return videos


def search_videos(youtube, query: str, max_results: int = 50) -> list[dict]:
    """Search for FPV videos by query."""
    videos = []
    next_page_token = None

    while len(videos) < max_results:
        request = youtube.search().list(
            part="snippet",
            q=query,
            maxResults=min(50, max_results - len(videos)),
            order="relevance",
            type="video",
            pageToken=next_page_token,
        )
        response = request.execute()

        for item in response.get("items", []):
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "published_at": item["snippet"]["publishedAt"],
                "channel_title": item["snippet"]["channelTitle"],
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break
        time.sleep(0.5)

    return videos


def get_video_details(youtube, video_ids: list[str]) -> dict:
    """Get view counts and durations for videos."""
    details = {}
    # API allows max 50 IDs per request
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        request = youtube.videos().list(
            part="statistics,contentDetails",
            id=",".join(batch),
        )
        response = request.execute()

        for item in response.get("items", []):
            details[item["id"]] = {
                "view_count": int(item["statistics"].get("viewCount", 0)),
                "like_count": int(item["statistics"].get("likeCount", 0)),
                "duration": item["contentDetails"]["duration"],
            }
        time.sleep(0.5)

    return details


def get_transcript(video_id: str) -> str | None:
    """Get transcript text for a video."""
    try:
        ytt = YouTubeTranscriptApi()
        transcript = ytt.fetch(video_id)
        full_text = " ".join(entry.text for entry in transcript)
        return clean_youtube_transcript(full_text)
    except Exception as e:
        logger.debug(f"No transcript for {video_id}: {e}")
        return None


def run():
    """Run the YouTube scraper."""
    logger.info("Starting YouTube scraper")
    youtube = create_client()
    all_videos = {}  # dedupe by video_id

    # Collect from channels
    for channel in YOUTUBE_CONFIG["channels"]:
        try:
            logger.info(f"Fetching videos from {channel['name']}")
            videos = get_channel_videos(
                youtube, channel["id"],
                max_results=YOUTUBE_CONFIG["max_results_per_channel"],
            )
            for v in videos:
                all_videos[v["video_id"]] = v
            logger.info(f"  Found {len(videos)} videos")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Failed channel {channel['name']}: {e}")

    # Collect from search queries
    for query in YOUTUBE_CONFIG["search_queries"]:
        try:
            logger.info(f"Searching: {query}")
            videos = search_videos(
                youtube, query,
                max_results=YOUTUBE_CONFIG["max_results_per_query"],
            )
            for v in videos:
                all_videos[v["video_id"]] = v
            logger.info(f"  Found {len(videos)} videos")
            time.sleep(1)
        except Exception as e:
            logger.error(f"Failed search '{query}': {e}")

    logger.info(f"Total unique videos found: {len(all_videos)}")

    # Get video details (views, likes)
    video_ids = list(all_videos.keys())
    details = get_video_details(youtube, video_ids)

    # Now get transcripts and build training items
    items = []
    for video_id, video in all_videos.items():
        transcript = get_transcript(video_id)
        if not transcript:
            continue  # skip videos without transcripts

        content = f"{video['title']}\n\n{video['description']}\n\n{transcript}"
        video_details = details.get(video_id, {})

        item = {
            "id": f"youtube_{video_id}",
            "type": "youtube_video",
            "title": video["title"],
            "description": video["description"],
            "transcript": transcript,
            "content": content,
            "url": f"https://youtube.com/watch?v={video_id}",
            "channel": video["channel_title"],
            "published_at": video["published_at"],
            "view_count": video_details.get("view_count", 0),
            "like_count": video_details.get("like_count", 0),
            "duration": video_details.get("duration", ""),
            "tags": extract_fpv_terms(content),
        }
        items.append(item)
        time.sleep(0.2)  # rate limit transcript fetches

    new_count = save_items(items, "youtube", "all_channels", RAW_DIR)
    logger.info(f"YouTube scraper complete: {new_count} new items ({len(items)} with transcripts)")
    return new_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
