"""
Firebase Client Singleton Manager.
Provides initialized instances of Firestore DB Client and Cloud Storage Bucket.
Following DRY principles and using centralized settings.
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore, storage

# Ensure sys.path contains Backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.config.settings import FIREBASE_KEY_DIR, STORAGE_BUCKET_NAME
from app.utils.logger import get_logger

logger = get_logger("firebase_client")

_firebase_app = None
_firestore_db = None
_storage_bucket = None


def get_key_path() -> str:
    """Find and return absolute path to service account key JSON."""
    if not os.path.exists(FIREBASE_KEY_DIR):
        raise FileNotFoundError(f"Key directory does not exist: {FIREBASE_KEY_DIR}")

    json_files = [f for f in os.listdir(FIREBASE_KEY_DIR) if f.endswith(".json")]
    if not json_files:
        raise FileNotFoundError(f"No JSON key files found in: {FIREBASE_KEY_DIR}")

    return os.path.join(FIREBASE_KEY_DIR, json_files[0])


def initialize_firebase() -> firebase_admin.App:
    """Initialize Firebase Admin SDK singleton with credentials & bucket."""
    global _firebase_app
    if _firebase_app:
        return _firebase_app

    key_path = get_key_path()
    logger.info(f"Initializing Firebase with key: {os.path.basename(key_path)}")

    cred = credentials.Certificate(key_path)
    _firebase_app = firebase_admin.initialize_app(
        cred,
        {"storageBucket": STORAGE_BUCKET_NAME}
    )
    logger.info("Firebase Admin SDK initialized successfully.")
    return _firebase_app


def get_firestore_client() -> firestore.firestore.Client:
    """Get Firestore Database client instance."""
    global _firestore_db
    if not _firestore_db:
        initialize_firebase()
        _firestore_db = firestore.client()
    return _firestore_db


def get_storage_bucket() -> storage.storage.Bucket:
    """Get Firebase Cloud Storage bucket instance."""
    global _storage_bucket
    if not _storage_bucket:
        initialize_firebase()
        _storage_bucket = storage.bucket()
    return _storage_bucket


if __name__ == "__main__":
    logger.info("=== Testing Firebase Client Singleton Connection ===")
    try:
        db = get_firestore_client()
        bucket = get_storage_bucket()
        logger.info(f"Firestore Client Connected: {db.project}")
        logger.info(f"Storage Bucket Connected: {bucket.name}")
        logger.info("=== Step 1 Completed Successfully [OK] ===")
    except Exception as err:
        logger.error(f"Firebase Client Initialization Error: {err}")
        sys.exit(1)
