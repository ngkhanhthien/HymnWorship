"""
Scriptures Crawler Module

Crawls English scripture verse text content from churchofjesuschrist.org scripture URLs.
"""

import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Dict, List, Optional, Any

from app.utils.logger import get_logger

logger = get_logger("scriptures_crawler")


class ScriptureVerseParser(HTMLParser):
    """HTML Parser to extract verse paragraphs from scripture study pages."""

    def __init__(self) -> None:
        super().__init__()
        self.in_verse = False
        self.current_verse_id: Optional[str] = None
        self.verses: Dict[str, str] = {}
        self.current_text: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        attr_dict = dict(attrs)
        if tag == 'p' and 'verse' in attr_dict.get('class', ''):
            self.in_verse = True
            self.current_verse_id = attr_dict.get('id')
            self.current_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag == 'p' and self.in_verse:
            if self.current_verse_id:
                raw = "".join(self.current_text)
                cleaned = raw.replace('\ufffd', '—')
                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                self.verses[self.current_verse_id] = cleaned
            self.in_verse = False
            self.current_verse_id = None

    def handle_data(self, data: str) -> None:
        if self.in_verse:
            self.current_text.append(data)


def parse_target_verse_ids(url: str) -> List[str]:
    """Parse requested verse ID range from URL query parameters (e.g. id=p1-p3 -> ['p1', 'p2', 'p3'])."""
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)
    id_param = qs.get('id', [None])[0]

    if not id_param:
        return []

    m_range = re.match(r'^p?(\d+)-p?(\d+)$', id_param)
    if m_range:
        start_num = int(m_range.group(1))
        end_num = int(m_range.group(2))
        return [f"p{i}" for i in range(start_num, end_num + 1)]

    m_single = re.match(r'^p?(\d+)$', id_param)
    if m_single:
        return [f"p{m_single.group(1)}"]

    return []


def fetch_scripture_text(url: str, timeout: int = 10) -> str:
    """Fetch HTML page for a scripture URL and return extracted English verse texts joined by newlines."""
    if not url or not url.startswith('http'):
        return ""

    if 'lang=eng' not in url:
        sep = '&' if '?' in url else '?'
        url = f"{url}{sep}lang=eng"

    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        logger.warning(f"Error fetching scripture text from {url}: {e}")
        return ""

    parser = ScriptureVerseParser()
    parser.feed(html)

    target_ids = parse_target_verse_ids(url)

    if target_ids:
        selected = [parser.verses[vid] for vid in target_ids if vid in parser.verses]
    else:
        sorted_keys = sorted(parser.verses.keys(), key=lambda k: int(re.sub(r'\D', '', k) or 0))
        selected = [parser.verses[k] for k in sorted_keys]

    return "\n".join(selected)


def enrich_hymn_scriptures(scriptures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich a list of scripture dictionaries by adding the 'text' field."""
    enriched: List[Dict[str, Any]] = []
    for s in scriptures:
        if isinstance(s, dict):
            ref = s.get("reference", "")
            url = s.get("url", "")
            existing_text = s.get("text", "")

            if not existing_text and url:
                text = fetch_scripture_text(url)
            else:
                text = existing_text

            enriched.append({
                "reference": ref,
                "text": text,
                "url": url,
            })
        else:
            enriched.append(s)
    return enriched
