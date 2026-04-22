"""Parse synthetic DOORS MD exports to JSONL records for AeroScope.

This module is the synthetic DOORS export parser for AeroScope. It reads
Markdown files produced by the synthetic DOORS corpus generator and
normalises them into JSONL records that downstream graph-building, entity
extraction and embedding stages consume.

Target input format:
    - Metadata lines: PROJECT NAME, MODULE NAME, BASELINE, ABSOLUTE PATH
    - Sections delimited by "Header: ..." (optionally prefixed with "## ")
    - Requirements wrapped in markers:
          || Requirement No:ID || Requirement: TEXT ||
      The legacy Turkish marker `|| Gereksinim No:ID || Gereksinim: TEXT ||`
      is still accepted for backwards compatibility.
    - Multi-line requirements: TEXT continues on subsequent lines and ends
      with a trailing `||`.
    - Pipe-tables: `|Col1|Col2|` rows with `------` dash separators.
    - Notes: inline `Note:` / `Not:` lines (and numbered variants) are
      absorbed into the preceding requirement.

Chunking strategy (3-layer):
    1. Split by "Header:" markers (section boundaries).
    2. Within sections, split by requirement blocks
       (|| Requirement No: ... ||).
    3. Large tables are split by rows; the header row is repeated per
       chunk. Target: each chunk <= 3000 chars for good embedding quality.

Usage:
    python -m src.md_to_jsonl data/synthetic/FCC.md data/synthetic/requirements.jsonl
    python -m src.md_to_jsonl data/synthetic/ data/synthetic/requirements.jsonl
"""
import sys
import re
import json
import os
import glob
import logging
from typing import Any, Dict, List, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("md_to_jsonl")

MAX_CHUNK_CHARS = 3000   # target max chunk size
TABLE_ROWS_PER_CHUNK = 30  # max table rows before splitting

# Regex for header lines: "Header: ..." or "## Header: ..."
_HEADER_RE = re.compile(r'^(?:#{1,3}\s+)?Header:\s*(.*)', re.IGNORECASE)

# Regex for requirement block start.
# Accepts English ("Requirement No:", "Req:") and legacy Turkish
# ("Gereksinim No:") forms.
_REQ_START_RE = re.compile(r'\|\|\s*(?:Gereksinim No|Requirement No|Req):')

# Regex for dash separator lines in tables
_DASH_LINE_RE = re.compile(r'^-{5,}$')

# Regex for Note lines that follow requirements.
# Accepts English ("Note:") and legacy Turkish ("Not:"), optionally
# followed by a number like "Note 1:" / "Not-1:" / "Not1:".
_NOTE_RE = re.compile(r'^(?:Not|Note)[\s\-]?\d*\s*:', re.IGNORECASE)


def is_header_line(stripped: str) -> bool:
    """Check if line is a section header."""
    return _HEADER_RE.match(stripped) is not None


def get_header_text(stripped: str) -> str:
    """Extract header text from a header line."""
    m = _HEADER_RE.match(stripped)
    return m.group(1).strip() if m else ""


def is_table_row(line: str) -> bool:
    """Check if a line is a pipe-separated table row (NOT a requirement block)."""
    stripped = line.strip()
    # Requirement blocks start with || — exclude them
    if stripped.startswith("||"):
        return False
    return stripped.startswith("|") and stripped.endswith("|") and stripped.count("|") >= 2


def is_dash_separator(line: str) -> bool:
    """Check if line is a table dash separator."""
    return _DASH_LINE_RE.match(line.strip()) is not None


def is_table_meta(stripped: str) -> bool:
    """Check if line is table metadata."""
    return (stripped.startswith("Table Type:") or
            stripped.startswith("Table Name") or
            stripped.startswith("Table:"))


