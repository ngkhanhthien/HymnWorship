import os
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
    Synchronizes crawled output JSON files, sheet music images, and audio files
    from Backend/app/output/ to Frontend/public/assets/hymns/.
    """
    try:
        if not os.path.exists(OUTPUT_DIR):
            logger.warning(f"Output directory does not exist: {OUTPUT_DIR}")
            return False

        os.makedirs(FRONTEND_ASSETS_DIR, exist_ok=True)

        # 1. Find the main hymns JSON file in Backend output (prioritizing full collection)
        json_files = [
            f for f in glob.glob(os.path.join(OUTPUT_DIR, "hymns_*.json"))
            if "home_church" not in os.path.basename(f)
        ]
        if not json_files:
            json_files = glob.glob(os.path.join(OUTPUT_DIR, "hymns_*.json"))

        if json_files:
            latest_json = max(json_files, key=os.path.getmtime)
            dest_json = os.path.join(FRONTEND_ASSETS_DIR, "hymns.json")
            shutil.copy2(latest_json, dest_json)
            logger.info(f"Synced JSON: {os.path.basename(latest_json)} -> {dest_json}")
        else:
            logger.warning("No hymns_*.json file found in output directory.")

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
