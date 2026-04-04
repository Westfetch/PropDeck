"""
Data processor and training format exporter.

Takes raw scraped data from all sources and normalizes it into
clean training formats suitable for fine-tuning or RAG ingestion.

Output formats:
- JSONL: One document per line, ready for fine-tuning pipelines
- Parquet: Columnar format for analytics and large-scale processing
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from config import PROCESSING_CONFIG, RAW_DIR, PROCESSED_DIR
from utils.storage import load_raw_items
from utils.text import normalize_whitespace, extract_fpv_terms

logger = logging.getLogger(__name__)


def classify_content(item: dict) -> str:
    """
    Auto-classify content into FPV categories based on content analysis.
    Returns the best-fit category from PROCESSING_CONFIG['categories'].
    """
    text = (item.get("content", "") + " " + item.get("title", "")).lower()

    # Priority-ordered classification rules
    rules = [
        ("pid_tuning", [r"\bpid\b", r"\btune\b", r"\btuning\b", r"\bfilter\b", r"\brates\b"]),
        ("troubleshooting", [r"\bfix\b", r"\bproblem\b", r"\bissue\b", r"\berror\b", r"\bhelp\b", r"\bnot working\b", r"\bwon'?t\b"]),
        ("build_guide", [r"\bbuild\b", r"\bguide\b", r"\bhow to\b", r"\bsetup\b", r"\binstall\b", r"\bsolder\b"]),
        ("gear_recommendation", [r"\brecommend\b", r"\bbest\b", r"\bvs\b", r"\bwhich\b", r"\breview\b", r"\bworth\b"]),
        ("tiny_whoop", [r"\bwhoop\b", r"\b65mm\b", r"\b75mm\b", r"\bmob[67]\b", r"\bmeteor\b"]),
        ("flight_controller", [r"\bflight.?controller\b", r"\bfc\b", r"\bf[47][045]\b", r"\bspeedybee\b"]),
        ("firmware", [r"\bbetaflight\b", r"\binav\b", r"\bedgetx\b", r"\bfirmware\b", r"\bflash\b", r"\bcli\b"]),
        ("radio_link", [r"\belrs\b", r"\bcrossfire\b", r"\btracer\b", r"\bradio\b", r"\btransmitter\b", r"\breceiver\b"]),
        ("motors", [r"\bmotor\b", r"\bkv\b", r"\bstator\b", r"\bxing\b", r"\bemax\b"]),
        ("esc", [r"\besc\b", r"\bblheli\b", r"\bbluejay\b", r"\bam32\b", r"\bdshot\b"]),
        ("camera", [r"\bcamera\b", r"\bcaddx\b", r"\bruncam\b"]),
        ("goggles", [r"\bgoggles\b", r"\bfatshark\b", r"\bskyzone\b", r"\bdji.?v[12]\b"]),
        ("vtx", [r"\bvtx\b", r"\bvideo.?transmitter\b"]),
        ("dji", [r"\bdji\b", r"\bo[34]\b", r"\bavata\b"]),
        ("hdzero", [r"\bhdzero\b"]),
        ("walksnail", [r"\bwalksnail\b", r"\bavatar\b"]),
        ("analog", [r"\banalog\b", r"\braceband\b"]),
        ("antenna", [r"\bantenna\b", r"\blhcp\b", r"\brhcp\b"]),
        ("battery", [r"\bbattery\b", r"\blipo\b", r"\b[1-6]s\b", r"\bmah\b"]),
        ("propellers", [r"\bprop\b", r"\bgemfan\b", r"\bhq.?prop\b"]),
        ("frame", [r"\bframe\b", r"\bsource.?one\b", r"\bapex\b"]),
        ("freestyle", [r"\bfreestyle\b", r"\bbando\b", r"\bpowerloop\b", r"\btrick\b"]),
        ("racing", [r"\bracing\b", r"\brace\b", r"\blap\b", r"\bgate\b"]),
        ("cinematic", [r"\bcine\b", r"\bcinematic\b", r"\bgopro\b"]),
        ("long_range", [r"\blong.?range\b", r"\b7.?inch\b", r"\b10.?inch\b"]),
        ("regulations", [r"\bfaa\b", r"\bcaa\b", r"\bregistration\b", r"\blicense\b", r"\bregulat\b"]),
    ]

    for category, patterns in rules:
        matches = sum(1 for p in patterns if re.search(p, text))
        if matches >= 2:
            return category

    return "general"


def process_item(item: dict) -> dict | None:
    """Process a single raw item into training format."""
    content = item.get("content", "")

    if not content:
        return None

    content = normalize_whitespace(content)

    # Length filters
    if len(content) < PROCESSING_CONFIG["min_content_length"]:
        return None
    if len(content) > PROCESSING_CONFIG["max_content_length"]:
        content = content[:PROCESSING_CONFIG["max_content_length"]]

    # Build processed item
    processed = {
        "id": item.get("id", ""),
        "source": item.get("source", ""),
        "sub_source": item.get("sub_source", ""),
        "type": item.get("type", ""),
        "title": item.get("title", ""),
        "content": content,
        "url": item.get("url", ""),
        "category": classify_content(item),
        "tags": item.get("tags", []) or extract_fpv_terms(content),
        "quality_signals": {
            "score": item.get("score", 0),
            "view_count": item.get("view_count", 0),
            "comment_count": item.get("comment_count", item.get("num_comments", 0)),
            "like_count": item.get("like_count", 0),
        },
        "created_at": item.get("created_at", item.get("published_at", "")),
        "collected_at": item.get("collected_at", ""),
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "content_length": len(content),
    }

    return processed


def export_jsonl(items: list[dict], output_path: Path):
    """Export processed items as JSONL."""
    with open(output_path, "w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    logger.info(f"Exported {len(items)} items to {output_path}")


def export_parquet(items: list[dict], output_path: Path):
    """Export processed items as Parquet (if pyarrow available)."""
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq

        # Flatten quality_signals for columnar storage
        flat_items = []
        for item in items:
            flat = {k: v for k, v in item.items() if k != "quality_signals"}
            flat["tags"] = ",".join(item.get("tags", []))
            signals = item.get("quality_signals", {})
            flat["score"] = signals.get("score", 0)
            flat["view_count"] = signals.get("view_count", 0)
            flat["comment_count"] = signals.get("comment_count", 0)
            flat["like_count"] = signals.get("like_count", 0)
            flat_items.append(flat)

        table = pa.Table.from_pylist(flat_items)
        pq.write_table(table, output_path)
        logger.info(f"Exported {len(items)} items to {output_path}")

    except ImportError:
        logger.warning("pyarrow not installed — skipping Parquet export. pip install pyarrow")


def run():
    """Process all raw data and export to training formats."""
    logger.info("Starting data processor")

    raw_items = load_raw_items(RAW_DIR)
    logger.info(f"Loaded {len(raw_items)} raw items")

    # Process
    processed = []
    seen_hashes = set()
    for item in raw_items:
        result = process_item(item)
        if result is None:
            continue

        # Dedup by content hash
        h = item.get("content_hash", "")
        if h and PROCESSING_CONFIG["deduplicate"]:
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

        processed.append(result)

    logger.info(f"Processed {len(processed)} items (from {len(raw_items)} raw)")

    # Category breakdown
    categories = {}
    for item in processed:
        cat = item["category"]
        categories[cat] = categories.get(cat, 0) + 1
    logger.info("Category breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        logger.info(f"  {cat}: {count}")

    # Source breakdown
    sources = {}
    for item in processed:
        src = item["source"]
        sources[src] = sources.get(src, 0) + 1
    logger.info("Source breakdown:")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        logger.info(f"  {src}: {count}")

    # Export
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if "jsonl" in PROCESSING_CONFIG["output_formats"]:
        export_jsonl(processed, PROCESSED_DIR / f"fpv_brain_{timestamp}.jsonl")
        # Also export a "latest" symlink
        latest = PROCESSED_DIR / "fpv_brain_latest.jsonl"
        export_jsonl(processed, latest)

    if "parquet" in PROCESSING_CONFIG["output_formats"]:
        export_parquet(processed, PROCESSED_DIR / f"fpv_brain_{timestamp}.parquet")
        latest_pq = PROCESSED_DIR / "fpv_brain_latest.parquet"
        export_parquet(processed, latest_pq)

    # Export category-specific files for targeted training
    for cat in categories:
        cat_items = [i for i in processed if i["category"] == cat]
        if cat_items:
            export_jsonl(cat_items, PROCESSED_DIR / f"fpv_brain_{cat}.jsonl")

    logger.info(f"Processing complete. {len(processed)} items exported.")
    return len(processed)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
