"""
Make All Firebase Storage Media Public & Update Hymns Dataset

Fixes 403 Forbidden access errors on Firebase Cloud Storage by calling blob.make_public()
on all 423 sheet music images, audio files, and data/hymns.json dataset.
"""

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix Unicode output on Windows console (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sync_data.sync_firebase.firebase_syncer import get_firebase_clients, upload_media_file
from app.utils.logger import get_logger

logger = get_logger("make_all_media_public")

JSON_PATHS = [
    os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "hymns.json"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "hymns_2026-08-31.json"),
]


def make_blob_public(bucket: Any, blob_name: str) -> tuple[str, bool, str]:
    """Call blob.make_public() for a given storage blob name."""
    try:
        blob = bucket.blob(blob_name)
        if blob.exists():
            blob.make_public()
            return blob_name, True, blob.public_url
        return blob_name, False, ""
    except Exception as e:
        return blob_name, False, str(e)


def process_all_media() -> None:
    logger.info("=======================================================")
    logger.info("  Making All Firebase Storage Media Public")
    logger.info("=======================================================")

    db, bucket = get_firebase_clients()
    if not db or not bucket:
        logger.error("Could not initialize Firebase clients!")
        return

    # List all blobs in bucket
    logger.info("Listing blobs in Firebase Storage bucket...")
    all_blobs = list(bucket.list_blobs())
    logger.info(f"Total blobs found on Storage: {len(all_blobs)}")

    sheet_blobs = [b.name for b in all_blobs if b.name.startswith("sheet_music/")]
    logger.info(f"Sheet music blobs to process: {len(sheet_blobs)}")

    success_count = 0
    # Make all sheet music blobs public concurrently
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(make_blob_public, bucket, b_name): b_name for b_name in sheet_blobs}
        for future in as_completed(futures):
            b_name, ok, url_or_err = future.result()
            if ok:
                success_count += 1
            else:
                logger.warning(f"Failed to make {b_name} public: {url_or_err}")

    logger.info(f"Successfully made {success_count}/{len(sheet_blobs)} sheet music blobs public!")

    # Update local hymns.json datasets with verified public URLs
    source_path = None
    for p in JSON_PATHS:
        if os.path.exists(p):
            source_path = p
            break

    if source_path:
        logger.info(f"Updating dataset at: {source_path}")
        with open(source_path, "r", encoding="utf-8") as f:
            hymns = json.load(f)

        for h in hymns:
            h_id = str(h.get("id", ""))
            public_sheet_url = f"https://storage.googleapis.com/qthymns1.firebasestorage.app/sheet_music/{h_id}.png"
            h["sheet_music_urls"] = [public_sheet_url]

        for target_path in JSON_PATHS:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(hymns, f, ensure_ascii=False, indent=2)
            logger.info(f"Updated public URLs in dataset file: {target_path}")

        # Re-upload data/hymns.json to Storage and make it public
        json_blob = bucket.blob("data/hymns.json")
        json_blob.upload_from_filename(source_path, content_type="application/json")
        json_blob.make_public()
        logger.info(f"Uploaded and made public: {json_blob.public_url}")

    logger.info("=======================================================")
    logger.info("  Firebase Storage Media Public Update Completed")
    logger.info("=======================================================")


if __name__ == "__main__":
    process_all_media()
