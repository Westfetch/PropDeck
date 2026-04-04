"""
Storage utilities for saving and deduplicating scraped data.
"""

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path


def content_hash(text: str) -> str:
    """Generate a hash for deduplication."""
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:16]


def save_items(items: list[dict], source: str, sub_source: str, raw_dir: Path):
    """
    Save scraped items to a JSONL file in the raw directory.
    Each item gets a unique ID, timestamp, and source tag.
    Deduplicates against existing data in the same file.
    """
    output_dir = raw_dir / source
    output_dir.mkdir(parents=True, exist_ok=True)

    safe_name = sub_source.replace("/", "_").replace(" ", "_").lower()
    output_file = output_dir / f"{safe_name}.jsonl"

    # Load existing hashes for dedup
    existing_hashes = set()
    if output_file.exists():
        with open(output_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                try:
                    existing = json.loads(line)
                    if "content_hash" in existing:
                        existing_hashes.add(existing["content_hash"])
                except json.JSONDecodeError:
                    continue

    new_count = 0
    with open(output_file, "a", encoding="utf-8") as f:
        for item in items:
            text = item.get("content", "") or item.get("title", "")
            h = content_hash(text)

            if h in existing_hashes:
                continue

            item["content_hash"] = h
            item["source"] = source
            item["sub_source"] = sub_source
            item["collected_at"] = datetime.now(timezone.utc).isoformat()

            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            existing_hashes.add(h)
            new_count += 1

    return new_count


def load_raw_items(raw_dir: Path, source: str = None) -> list[dict]:
    """Load all raw items, optionally filtered by source."""
    items = []
    search_dir = raw_dir / source if source else raw_dir

    for jsonl_file in search_dir.rglob("*.jsonl"):
        with open(jsonl_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                try:
                    items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    return items


def get_stats(raw_dir: Path) -> dict:
    """Get collection statistics."""
    stats = {}
    for source_dir in raw_dir.iterdir():
        if source_dir.is_dir():
            count = 0
            for jsonl_file in source_dir.rglob("*.jsonl"):
                with open(jsonl_file, "r", encoding="utf-8", errors="replace") as f:
                    count += sum(1 for line in f if line.strip())
            stats[source_dir.name] = count
    stats["total"] = sum(stats.values())
    return stats
