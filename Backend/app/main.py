"""
HymnWorship Backend - Entry Point

How to run from Backend directory:
    python app/main.py
    or
    python -m app.main
"""

import sys
import os

# Fix Unicode output on Windows (UTF-8)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Đảm bảo thư mục Backend luôn nằm trong sys.path
# để import "from app.xxx" hoạt động đúng dù chạy bằng cách nào
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.crawler.hymns_crawler import check_connection
from app.crawler.save_json import save_json


def main() -> None:
    """Entry point: test connection to website and save result."""
    print("=" * 50)
    print("  HymnWorship Crawler - Connection Test")
    print("=" * 50)

    # Check connection
    result = check_connection()

    # Print result
    print(f"\n  URL        : {result['url']}")
    print(f"  Status     : {result['status_code']}")
    print(f"  Connected  : {'[OK]' if result['connected'] else '[FAIL]'}")
    print(f"  Message    : {result['message']}")
    print("=" * 50)

    # Save result to JSON file
    save_json(result, "connection_test")


if __name__ == "__main__":
    main()
