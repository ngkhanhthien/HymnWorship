"""
Recrawl Blank/Undersized Sheet Music Images & Sync to Firebase Storage

Identifies hymns with blank/undersized canvas PNG files (<110KB), recrawls them
with a 4-second render delay for Verovio sheet music notation, saves fresh PNG files,
and uploads them to Firebase Storage with public access enabled.
"""

import base64
import json
import os
import sys
import time

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from app.sync_data.sync_firebase.firebase_syncer import get_firebase_clients
from app.utils.logger import get_logger

logger = get_logger("recrawl_blank_sheet_music")

HYMNS_JSON_PATH = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json")
BACKEND_SHEET_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Backend/app/output/sheet_music")
FRONTEND_SHEET_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/sheet_music")


def audit_and_recrawl_blank_images() -> None:
    logger.info("=======================================================")
    logger.info("  Starting Audit & Recrawl of Blank Sheet Music Images")
    logger.info("=======================================================")

    with open(HYMNS_JSON_PATH, "r", encoding="utf-8") as f:
        hymns = json.load(f)

    hymns_map = {str(h.get("id")): h for h in hymns}

    # Audit for PNG files under 110 KB
    affected_ids = []
    for h_id, h in hymns_map.items():
        png_path = os.path.join(BACKEND_SHEET_DIR, f"{h_id}.png")
        if not os.path.exists(png_path) or os.path.getsize(png_path) < 110000:
            affected_ids.append(h_id)

    # Sort numerically
    affected_ids.sort(key=lambda x: int(x) if x.isdigit() else 9999)
    logger.info(f"Found {len(affected_ids)} hymns with blank/undersized sheet music images:")
    logger.info(f"IDs to recrawl: {affected_ids}")

    if not affected_ids:
        logger.info("All sheet music images are already rich and valid! Exiting.")
        return

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    db, bucket = get_firebase_clients()

    success_count = 0
    try:
        for idx, h_id in enumerate(affected_ids, 1):
            hymn = hymns_map.get(h_id)
            if not hymn or not hymn.get("url"):
                logger.warning(f"[{idx}/{len(affected_ids)}] Hymn #{h_id} has no valid URL, skipping.")
                continue

            url = hymn["url"]
            logger.info(f"[{idx}/{len(affected_ids)}] Recrawling Hymn #{h_id} '{hymn.get('title')}'...")

            try:
                driver.get(url)
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "canvas"))
                )
                time.sleep(4)  # Wait for Verovio canvas renderer to finish drawing notation

                canvases = driver.find_elements(By.CSS_SELECTOR, "canvas")
                if not canvases:
                    logger.warning(f"[{h_id}] No canvas element found after wait!")
                    continue

                canvas = canvases[0]
                data_url = driver.execute_script("return arguments[0].toDataURL('image/png');", canvas)

                if data_url and "," in data_url:
                    b64_str = data_url.split(",", 1)[1]
                    img_bytes = base64.b64decode(b64_str)

                    # Save to Backend
                    backend_path = os.path.join(BACKEND_SHEET_DIR, f"{h_id}.png")
                    with open(backend_path, "wb") as f:
                        f.write(img_bytes)

                    # Save to Frontend assets
                    frontend_path = os.path.join(FRONTEND_SHEET_DIR, f"{h_id}.png")
                    with open(frontend_path, "wb") as f:
                        f.write(img_bytes)

                    logger.info(f"[{h_id}] Saved fresh image ({len(img_bytes)/1024:.1f} KB)")

                    # Upload to Firebase Cloud Storage & make public
                    if bucket:
                        blob = bucket.blob(f"sheet_music/{h_id}.png")
                        blob.upload_from_filename(backend_path, content_type="image/png")
                        blob.make_public()

                    success_count += 1
            except Exception as e:
                logger.error(f"[{h_id}] Error recrawling sheet music: {e}")

    finally:
        driver.quit()

    logger.info("=======================================================")
    logger.info(f"  Successfully recrawled and uploaded {success_count}/{len(affected_ids)} sheet music images!")
    logger.info("=======================================================")


if __name__ == "__main__":
    audit_and_recrawl_blank_images()
