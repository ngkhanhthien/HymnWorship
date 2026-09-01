"""
Upload Hymns Dataset to Firebase Command Script

Uploads the enriched hymns.json dataset directly to:
1. Firebase Cloud Storage at 'data/hymns.json'
2. Cloud Firestore collection 'hymns'
"""

import json
import os
import sys

# Fix Unicode output on Windows console (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sync_data.sync_firebase.firebase_syncer import sync_hymns_to_firebase
from app.utils.logger import get_logger

logger = get_logger("upload_to_firebase_cmd")

JSON_PATHS = [
    os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "hymns.json"),
]


def run_upload() -> None:
    logger.info("=======================================================")
    logger.info("  Uploading Updated hymns.json to Firebase")
    logger.info("=======================================================")

    source_path = None
    for p in JSON_PATHS:
        if os.path.exists(p):
            source_path = p
            break

    if not source_path:
        logger.error("No valid hymns.json file found to upload!")
        return

    logger.info(f"Loading dataset from: {source_path}")
    with open(source_path, "r", encoding="utf-8") as f:
        hymns = json.load(f)

    logger.info(f"Loaded {len(hymns)} hymns. Starting Firebase upload...")
    success = sync_hymns_to_firebase(hymns)

    logger.info("=======================================================")
    if success:
        logger.info("  Firebase Upload Completed Successfully!")
        logger.info("  - Replaced 'data/hymns.json' in Firebase Cloud Storage")
        logger.info("  - Updated 'hymns' collection documents in Cloud Firestore")
    else:
        logger.error("  Firebase Upload Encountered Errors.")
    logger.info("=======================================================")


if __name__ == "__main__":
    run_upload()