def clean_requirement_text(text: str) -> str:
    """Strip || markers and requirement-ID prefix, keep only content.

    Handles both the English form
        || Requirement No:ID || Requirement: TEXT ||
    and the legacy Turkish form
        || Gereksinim No:ID || Gereksinim: TEXT ||
    by anchoring the regex on "No:" and "Requirement:" / "Gereksinim:".
    """
    # Remove leading || (Requirement|Gereksinim) No:ID || (Requirement|Gereksinim):
    cleaned = re.sub(
        r'^\s*\|\|\s*(?:Gereksinim|Requirement|Req)\s*No:[^|]*\|\|\s*'
        r'(?:Gereksinim|Requirement):\s*',
        '',
        text,
    )
    # Remove trailing ||
    cleaned = re.sub(r'\s*\|\|\s*$', '', cleaned)
    # Remove any remaining leading ||
    cleaned = re.sub(r'^\s*\|\|\s*', '', cleaned)
    return cleaned.strip()


def extract_cross_refs(text: str) -> List[Dict[str, str]]:
    """Extract cross-references from text.

    Handles:
      - ##ModuleName.ID -> target_id = ID part
      - Trace keywords (English + legacy Turkish) followed by
        comma-separated IDs.
    """
    refs: List[Dict[str, str]] = []
    seen = set()

    # Pattern 2 runs FIRST so typed links (satisfies, derives_from, etc.)
    # take priority over generic "references" from Pattern 1.
    #
    # English keywords:
    #   Satisfies, Derives From, Derives To, Verifies, Verified By,
    #   Implements, Implemented By, Traces To, Traced From,
    #   Allocated To, Allocates, Refines, Refined By, Covers, Covered By,
    #   Depends On, Conflicts With.
    # Legacy Turkish keywords (kept intact):
    #   Karşılar, Türetilir, Türetilen, Doğrular, Uygular, Tahsis,
    #   İyileştirir, Rafine, Kapsar, İzlenebilirlik, İzlenir.
    trace_pattern = re.compile(
        r'(?:Trace[sd]?\s*(?:Down|Up|To|From)?|Satisf\w*|'
        r'Deriv\w*\s*(?:From|To)?|'
        r'Verif\w*(?:\s*By)?|Implement\w*(?:\s*By)?|'
        r'Allocat\w*(?:\s*To)?|Refine\w*(?:\s*By)?|'
        r'Cover\w*(?:\s*By)?|Depends\s*On|Conflicts\s*With|'
        r'Karşılar|Türetilir|Türetilen|Doğrular|Uygular|Tahsis|'
        r'İyileştirir|Rafine|Kapsar|İzlenebilirlik|İzlenir)'
        r'\s*[:=]\s*'
        r'([A-Za-z][\w-]*(?:\s*,\s*[A-Za-z][\w-]*)*)',
        re.IGNORECASE,
    )
    for match in trace_pattern.finditer(text):
        ids_str = match.group(1)
        # casefold() handles Turkish İ→i correctly (lower() produces combining dot)
        keyword = text[match.start():match.start() + 20].casefold()
        if "satisf" in keyword or "karşıl" in keyword:
            link_type = "satisfies"
        elif "deriv" in keyword or "türet" in keyword:
            link_type = "derives_from"
        elif "verif" in keyword or "doğrul" in keyword:
            link_type = "verifies"
        elif "implement" in keyword or "uygul" in keyword:
            link_type = "implements"
        elif "allocat" in keyword or "tahsis" in keyword:
            link_type = "allocated_to"
        elif "refine" in keyword or "iyileştir" in keyword or "rafine" in keyword:
            link_type = "refines"
        elif "cover" in keyword or "kapsa" in keyword:
            link_type = "covers"
        elif "depend" in keyword:
            link_type = "depends_on"
        elif "conflict" in keyword:
            link_type = "conflicts_with"
        else:
            link_type = "traces_to"

        for ref_id in re.split(r'\s*,\s*', ids_str):
            ref_id = ref_id.strip()
            if ref_id and ref_id not in seen and len(ref_id) > 2:
                seen.add(ref_id)
                refs.append({
                    "target_id": ref_id,
                    "target_module": "",
                    "link_module": link_type,
                    "link_type": link_type,
                })

    # Pattern 1: ##Module.ref format (runs second — typed links already in `seen`)
    for match in re.finditer(r'##(\w+)\.([^\s,;|}\]\)]+)', text):
        target_module = match.group(1)
        target_ref = match.group(2).rstrip(".)")
        if target_ref not in seen:
            seen.add(target_ref)
            refs.append({
                "target_id": target_ref,
                "target_module": target_module,
                "link_module": "references",
                "link_type": "references",
            })

    return refs


