"""
Hymns crawler — crawl hymn ID and title from multiple collections.

The site renders content with JavaScript (React), so a headless browser
is required to get the fully rendered DOM.

Public API:
    check_connection() -> dict          — lightweight HTTP connectivity test
    crawl_all_collections() -> list     — crawl every collection in settings
"""

import os
import base64
import time
import re
import requests

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from app.config.settings import (
    BASE_URL,
    HYMNS_URL,
    HYMN_COLLECTIONS,
    REQUEST_HEADERS,
    REQUEST_TIMEOUT,
    JS_RENDER_WAIT,
    JS_SCROLL_PAUSE,
    JS_DETAIL_WAIT,
    HYMN_DETAIL_CRAWL_LIMIT,
    SHEET_MUSIC_DIR,
    AUDIO_DIR,
    AUDIO_ACCOMPANIMENT_DIR,
    FORCE_REFRESH_IMAGES,
    FORCE_REFRESH_AUDIO,
)


# ── Private helpers ────────────────────────────────────────────────────────────

def _error_result(message: str) -> dict:
    """Build a failed connection result dict."""
    return {
        "url":         HYMNS_URL,
        "status_code": None,
        "connected":   False,
        "message":     message,
    }


def _normalize_url(url: str) -> str:
    """Ensure relative URLs are converted to full URLs with BASE_URL (DRY helper)."""
    if not url:
        return ""
    if url.startswith("/"):
        return f"{BASE_URL}{url}"
    return url


def _normalize_text(text: str) -> str:
    """Clean up non-breaking spaces and en-dashes from scraped text (DRY helper)."""
    return text.replace("\xa0", " ").replace("\u2013", "-").strip()


def _touch_file_timestamps(filepath: str) -> None:
    """
    Force update Creation Time (ctime) and Modification Time (mtime) of a file to NOW.
    Uses Windows API (SetFileTime) on Windows to bypass NTFS File System Tunneling.
    """
    try:
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes
            now_ft = int((time.time() + 11644473600) * 10000000)
            ft = wintypes.FILETIME(now_ft & 0xFFFFFFFF, now_ft >> 32)
            h = ctypes.windll.kernel32.CreateFileW(
                filepath, 0x0100, 0, None, 3, 0x02000000, None
            )
            if h != -1 and h != 0:
                ctypes.windll.kernel32.SetFileTime(h, ctypes.byref(ft), ctypes.byref(ft), ctypes.byref(ft))
                ctypes.windll.kernel32.CloseHandle(h)
        else:
            os.utime(filepath, None)
    except Exception:
        pass


