"""
Hymns crawler — crawl hymn ID and title from multiple collections.

The site renders content with JavaScript (React), so a headless browser
is required to get the fully rendered DOM.

Public API:
    check_connection() -> dict          — lightweight HTTP connectivity test
    crawl_all_collections() -> list     — crawl every collection in settings
"""

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

        # Build full URL — href is relative e.g. /media/music/hymns/1-the-morning-breaks
        full_url = f"{BASE_URL}{href}" if href.startswith("/") else href

        hymns.append({"id": hymn_id, "title": title, "url": full_url})

    hymns.sort(key=lambda h: int(h["id"]))
    return hymns


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
    print(f"[Crawler] [{name}] Found {len(hymns)} hymns.")
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
