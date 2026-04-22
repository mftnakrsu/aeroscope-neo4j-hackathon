"""
LLM-based requirement enrichment — summary generation + classification.

Reads requirements from JSONL, generates a concise English summary and
classifies each requirement (Functional / Non-Functional / Safety / Interface /
Performance) via the OpenAI API, and stores the results as properties on
Neo4j Requirement nodes.

The summary is later used by compute_embeddings.py as a multi-representation
prefix to improve retrieval quality.

Usage:
    $ python -m src.requirement_enricher -i data/synthetic/requirements.jsonl
    $ python -m src.requirement_enricher -i data/synthetic/requirements.jsonl --force
    $ python -m src.requirement_enricher -i data/synthetic/requirements.jsonl --batch-size 3
"""

from __future__ import annotations

import argparse
import logging
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

from neo4j import GraphDatabase
from openai import OpenAI

from src.config import (
    NEO4J_PASSWORD,
    NEO4J_URI,
    NEO4J_USER,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
)
from src.llm_utils import parse_llm_json, read_input

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("requirement_enricher")

REQUIREMENT_CLASSES = [
    "Functional",
    "Non-Functional",
    "Safety",
    "Interface",
    "Performance",
]

ENRICHMENT_PROMPT = """\
You are an aerospace requirements engineering expert.
For each requirement below, generate:
1. A concise 1-2 sentence English summary preserving technical terms, IDs, and units.
2. A classification into exactly one of: Functional, Non-Functional, Safety, Interface, Performance.

Requirements are from fictional civil/defence UAV programmes at AeroSys Dynamics.
Platforms include Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3.

Return a JSON object keyed by requirement ID:
{"REQ-ID": {"summary": "English summary...", "classification": "Functional"}}

Rules:
- Summaries must be written in English.
- Use the exact requirement ID as the JSON key.
- Classification must be one of: Functional, Non-Functional, Safety, Interface, Performance.
- For table/data requirements, summarize what data the table defines.
"""


def get_existing_summaries(driver) -> set:
    """Return IDs of requirements that already have summaries in Neo4j."""
    with driver.session() as session:
        result = session.run(
            "MATCH (r:Requirement) WHERE r.summary IS NOT NULL "
            "RETURN r.id AS id"
        )
        return {rec["id"] for rec in result}


def enrich_batch(
    client: OpenAI, batch: List[Dict], model: str
) -> Dict[str, Dict]:
    """Call the LLM to generate summaries + classifications for a batch.

    Returns {req_id: {"summary": ..., "classification": ...}}.
    """
    context_parts = []
    for req in batch:
        req_id = req.get("id", "?")
        text = req.get("full_text", "") or req.get("text", "")
        heading = req.get("heading", "")
        content = f"{heading} -- {text}" if heading else text
        context_parts.append(f"[{req_id}]\n{content}")

    user_prompt = "\n\n".join(context_parts)

    last_err = None
    for attempt in range(2):
        try:
            messages = [
                {"role": "system", "content": ENRICHMENT_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
            if attempt == 1:
                messages.append(
                    {
                        "role": "user",
                        "content": "Output ONLY valid JSON. No explanation, no markdown fences.",
                    }
                )

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=4096,
                temperature=0.0,
            )

            content = ""
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content or ""
            raw = content.strip()
            parsed = parse_llm_json(raw)
            if parsed is not None:
                return parsed

            logger.warning(
                f"Unparseable JSON (attempt {attempt + 1}): "
                f"{raw[:500] if raw else 'EMPTY'}"
            )

        except Exception as e:
            last_err = e
            if attempt == 0:
                logger.warning(f"LLM call failed (retrying): {e}")
                continue
            raise

    if last_err:
        logger.warning(f"Enrichment failed after retries: {last_err}")
    return {}


def store_enrichment(driver, req_id: str, summary: str, classification: str) -> None:
    """Store summary and classification on the Neo4j Requirement node."""
    with driver.session() as session:
        session.run(
            "MATCH (r:Requirement {id: $id}) "
            "SET r.summary = $summary, r.requirement_class = $cls",
            id=req_id,
            summary=summary,
            cls=classification,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enrich requirements with LLM-generated summaries and classifications"
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="JSONL file, MD file, or directory of MD files",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=3,
        help="Requirements per LLM call (default 3)",
    )
    parser.add_argument(
        "--workers", type=int, default=4, help="Parallel LLM workers (default 4)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing summaries (default: skip enriched)",
    )
    args = parser.parse_args()

    # Load requirements
    try:
        requirements = read_input(args.input)
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)
    logger.info(f"Loaded {len(requirements)} requirements")

    # Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()

    # Skip already enriched (unless --force)
    if not args.force:
        existing = get_existing_summaries(driver)
        before = len(requirements)
        requirements = [r for r in requirements if r.get("id") not in existing]
        skipped = before - len(requirements)
        if skipped:
            logger.info(
                f"Skipping {skipped} already enriched (use --force to overwrite)"
            )

    if not requirements:
        logger.info("Nothing to enrich — all requirements already have summaries")
        driver.close()
        return

    logger.info(
        f"Enriching {len(requirements)} requirements ({args.workers} workers)..."
    )

    # OpenAI client
    client = OpenAI(
        api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=120.0
    )
    bs = args.batch_size

    enriched_count = 0
    failed_count = 0
    class_counts = {c: 0 for c in REQUIREMENT_CLASSES}

    # Build batch list
    batches = []
    for i in range(0, len(requirements), bs):
        batches.append((i, requirements[i : i + bs]))

    def _run_enrich_batch(batch_info):
        idx, batch = batch_info
        try:
            return idx, batch, enrich_batch(client, batch, OPENAI_MODEL), None
        except Exception as e:
            return idx, batch, None, e

    completed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(_run_enrich_batch, b): b for b in batches}
        for future in as_completed(futures):
            idx, batch, result, error = future.result()
            completed += len(batch)

            if error:
                logger.error(f"  Batch {idx // bs + 1} failed: {error}")
                failed_count += len(batch)
                continue

            for req in batch:
                req_id = req.get("id", "")
                enrichment = result.get(req_id, {})
                summary = enrichment.get("summary", "")
                classification = enrichment.get("classification", "")

                if classification not in REQUIREMENT_CLASSES:
                    classification = "Functional"

                if summary:
                    try:
                        store_enrichment(driver, req_id, summary, classification)
                        enriched_count += 1
                        class_counts[classification] = (
                            class_counts.get(classification, 0) + 1
                        )
                    except Exception as e:
                        logger.error(f"  Store failed for {req_id}: {e}")
                        failed_count += 1
                else:
                    failed_count += 1

            logger.info(f"  Progress: {completed}/{len(requirements)}")

    driver.close()

    # Stats
    logger.info("=" * 50)
    logger.info("  Requirement Enrichment Complete")
    logger.info("=" * 50)
    logger.info(f"  Enriched: {enriched_count}")
    logger.info(f"  Failed:   {failed_count}")
    logger.info("  Classification breakdown:")
    for cls, cnt in sorted(class_counts.items()):
        if cnt:
            logger.info(f"    {cls:20s}: {cnt}")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
