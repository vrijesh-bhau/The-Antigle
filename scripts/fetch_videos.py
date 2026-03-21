#!/usr/bin/env python3
"""
fetch_videos.py — The Antigle YouTube Auto-Updater  (v3)
==========================================================
Strategy:
  1. Try to extract the real Channel ID from the YouTube channel
     page (no API key needed — works by reading page source).
  2. Fall back to the hardcoded CHANNEL_ID if page fetch fails.
  3. Fetch the RSS feed using the resolved Channel ID.
  4. Merge new videos into existing JSON, sort newest-first.

Channel handle : @notgamingplayz
Fallback ID    : UCXR0A7A2OonSoaa_EKTwp0A
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────
HANDLE         = "notgamingplayz"          # WITHOUT the @
CHANNEL_ID_FB  = "UCXR0A7A2OonSoaa_EKTwp0A"   # fallback hardcoded ID
CHANNEL_PAGE   = f"https://www.youtube.com/@{HANDLE}"
OUTPUT_FILE    = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "content", "videos", "index.json")
)

HEADERS = {
    "User-Agent"     : (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# XML namespaces in YouTube Atom feed
NS = {
    "atom" : "http://www.w3.org/2005/Atom",
    "yt"   : "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}

# ── HTTP helper ────────────────────────────────────────────────────
def http_get(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

# ── Step 1: Resolve real Channel ID from page source ──────────────
def resolve_channel_id() -> str:
    print(f"  Fetching channel page: {CHANNEL_PAGE}")
    try:
        html = http_get(CHANNEL_PAGE, timeout=15).decode("utf-8", errors="replace")

        # Pattern 1: externalId in page JSON
        m = re.search(r'"externalId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"', html)
        if m:
            cid = m.group(1)
            print(f"  ✓ Resolved Channel ID (externalId): {cid}")
            return cid

        # Pattern 2: channel/UC... in og:url or canonical
        m = re.search(r'channel/(UC[A-Za-z0-9_-]{22})', html)
        if m:
            cid = m.group(1)
            print(f"  ✓ Resolved Channel ID (og:url): {cid}")
            return cid

        # Pattern 3: browse_id in page data
        m = re.search(r'"browseId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"', html)
        if m:
            cid = m.group(1)
            print(f"  ✓ Resolved Channel ID (browseId): {cid}")
            return cid

        print(f"  ! Could not auto-resolve ID from page — using fallback: {CHANNEL_ID_FB}")
        return CHANNEL_ID_FB

    except Exception as e:
        print(f"  ! Page fetch failed ({e}) — using fallback: {CHANNEL_ID_FB}")
        return CHANNEL_ID_FB

# ── Step 2: Fetch RSS feed ─────────────────────────────────────────
def fetch_rss(channel_id: str) -> bytes:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    print(f"  Fetching RSS: {url}")
    try:
        data = http_get(url, timeout=30)
        print(f"  ✓ RSS fetched — {len(data):,} bytes")
        return data
    except urllib.error.HTTPError as e:
        print(f"  ✗ HTTP {e.code} — {e.reason}", file=sys.stderr)
        if e.code == 404:
            print(
                "\n  ── Channel ID is WRONG or RSS is disabled ──\n"
                "  Fix: Open YouTube Studio → Settings → Channel →\n"
                "       Advanced settings → copy Channel ID.\n"
                "  Then update CHANNEL_ID_FB in this script.\n",
                file=sys.stderr,
            )
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"  ✗ Network error: {e}", file=sys.stderr)
        sys.exit(1)

# ── Step 3: Parse RSS into list of dicts ──────────────────────────
def parse_rss(xml_bytes: bytes) -> list[dict]:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        print(f"  ✗ XML parse error: {e}", file=sys.stderr)
        sys.exit(1)

    videos = []
    for entry in root.findall("atom:entry", NS):
        vid_el = entry.find("yt:videoId", NS)
        if vid_el is None or not vid_el.text:
            continue
        vid_id = vid_el.text.strip()

        title_el = entry.find("atom:title", NS)
        title = (title_el.text or "Untitled").strip() if title_el is not None else "Untitled"

        pub_el = entry.find("atom:published", NS)
        date_raw = pub_el.text.strip() if pub_el is not None and pub_el.text else ""
        date_str = _norm_date(date_raw)

        desc = ""
        group = entry.find("media:group", NS)
        if group is not None:
            desc_el = group.find("media:description", NS)
            if desc_el is not None and desc_el.text:
                raw = desc_el.text.strip()
                desc = raw[:220] + ("…" if len(raw) > 220 else "")

        category = _guess_category(title, desc)
        tags = _build_tags(title, category)

        videos.append({
            "id"         : vid_id,
            "title"      : title,
            "description": desc,
            "category"   : category,
            "thumbnail"  : f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
            "youtube"    : f"https://www.youtube.com/watch?v={vid_id}",
            "date"       : date_str,
            "tags"       : tags,
        })

    return videos

# ── Helpers ────────────────────────────────────────────────────────
def _norm_date(raw: str) -> str:
    if not raw:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        clean = re.sub(r"[+-]\d{2}:\d{2}$", "", raw).replace("Z", "").strip()
        return datetime.fromisoformat(clean).strftime("%Y-%m-%d")
    except Exception:
        return raw[:10] if len(raw) >= 10 else raw

def _guess_category(title: str, desc: str) -> str:
    t = (title + " " + desc).lower()
    if re.search(r"tutorial|how to|kaise|guide|step by step|sikhe|banaye|seekho|sikh", t):
        return "tutorials"
    if re.search(r"\btips?\b|tricks?|top \d|best|improve|shortcut|secret|\bpro\b", t):
        return "tips"
    return "minecraft"

def _build_tags(title: str, category: str) -> list[str]:
    tags = []
    t = title.lower()
    if "minecraft" in t:
        tags.append("minecraft")
    if category == "tutorials" and "tutorial" not in tags:
        tags.append("tutorial")
    if category == "tips" and "tips" not in tags:
        tags.append("tips")
    return tags

# ── Step 4: Merge + sort ───────────────────────────────────────────
def merge(existing: list[dict], fresh: list[dict]) -> list[dict]:
    seen = {v["id"] for v in existing if "id" in v}
    added = 0
    for v in fresh:
        if v["id"] not in seen:
            existing.append(v)
            seen.add(v["id"])
            added += 1
            print(f"  + Added: {v['title'][:70]}")
    if added == 0:
        print("  = Already up to date — no new videos.")
    else:
        print(f"  ✓ {added} new video(s) added.")
    return existing

def sort_by_date(videos: list[dict]) -> list[dict]:
    def _key(v):
        try:
            return datetime.strptime(v.get("date", "1970-01-01")[:10], "%Y-%m-%d")
        except Exception:
            return datetime.min
    return sorted(videos, key=_key, reverse=True)

# ── Load / save JSON ───────────────────────────────────────────────
def load_existing() -> list[dict]:
    if not os.path.exists(OUTPUT_FILE):
        print("  (No existing file — will create fresh.)")
        return []
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            print(f"  Loaded {len(data)} existing video(s).")
            return data
        return []
    except Exception as e:
        print(f"  ! Could not read existing JSON ({e}) — starting fresh.")
        return []

def save(videos: list[dict]):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(videos, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Saved {len(videos)} video(s) → {OUTPUT_FILE}")

# ── Main ───────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(" The Antigle — YouTube Video Updater  (v3)")
    print(f" Handle  : @{HANDLE}")
    print("=" * 60)

    print("\n[1/4] Resolving Channel ID from YouTube page…")
    channel_id = resolve_channel_id()
    print(f"      Using Channel ID: {channel_id}")

    print("\n[2/4] Fetching RSS feed…")
    xml_bytes = fetch_rss(channel_id)

    print("\n[3/4] Parsing feed…")
    fresh = parse_rss(xml_bytes)
    print(f"      Parsed {len(fresh)} video(s) from feed.")
    if not fresh:
        print("  ! No videos found in RSS. Nothing to do.")
        return

    print("\n[4/4] Merging with existing data…")
    existing = load_existing()
    merged   = merge(existing, fresh)
    merged   = sort_by_date(merged)
    save(merged)

    print("\n✓ Done!\n")

if __name__ == "__main__":
    main()