def _build_chrome_options() -> Options:
    """Return headless Chrome options (single source of truth for browser config)."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(f"user-agent={REQUEST_HEADERS['User-Agent']}")
    return options


def _scroll_to_bottom(driver: webdriver.Chrome) -> None:
    """Scroll gradually to trigger lazy-loaded content."""
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(JS_SCROLL_PAUSE)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def _extract_raw_items(driver: webdriver.Chrome) -> list[dict]:
    """
    Execute JS in the rendered page to collect href + text for each hymn link.
    Returns raw [{href, text}] — parsing is done separately (_parse_raw_items).
    """
    return driver.execute_script("""
        const items = [];
        const selectors = [
            'a[href*="/media/music/hymns/"]',
            'a[href*="hymn"]',
            'li a',
        ];
        for (const sel of selectors) {
            const nodes = document.querySelectorAll(sel);
            if (nodes.length > 10) {
                nodes.forEach(node => {
                    items.push({
                        href: node.getAttribute('href') || '',
                        text: (node.innerText || node.textContent || '').trim(),
                    });
                });
                break;
            }
        }
        return items;
    """)


def _parse_raw_items(raw_items: list[dict]) -> list[dict]:
    """
    Convert raw DOM items [{href, text}] into clean [{id, title}].
    All parsing logic lives here — one place to update if the site changes.
    """
    hymns    = []
    seen_ids = set()

    for item in raw_items:
        href = item.get("href", "")
        text = (item.get("text") or "").strip()

        if not text or len(text) < 2:
            continue

        # Strategy 1: extract number from URL  /hymns/1-the-morning-breaks
        url_match = re.search(r"/hymns?/(\d+)", href)
        # Strategy 2: extract from text "1. The Morning Breaks"
        txt_match = re.search(r"^(\d+)[.\s]+(.+)$", text, re.DOTALL)

        if url_match:
            hymn_id = url_match.group(1)
            title   = re.sub(r"^\d+[.\s]+", "", text).strip() or text
        elif txt_match:
            hymn_id = txt_match.group(1)
            title   = txt_match.group(2).strip()
        else:
            continue

        if hymn_id in seen_ids:
            continue
        seen_ids.add(hymn_id)

        full_url = _normalize_url(href)

        hymns.append({"id": hymn_id, "title": title, "url": full_url})

    hymns.sort(key=lambda h: int(h["id"]))
    return hymns


def _extract_sheet_music_images(driver: webdriver.Chrome, hymn_id: str) -> list[str]:
    """
    Wait for sheet music canvas element(s) on the detail page and save as PNG file(s).
    File name: <hymn_id>.png (or <hymn_id>_<page>.png if multi-page).
    Saved into SHEET_MUSIC_DIR (e.g. app/output/sheet_music).

    If FORCE_REFRESH_IMAGES is False (default) and file(s) already exist,
    skips re-exporting canvas and returns existing file path(s).
    If FORCE_REFRESH_IMAGES is True, deletes existing old file(s) for this hymn_id first,
    then captures fresh images from the web page and writes new files.
    """
    # 1. If FORCE_REFRESH_IMAGES is False: reuse existing files if present
    if not FORCE_REFRESH_IMAGES and os.path.exists(SHEET_MUSIC_DIR):
        existing = [
            os.path.join(SHEET_MUSIC_DIR, fname).replace("\\", "/")
            for fname in sorted(os.listdir(SHEET_MUSIC_DIR))
            if fname == f"{hymn_id}.png" or re.match(fr"^{re.escape(hymn_id)}_\d+\.png$", fname)
        ]
        if existing:
            print(f"[Crawler] [{hymn_id}] Sheet music image exists — skipping download.")
            return existing

    # 2. If FORCE_REFRESH_IMAGES is True: delete old files for this hymn_id before re-downloading
    if os.path.exists(SHEET_MUSIC_DIR):
        for fname in os.listdir(SHEET_MUSIC_DIR):
            if fname == f"{hymn_id}.png" or re.match(fr"^{re.escape(hymn_id)}_\d+\.png$", fname):
                old_file = os.path.join(SHEET_MUSIC_DIR, fname)
                try:
                    os.remove(old_file)
                except Exception:
                    pass

    # 3. Capture fresh canvas images from live webpage
    saved_paths = []
    try:
        WebDriverWait(driver, JS_DETAIL_WAIT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "canvas"))
        )
        canvases = driver.find_elements(By.CSS_SELECTOR, "canvas")
        if not canvases:
            return saved_paths

        os.makedirs(SHEET_MUSIC_DIR, exist_ok=True)
        for i, canvas in enumerate(canvases):
            data_url = driver.execute_script("return arguments[0].toDataURL('image/png');", canvas)
            if data_url and "," in data_url:
                b64_str = data_url.split(",", 1)[1]
                img_bytes = base64.b64decode(b64_str)
                filename = f"{hymn_id}_{i+1}.png" if len(canvases) > 1 else f"{hymn_id}.png"
                filepath = os.path.join(SHEET_MUSIC_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(img_bytes)
                _touch_file_timestamps(filepath)
                rel_path = filepath.replace("\\", "/")
                print(f"[Crawler] [{hymn_id}] Fresh sheet music downloaded & saved -> {rel_path}")
                saved_paths.append(rel_path)
    except Exception as e:
        print(f"[Crawler] Warning: Sheet music image capture for hymn #{hymn_id} skipped or timed out: {e}")
    return saved_paths


def _extract_accompaniment_audio(driver: webdriver.Chrome, hymn_id: str) -> str | None:
    """
    Extract Accompaniment MP3 URL from detail page, download the MP3 file,
    and save it as <hymn_id>.mp3 inside AUDIO_ACCOMPANIMENT_DIR (e.g. app/output/audio/accompaniment/1.mp3).

    Respects FORCE_REFRESH_AUDIO setting (default False): if <hymn_id>.mp3 already exists,
    skips downloading and reuses existing file path.
    Returns relative saved file path (e.g. "app/output/audio/accompaniment/1.mp3") or None if not found/failed.
    """
    target_filename = f"{hymn_id}.mp3"
    target_path = os.path.join(AUDIO_ACCOMPANIMENT_DIR, target_filename)
    rel_path = target_path.replace("\\", "/")

    # 1. Skip if already exists and FORCE_REFRESH_AUDIO is False
    if not FORCE_REFRESH_AUDIO and os.path.exists(target_path):
        print(f"[Crawler] [{hymn_id}] Audio file exists — skipping download.")
        return rel_path

    # 2. Extract Accompaniment MP3 URL from page DOM
    try:
        mp3_links = set(re.findall(r'https?://[^\'"\s<>]+\.mp3[^\'"\s<>]*', driver.page_source))
        if not mp3_links:
            return None

        acc_links = [l for l in mp3_links if "accompaniment" in l.lower() and "vocal" not in l.lower()]
        if not acc_links:
            acc_links = [l for l in mp3_links if "accompaniment" in l.lower()] or [l for l in mp3_links if "vocal" not in l.lower()] or list(mp3_links)

        audio_url = acc_links[0]
        os.makedirs(AUDIO_ACCOMPANIMENT_DIR, exist_ok=True)

        # Delete old file if FORCE_REFRESH_AUDIO is True
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass

        response = requests.get(audio_url, headers=REQUEST_HEADERS, timeout=30)
        if response.status_code == 200:
            with open(target_path, "wb") as f:
                f.write(response.content)
            _touch_file_timestamps(target_path)
            print(f"[Crawler] [{hymn_id}] Fresh Accompaniment MP3 downloaded & saved -> {rel_path}")
            return rel_path
    except Exception as e:
        print(f"[Crawler] Warning: Accompaniment audio capture for hymn #{hymn_id} skipped or timed out: {e}")
    return None


def _crawl_hymn_detail(driver: webdriver.Chrome, hymn_id: str, hymn_url: str) -> dict:
    """
    Navigate to a single hymn detail page and extract scriptures + sheet music images.

    Returns dict:
        {
            "scriptures": [{"reference": "...", "url": "..."}, ...],
            "sheet_music": ["app/output/sheet_music/1.png", ...]
        }
    """
    try:
        driver.get(hymn_url)
        WebDriverWait(driver, JS_DETAIL_WAIT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1, .eden-headings-h1"))
        )

        # 1. Scriptures
        scriptures = []
        items = driver.find_elements(By.CSS_SELECTOR, "li.eden-list-item a")
        for el in items:
            raw_text = el.text.strip()
            if not raw_text:
                continue
            href = el.get_attribute("href") or ""
            scriptures.append({
                "reference": _normalize_text(raw_text),
                "url":       _normalize_url(href),
            })

        # 2. Sheet music images
        sheet_music = _extract_sheet_music_images(driver, hymn_id)

        # 3. Audio Accompaniment MP3
        audio_accompaniment = _extract_accompaniment_audio(driver, hymn_id)

        return {
            "scriptures":          scriptures,
            "sheet_music":         sheet_music,
            "audio_accompaniment": audio_accompaniment,
        }
    except Exception:
        return {"scriptures": [], "sheet_music": [], "audio_accompaniment": None}


def _crawl_single_page(driver: webdriver.Chrome, url: str, name: str) -> list[dict]:
    """
    Navigate to *url* in an already-open driver, wait for JS render,
    scroll to load all items, then return parsed [{id, title}].

    DRY core: this single function handles every collection URL.
    """
    print(f"[Crawler] [{name}] Loading: {url}")
    driver.get(url)

    WebDriverWait(driver, JS_RENDER_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "li, .MusicLibraryItem"))
    )

    _scroll_to_bottom(driver)

    raw   = _extract_raw_items(driver)
    hymns = _parse_raw_items(raw)

    # Determine hymn detail crawl limit ("all" vs integer count)
    if isinstance(HYMN_DETAIL_CRAWL_LIMIT, str) and HYMN_DETAIL_CRAWL_LIMIT.lower() == "all":
        limit = len(hymns)
    elif isinstance(HYMN_DETAIL_CRAWL_LIMIT, int):
        limit = max(0, HYMN_DETAIL_CRAWL_LIMIT)
    else:
        limit = len(hymns)

    limit_desc = "ALL" if limit == len(hymns) else f"first {limit}"
    print(f"[Crawler] [{name}] Found {len(hymns)} hymns. Crawling detail pages for {limit_desc} hymn(s)...")

    for i, hymn in enumerate(hymns, 1):
        if i <= limit:
            detail = _crawl_hymn_detail(driver, hymn["id"], hymn["url"])
            hymn["scriptures"]          = detail["scriptures"]
            hymn["sheet_music"]         = detail["sheet_music"]
            hymn["audio_accompaniment"] = detail["audio_accompaniment"]
            if i % 20 == 0 or i == limit:
                print(f"[Crawler] [{name}] Detail progress: {i}/{limit}")
        else:
            hymn["scriptures"]          = []
            hymn["sheet_music"]         = []
            hymn["audio_accompaniment"] = None

    return hymns


# ── Public API ─────────────────────────────────────────────────────────────────

def check_connection() -> dict:
    """
    Lightweight HTTP request to verify connectivity.

    Returns:
        dict: {url, status_code, connected, message}
    """
    print(f"[Crawler] Connecting to: {HYMNS_URL}")
    try:
        response  = requests.get(HYMNS_URL, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
        connected = response.status_code == 200
        return {
            "url":         response.url,
            "status_code": response.status_code,
            "connected":   connected,
            "message":     "Connection successful!" if connected
                           else f"Connection failed! Status: {response.status_code}",
        }
    except requests.exceptions.ConnectionError:
        return _error_result("Error: Cannot connect. Check your internet connection.")
    except requests.exceptions.Timeout:
        return _error_result(f"Error: Connection timed out ({REQUEST_TIMEOUT}s).")
    except requests.exceptions.RequestException as e:
        return _error_result(f"Unknown error: {e}")


def crawl_all_collections() -> list[dict]:
    """
    Open one headless Chrome session and crawl every collection in
    HYMN_COLLECTIONS (settings.py). Returns a list of collection results:

        [
            {"name": str, "output_file": str, "hymns": [{id, title}, ...]},
            ...
        ]

    Adding a new source = adding 1 dict to HYMN_COLLECTIONS in settings.py.
    No changes needed in crawler code.
    """
    print("[Crawler] Launching headless Chrome...")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=_build_chrome_options(),
    )

    results = []
    try:
        for collection in HYMN_COLLECTIONS:
            hymns = _crawl_single_page(driver, collection["url"], collection["name"])
            results.append({
                "name":        collection["name"],
                "output_file": collection["output_file"],
                "hymns":       hymns,
            })
    finally:
        driver.quit()
        print("[Crawler] Browser closed.")

    return results