def extract_req_ids(text: str) -> List[str]:
    """Extract requirement IDs from text.

    Accepts both the English ("Requirement No:" / "Req No:") and legacy
    Turkish ("Gereksinim No:") forms.
    """
    return re.findall(
        r'(?:Gereksinim|Requirement|Req)\s*No:\s*([^\|]+?)(?:\s*\|\|)',
        text,
    )


# -------------------------------------------------------------------
# REQUIREMENT BLOCK PARSING
# -------------------------------------------------------------------

def parse_requirements_from_lines(lines: List[str]) -> List[Tuple[str, str]]:
    """Parse requirement blocks from section lines.

    A requirement starts with '|| Requirement No:' (or the legacy
    '|| Gereksinim No:') and ends when:
      1. The line ends with '||' (properly closed)
      2. The NEXT line starts a new requirement
      3. The NEXT line is a Header
      4. End of lines

    Returns list of tuples: ("requirement", text) or ("other", text).
    """
    blocks: List[Tuple[str, str]] = []
    i = 0
    pending_other: List[str] = []  # non-requirement lines before a requirement

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Is this a requirement start?
        if _REQ_START_RE.search(stripped):
            # Flush any pending non-requirement content
            if pending_other:
                other_text = "\n".join(pending_other).strip()
                if other_text:
                    blocks.append(("other", other_text))
                pending_other = []

            # Collect requirement lines
            req_lines = [line]

            # Check if this single line is already complete
            # A complete single line has >= 3 '||' occurrences AND ends with '||'
            if stripped.endswith("||") and stripped.count("||") >= 3:
                # Complete single-line requirement
                # Absorb trailing Note:/Not: lines into this requirement
                while i + 1 < len(lines):
                    peek = lines[i + 1].strip()
                    if _NOTE_RE.match(peek):
                        i = i + 1
                        req_lines.append(lines[i])
                        if peek.endswith("||"):
                            break
                    else:
                        break
                blocks.append(("requirement", "\n".join(req_lines).strip()))
                i = i + 1
                continue

            # Multi-line requirement: read until closed
            while i + 1 < len(lines):
                next_stripped = lines[i + 1].strip()

                # Stop if next line is a new requirement
                if _REQ_START_RE.search(next_stripped):
                    break

                # Stop if next line is a header
                if is_header_line(next_stripped):
                    break

                i = i + 1
                req_lines.append(lines[i])

                # Check if this line closes the requirement
                if lines[i].strip().endswith("||"):
                    break

            # Absorb trailing Note:/Not: lines into this requirement
            while i + 1 < len(lines):
                peek = lines[i + 1].strip()
                if _NOTE_RE.match(peek):
                    i = i + 1
                    req_lines.append(lines[i])
                    if peek.endswith("||"):
                        break
                else:
                    break

            blocks.append(("requirement", "\n".join(req_lines).strip()))
            i = i + 1
            continue

        # Not a requirement line — accumulate as "other"
        pending_other.append(line)
        i = i + 1

    # Flush remaining
    if pending_other:
        other_text = "\n".join(pending_other).strip()
        if other_text:
            blocks.append(("other", other_text))

    return blocks


# -------------------------------------------------------------------
# TABLE CHUNKING
# -------------------------------------------------------------------

