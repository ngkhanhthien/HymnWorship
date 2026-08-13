"""
Firebase Syncer Module
Uploads crawled media files to Cloud Storage and hymn metadata to Cloud Firestore.
"""

import os
import sys
import json
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

# Fix Unicode output on Windows console (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_DIR)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from firebase_admin import firestore, storage
from app.config.settings import (
    FIREBASE_PROJECT_ID,
    STORAGE_BUCKET_NAME,
    FIRESTORE_COLLECTION,
    OUTPUT_DIR,
    HYMN_DETAIL_CRAWL_LIMIT,
)
from app.sync_data.sync_firebase.sync_firebase import (
    find_service_account_key,
    init_firebase_app,
)
from app.utils.logger import get_logger

logger = get_logger("firebase_syncer")


def get_firebase_clients() -> Tuple[Optional[Any], Optional[Any]]:
    """Initialize Firebase App and return (firestore_client, storage_bucket)."""
    key_path, _ = find_service_account_key(FIREBASE_PROJECT_ID)
    if not key_path:
        logger.error("Cannot initialize Firebase: Service account key not found.")
        return None, None

    init_firebase_app(key_path, STORAGE_BUCKET_NAME)
    db = firestore.client()
    bucket = storage.bucket(STORAGE_BUCKET_NAME)
    return db, bucket


def upload_media_file(
    bucket: Any,
    local_path: Optional[str],
    storage_path: str,
    content_type: str,
    force_upload: bool = False,
) -> Optional[str]:
    """
    Upload a local binary file to Firebase Cloud Storage.
    If the file already exists on Storage and force_upload is False, skip upload and reuse URL.
    """
    if not local_path or not os.path.exists(local_path):
        return None

    try:
        blob = bucket.blob(storage_path)
        encoded_path = urllib.parse.quote(storage_path, safe="")
        public_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{encoded_path}?alt=media"

        if not force_upload and blob.exists():
            return public_url

        blob.upload_from_filename(local_path, content_type=content_type)
        return public_url
    except Exception as e:
        logger.warning(f"Failed to upload '{local_path}' to Storage '{storage_path}': {e}")
        return None


def build_hymn_document(hymn: Dict[str, Any], bucket: Any) -> Dict[str, Any]:
    """Upload hymn media to Storage and prepare Firestore document payload."""
    hymn_id = str(hymn.get("id", ""))
    collection_code = hymn.get("collection", "hymns")
    collection_name = hymn.get("collection_name", "Hymns")

    # 1. Upload sheet music images (flat folder: sheet_music/{filename})
    sheet_music_paths = hymn.get("sheet_music", []) or []
    sheet_music_urls = []
    for local_sheet in sheet_music_paths:
        sheet_filename = os.path.basename(local_sheet)
        storage_dest = f"sheet_music/{sheet_filename}"
        url = upload_media_file(bucket, local_sheet, storage_dest, "image/png")
        if url:
            sheet_music_urls.append(url)

    # 2. Upload accompaniment audio (flat folder: audio/accompaniment/{filename})
    acc_path = hymn.get("audio_accompaniment")
    acc_url = None
    if acc_path:
        acc_filename = os.path.basename(acc_path)
        acc_storage_dest = f"audio/accompaniment/{acc_filename}"
        acc_url = upload_media_file(bucket, acc_path, acc_storage_dest, "audio/mpeg")

    # 3. Upload vocal audio (flat folder: audio/vocal/{filename})
    vocal_path = hymn.get("audio_vocal")
    vocal_url = None
    if vocal_path:
        vocal_filename = os.path.basename(vocal_path)
        vocal_storage_dest = f"audio/vocal/{vocal_filename}"
        vocal_url = upload_media_file(bucket, vocal_path, vocal_storage_dest, "audio/mpeg")

    try:
        numeric_id = int(hymn_id)
    except (ValueError, TypeError):
        numeric_id = hymn_id

    return {
        "id": hymn_id,
        "hymn_number": numeric_id,
        "collection": collection_code,
        "collection_name": collection_name,
        "title": hymn.get("title", ""),
        "search_title": hymn.get("title", "").lower(),
        "url": hymn.get("url", ""),
        "scriptures": hymn.get("scriptures", []),
        "sheet_music_paths": sheet_music_paths,
        "sheet_music_urls": sheet_music_urls,
        "audio_accompaniment_path": acc_path,
        "audio_accompaniment_url": acc_url,
        "audio_vocal_path": vocal_path,
        "audio_vocal_url": vocal_url,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }


