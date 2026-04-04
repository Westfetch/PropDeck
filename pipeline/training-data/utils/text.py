"""
Text cleaning and processing utilities for FPV training data.
"""

import re
import html


def clean_html(text: str) -> str:
    """Strip HTML tags and decode entities."""
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def clean_reddit_markdown(text: str) -> str:
    """Clean Reddit-flavored markdown into plain text while preserving structure."""
    # Remove Reddit-specific formatting
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # links -> text
    text = re.sub(r"&amp;#x200B;", "", text)  # zero-width spaces
    text = re.sub(r"&#x200B;", "", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)  # bold
    text = re.sub(r"\*([^*]+)\*", r"\1", text)  # italic
    text = re.sub(r"~~([^~]+)~~", r"\1", text)  # strikethrough
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # headers
    text = re.sub(r"^[>\s]*>", "", text, flags=re.MULTILINE)  # quotes
    text = re.sub(r"\n{3,}", "\n\n", text)  # collapse whitespace
    return text.strip()


def clean_youtube_transcript(text: str) -> str:
    """Clean auto-generated YouTube transcript text."""
    # Remove timing artifacts and [Music] tags
    text = re.sub(r"\[Music\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[Applause\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[Laughter\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def normalize_whitespace(text: str) -> str:
    """Normalize all whitespace to single spaces, preserve paragraph breaks."""
    paragraphs = re.split(r"\n\s*\n", text)
    cleaned = []
    for p in paragraphs:
        p = re.sub(r"\s+", " ", p).strip()
        if p:
            cleaned.append(p)
    return "\n\n".join(cleaned)


def extract_fpv_terms(text: str) -> list[str]:
    """Extract FPV-specific terms found in text for tagging."""
    terms = []
    fpv_patterns = {
        "betaflight": r"\bbetaflight\b",
        "inav": r"\binav\b",
        "pid": r"\bpid[s]?\b",
        "rates": r"\b(rates|rc_rate|super_rate|expo)\b",
        "filter": r"\b(rpm.?filter|dterm.?filter|gyro.?filter|notch)\b",
        "motor": r"\b(motor|motors|xing|emax|t-?motor|brotherhobby)\b",
        "esc": r"\b(esc|blheli|bluejay|am32)\b",
        "fc": r"\b(flight.?controller|fc|f[47][045][25]|speedybee|mamba)\b",
        "vtx": r"\b(vtx|video.?transmitter|rush|tbs.?unify)\b",
        "camera": r"\b(fpv.?camera|caddx|runcam|dji.?o[234]|walksnail|hdzero|analog)\b",
        "frame": r"\b(frame|source.?one|apex|chimera|roma)\b",
        "propeller": r"\b(prop|propeller|gemfan|hq.?prop|avan|ethix)\b",
        "radio": r"\b(radio|transmitter|tx|elrs|crossfire|tracer|tbs|radiomaster|tx16|jumper)\b",
        "receiver": r"\b(receiver|rx|ep[12]|happymodel.?ep)\b",
        "goggles": r"\b(goggles|fatshark|skyzone|orqa|dji.?goggles|dji.?v[12])\b",
        "battery": r"\b(battery|lipo|li-?ion|[1-6]s|mah|gnb|tattu|cnhl)\b",
        "antenna": r"\b(antenna|lhcp|rhcp|axii|patch|omni|pagoda|foxeer.?lollipop)\b",
        "tiny_whoop": r"\b(tiny.?whoop|whoop|65mm|75mm|mob[67]|meteor[67]5|beta[67]5)\b",
        "freestyle": r"\b(freestyle|bando|powerloop|matty.?flip|juicy)\b",
        "racing": r"\b(racing|race|gate|lap.?time|racetrack)\b",
        "long_range": r"\b(long.?range|lr|7.?inch|10.?inch|gps.?rescue)\b",
        "cinematic": r"\b(cine.?whoop|cinematic|gopro|naked.?gopro|insta360|smo)\b",
    }

    text_lower = text.lower()
    for term, pattern in fpv_patterns.items():
        if re.search(pattern, text_lower):
            terms.append(term)

    return terms
