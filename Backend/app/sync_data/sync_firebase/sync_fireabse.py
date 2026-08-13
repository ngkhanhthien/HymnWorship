"""
Alias entry point for sync_firebase.py (supporting user spelling 'sync_fireabse.py').
"""

import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_DIR)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.sync_data.sync_firebase.sync_firebase import test_firebase_connection

if __name__ == "__main__":
    test_firebase_connection()
