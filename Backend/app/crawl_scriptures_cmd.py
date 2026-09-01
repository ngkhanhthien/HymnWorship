"""
Batch Command Script - Crawl English Scripture Verse Texts for All Hymns

Run from Backend directory:
    python app/crawl_scriptures_cmd.py
"""

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

# Fix Unicode output on Windows (UTF-8)
if hasattr(sys.stdout, "reconfigure") and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure Backend/ is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.crawler.scriptures_crawler import fetch_scripture_text
from app.utils.logger import get_logger

logger = get_logger("crawl_scriptures_cmd")

JSON_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "hymns.json"),
    os.path.abspath("c:/Nguyenkhanhthien/HymnWorship/HymnWorship/Frontend/public/assets/hymns/hymns.json"),
]


def process_single_scripture(item: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch text for a single scripture reference dict if text is not already present."""
    if not isinstance(item, dict):
        return item

    ref = item.get("reference", "")
    url = item.get("url", "")
    existing_text = item.get("text", "")

    if not existing_text and url:
        text = fetch_scripture_text(url)
    else:
        text = existing_text

    return {
        "reference": ref,
        "text": text,
        "url": url,
    }


def crawl_all_hymn_scriptures() -> None:
    logger.info("=======================================================")
    logger.info("  Starting English Scripture Text Crawler")
    logger.info("=======================================================")

    # Locate source json file
    source_path = None
    for path in JSON_PATHS:
        if os.path.exists(path):
            source_path = path
            break

    if not source_path:
        logger.error("No hymns.json file found to process!")
        return

    logger.info(f"Loading hymns from: {source_path}")
    with open(source_path, "r", encoding="utf-8") as f:
        hymns: List[Dict[str, Any]] = json.load(f)

    # Collect all (hymn_index, scripture_index, scripture_item) tasks
    tasks = []
    for h_idx, hymn in enumerate(hymns):
        scriptures = hymn.get("scriptures", [])
        for s_idx, s in enumerate(scriptures):
            if isinstance(s, dict) and s.get("url"):
                tasks.append((h_idx, s_idx, s))

    total_tasks = len(tasks)
    logger.info(f"Total scripture references to crawl: {total_tasks} across {len(hymns)} hymns")

    completed = 0
    # Use ThreadPoolExecutor for fast concurrent HTTP requests
    max_workers = 5
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {
            executor.submit(process_single_scripture, s_item): (h_idx, s_idx)
            for (h_idx, s_idx, s_item) in tasks
        }

        for future in as_completed(future_to_task):
            h_idx, s_idx = future_to_task[future]
            completed += 1
            try:
                enriched = future.result()
                hymns[h_idx]["scriptures"][s_idx] = enriched
                if completed % 50 == 0 or completed == total_tasks:
                    logger.info(
                        f"Progress: {completed}/{total_tasks} scriptures processed ({completed/total_tasks*100:.1f}%)"
                    )
            except Exception as e:
                logger.warning(
                    f"Error processing scripture task at hymn #{hymns[h_idx].get('id')}: {e}"
                )

    # Save enriched data to all destination JSON paths
    for target_path in JSON_PATHS:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(hymns, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved enriched scripture dataset to: {target_path}")

    logger.info("=======================================================")
    logger.info("  English Scripture Text Crawler Execution Completed")
    logger.info("=======================================================")


if __name__ == "__main__":
    crawl_all_hymn_scriptures()
