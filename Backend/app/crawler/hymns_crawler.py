"""
Main crawler — connects to the website and returns connection info.
Phase 1: Connection test only.
"""

import requests
from app.config.settings import HYMNS_URL, REQUEST_HEADERS, REQUEST_TIMEOUT


def _error_result(message: str) -> dict:
    """Build a failed connection result dict (DRY helper)."""
    return {
        "url":         HYMNS_URL,
        "status_code": None,
        "connected":   False,
        "message":     message,
    }


def check_connection() -> dict:
    """
    Send a request to the website and check connectivity.

    Returns:
        dict: Connection result with url, status_code, connected flag, and message.
    """
    print(f"[Crawler] Connecting to: {HYMNS_URL}")

    try:
        response = requests.get(
            HYMNS_URL,
            headers=REQUEST_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        connected = response.status_code == 200
        return {
            "url":         response.url,
            "status_code": response.status_code,
            "connected":   connected,
            "message":     "Connection successful!" if connected
                           else f"Connection failed! Status: {response.status_code}",
        }

    except requests.exceptions.ConnectionError:
        return _error_result("Error: Cannot connect. Check your internet connection.")
    except requests.exceptions.Timeout:
        return _error_result(f"Error: Connection timed out ({REQUEST_TIMEOUT}s).")
    except requests.exceptions.RequestException as e:
        return _error_result(f"Unknown error: {e}")