def sync_hymns_to_firebase(hymns: List[Dict[str, Any]]) -> bool:
    """
    Sync crawled hymns, sheet music, accompaniment and vocal audio to Firebase.
    Respects HYMN_DETAIL_CRAWL_LIMIT to upload only detailed hymns per collection.
    """
    if not hymns:
        logger.warning("No hymns provided for Firebase synchronization.")
        return False

    db, bucket = get_firebase_clients()
    if not db or not bucket:
        logger.error("Firebase clients unavailable — skipping upload.")
        return False

    # Filter hymns per collection according to HYMN_DETAIL_CRAWL_LIMIT
    target_hymns = []
    if isinstance(HYMN_DETAIL_CRAWL_LIMIT, int) and HYMN_DETAIL_CRAWL_LIMIT > 0:
        counts: Dict[str, int] = {}
        for h in hymns:
            col = h.get("collection", "hymns")
            counts[col] = counts.get(col, 0) + 1
            if counts[col] <= HYMN_DETAIL_CRAWL_LIMIT:
                target_hymns.append(h)
    else:
        target_hymns = hymns

    logger.info("=======================================================")
    logger.info(
        f"  Starting Firebase Sync: {len(target_hymns)} Hymns "
        f"(Limit: {HYMN_DETAIL_CRAWL_LIMIT}/collection) -> [{FIREBASE_PROJECT_ID}]"
    )
    logger.info("=======================================================")

    batch = db.batch()
    batch_count = 0
    total_synced = 0
    synced_hymns_json = []

    for i, hymn in enumerate(target_hymns, 1):
        hymn_id = str(hymn.get("id", ""))
        collection_code = hymn.get("collection", "hymns")
        doc_id = f"{collection_code}_{hymn_id}"

        doc_payload = build_hymn_document(hymn, bucket)
        doc_ref = db.collection(FIRESTORE_COLLECTION).document(doc_id)
        batch.set(doc_ref, doc_payload, merge=True)
        batch_count += 1
        total_synced += 1

        # Prepare JSON-serializable item
        json_item = dict(doc_payload)
        json_item["updated_at"] = datetime.now().isoformat()
        synced_hymns_json.append(json_item)

        acc_status = "[OK]" if doc_payload['audio_accompaniment_url'] else "[-]"
        voc_status = "[OK]" if doc_payload['audio_vocal_url'] else "[-]"
        logger.info(
            f"  [{i}/{len(target_hymns)}] Uploaded #{hymn_id} '{hymn.get('title')}' "
            f"(Sheets: {len(doc_payload['sheet_music_urls'])}, "
            f"Acc: {acc_status}, Vocal: {voc_status})"
        )

        # Commit batch every 400 operations (Firestore limit is 500)
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    # Save updated JSON file locally with Firebase Storage URLs
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    local_json_path = os.path.join(OUTPUT_DIR, "hymns.json")
    with open(local_json_path, "w", encoding="utf-8") as f:
        json.dump(synced_hymns_json, f, ensure_ascii=False, indent=2)
    logger.info(f"Updated local JSON with Firebase URLs -> {local_json_path}")

    # Upload JSON file to Cloud Storage (data/hymns.json)
    json_storage_path = "data/hymns.json"
    json_storage_url = upload_media_file(
        bucket, local_json_path, json_storage_path, "application/json", force_upload=True
    )
    if json_storage_url:
        logger.info(f"Uploaded hymns.json to Cloud Storage: {json_storage_url}")

    logger.info("=======================================================")
    logger.info(f"  Firebase Sync Completed: {total_synced} Hymns Synced Successfully!")
    logger.info("=======================================================")
    return True
