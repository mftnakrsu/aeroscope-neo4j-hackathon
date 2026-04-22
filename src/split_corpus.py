"""Split a Claude Opus corpus-generation transcript into per-module MD files.

Takes a single text file containing Claude's responses (concatenated across
multiple turns is fine — the splitter is agnostic to turn boundaries) and
extracts each `===FILE: X.md ===` ... `===END FILE: X.md ===` block into
`<output>/X.md`.

Usage:
    python -m src.split_corpus path/to/raw_transcript.txt data/synthetic/
    python -m src.split_corpus raw.txt data/synthetic/ --strict

Options:
    --strict   Fail hard if any of the 30 expected modules is missing.

Expected modules (from HACKATHON_PLAN/02_corpus_generation_prompt.md §3):
    FCC FMS AUTO INS GPS NAV ADS RADAR CDL COMM DLNK PWR APM EPS ENG
    FUEL LDG PLD EOIR SAR GCS HMI EMS BIT FDR TCS STR ICE LGT SEC
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
from pathlib import Path
from typing import Dict, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("split_corpus")

EXPECTED_MODULES: List[str] = [
    "FCC", "FMS", "AUTO", "INS", "GPS", "NAV", "ADS", "RADAR",
    "CDL", "COMM", "DLNK", "PWR", "APM", "EPS", "ENG", "FUEL",
    "LDG", "PLD", "EOIR", "SAR", "GCS", "HMI", "EMS", "BIT",
    "FDR", "TCS", "STR", "ICE", "LGT", "SEC",
]

# ===FILE: X.md === ... ===END FILE: X.md===
# Tolerant to optional spaces and case of "md".
BLOCK_RE = re.compile(
    r"===\s*FILE:\s*([A-Z0-9_]+)\.md\s*===\s*\n"
    r"(.*?)"
    r"\n\s*===\s*END\s+FILE:\s*\1\.md\s*===",
    re.DOTALL | re.IGNORECASE,
)


def extract_blocks(text: str) -> Dict[str, str]:
    """Extract all ===FILE: X.md === blocks from a transcript.

    Returns a dict {module_name: md_body}. If a module appears more
    than once (e.g. Claude emitted a correction on a later turn), the
    LAST occurrence wins.
    """
    blocks: Dict[str, str] = {}
    for match in BLOCK_RE.finditer(text):
        module = match.group(1).upper()
        body = match.group(2).strip("\n")
        if module in blocks:
            logger.warning("Duplicate block for %s — later one replaces earlier.", module)
        blocks[module] = body
    return blocks


def write_modules(blocks: Dict[str, str], out_dir: Path) -> None:
    """Write each extracted block to <out_dir>/<MODULE>.md."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for module, body in sorted(blocks.items()):
        path = out_dir / f"{module}.md"
        # Ensure trailing newline for POSIX niceness
        content = body if body.endswith("\n") else body + "\n"
        path.write_text(content, encoding="utf-8")
        size_kb = path.stat().st_size / 1024.0
        req_count = body.count("|| Requirement No:")
        logger.info("  wrote %-6s  %5.1f KB  reqs=%d", f"{module}.md", size_kb, req_count)


def print_summary(blocks: Dict[str, str], strict: bool) -> int:
    """Print coverage summary. Returns process exit code."""
    found = set(blocks.keys())
    expected = set(EXPECTED_MODULES)
    missing = sorted(expected - found)
    extra = sorted(found - expected)

    total_reqs = sum(b.count("|| Requirement No:") for b in blocks.values())

    logger.info("=" * 60)
    logger.info("  Summary")
    logger.info("=" * 60)
    logger.info("  Modules found    : %d / %d", len(found), len(expected))
    logger.info("  Total requirements: %d", total_reqs)
    if missing:
        logger.warning("  Missing modules  : %s", ", ".join(missing))
    if extra:
        logger.warning("  Unexpected modules: %s", ", ".join(extra))
    logger.info("=" * 60)

    if strict and (missing or extra):
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path, help="Transcript text file containing Claude's output")
    parser.add_argument("output", type=Path, help="Directory where <MODULE>.md files are written")
    parser.add_argument("--strict", action="store_true",
                        help="Exit with code 1 if expected modules are missing or extra modules appear")
    args = parser.parse_args()

    if not args.input.exists():
        logger.error("Input file not found: %s", args.input)
        return 1

    text = args.input.read_text(encoding="utf-8", errors="replace")
    if text.startswith("﻿"):
        text = text[1:]

    blocks = extract_blocks(text)
    if not blocks:
        logger.error("No ===FILE: X.md === blocks found in %s.", args.input)
        logger.error("Did you paste the full Claude output? Sentinels are case-insensitive.")
        return 1

    write_modules(blocks, args.output)
    return print_summary(blocks, args.strict)


if __name__ == "__main__":
    sys.exit(main())
