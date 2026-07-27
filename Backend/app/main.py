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

from app.crawler.hymns_crawler import check_connection, crawl_all_collections
from app.crawler.save_json import save_json


def _print_separator() -> None:
    print("=" * 55)


def main() -> None:
    """Entry point: verify connection then crawl all hymn collections."""
    _print_separator()
    print("  HymnWorship Crawler")
    _print_separator()

    # Step 1: Connection check
    conn = check_connection()
    print(f"\n  URL      : {conn['url']}")
    print(f"  Status   : {conn['status_code']}")
    print(f"  Connected: {'[OK]' if conn['connected'] else '[FAIL]'}")

    if not conn["connected"]:
        print(f"  Message  : {conn['message']}")
        _print_separator()
        return

    _print_separator()

    # Step 2: Crawl all collections (defined in settings.py)
    print("\n[Crawler] Starting crawl for all collections...")
    collections = crawl_all_collections()

    # Step 3: Save each collection to its own JSON file
    _print_separator()
    for col in collections:
        if not col["hymns"]:
            print(f"  [{col['name']}] No hymns found — skipping.")
            continue

        print(f"\n  [{col['name']}]")
        print(f"  Total : {len(col['hymns'])} hymns")
        print("  Sample (first 3):")
        for h in col["hymns"][:3]:
            print(f"    #{h['id']:>3}  {h['title']}")

        save_json(col["hymns"], col["output_file"])

    _print_separator()


if __name__ == "__main__":
    main()
