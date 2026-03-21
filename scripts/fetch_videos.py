#!/usr/bin/env python3
"""
fetch_videos.py — The Antigle YouTube Updater  (v4)
=====================================================
Uses rss2json.com as a free proxy to fetch YouTube videos.
This bypasses the YouTube 404 block that happens from GitHub Actions IPs.

No API key needed. Free tier: 10 req/hour — plenty for daily use.

Channel : @notgamingplayz
"""

import json, os, re, sys, time, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────
CHANNEL_ID  = "UCXR0A7A2OonSoaa_EKTwp0A"
RSS_URL     = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"

# rss2json.com converts RSS→JSON from THEIR servers (not blocked by YouTube)
RSS2JSON    = "https://api.rss2json.com/v1/api.json?rss_url=" + urllib.parse.quote(RSS_URL, safe="")

OUTPUT_FILE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "content", "videos", "index.json")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# ── HTTP ────────────────────────────────────────────────────────────
def http_get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

# ── Fetch via rss2json.com ──────────────────────────────────────────
def fetch_via_rss2json() -> list[dict]:
    print(f"  URL: {RSS2JSON}")
    raw = http_get(RSS2JSON)
    data = json.loads(raw)

    if data.get("status") != "ok":
        raise RuntimeError(f"rss2json error: {data.get('message', data.get('status'))}")

    items = data.get("items", [])
    print(f"  ✓ Got {len(items)} items from rss2json.com")
    return items

# ── Parse rss2json items → our format ──────────────────────────────
def parse_items(items: list[dict]) -> list[dict]:
    videos = []
    for item in items:
        # Extract YouTube video ID from link
        link  = item.get("link", "")
        vid_id = _ytid(link)
        if not vid_id:
            # Try guid field
            vid_id = _ytid(item.get("guid", ""))
        if not vid_id:
            continue

        title = (item.get("title") or "Untitled").strip()
        desc  = _clean_desc(item.get("description") or item.get("content") or "")
        date  = _norm_date(item.get("pubDate") or "")

        # rss2json sometimes provides thumbnail directly
        thumb = item.get("thumbnail") or item.get("enclosure", {}).get("link") or ""
        if not thumb or "ytimg" not in thumb:
            thumb = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"

        category = _guess_cat(title, desc)

        videos.append({
            "id"         : vid_id,
            "title"      : title,
            "description": desc,
            "category"   : category,
            "thumbnail"  : thumb,
            "youtube"    : f"https://www.youtube.com/watch?v={vid_id}",
            "date"       : date,
            "tags"       : _tags(title, category),
        })
    return videos

