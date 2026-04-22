"""Shared utilities for LLM interaction across pipeline scripts.

Consolidates:
- Robust JSON parsing from LLM output (parse_llm_json)
- JSONL file loading with encoding fallback (read_jsonl)
- Unified input reader for .jsonl, .md, or directories (read_input)
"""

import json
import re
import logging
from pathlib import Path
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

# Encoding fallback chain for requirements exports from different locales
ENCODINGS = ("utf-8", "cp1254", "latin-1")


def parse_llm_json(text: str) -> Optional[dict]:
    """Robustly parse JSON from LLM output.

    Handles: pure JSON, markdown code fences, mixed text with embedded JSON,
    and thinking tags (<think>...</think>) that some models emit.
    """
    if not text or not text.strip():
        return None

    # Strip <think>...</think> blocks (reasoning output from some models)
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
    fenced = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Find outermost { ... } block via bracket-counting
    start = text.find('{')
    if start == -1:
        return None
    depth = 0
    end = start
    for i in range(start, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if depth == 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    # 4. Truncated JSON recovery — close unclosed braces and retry
    if depth > 0 and start >= 0:
        fragment = text[start:]
        open_braces = fragment.count('{') - fragment.count('}')
        if 0 < open_braces <= 10:
            repaired = fragment + '}'.join([''] * (open_braces + 1))
            try:
                result = json.loads(repaired)
                logger.info(f"Recovered truncated JSON by closing {open_braces} brace(s)")
                return result
            except json.JSONDecodeError:
                pass

    return None


def read_input(path: str) -> List[Dict]:
    """Read requirements from JSONL file, MD file, or directory of MD/JSONL files.

    Supports:
        - .jsonl file: reads JSONL with encoding fallback
        - .md file: parses MD export directly (no intermediate JSONL needed)
        - directory: finds all .md files (or .jsonl if no .md found) and reads them
    """
    p = Path(path)

    if p.is_file():
        if p.suffix == ".jsonl":
            return read_jsonl(str(p))
        elif p.suffix == ".md":
            return _parse_md_files([p])
        else:
            raise ValueError(f"Unsupported file type: {p.suffix} (expected .md or .jsonl)")
    elif p.is_dir():
        md_files = sorted(p.glob("*.md"))
        if md_files:
            return _parse_md_files(md_files)
        jsonl_files = sorted(p.glob("*.jsonl"))
        if jsonl_files:
            all_records = []
            for f in jsonl_files:
                all_records.extend(read_jsonl(str(f)))
            return all_records
        raise ValueError(f"No .md or .jsonl files found in {path}")
    else:
        raise ValueError(f"Path not found: {path}")


def _parse_md_files(md_files: List[Path]) -> List[Dict]:
    """Parse one or more .md exports using the md_to_jsonl parser."""
    import importlib.util

    parser_path = Path(__file__).parent / "md_to_jsonl.py"
    spec = importlib.util.spec_from_file_location("md_to_jsonl", str(parser_path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    all_objects = []
    seen_ids = set()

    for md_file in md_files:
        objects, _, _ = mod.parse_md_file(str(md_file))
        for obj in objects:
            base_id = obj["id"]
            counter = 1
            while obj["id"] in seen_ids:
                obj["id"] = f"{base_id}_{counter}"
                counter += 1
            seen_ids.add(obj["id"])
        all_objects.extend(objects)

    logger.info(f"Parsed {len(all_objects)} requirements from {len(md_files)} .md file(s)")
    return all_objects


def read_jsonl(path: str) -> List[Dict]:
    """Read a JSONL file with encoding fallback for requirements exports.

    Tries UTF-8, then cp1254, then latin-1.
    Logs a warning for invalid JSON lines (with line number).

    Raises:
        ValueError: If the file cannot be decoded with any known encoding.
    """
    raw = None
    for enc in ENCODINGS:
        try:
            raw = Path(path).read_text(encoding=enc)
            break
        except UnicodeDecodeError:
            continue

    if raw is None:
        raise ValueError(f"Cannot decode {path} with any known encoding")

    records = []
    for line_num, line in enumerate(raw.splitlines(), 1):
        line = line.strip()
        if line:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                logger.warning(f"Skipping invalid JSON at line {line_num}: {e}")
    return records
