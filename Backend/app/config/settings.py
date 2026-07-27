"""
Cấu hình trang web cần crawl.
"""

# ─── Thông tin trang web ───────────────────────────────────────────────────────
HYMNS_URL = "https://www.churchofjesuschrist.org/media/music/collections/hymns?lang=eng"
LANGUAGE   = "eng"

# ─── HTTP Headers giả lập trình duyệt thật ────────────────────────────────────
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ─── Thời gian chờ kết nối (giây) ─────────────────────────────────────────────
REQUEST_TIMEOUT = 15

# ─── Thư mục lưu output ───────────────────────────────────────────────────────
OUTPUT_DIR = "app/output"