# ── Fallback: Direct XML fetch (if rss2json fails) ──────────────────
def fetch_direct_xml() -> list[dict]:
    import xml.etree.ElementTree as ET
    NS = {
        "atom" : "http://www.w3.org/2005/Atom",
        "yt"   : "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }
    direct_url = RSS_URL
    print(f"  Trying direct RSS: {direct_url}")
    raw  = http_get(direct_url)
    root = ET.fromstring(raw)
    videos = []
    for entry in root.findall("atom:entry", NS):
        vid_el = entry.find("yt:videoId", NS)
        if vid_el is None: continue
        vid_id = vid_el.text.strip()
        title  = (entry.findtext("atom:title", "", NS) or "Untitled").strip()
        date   = _norm_date(entry.findtext("atom:published", "", NS) or "")
        desc   = ""
        grp    = entry.find("media:group", NS)
        if grp is not None:
            raw_d = grp.findtext("media:description", "", NS) or ""
            desc  = raw_d[:220] + ("…" if len(raw_d) > 220 else "")
        cat = _guess_cat(title, desc)
        videos.append({
            "id": vid_id, "title": title, "description": desc,
            "category": cat,
            "thumbnail": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
            "youtube": f"https://www.youtube.com/watch?v={vid_id}",
            "date": date, "tags": _tags(title, cat),
        })
    return videos

# ── Helpers ─────────────────────────────────────────────────────────
def _ytid(url: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|/embed/|/v/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else ""

def _clean_desc(html: str) -> str:
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", "", html)
    text = text.strip()[:220]
    return text

def _norm_date(raw: str) -> str:
    if not raw:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        # Handle "2024-12-15 10:30:00" and ISO variants
        clean = re.sub(r"[+-]\d{2}:\d{2}$", "", raw.strip()).replace("Z", "")
        clean = clean.replace(" ", "T")
        return datetime.fromisoformat(clean).strftime("%Y-%m-%d")
    except Exception:
        return raw[:10] if len(raw) >= 10 else raw

def _guess_cat(title: str, desc: str) -> str:
    t = (title + " " + desc).lower()
    if re.search(r"tutorial|how to|kaise|guide|step by step|sikhe|banaye", t):
        return "tutorials"
    if re.search(r"\btips?\b|tricks?|top \d|best|improve|shortcut|secret", t):
        return "tips"
    return "minecraft"

def _tags(title: str, cat: str) -> list:
    tags, t = [], title.lower()
    if "minecraft" in t: tags.append("minecraft")
    if cat == "tutorials": tags.append("tutorial")
    if cat == "tips":      tags.append("tips")
    return tags

# ── Merge + sort ────────────────────────────────────────────────────
def merge(existing: list, fresh: list) -> list:
    seen  = {v["id"] for v in existing if "id" in v}
    added = 0
    for v in fresh:
        if v["id"] not in seen:
            existing.append(v)
            seen.add(v["id"])
            added += 1
            print(f"  + {v['title'][:65]}")
    if added == 0:
        print("  = Already up to date.")
    else:
        print(f"  ✓ {added} new video(s) added.")
    return existing

def sort_videos(videos: list) -> list:
    def key(v):
        try:    return datetime.strptime(v.get("date","1970-01-01")[:10], "%Y-%m-%d")
        except: return datetime.min
    return sorted(videos, key=key, reverse=True)

def load_existing() -> list:
    if not os.path.exists(OUTPUT_FILE): return []
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"  Loaded {len(data)} existing video(s).")
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  ! JSON read error ({e}) — starting fresh.")
        return []

def save(videos: list):
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(videos, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Saved {len(videos)} video(s) → {OUTPUT_FILE}")

# ── Main ─────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(" The Antigle — YouTube Video Updater  (v4)")
    print(f" Channel : {CHANNEL_ID}  (@notgamingplayz)")
    print("=" * 60)

    # Step 1: Fetch videos
    print("\n[1/3] Fetching videos from YouTube…")
    fresh = []

    # Try rss2json.com first (bypasses GitHub Actions IP block)
    try:
        print("  Method: rss2json.com proxy")
        items = fetch_via_rss2json()
        fresh = parse_items(items)
        print(f"  ✓ Parsed {len(fresh)} video(s).")
    except Exception as e:
        print(f"  ! rss2json failed: {e}")
        print("  Trying direct RSS fallback…")
        try:
            fresh = fetch_direct_xml()
            print(f"  ✓ Direct RSS: {len(fresh)} video(s).")
        except Exception as e2:
            print(f"  ✗ Direct RSS also failed: {e2}")
            print("\n  BOTH methods failed. Possible causes:")
            print("  - No internet access in this runner")
            print("  - Channel ID is wrong")
            print(f"  - Verify: https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}")
            sys.exit(1)

    if not fresh:
        print("  ! No videos parsed. Exiting.")
        sys.exit(0)

    # Step 2: Merge
    print("\n[2/3] Merging with existing data…")
    existing = load_existing()
    merged   = merge(existing, fresh)
    merged   = sort_videos(merged)

    # Step 3: Save
    print("\n[3/3] Saving…")
    save(merged)
    print("\n✓ Complete!\n")

if __name__ == "__main__":
    main()