def split_table_block(text: str) -> List[str]:
    """Split a large table block into smaller chunks."""
    lines = text.split("\n")

    # Separate header, data rows, and dash separators
    header_line = None
    data_lines: List[str] = []
    meta_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if is_table_meta(stripped):
            meta_lines.append(line)
        elif is_dash_separator(stripped):
            continue  # skip dash separators
        elif is_table_row(stripped):
            if header_line is None:
                header_line = line
            else:
                data_lines.append(line)
        else:
            # Non-table line within table block (comments, etc.)
            if stripped:
                data_lines.append(line)

    if not data_lines:
        return [text]

    # Small enough — return as is (without dash lines)
    if len(data_lines) <= TABLE_ROWS_PER_CHUNK:
        clean_lines = meta_lines[:]
        if header_line:
            clean_lines.append(header_line)
        clean_lines.extend(data_lines)
        return ["\n".join(clean_lines).strip()]

    # Split into chunks
    chunks: List[str] = []
    meta_prefix = "\n".join(meta_lines).strip()
    for j in range(0, len(data_lines), TABLE_ROWS_PER_CHUNK):
        batch = data_lines[j:j + TABLE_ROWS_PER_CHUNK]
        parts: List[str] = []
        if meta_prefix and j == 0:
            parts.append(meta_prefix)
        if header_line:
            parts.append(header_line)
        parts.extend(batch)
        chunks.append("\n".join(parts).strip())

    return chunks


# -------------------------------------------------------------------
# SECTION CHUNKING
# -------------------------------------------------------------------

def split_section_into_chunks(body: str) -> List[str]:
    """Split a section body into chunks: requirements and other content."""
    blocks = parse_requirements_from_lines(body.split("\n"))
    chunks: List[str] = []

    for block_type, block_text in blocks:
        if not block_text.strip():
            continue

        if block_type == "requirement":
            # Requirement block — keep as single chunk if possible
            if len(block_text) <= MAX_CHUNK_CHARS:
                chunks.append(block_text)
            else:
                # Very large requirement — split by paragraphs
                paragraphs = re.split(r'\n\s*\n', block_text)
                current = ""
                for para in paragraphs:
                    if len(current) + len(para) > MAX_CHUNK_CHARS and current:
                        chunks.append(current.strip())
                        current = para
                    else:
                        current = current + "\n\n" + para if current else para
                if current.strip():
                    chunks.append(current.strip())
        else:
            # Other content: tables or text
            # Check if it's table content
            lines = block_text.split("\n")
            has_table = any(is_table_row(l.strip()) for l in lines)

            if has_table:
                table_chunks = split_table_block(block_text)
                chunks.extend(table_chunks)
            elif len(block_text) <= MAX_CHUNK_CHARS:
                chunks.append(block_text)
            else:
                # Split long text
                paragraphs = re.split(r'\n\s*\n', block_text)
                current = ""
                for para in paragraphs:
                    if len(current) + len(para) > MAX_CHUNK_CHARS and current:
                        chunks.append(current.strip())
                        current = para
                    else:
                        current = current + "\n\n" + para if current else para
                if current.strip():
                    chunks.append(current.strip())

    return chunks if chunks else [body]


# -------------------------------------------------------------------
# OBJECT CREATION
# -------------------------------------------------------------------

def make_object(
    chunk_id: str,
    heading: str,
    text: str,
    module_name: str,
    module_path: str,
    project_name: str,
    baseline: str,
    abs_num: int,
    obj_type: str = "Requirement",
    req_tag: str = "",
) -> Dict[str, Any]:
    """Create a requirement object dict."""
    is_heading = len(text.strip()) == 0

    cross_refs = extract_cross_refs(heading + " " + text)
    req_ids = extract_req_ids(text)

    # Use first requirement ID if available
    if req_ids and obj_type != "Heading":
        chunk_id = req_ids[0].strip()

    # Build full_text — clean version without || markers for embedding quality
    cleaned_text = clean_requirement_text(text) if obj_type != "Table" else text.strip()
    parts: List[str] = []
    if heading:
        parts.append(heading)
    if cleaned_text:
        parts.append(cleaned_text)
    full_text = " -- ".join(parts)

    # Extract ## params (no dot = parameter, skip cross-refs like ##Module.ID)
    params: List[str] = []
    full_content = heading + " " + text
    for match in re.finditer(r'##(\w+)', full_content):
        p = match.group(1)
        # Skip cross-references (##Module.ID pattern)
        end_pos = match.end()
        if end_pos < len(full_content) and full_content[end_pos] == '.':
            continue
        if p not in params:
            params.append(p)

    attrs: Dict[str, Any] = {"baseline": baseline, "project": project_name}
    if req_tag:
        attrs["doors_requirement_tag"] = req_tag
    if req_ids:
        attrs["requirement_ids"] = ", ".join(r.strip() for r in req_ids)

    return {
        "id": chunk_id,
        "absolute_number": abs_num,
        "level": 1,
        "heading": heading,
        "text": text.strip(),
        "object_type": "Heading" if is_heading else obj_type,
        "is_heading": is_heading,
        "module": module_name,
        "module_path": module_path,
        "attributes": attrs,
        "outgoing_links": cross_refs,
        "incoming_links": [],
        "ole_files": [],
        "parameters": params,
        "full_text": full_text,
    }


