"""
Centralized logger utility following DRY principles.
Configures console and file handlers using settings from app.config.settings.
"""

import os
import sys
import logging
from app.config.settings import LOGS_DIR, LOG_FILE_PATH, LOG_LEVEL


def setup_logger(name: str = "HymnWorship") -> logging.Logger:
    """
    Get or configure a logger instance.
    Logs to both console (stdout) and log file specified by LOG_FILE_PATH.
    
    Args:
        name: Name of the logger (default: "HymnWorship")
        
    Returns:
        logging.Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)
    
    # Return existing logger if already configured to avoid duplicate handlers (DRY)
    if logger.hasHandlers():
        return logger

    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler
    try:
        os.makedirs(LOGS_DIR, exist_ok=True)
        file_handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Could not initialize file logging at {LOG_FILE_PATH}: {e}")

    return logger


def get_logger(name: str = "HymnWorship") -> logging.Logger:
    """
    Helper function to retrieve a configured logger.
    
    Args:
        name: Name of the logger
        
    Returns:
        logging.Logger
    """
    return setup_logger(name)
