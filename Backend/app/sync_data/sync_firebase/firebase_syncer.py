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
    SHEET_MUSIC_DIR,
    AUDIO_ACCOMPANIMENT_DIR,
    AUDIO_VOCAL_DIR,
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


def make_storage_url(bucket_name: str, storage_path: str) -> str:
    """Generate public Firebase Storage HTTPS download URL."""
    encoded_path = urllib.parse.quote(storage_path, safe="")
    return f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_path}?alt=media"


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
        public_url = make_storage_url(bucket.name, storage_path)

        if not force_upload and blob.exists():
            try:
                blob.make_public()
            except Exception:
                pass
            return blob.public_url or public_url

        blob.upload_from_filename(local_path, content_type=content_type)
        try:
            blob.make_public()
        except Exception:
            pass
        return blob.public_url or public_url
    except Exception as e:
        logger.warning(f"Failed to upload '{local_path}' to Storage '{storage_path}': {e}")
        return None


def build_hymn_document(
    hymn: Dict[str, Any],
    bucket: Any,
    existing_storage_paths: set,
) -> Dict[str, Any]:
    """
    Upload new local media to Storage and auto-discover any media already on Storage.
    Prepares Firestore document payload with accurate media links.
    """
    hymn_id = str(hymn.get("id", ""))
    collection_code = hymn.get("collection", "hymns")
    collection_name = hymn.get("collection_name", "Hymns")

    # 1. Sheet music images
    sheet_music_paths = list(hymn.get("sheet_music") or [])
    sheet_music_urls: List[str] = []

    # Check local SHEET_MUSIC_DIR if not provided in hymn dict
    if not sheet_music_paths and os.path.exists(SHEET_MUSIC_DIR):
        single_local = os.path.join(SHEET_MUSIC_DIR, f"{hymn_id}.png")
        if os.path.exists(single_local):
            sheet_music_paths.append(single_local.replace("\\", "/"))
        for p in range(1, 10):
            multi_local = os.path.join(SHEET_MUSIC_DIR, f"{hymn_id}_{p}.png")
            if os.path.exists(multi_local):
                sheet_music_paths.append(multi_local.replace("\\", "/"))

    # Upload local sheet music files if present
    for local_sheet in sheet_music_paths:
        if os.path.exists(local_sheet):
            sheet_filename = os.path.basename(local_sheet)
            storage_dest = f"sheet_music/{sheet_filename}"
            url = upload_media_file(bucket, local_sheet, storage_dest, "image/png")
            if url and url not in sheet_music_urls:
                sheet_music_urls.append(url)
                existing_storage_paths.add(storage_dest)

    # Auto-discover from Storage (for files uploaded directly to Firebase)
    single_sheet_dest = f"sheet_music/{hymn_id}.png"
    if single_sheet_dest in existing_storage_paths:
        url = make_storage_url(bucket.name, single_sheet_dest)
        if url not in sheet_music_urls:
            sheet_music_urls.append(url)

    for p in range(1, 10):
        multi_sheet_dest = f"sheet_music/{hymn_id}_{p}.png"
        if multi_sheet_dest in existing_storage_paths:
            url = make_storage_url(bucket.name, multi_sheet_dest)
            if url not in sheet_music_urls:
                sheet_music_urls.append(url)

    # 2. Accompaniment audio
    acc_path = hymn.get("audio_accompaniment")
    if not acc_path and os.path.exists(AUDIO_ACCOMPANIMENT_DIR):
        local_acc = os.path.join(AUDIO_ACCOMPANIMENT_DIR, f"{hymn_id}.mp3")
        if os.path.exists(local_acc):
            acc_path = local_acc.replace("\\", "/")

    acc_url: Optional[str] = None
    if acc_path and os.path.exists(acc_path):
        acc_filename = os.path.basename(acc_path)
        acc_storage_dest = f"audio/accompaniment/{acc_filename}"
        acc_url = upload_media_file(bucket, acc_path, acc_storage_dest, "audio/mpeg")
        if acc_url:
            existing_storage_paths.add(acc_storage_dest)
    else:
        acc_dest = f"audio/accompaniment/{hymn_id}.mp3"
        if acc_dest in existing_storage_paths:
            acc_url = make_storage_url(bucket.name, acc_dest)

    # 3. Vocal audio
    vocal_path = hymn.get("audio_vocal")
    if not vocal_path and os.path.exists(AUDIO_VOCAL_DIR):
        local_vocal = os.path.join(AUDIO_VOCAL_DIR, f"{hymn_id}.mp3")
        if os.path.exists(local_vocal):
            vocal_path = local_vocal.replace("\\", "/")

    vocal_url: Optional[str] = None
    if vocal_path and os.path.exists(vocal_path):
        vocal_filename = os.path.basename(vocal_path)
        vocal_storage_dest = f"audio/vocal/{vocal_filename}"
        vocal_url = upload_media_file(bucket, vocal_path, vocal_storage_dest, "audio/mpeg")
        if vocal_url:
            existing_storage_paths.add(vocal_storage_dest)
    else:
        vocal_dest = f"audio/vocal/{hymn_id}.mp3"
        if vocal_dest in existing_storage_paths:
            vocal_url = make_storage_url(bucket.name, vocal_dest)

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
    Sync all hymns to Firebase:
    - Auto-discovers any media previously or manually uploaded to Firebase Storage.
    - Syncs full hymn catalogue to Cloud Firestore.
    - Updates local and Cloud Storage data/hymns.json with accurate media links.
    """
    if not hymns:
        logger.warning("No hymns provided for Firebase synchronization.")
        return False

    db, bucket = get_firebase_clients()
    if not db or not bucket:
        logger.error("Firebase clients unavailable — skipping upload.")
        return False

    # Scan Storage bucket once to auto-discover all existing media
    logger.info("Scanning existing media files on Firebase Cloud Storage...")
    try:
        existing_storage_paths = {b.name for b in bucket.list_blobs()}
        logger.info(f"Found {len(existing_storage_paths)} existing media items in Storage.")
    except Exception as e:
        logger.warning(f"Could not list bucket blobs: {e}")
        existing_storage_paths = set()

    logger.info("=======================================================")
    logger.info(f"  Starting Firebase Sync: {len(hymns)} Hymns -> [{FIREBASE_PROJECT_ID}]")
    logger.info("=======================================================")

    batch = db.batch()
    batch_count = 0
    total_synced = 0
    synced_hymns_json = []

    for i, hymn in enumerate(hymns, 1):
        hymn_id = str(hymn.get("id", ""))
        collection_code = hymn.get("collection", "hymns")
        doc_id = f"{collection_code}_{hymn_id}"

        doc_payload = build_hymn_document(hymn, bucket, existing_storage_paths)
        doc_ref = db.collection(FIRESTORE_COLLECTION).document(doc_id)
        batch.set(doc_ref, doc_payload, merge=True)
        batch_count += 1
        total_synced += 1

        json_item = dict(doc_payload)
        json_item["updated_at"] = datetime.now().isoformat()
        synced_hymns_json.append(json_item)

        has_media = bool(doc_payload['sheet_music_urls'] or doc_payload['audio_accompaniment_url'] or doc_payload['audio_vocal_url'])
        if has_media:
            acc_status = "[OK]" if doc_payload['audio_accompaniment_url'] else "[-]"
            voc_status = "[OK]" if doc_payload['audio_vocal_url'] else "[-]"
            logger.info(
                f"  [{i}/{len(hymns)}] #{hymn_id:>4} '{hymn.get('title')}' "
                f"(Sheets: {len(doc_payload['sheet_music_urls'])}, Acc: {acc_status}, Vocal: {voc_status})"
            )

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
    logger.info(f"Updated local JSON ({len(synced_hymns_json)} hymns) with Firebase URLs -> {local_json_path}")

    # Upload JSON file to Cloud Storage (data/hymns.json)
    json_storage_path = "data/hymns.json"
    json_storage_url = upload_media_file(
        bucket, local_json_path, json_storage_path, "application/json", force_upload=True
    )
    if json_storage_url:
        logger.info(f"Uploaded updated hymns.json to Cloud Storage: {json_storage_url}")

    logger.info("=======================================================")
    logger.info(f"  Firebase Sync Completed: {total_synced} Hymns Synced Successfully!")
    logger.info("=======================================================")
    return True
