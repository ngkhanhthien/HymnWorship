import os

"""
Crawler configuration.
"""

# ─── Base Directories ─────────────────────────────────────────────────────────
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─── Logging Configuration ───────────────────────────────────────────────────
LOGS_DIR       = os.path.join(APP_DIR, "logs")
LOG_FILE_NAME  = "app.log"
LOG_FILE_PATH  = os.path.join(LOGS_DIR, LOG_FILE_NAME)
LOG_LEVEL      = "INFO"

# ─── Base ─────────────────────────────────────────────────────────────────────
BASE_URL = "https://www.churchofjesuschrist.org"
LANGUAGE = "
# ─── Collections to crawl ─────────────────────────────────────────────────────
# To add a new collection: append one dict with "name", "url", "output_file".
HYMN_COLLECTIONS = [
    {
        "name":        "Hymns",
        "url":         f"{BASE_URL}/media/music/collections/hymns?lang={LANGUAGE}",
        "output_file": "hymns",
    },
    {
        "name":        "Hymns for Home and Church",
        "url":         f"{BASE_URL}/media/music/collections/hymns-for-home-and-church?lang={LANGUAGE}",
        "output_file": "hymns_home_church",
    },
]

# Backward-compat alias used by check_connection()
HYMNS_URL = HYMN_COLLECTIONS[0]["url"]

# ─── HTTP Headers ─────────────────────────────────────────────────────────────
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ─── Timeouts ─────────────────────────────────────────────────────────────────
REQUEST_TIMEOUT = 15
JS_RENDER_WAIT  = 10   # seconds to wait for React to render
JS_SCROLL_PAUSE = 1    # seconds between scroll steps
JS_DETAIL_WAIT  = 5    # max seconds to wait for hymn detail h1 to appear (stops early if faster)

# ─── Output & Crawl Limits ───────────────────────────────────────────────────
OUTPUT_DIR              = "app/output"
SHEET_MUSIC_DIR         = "app/output/sheet_music"
AUDIO_DIR               = "app/output/audio"
AUDIO_ACCOMPANIMENT_DIR = "app/output/audio/accompaniment"

# Number of hymns to crawl detail pages for testing (e.g. 3) or "all" to crawl all hymns
HYMN_DETAIL_CRAWL_LIMIT = 3

# Force re-download/refresh sheet music images even if they already exist locally.
# Default: False (skip downloading if file already exists). Set to True to force overwrite.
FORCE_REFRESH_IMAGES = False

# Force re-download/refresh audio MP3 files even if they already exist locally.
# Default: False (skip downloading if file already exists). Set to True to force overwrite.
FORCE_REFRESH_AUDIO = False


