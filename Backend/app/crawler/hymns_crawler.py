"""
Hymns crawler — Phase 2: crawl hymn ID and title using Selenium.

The site renders content with JavaScript (React), so a headless browser
is required to get the fully rendered DOM.
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
    HYMNS_URL,
    REQUEST_HEADERS,
    REQUEST_TIMEOUT,
    JS_RENDER_WAIT,
    JS_SCROLL_PAUSE,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _error_result(message: str) -> dict:
    """Build a failed connection result dict (DRY helper)."""
    return {
        "url":         HYMNS_URL,
        "status_code": None,
        "connected":   False,
        "message":     message,
    }


def _build_chrome_options() -> Options:
    """Return headless Chrome options (DRY: single place for browser config)."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(f"user-agent={REQUEST_HEADERS['User-Agent']}")
    return options


def _scroll_to_bottom(driver: webdriver.Chrome) -> None:
    """Scroll page to bottom gradually to trigger lazy-loaded content."""
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(JS_SCROLL_PAUSE)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def _parse_hymn_number(text: str) -> str | None:
    """Extract hymn number from element text like '1.' or '142.'"""
    match = re.search(r"^\s*(\d+)", text)
    return match.group(1) if match else None


# ── Public API ─────────────────────────────────────────────────────────────────

def check_connection() -> dict:
    """
    Send a lightweight HTTP request to verify connectivity.

    Returns:
        dict: Connection result with url, status_code, connected flag, and message.
    """
    print(f"[Crawler] Connecting to: {HYMNS_URL}")
    try:
        response = requests.get(HYMNS_URL, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
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


def crawl_hymns() -> list[dict]:
    """
    Launch a headless Chrome browser, render the hymns page, and extract
    hymn ID (number) and title from the fully-rendered DOM.

    Returns:
        list[dict]: Each item has {"id": str, "title": str}.
    """
    print("[Crawler] Launching headless Chrome...")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=_build_chrome_options(),
    )

    try:
        driver.get(HYMNS_URL)
        print(f"[Crawler] Page loaded. Waiting {JS_RENDER_WAIT}s for JS to render...")

        # Wait until at least one list item appears
        WebDriverWait(driver, JS_RENDER_WAIT).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "li, .MusicLibraryItem"))
        )

        # Scroll to trigger any lazy-loaded hymns
        _scroll_to_bottom(driver)

        # Extract hymn data via JavaScript — most reliable method for React apps
        hymns_raw = driver.execute_script("""
            const items = [];
            // Try multiple selector strategies
            const selectors = [
                'a[href*="/media/music/hymns/"]',
                'a[href*="hymn"]',
                'li a',
            ];
            for (const sel of selectors) {
                const nodes = document.querySelectorAll(sel);
                if (nodes.length > 10) {
                    nodes.forEach(node => {
                        const href = node.getAttribute('href') || '';
                        const text = node.innerText || node.textContent || '';
                        items.push({ href: href, text: text.trim() });
                    });
                    break;
                }
            }
            return items;
        """)

        print(f"[Crawler] Raw items found: {len(hymns_raw)}")

        # Parse into clean {id, title} format
        hymns = _parse_raw_items(hymns_raw)
        print(f"[Crawler] Parsed hymns: {len(hymns)}")
        return hymns

    finally:
        driver.quit()
        print("[Crawler] Browser closed.")


def _parse_raw_items(raw_items: list[dict]) -> list[dict]:
    """
    Convert raw DOM items [{href, text}] into clean [{id, title}] format.
    DRY: all parsing logic in one place.
    """
    hymns = []
    seen_ids = set()

    for item in raw_items:
        href  = item.get("href", "")
        text  = item.get("text", "").strip()

        if not text or len(text) < 2:
            continue

        # Extract hymn number from URL e.g. /media/music/hymns/1-the-morning-breaks
        url_match = re.search(r"/hymns?/(\d+)", href)
        # Or from the text content (e.g. "1. The Morning Breaks")
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

        hymns.append({"id": hymn_id, "title": title})

    # Sort by numeric ID
    hymns.sort(key=lambda h: int(h["id"]))
    return hymns
