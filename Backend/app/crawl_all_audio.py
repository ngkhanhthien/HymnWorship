"""
Multithreaded Audio Crawler & Firebase Syncer for Hymns & Worship

Extracts Accompaniment and Vocal MP3 tracks for all 423 hymns, downloads local MP3 files,
uploads audio files to Firebase Cloud Storage, sets public access, and updates datasets.
"""

import json
import os
import re
import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix console encoding for Windows UTF-8
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

from app.sync_data.sync_firebase.firebase_syncer import get_firebase_clients
from app.utils.logger import get_logger

logger = get_logger("crawl_all_audio")

HYMNS_JSON_PATH = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json")
BACKEND_ACC_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Backend/app/output/audio/accompaniment")
BACKEND_VOC_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Backend/app/output/audio/vocal")
FRONTEND_ACC_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/audio/accompaniment")
FRONTEND_VOC_DIR = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/audio/vocal")

DATASET_PATHS = [
    os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json"),
    os.path.join(BACKEND_DIR, "output", "hymns.json"),
    os.path.join(BACKEND_DIR, "output", "hymns_2026-08-31.json"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def create_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("user-agent=" + HEADERS["User-Agent"])
    return webdriver.Chrome(options=chrome_options)


def extract_audio_urls(driver: webdriver.Chrome, url: str) -> tuple[str | None, str | None]:
    acc_url = None
    vocal_url = None
    try:
        driver.get(url)
        # 1. window.renderData
        try:
            assets = driver.execute_script(
                "return (window.renderData && window.renderData.data && window.renderData.data.songData) "
                "? window.renderData.data.songData.assets : null;"
            )
            if assets and isinstance(assets, list):
                for a in assets:
                    atype = str(a.get("assetType") or "").upper()
                    durl = a.get("distributionUrl") or a.get("url")
                    if not durl:
                        continue
                    if "ACCOMPANIMENT" in atype and not acc_url:
                        acc_url = durl
                    elif "VOCAL" in atype and not vocal_url:
                        vocal_url = durl
        except Exception:
            pass

        # 2. Regex fallback
        if not acc_url or not vocal_url:
            mp3_links = set(re.findall(r'https?://[^\'"\s<>]+\.mp3[^\'"\s<>]*', driver.page_source))
            for link in mp3_links:
                l_lower = link.lower()
                if "accompaniment" in l_lower and not acc_url:
                    acc_url = link
                elif "vocal" in l_lower and not vocal_url:
                    vocal_url = link
    except Exception:
        pass

    return acc_url, vocal_url


def process_hymn_audio(driver: webdriver.Chrome, hymn: dict, bucket: any) -> dict:
    h_id = str(hymn.get("id"))
    h_url = hymn.get("url")
    title = hymn.get("title", "")

    res = {
        "id": h_id,
        "acc_downloaded": False,
        "vocal_downloaded": False,
        "acc_url": None,
        "vocal_url": None,
    }

    if not h_url:
        return res

    acc_remote, vocal_remote = extract_audio_urls(driver, h_url)

    # 1. Download & Sync Accompaniment MP3
    if acc_remote:
        try:
            r = requests.get(acc_remote, headers=HEADERS, timeout=25)
            if r.status_code == 200:
                b_path = os.path.join(BACKEND_ACC_DIR, f"{h_id}.mp3")
                f_path = os.path.join(FRONTEND_ACC_DIR, f"{h_id}.mp3")
                os.makedirs(os.path.dirname(b_path), exist_ok=True)
                os.makedirs(os.path.dirname(f_path), exist_ok=True)
                with open(b_path, "wb") as f:
                    f.write(r.content)
                with open(f_path, "wb") as f:
                    f.write(r.content)

                if bucket:
                    blob = bucket.blob(f"audio/accompaniment/{h_id}.mp3")
                    blob.upload_from_filename(b_path, content_type="audio/mpeg")
                    blob.make_public()
                    res["acc_url"] = blob.public_url

                res["acc_downloaded"] = True
        except Exception as e:
            logger.warning(f"[{h_id}] Accompaniment download failed: {e}")

    # 2. Download & Sync Vocal MP3
    if vocal_remote:
        try:
            r = requests.get(vocal_remote, headers=HEADERS, timeout=25)
            if r.status_code == 200:
                b_path = os.path.join(BACKEND_VOC_DIR, f"{h_id}.mp3")
                f_path = os.path.join(FRONTEND_VOC_DIR, f"{h_id}.mp3")
                os.makedirs(os.path.dirname(b_path), exist_ok=True)
                os.makedirs(os.path.dirname(f_path), exist_ok=True)
                with open(b_path, "wb") as f:
                    f.write(r.content)
                with open(f_path, "wb") as f:
                    f.write(r.content)

                if bucket:
                    blob = bucket.blob(f"audio/vocal/{h_id}.mp3")
                    blob.upload_from_filename(b_path, content_type="audio/mpeg")
                    blob.make_public()
                    res["vocal_url"] = blob.public_url

                res["vocal_downloaded"] = True
        except Exception as e:
            logger.warning(f"[{h_id}] Vocal download failed: {e}")

    return res


def worker_task(hymns_chunk: list[dict], bucket: any) -> list[dict]:
    driver = create_driver()
    results = []
    try:
        for h in hymns_chunk:
            res = process_hymn_audio(driver, h, bucket)
            results.append(res)
    finally:
        driver.quit()
    return results


def main():
    logger.info("=======================================================")
    logger.info("  Starting Full Audio (Accompaniment & Vocal) Crawler")
    logger.info("=======================================================")

    with open(HYMNS_JSON_PATH, "r", encoding="utf-8") as f:
        hymns = json.load(f)

    db, bucket = get_firebase_clients()

    # Filter hymns that need crawling (either missing accompaniment or missing vocal locally)
    to_crawl = []
    for h in hymns:
        h_id = str(h.get("id"))
        has_acc = os.path.exists(os.path.join(BACKEND_ACC_DIR, f"{h_id}.mp3"))
        has_voc = os.path.exists(os.path.join(BACKEND_VOC_DIR, f"{h_id}.mp3"))
        if not has_acc or not has_voc:
            to_crawl.append(h)

    logger.info(f"Total Hymns: {len(hymns)}")
    logger.info(f"Hymns needing audio crawl: {len(to_crawl)}")

    # Chunk hymns among 8 worker threads
    num_workers = 8
    chunks = [[] for _ in range(num_workers)]
    for i, h in enumerate(to_crawl):
        chunks[i % num_workers].append(h)

    all_results = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(worker_task, chunk, bucket) for chunk in chunks if chunk]
        for future in as_completed(futures):
            all_results.extend(future.result())

    acc_count = sum(1 for r in all_results if r["acc_downloaded"])
    voc_count = sum(1 for r in all_results if r["vocal_downloaded"])

    logger.info(f"Crawled and synced {acc_count} fresh Accompaniment MP3s and {voc_count} fresh Vocal MP3s!")

    # Update dataset json files with public audio URLs
    res_map = {r["id"]: r for r in all_results}
    for h in hymns:
        h_id = str(h.get("id"))
        r = res_map.get(h_id)
        
        # Accompaniment URL
        acc_path = os.path.join(BACKEND_ACC_DIR, f"{h_id}.mp3")
        if os.path.exists(acc_path):
            h["audio_accompaniment"] = f"app/output/audio/accompaniment/{h_id}.mp3"
            h["audio_accompaniment_url"] = f"https://storage.googleapis.com/qthymns1.firebasestorage.app/audio/accompaniment/{h_id}.mp3"
            
        # Vocal URL
        voc_path = os.path.join(BACKEND_VOC_DIR, f"{h_id}.mp3")
        if os.path.exists(voc_path):
            h["audio_vocal"] = f"app/output/audio/vocal/{h_id}.mp3"
            h["audio_vocal_url"] = f"https://storage.googleapis.com/qthymns1.firebasestorage.app/audio/vocal/{h_id}.mp3"

    for target_path in DATASET_PATHS:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(hymns, f, ensure_ascii=False, indent=2)
        logger.info(f"Updated audio URLs in: {target_path}")

    # Upload data/hymns.json to Firebase Storage
    if bucket:
        json_blob = bucket.blob("data/hymns.json")
        json_blob.upload_from_filename(HYMNS_JSON_PATH, content_type="application/json")
        json_blob.make_public()
        logger.info(f"Uploaded updated dataset to Storage: {json_blob.public_url}")

    logger.info("=======================================================")
    logger.info("  Full Audio Crawl & Sync Completed Successfully")
    logger.info("=======================================================")


if __name__ == "__main__":
    main()
