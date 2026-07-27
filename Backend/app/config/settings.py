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

# ─── Selenium: thời gian chờ trang JS render xong (giây) ──────────────────────
JS_RENDER_WAIT  = 10   # Chờ trang load lần đầu
JS_SCROLL_PAUSE = 1    # Chờ giữa các lần scroll

# ─── CSS selector để tìm bài hát trên trang ───────────────────────────────────
# Trang dùng React, cần lấy từ DOM sau khi JS chạy xong
HYMN_ITEM_SELECTOR = "li.MusicLibraryItem, li[class*='LibraryItem'], li[class*='musicItem'], div[class*='item']"

# ─── Thư mục lưu output ───────────────────────────────────────────────────────
OUTPUT_DIR = "app/output"
