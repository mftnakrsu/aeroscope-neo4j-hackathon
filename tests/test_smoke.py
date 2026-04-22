"""Offline smoke test for the AeroScope parse -> cross-ref -> chunk pipeline.

Validates src/md_to_jsonl.py end-to-end on the known-good placeholder
corpus plus a few hand-crafted snippets. Zero network, zero Neo4j,
zero OpenAI. Pure stdlib `unittest` so this can run even in a minimal
virtualenv with only the parser's own dependencies installed.

Run:
    python -m unittest tests.test_smoke
"""
from __future__ import annotations

import logging
import os
import sys
import tempfile
import unittest
from typing import List

# Make `src.md_to_jsonl` importable when invoked from the repo root.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Silence the parser's INFO logs so `python -m unittest -v` output stays
# readable. The parser itself is pure-stdlib, so this import is safe.
logging.getLogger("md_to_jsonl").setLevel(logging.WARNING)

from src.md_to_jsonl import (  # noqa: E402  (sys.path tweak above)
    MAX_CHUNK_CHARS,
    TABLE_ROWS_PER_CHUNK,
    extract_cross_refs,
    parse_md_file,
    parse_requirements_from_lines,
    split_section_into_chunks,
    split_table_block,
)

PLACEHOLDER_DIR = os.path.join(REPO_ROOT, "data", "placeholders")
PLACEHOLDER_FILES = [
    os.path.join(PLACEHOLDER_DIR, "placeholder_template_{}.md".format(n))
    for n in range(1, 6)
]

REQUIRED_KEYS = {
    "id",
    "heading",
    "text",
    "object_type",
    "is_heading",
    "module",
    "full_text",
    "outgoing_links",
    "attributes",
}

# Small slack allowance over MAX_CHUNK_CHARS — the parser may overshoot
# slightly when a single requirement/paragraph happens to be oversized
# and cannot be split further. Keep this generous but finite.
CHUNK_SIZE_SLACK = 1000


def _parse_all_placeholders():
    """Parse every placeholder file once with the same dedup logic as main().

    Returns (all_objects, per_file_counts).
    """
    all_objects = []
    per_file = []
    seen_ids = set()
    for path in PLACEHOLDER_FILES:
        objs, _, _ = parse_md_file(path)
        per_file.append((os.path.basename(path), len(objs)))
        # Mirror md_to_jsonl.main() dedup: append "_N" suffix on collision.
        for obj in objs:
            base_id = obj["id"]
            counter = 1
            while obj["id"] in seen_ids:
                obj["id"] = base_id + "_" + str(counter)
                counter += 1
            seen_ids.add(obj["id"])
        all_objects.extend(objs)
    return all_objects, per_file


