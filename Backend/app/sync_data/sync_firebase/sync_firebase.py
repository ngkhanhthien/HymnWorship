"""
Firebase Connection Test & Sync Utility
Target Project: qthymns1 (https://console.firebase.google.com/u/0/project/qthymns1)

Tests connection to Firebase Admin SDK, Cloud Firestore, and Cloud Storage.
"""

import os
import sys
import json
import glob
from typing import Optional, Dict, Any, Tuple

# Fix Unicode output on Windows console (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_DIR)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import firebase_admin
from firebase_admin import credentials, firestore, storage

from app.config.settings import (
    FIREBASE_KEY_DIR,
    STORAGE_BUCKET_NAME,
    FIRESTORE_COLLECTION,
)
from app.utils.logger import get_logger

logger = get_logger("sync_firebase")

TARGET_PROJECT_ID = "qthymns1"


def find_service_account_key(target_project: str = TARGET_PROJECT_ID) -> Tuple[Optional[str], Optional[dict]]:
    """
    Find the service account JSON file in FIREBASE_KEY_DIR.
    Prioritizes key matching target_project, otherwise returns the first valid key found.
    """
    if not os.path.exists(FIREBASE_KEY_DIR):
        logger.error(f"Key directory does not exist: {FIREBASE_KEY_DIR}")
        return None, None

    key_files = glob.glob(os.path.join(FIREBASE_KEY_DIR, "*.json"))
    if not key_files:
        logger.error(f"No JSON key files found in: {FIREBASE_KEY_DIR}")
        return None, None

    selected_path = None
    selected_data = None

    for kf in key_files:
        try:
            with open(kf, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("type") == "service_account":
                    pid = data.get("project_id")
                    if pid == target_project:
                        return kf, data
                    if selected_path is None:
                        selected_path = kf
                        selected_data = data
        except Exception as e:
            logger.warning(f"Failed to read key file {kf}: {e}")

    return selected_path, selected_data


def init_firebase_app(
    key_path: str,
    bucket_name: Optional[str] = None
) -> firebase_admin.App:
    """Initialize or retrieve existing Firebase Admin App instance."""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = credentials.Certificate(key_path)
    options = {}
    if bucket_name:
        options["storageBucket"] = bucket_name

    return firebase_admin.initialize_app(cred, options)


def test_firestore(db) -> Dict[str, Any]:
    """Test connection and read access to Cloud Firestore."""
    result = {"success": False, "message": "", "collections": []}
    try:
        # Ping test: list collections or read document
        cols = [c.id for c in db.collections()]
        result["success"] = True
        result["collections"] = cols
        result["message"] = (
            f"Successfully connected to Firestore! "
            f"Found collections: {cols if cols else '[(empty database)]'}"
        )
    except Exception as e:
        result["message"] = f"Firestore connection error: {str(e)}"
    return result


def test_storage(bucket_name: str) -> Dict[str, Any]:
    """Test connection and access to Cloud Storage bucket."""
    result = {"success": False, "message": "", "bucket": bucket_name}
    try:
        bucket = storage.bucket(bucket_name)
        exists = bucket.exists()
        if exists:
            result["success"] = True
            result["message"] = f"Successfully connected to Storage bucket: '{bucket_name}'!"
        else:
            result["message"] = f"Bucket '{bucket_name}' does not exist or access is restricted."
    except Exception as e:
        result["message"] = f"Storage connection error: {str(e)}"
    return result


def test_firebase_connection(target_project: str = TARGET_PROJECT_ID) -> bool:
    """
    Main diagnostic routine: verifies credentials, connects to Firebase,
    and tests both Firestore and Cloud Storage.
    """
    logger.info("=======================================================")
    logger.info(f"  Firebase Connection Test: Project [{target_project}]")
    logger.info("=======================================================")

    key_path, key_data = find_service_account_key(target_project)
    if not key_path or not key_data:
        logger.error(f"[FAIL] Could not locate any Firebase service account key in: {FIREBASE_KEY_DIR}")
        logger.info(f"[HINT] Download key from Firebase Console -> Project Settings -> Service Accounts")
        logger.info(f"       Place the JSON file into: {FIREBASE_KEY_DIR}")
        logger.info("=======================================================")
        return False

    key_project_id = key_data.get("project_id", "unknown")
    client_email = key_data.get("client_email", "unknown")
    logger.info(f"Key File       : {os.path.basename(key_path)}")
    logger.info(f"Key Project ID : {key_project_id}")
    logger.info(f"Service Account: {client_email}")

    if key_project_id != target_project:
        logger.warning(
            f"[WARNING] Key project_id ('{key_project_id}') does not match target ('{target_project}')! "
            f"Testing connection with current key for '{key_project_id}'..."
        )

    # Determine storage bucket candidates
    bucket_candidates = []
    if STORAGE_BUCKET_NAME:
        bucket_candidates.append(STORAGE_BUCKET_NAME)
    bucket_candidates.extend([
        f"{key_project_id}.firebasestorage.app",
        f"{key_project_id}.appspot.com",
    ])
    # Remove duplicates preserving order
    bucket_candidates = list(dict.fromkeys(bucket_candidates))

    try:
        init_firebase_app(key_path, bucket_candidates[0])
        logger.info(f"Firebase Admin SDK initialized successfully.")
    except Exception as e:
        logger.error(f"[FAIL] Firebase Admin init failed: {e}")
        return False

    # 1. Test Firestore
    db = firestore.client()
    fs_res = test_firestore(db)
    if fs_res["success"]:
        logger.info(f"[OK] {fs_res['message']}")
    else:
        logger.error(f"[FAIL] {fs_res['message']}")

    # 2. Test Storage
    st_res = {"success": False, "message": "No bucket tested"}
    for candidate in bucket_candidates:
        st_res = test_storage(candidate)
        if st_res["success"]:
            logger.info(f"[OK] {st_res['message']}")
            break
    if not st_res["success"]:
        logger.warning(f"[WARN] {st_res['message']}")

    overall_success = fs_res["success"]
    logger.info("=======================================================")
    if overall_success:
        logger.info(f"  Firebase Connection Test: PASSED for project '{key_project_id}'")
        if key_project_id != target_project:
            logger.info(f"  [NOTE] Target project is '{target_project}', but current key belongs to '{key_project_id}'.")
            logger.info(f"  To connect to '{target_project}':")
            logger.info(f"  1. Go to: https://console.firebase.google.com/u/0/project/{target_project}/settings/serviceaccounts/adminsdk")
            logger.info(f"  2. Click 'Generate new private key'")
            logger.info(f"  3. Save the JSON file into: Backend/app/config/key/")
    else:
        logger.error(f"  Firebase Connection Test: FAILED")
    logger.info("=======================================================")
    return overall_success


if __name__ == "__main__":
    test_firebase_connection()
