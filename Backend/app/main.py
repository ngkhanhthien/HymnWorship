"""
HymnWorship Backend - Entry Point

How to run from Backend directory:
    python app/main.py
"""

import sys
import os

# Fix Unicode output on Windows (UTF-8)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend/ is always in sys.path so "from app.xxx" imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.crawler.hymns_crawler import check_connection, crawl_hymns
from app.crawler.save_json import save_json


def main() -> None:
    """Entry point: verify connection then crawl hymn IDs and titles."""
    print("=" * 55)
    print("  HymnWorship Crawler")
    print("=" * 55)

    # Step 1: Check connection
    conn = check_connection()
    print(f"\n  URL      : {conn['url']}")
    print(f"  Status   : {conn['status_code']}")
    print(f"  Connected: {'[OK]' if conn['connected'] else '[FAIL]'}")

    if not conn["connected"]:
        print(f"  Message  : {conn['message']}")
        print("=" * 55)
        return

    print("=" * 55)

    # Step 2: Crawl hymn data
    print("\n[Crawler] Starting hymn crawl...")
    hymns = crawl_hymns()

    if not hymns:
        print("[Crawler] No hymns found. Check selectors in settings.py")
        return

    print(f"\n[Crawler] Total hymns found: {len(hymns)}")
    print("\n  Sample (first 5):")
    for h in hymns[:5]:
        print(f"    #{h['id']:>3}  {h['title']}")

    # Step 3: Save to JSON
    save_json(hymns, "hymns")
    print("=" * 55)


if __name__ == "__main__":
    main()
