import os
import json
import shutil
import glob
from app.utils.logger import get_logger

logger = get_logger("sync_local")

# Determine project paths cleanly
CURRENT_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_FILE_DIR)))
WORKSPACE_ROOT = os.path.dirname(BACKEND_DIR)

OUTPUT_DIR = os.path.join(BACKEND_DIR, "app", "output")
FRONTEND_ASSETS_DIR = os.path.join(WORKSPACE_ROOT, "Frontend", "public", "assets", "hymns")


def sync_output_to_local_assets() -> bool:
    """
    Combines all crawled JSON files (hymns, hymns_home_church, etc.), sheet music images,
    and audio files from Backend/app/output/ into Frontend/public/assets/hymns/.
    """
    try:
        if not os.path.exists(OUTPUT_DIR):
            logger.warning(f"Output directory does not exist: {OUTPUT_DIR}")
            return False

        os.makedirs(FRONTEND_ASSETS_DIR, exist_ok=True)

        # 1. Combine all JSON files in Backend output into a single merged hymns.json
        json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))
        merged_hymns = []
        seen_ids = set()

        if json_files:
            # Sort files by modification time so newer data takes precedence
            json_files.sort(key=os.path.getmtime)

            for file_path in json_files:
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for item in data:
                                item_id = str(item.get("id") or item.get("number") or "")
                                if item_id and item_id not in seen_ids:
                                    seen_ids.add(item_id)
                                    merged_hymns.append(item)
                                elif not item_id:
                                    merged_hymns.append(item)
                except Exception as read_err:
                    logger.warning(f"Could not read JSON file {file_path}: {read_err}")

            # Sort merged hymns by numeric ID
            def get_numeric_id(hymn: dict) -> int:
                try:
                    return int(hymn.get("id") or hymn.get("number") or 0)
                except (ValueError, TypeError):
                    return 999999

            merged_hymns.sort(key=get_numeric_id)

            dest_json = os.path.join(FRONTEND_ASSETS_DIR, "hymns.json")
            with open(dest_json, "w", encoding="utf-8") as f:
                json.dump(merged_hymns, f, ensure_ascii=False, indent=2)

            logger.info(
                f"Combined {len(json_files)} JSON files into {dest_json} ({len(merged_hymns)} total unique hymns)."
            )
        else:
            logger.warning("No JSON files found in output directory.")

        # 2. Copy sheet_music directory if exists
        sheet_music_src = os.path.join(OUTPUT_DIR, "sheet_music")
        sheet_music_dst = os.path.join(FRONTEND_ASSETS_DIR, "sheet_music")
        if os.path.exists(sheet_music_src):
            if os.path.exists(sheet_music_dst):
                shutil.rmtree(sheet_music_dst)
            shutil.copytree(sheet_music_src, sheet_music_dst)
            logger.info(f"Synced sheet_music directory -> {sheet_music_dst}")

        # 3. Copy audio directory if exists
        audio_src = os.path.join(OUTPUT_DIR, "audio")
        audio_dst = os.path.join(FRONTEND_ASSETS_DIR, "audio")
        if os.path.exists(audio_src):
            if os.path.exists(audio_dst):
                shutil.rmtree(audio_dst)
            shutil.copytree(audio_src, audio_dst)
            logger.info(f"Synced audio directory -> {audio_dst}")

        logger.info("Local assets synchronization completed successfully!")
        return True

    except Exception as e:
        logger.error(f"Error during local assets synchronization: {e}", exc_info=True)
        return False
