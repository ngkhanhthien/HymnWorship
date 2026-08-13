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
from app.sync_data.sync_firebase.firebase_syncer import sync_hymns_to_firebase
from app.utils.logger import get_logger

logger = get_logger("main")


def main() -> None:
    """Entry point: verify connection, crawl all hymn collections, and sync to Firebase."""
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

    # Step 3: Combine all collections into a single merged list and save to 1 JSON file
    all_hymns = []
    seen_ids = set()

    for col in collections:
        if not col["hymns"]:
            logger.warning(f"[{col['name']}] No hymns found — skipping.")
            continue

        logger.info(f"[{col['name']}] Total : {len(col['hymns'])} hymns")
        for h in col["hymns"]:
            hymn_key = f"{h.get('collection', '')}_{h['id']}"
            if hymn_key not in seen_ids:
                seen_ids.add(hymn_key)
                all_hymns.append(h)

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
            acc_audio = h.get("audio_accompaniment") or "(none)"
            voc_audio = h.get("audio_vocal") or "(none)"
            logger.info(f"  #{h['id']:>3} {h['title']} | Sheets: {sheets} | Acc: {acc_audio} | Vocal: {voc_audio}")

    # Save all hymns combined into 1 single JSON file
    if all_hymns:
        output_file_path = save_json(all_hymns, "hymns")
        logger.info(f"Saved {len(all_hymns)} combined hymns into single JSON file: {output_file_path}")
    else:
        logger.warning("No hymns collected to save.")

    logger.info("=======================================================")
    logger.info("  HymnWorship Backend Crawl Completed")
    logger.info("=======================================================")

    # Step 4: Synchronize directly to Firebase (Firestore & Cloud Storage)
    if all_hymns:
        logger.info("Uploading crawled media and metadata directly to Firebase...")
        success = sync_hymns_to_firebase(all_hymns)
        if success:
            logger.info("Firebase sync completed successfully!")
        else:
            logger.error("Firebase sync encountered errors.")

    logger.info("=======================================================")
    logger.info("  HymnWorship Backend Execution Completed")
    logger.info("=======================================================")


if __name__ == "__main__":
    main()
