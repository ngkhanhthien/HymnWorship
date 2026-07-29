"""
HymnWorship Backend - Entry Point

How to run from Backend directory:
    python app/main.py
"""

import sys
import os

# Fix Unicode output on Windows (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend/ is always in sys.path so "from app.xxx" imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.crawler.hymns_crawler import check_connection, crawl_all_collections
from app.crawler.save_json import save_json
from app.utils.logger import get_logger
from app.sync_data.sync_local.local_syncer import sync_output_to_local_assets

logger = get_logger("main")


def main() -> None:
    """Entry point: verify connection, crawl all hymn collections, and optionally sync to Frontend."""
    logger.info("=======================================================")
    logger.info("  HymnWorship Backend Execution Started")
    logger.info("=======================================================")

    # Step 1: Connection check
    conn = check_connection()
    logger.info(f"URL      : {conn['url']}")
    logger.info(f"Status   : {conn['status_code']}")
    logger.info(f"Connected: {'[OK]' if conn['connected'] else '[FAIL]'}")

    if not conn["connected"]:
        logger.error(f"Connection failed: {conn['message']}")
        logger.info("=======================================================")
        return

    # Step 2: Crawl all collections (defined in settings.py)
    logger.info("Starting crawl for all collections...")
    collections = crawl_all_collections()

    # Step 3: Save each collection to its own JSON file
    for col in collections:
        if not col["hymns"]:
            logger.warning(f"[{col['name']}] No hymns found — skipping.")
            continue

        logger.info(f"[{col['name']}] Total : {len(col['hymns'])} hymns")
        for h in col["hymns"][:3]:
            script_items = h.get("scriptures", [])
            if script_items:
                formatted_scripts = []
                for s in script_items:
                    if isinstance(s, dict):
                        ref = s.get("reference", "")
                        url = s.get("url", "")
                        formatted_scripts.append(f"{ref} ({url})" if url else ref)
                    else:
                        formatted_scripts.append(str(s))
                scripts = ", ".join(formatted_scripts)
            else:
                scripts = "(none)"
            sheets = ", ".join(h.get("sheet_music", [])) or "(none)"
            audio  = h.get("audio_accompaniment") or "(none)"
            logger.info(f"  #{h['id']:>3} {h['title']} | Scriptures: {scripts} | Sheet Music: {sheets} | Audio: {audio}")

        save_json(col["hymns"], col["output_file"])

    logger.info("=======================================================")
    logger.info("  HymnWorship Backend Crawl Completed")
    logger.info("=======================================================")

    # Step 4: Prompt user for sync to Frontend local assets
    print("\n-------------------------------------------------------")
    try:
        user_choice = input("Do you want to update crawled data to Frontend/public/assets? (yes/no): ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        user_choice = "no"

    if user_choice in ["yes", "y"]:
        logger.info("User confirmed YES. Synchronizing data to Frontend local assets...")
        success = sync_output_to_local_assets()
        if success:
            logger.info("Sync completed successfully.")
        else:
            logger.error("Sync encountered errors.")
    else:
        logger.info("User selected NO (or skipped). Data remains saved in Backend/app/output/.")

    logger.info("=======================================================")
    logger.info("  HymnWorship Backend Execution Completed")
    logger.info("=======================================================")


if __name__ == "__main__":
    main()