# -------------------------------------------------------------------
# FILE PARSING
# -------------------------------------------------------------------

def parse_md_file(filepath: str) -> Tuple[List[Dict[str, Any]], str, str]:
    """Parse a single .md file with smart chunking."""
    with open(filepath, "rb") as fh:
        raw = fh.read()
    text = None
    for enc in ("utf-8", "cp1254", "latin-1"):
        try:
            text = raw.decode(enc)
            logger.info(f"Decoded {filepath} with {enc}")
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw.decode("latin-1", errors="replace")

    if text and text[0] == '﻿':
        text = text[1:]

    lines = text.split("\n")

    # ---- Parse metadata ----
    module_name = ""
    module_path = ""
    project_name = ""
    baseline = ""
    req_tag = ""
    content_start = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("#Requirement:") or stripped.startswith("# Requirement:"):
            req_tag = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("PROJECT NAME:"):
            project_name = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("MODULE NAME:"):
            module_name = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("BASELINE:"):
            baseline = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("ABSOLUTE PATH:"):
            module_path = stripped.split(":", 1)[1].strip()
        elif is_header_line(stripped):
            content_start = i
            break

    if not module_name:
        module_name = os.path.splitext(os.path.basename(filepath))[0]

    logger.info("  Module: %s", module_name)
    logger.info("  Path: %s", module_path)

    # ---- Split by Header: markers ----
    sections: List[Tuple[str, str]] = []
    current_header = ""
    current_lines: List[str] = []
    heading_stack: List[str] = []
    prev_raw_header = ""  # raw (unresolved) header name for stack
    prev_section_had_content = True  # treat start as having content

    for i in range(content_start, len(lines)):
        line = lines[i].rstrip("\r\n")
        stripped = line.strip()

        if is_header_line(stripped):
            if current_header or current_lines:
                section_text = "\n".join(current_lines).strip()
                prev_section_had_content = bool(section_text)
                if section_text or current_header:
                    sections.append((current_header, section_text))
            new_header = get_header_text(stripped)
            # Build heading hierarchy: if previous section was heading-only
            # (no body content), treat it as a parent heading.
            if not prev_section_had_content and prev_raw_header:
                heading_stack.append(prev_raw_header)
            elif prev_section_had_content:
                heading_stack = []
            section_path = " > ".join(heading_stack + [new_header])
            prev_raw_header = new_header
            current_header = section_path
            current_lines = []
        else:
            current_lines.append(line)

    if current_header or current_lines:
        section_text = "\n".join(current_lines).strip()
        if section_text or current_header:
            sections.append((current_header, section_text))

    logger.info("  Sections: %d", len(sections))

    # ---- Smart chunking ----
    objects: List[Dict[str, Any]] = []
    obj_counter = 0

    for header, body in sections:
        if not body.strip():
            # Heading only
            obj_counter = obj_counter + 1
            objects.append(make_object(
                module_name + "-HDR-" + str(obj_counter),
                header, "", module_name, module_path,
                project_name, baseline, obj_counter, "Heading",
                req_tag=req_tag,
            ))
            continue

        # Split section into chunks
        sub_chunks = split_section_into_chunks(body)
        last_req_id = None  # track last requirement ID for table DESCRIBES links

        for ci, chunk_text in enumerate(sub_chunks):
            obj_counter = obj_counter + 1
            chunk_id = module_name + "-C" + str(obj_counter)

            # Determine type
            obj_type = "Requirement"
            first_line = chunk_text.split("\n")[0].strip() if chunk_text else ""
            if is_table_row(first_line) or is_table_meta(first_line):
                obj_type = "Table"

            obj = make_object(
                chunk_id, header, chunk_text,
                module_name, module_path, project_name, baseline,
                obj_counter, obj_type,
                req_tag=req_tag,
            )

            if obj_type != "Table":
                # Update last_req_id from this chunk's requirement IDs
                req_ids_in_chunk = extract_req_ids(chunk_text)
                if req_ids_in_chunk:
                    last_req_id = req_ids_in_chunk[0].strip()
            elif last_req_id is not None:
                # Table chunk follows a requirement — add DESCRIBES link
                obj["outgoing_links"].append({
                    "target_id": last_req_id,
                    "link_type": "describes",
                    "link_module": module_name,
                    "target_module": "",
                })

            objects.append(obj)

    logger.info("  Chunks: %d (from %d sections)", len(objects), len(sections))
    return objects, module_name, module_path