class SmokeTests(unittest.TestCase):
    """End-to-end offline smoke tests for the MD parser."""

    @classmethod
    def setUpClass(cls) -> None:
        # Confirm the placeholder corpus is actually on disk before we run
        # anything else — a missing fixture would produce a confusing cascade
        # of unrelated failures downstream.
        for path in PLACEHOLDER_FILES:
            if not os.path.isfile(path):
                raise unittest.SkipTest(
                    "Missing placeholder fixture: {}".format(path)
                )
        cls.all_objects, cls.per_file_counts = _parse_all_placeholders()

    # --------------------------------------------------------------
    # 1. Parser imports and runs without crashing on all 5 files
    # --------------------------------------------------------------
    def test_01_parses_all_placeholders(self) -> None:
        self.assertEqual(
            len(self.per_file_counts), 5,
            "Expected exactly 5 placeholder files to be parsed",
        )
        for name, count in self.per_file_counts:
            with self.subTest(file=name):
                self.assertGreater(
                    count, 0,
                    "Placeholder {} produced zero records".format(name),
                )

    # --------------------------------------------------------------
    # 2. Record count sanity: each file > 0, total > 50
    # --------------------------------------------------------------
    def test_02_record_count_sanity(self) -> None:
        total = len(self.all_objects)
        self.assertGreater(
            total, 50,
            "Expected >50 total records across placeholders, got {}".format(total),
        )
        # Sanity: at least one requirement-typed object must exist.
        req_count = sum(
            1 for o in self.all_objects if o["object_type"] == "Requirement"
        )
        self.assertGreater(req_count, 0, "Expected some Requirement objects")

    # --------------------------------------------------------------
    # 3. JSONL schema: every record has required keys
    # --------------------------------------------------------------
    def test_03_required_keys(self) -> None:
        for obj in self.all_objects:
            missing = REQUIRED_KEYS - set(obj.keys())
            self.assertFalse(
                missing,
                "Record id={!r} missing keys: {}".format(
                    obj.get("id"), sorted(missing),
                ),
            )
        # Also sanity-check the declared types of the nested collections.
        for obj in self.all_objects:
            self.assertIsInstance(obj["outgoing_links"], list)
            self.assertIsInstance(obj["attributes"], dict)
            self.assertIsInstance(obj["is_heading"], bool)

    # --------------------------------------------------------------
    # 4. ID uniqueness after the parser's _N suffix dedup step
    # --------------------------------------------------------------
    def test_04_id_uniqueness(self) -> None:
        ids = [obj["id"] for obj in self.all_objects]
        self.assertEqual(
            len(ids), len(set(ids)),
            "Duplicate IDs found after dedup step",
        )
        # No empty IDs either.
        for obj in self.all_objects:
            self.assertTrue(
                obj["id"].strip(),
                "Empty ID in record: {!r}".format(obj),
            )

    # --------------------------------------------------------------
    # 5. Cross-ref extraction round-trip (English + Turkish keywords)
    # --------------------------------------------------------------
    def test_05_cross_ref_extraction_roundtrip(self) -> None:
        snippet = (
            "Some body text for requirement FOO-100.\n"
            "Satisfies: PARENT-1\n"
            "Derives From: PARENT-2\n"
            "Karsilar: PARENT-3\n"  # see note below on keyword casefolding
            "Turetilir: PARENT-4\n"
            "Dogrular: PARENT-5\n"
            "See also ##OtherModule.XREF-9\n"
        )
        # NOTE: The parser's trace regex handles the Turkish-ASCII and
        # Turkish-diacritic forms both. Use the diacritic forms too to be
        # explicit — the parser's regex includes both.
        snippet_diacritic = (
            "Some body text for requirement FOO-101.\n"
            "Satisfies: PARENT-1\n"
            "Derives From: PARENT-2\n"
            "Karşılar: PARENT-3\n"
            "Türetilir: PARENT-4\n"
            "Doğrular: PARENT-5\n"
            "See also ##OtherModule.XREF-9\n"
        )

        refs = extract_cross_refs(snippet_diacritic)
        by_target = {r["target_id"]: r for r in refs}

        # Typed links must use the right link_type.
        self.assertIn("PARENT-1", by_target)
        self.assertEqual(by_target["PARENT-1"]["link_type"], "satisfies")

        self.assertIn("PARENT-2", by_target)
        self.assertEqual(by_target["PARENT-2"]["link_type"], "derives_from")

        self.assertIn("PARENT-3", by_target)
        self.assertEqual(
            by_target["PARENT-3"]["link_type"], "satisfies",
            "Karşılar: should map to satisfies",
        )

        self.assertIn("PARENT-4", by_target)
        self.assertEqual(
            by_target["PARENT-4"]["link_type"], "derives_from",
            "Türetilir: should map to derives_from",
        )

        self.assertIn("PARENT-5", by_target)
        self.assertEqual(
            by_target["PARENT-5"]["link_type"], "verifies",
            "Doğrular: should map to verifies",
        )

        # ##Module.ID form still yields a generic references link.
        self.assertIn("XREF-9", by_target)
        self.assertEqual(by_target["XREF-9"]["link_type"], "references")
        self.assertEqual(by_target["XREF-9"]["target_module"], "OtherModule")

        # No duplicate targets should appear in the result list.
        self.assertEqual(
            len(refs), len({r["target_id"] for r in refs}),
            "Duplicate target_id values in extract_cross_refs output",
        )

        # The ASCII-only keyword variant should still find the English
        # trace keywords (Turkish ASCII forms aren't in the regex, only
        # the diacritic ones are — that's fine, we just confirm English
        # still works).
        ascii_refs = extract_cross_refs(snippet)
        ascii_by_target = {r["target_id"]: r for r in ascii_refs}
        self.assertEqual(ascii_by_target["PARENT-1"]["link_type"], "satisfies")
        self.assertEqual(ascii_by_target["PARENT-2"]["link_type"], "derives_from")

    # --------------------------------------------------------------
    # 6. English block markers "|| Requirement No:... || Requirement: ..."
    # --------------------------------------------------------------
    def test_06_english_requirement_markers(self) -> None:
        lines = [
            "|| Requirement No:FOO-001 || Requirement: The system shall do X. ||",
        ]
        blocks = parse_requirements_from_lines(lines)
        self.assertEqual(len(blocks), 1, "Expected exactly one parsed block")
        kind, text = blocks[0]
        self.assertEqual(
            kind, "requirement",
            "English marker was not classified as a requirement",
        )
        self.assertIn("FOO-001", text)
        self.assertIn("The system shall do X.", text)

        # Also through the full chunking path: make sure split_section_into_chunks
        # treats it as a single requirement chunk.
        chunks = split_section_into_chunks(
            "|| Requirement No:FOO-001 || Requirement: The system shall do X. ||"
        )
        self.assertEqual(len(chunks), 1)
        self.assertIn("FOO-001", chunks[0])

    # --------------------------------------------------------------
    # 7. Note: absorption — English "Note:" must attach to the preceding req
    # --------------------------------------------------------------
    def test_07_english_note_absorption(self) -> None:
        # Multi-line requirement with a trailing English "Note:".
        lines = [
            "|| Requirement No:FOO-002 || Requirement: Something important",
            "Note: Timing is critical here. ||",
        ]
        blocks = parse_requirements_from_lines(lines)
        self.assertEqual(
            len(blocks), 1,
            "English Note: line should be absorbed, not produce a new block",
        )
        kind, text = blocks[0]
        self.assertEqual(kind, "requirement")
        self.assertIn("FOO-002", text)
        self.assertIn("Note: Timing is critical here.", text)

        # Single-line complete requirement followed by a trailing Note:.
        lines = [
            "|| Requirement No:FOO-003 || Requirement: Something short. ||",
            "Note: trailing note ||",
            "Header: Next",
        ]
        blocks = parse_requirements_from_lines(lines)
        # First block is the requirement (with absorbed note), second is the
        # "other" content for the stray Header line.
        self.assertGreaterEqual(len(blocks), 1)
        self.assertEqual(blocks[0][0], "requirement")
        self.assertIn("FOO-003", blocks[0][1])
        self.assertIn("Note: trailing note", blocks[0][1])

    # --------------------------------------------------------------
    # 8. Table chunking: 50-row table splits into chunks, header repeated
    # --------------------------------------------------------------
    def test_08_table_chunking(self) -> None:
        header = "|Name|Unit|Range|Default|"
        rows = [header]
        for i in range(50):
            rows.append("|field_{}|ms|0-100|0|".format(i))
        table = "\n".join(rows)

        chunks = split_table_block(table)
        self.assertGreaterEqual(
            len(chunks), 2,
            "50-row table should split into >=2 chunks "
            "(TABLE_ROWS_PER_CHUNK={})".format(TABLE_ROWS_PER_CHUNK),
        )
        # Every chunk must start with the header row (header is repeated).
        for idx, chunk in enumerate(chunks):
            first_line = chunk.split("\n", 1)[0]
            self.assertEqual(
                first_line, header,
                "Chunk {} does not start with header: {!r}".format(idx, first_line),
            )

        # Total data row count across chunks should equal 50 (none dropped,
        # none duplicated beyond the repeated header).
        data_rows = 0
        for chunk in chunks:
            for line in chunk.split("\n"):
                if line.startswith("|field_"):
                    data_rows += 1
        self.assertEqual(data_rows, 50)

    # --------------------------------------------------------------
    # 9. No chunk exceeds MAX_CHUNK_CHARS + small slack
    # --------------------------------------------------------------
    def test_09_chunk_size_cap(self) -> None:
        oversize = []
        for obj in self.all_objects:
            size = len(obj.get("text", "") or "")
            if size > MAX_CHUNK_CHARS + CHUNK_SIZE_SLACK:
                oversize.append((obj["id"], size))
        self.assertFalse(
            oversize,
            "Chunks exceed MAX_CHUNK_CHARS ({}) + slack ({}): {}".format(
                MAX_CHUNK_CHARS, CHUNK_SIZE_SLACK, oversize[:5],
            ),
        )

    # --------------------------------------------------------------
    # 10. Heading hierarchy: stacked empty-body headers nest with " > "
    # --------------------------------------------------------------
    def test_10_heading_hierarchy(self) -> None:
        snippet = (
            "#Requirement: REQ-XXX\n"
            "PROJECT NAME: Demo\n"
            "MODULE NAME: MYMODULE\n"
            "BASELINE: v1\n"
            "ABSOLUTE PATH: /foo\n"
            "Header: GEREKSİNİMLER\n"
            "Header: Hesaplamalar\n"
            "|| Requirement No:FOO-001 || Requirement: Compute velocity. ||\n"
        )
        # Write to a temp file in /tmp and parse it.
        with tempfile.NamedTemporaryFile(
            suffix=".md", mode="w", delete=False,
            encoding="utf-8", dir=tempfile.gettempdir(),
        ) as fh:
            fh.write(snippet)
            path = fh.name
        try:
            objs, mod, _ = parse_md_file(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

        self.assertEqual(mod, "MYMODULE")
        # Find the requirement object — its heading should be the nested path.
        reqs = [o for o in objs if o["object_type"] == "Requirement"]
        self.assertTrue(reqs, "No Requirement parsed from heading-hierarchy snippet")

        foo = reqs[0]
        self.assertEqual(foo["id"], "FOO-001")
        self.assertEqual(
            foo["heading"], "GEREKSİNİMLER > Hesaplamalar",
            "Expected nested heading joined by ' > ', got: {!r}".format(
                foo["heading"],
            ),
        )
        # full_text must carry the nested heading prefix too.
        self.assertTrue(
            foo["full_text"].startswith("GEREKSİNİMLER > Hesaplamalar"),
            "full_text missing nested heading prefix: {!r}".format(
                foo["full_text"],
            ),
        )
        self.assertIn("Compute velocity.", foo["full_text"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
