"""
Tiện ích lưu dữ liệu ra file JSON trong thư mục output.
"""

import json
import os
from datetime import datetime
from app.config.settings import OUTPUT_DIR


def save_json(data: dict | list, filename: str) -> str:
    """
    Lưu dữ liệu ra file JSON.

    Args:
        data:     Dữ liệu cần lưu (dict hoặc list).
        filename: Tên file (không cần đuôi .json).

    Returns:
        str: Đường dẫn file đã lưu.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath  = os.path.join(OUTPUT_DIR, f"{filename}_{timestamp}.json")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[Output] Đã lưu file: {filepath}")
    return filepath