# ============================================================================
# MAIN
# ============================================================================

def main() -> None:
    if len(sys.argv) < 3:
        logger.error("Usage: python -m src.md_to_jsonl <input.md or directory> <output.jsonl>")
        sys.exit(1)

    input_path = sys.argv[1]
    outfile = sys.argv[2]

    md_files: List[str] = []
    if os.path.isdir(input_path):
        md_files = sorted(glob.glob(os.path.join(input_path, "*.md")))
    elif os.path.isfile(input_path):
        md_files = [input_path]
    else:
        logger.error("Input path not found: %s", input_path)
        sys.exit(1)

    if not md_files:
        logger.error("No .md files found")
        sys.exit(1)

    logger.info("Found %d .md file(s)", len(md_files))

    all_objects: List[Dict[str, Any]] = []
    seen_ids = set()

    for md_file in md_files:
        logger.info("Parsing: %s", os.path.basename(md_file))
        objects, mod_name, mod_path = parse_md_file(md_file)

        for obj in objects:
            base_id = obj["id"]
            counter = 1
            while obj["id"] in seen_ids:
                obj["id"] = base_id + "_" + str(counter)
                counter = counter + 1
            seen_ids.add(obj["id"])

        all_objects.extend(objects)

    # Stats
    total_content = sum(1 for o in all_objects if not o["is_heading"])
    total_hdrs = sum(1 for o in all_objects if o["is_heading"])
    total_refs = sum(len(o.get("outgoing_links", [])) for o in all_objects)
    total_reqs = sum(1 for o in all_objects if o["object_type"] == "Requirement")
    total_tables = sum(1 for o in all_objects if o["object_type"] == "Table")
    sizes = [len(o.get("text", "")) for o in all_objects if not o["is_heading"]]
    avg_size = sum(sizes) // max(len(sizes), 1)
    max_size = max(sizes) if sizes else 0

    logger.info("=" * 40)
    logger.info("Total chunks: %d", len(all_objects))
    logger.info("  Requirements: %d", total_reqs)
    logger.info("  Tables: %d", total_tables)
    logger.info("  Headings: %d", total_hdrs)
    logger.info("  Cross-refs: %d", total_refs)
    logger.info("  Avg chunk: %d chars", avg_size)
    logger.info("  Max chunk: %d chars", max_size)
    logger.info("=" * 40)

    os.makedirs(os.path.dirname(outfile) or ".", exist_ok=True)
    with open(outfile, "w", encoding="utf-8") as f:
        for obj in all_objects:
            json.dump(obj, f, ensure_ascii=False)
            f.write("\n")

    logger.info("Saved to: %s", outfile)


if __name__ == "__main__":
    main()
