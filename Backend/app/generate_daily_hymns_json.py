"""
Generate Daily Hymns JSON Script

Loads the enriched hymns data with English scripture texts, validates all records,
and exports the dataset to Backend/app/output/ with today's timestamp and name.
"""

import json
import os
import sys
from datetime import datetime

# Fix Unicode output on Windows (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend/ is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.crawler.save_json import save_json
from app.utils.logger import get_logger

logger = get_logger("generate_daily_hymns")

SOURCE_PATH = os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")


def generate_today_hymns_json() -> None:
    logger.info("=======================================================")
    logger.info("  Generating Daily Updated hymns.json Dataset")
    logger.info("=======================================================")

    if not os.path.exists(SOURCE_PATH):
        logger.error(f"Source file not found: {SOURCE_PATH}")
        return

    logger.info(f"Loading enriched data from: {SOURCE_PATH}")
    with open(SOURCE_PATH, "r", encoding="utf-8") as f:
        hymns = json.load(f)

    # 1. Validation & Statistics
    total_hymns = len(hymns)
    total_scriptures = 0
    filled_scriptures = 0

    for h in hymns:
        scriptures = h.get("scriptures", [])
        for s in scriptures:
            if isinstance(s, dict):
                total_scriptures += 1
                if s.get("text"):
                    filled_scriptures += 1

    logger.info(f"Total Hymns: {total_hymns}")
    logger.info(f"Total Scriptures: {total_scriptures}")
    logger.info(f"Scriptures with Text: {filled_scriptures}/{total_scriptures} ({filled_scriptures/total_scriptures*100:.1f}%)")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    today_str = datetime.now().strftime("%Y-%m-%d")
    date_filename = f"hymns_{today_str}.json"
    date_filepath = os.path.join(OUTPUT_DIR, date_filename)

    # Save to Backend/app/output/hymns_YYYY-MM-DD.json
    with open(date_filepath, "w", encoding="utf-8") as f:
        json.dump(hymns, f, ensure_ascii=False, indent=2)
    logger.info(f"[Output Today] Saved today's file: {date_filepath}")

    # Save to Backend/app/output/hymns.json
    main_filepath = os.path.join(OUTPUT_DIR, "hymns.json")
    with open(main_filepath, "w", encoding="utf-8") as f:
        json.dump(hymns, f, ensure_ascii=False, indent=2)
    logger.info(f"[Output Main] Saved main file: {main_filepath}")

    # Save timestamped output via save_json utility
    ts_filepath = save_json(hymns, "hymns")
    logger.info(f"[Output Timestamped] Saved file: {ts_filepath}")

    logger.info("=======================================================")
    logger.info("  Daily Hymns Dataset Generation Completed Successfully")
    logger.info("=======================================================")


if __name__ == "__main__":
    generate_today_hymns_json()
