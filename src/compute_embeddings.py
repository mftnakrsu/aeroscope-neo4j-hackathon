"""
Batch embedding computation for requirements.

Uses the OpenAI embeddings API (text-embedding-3-small, 1536 dims by default)
and stores vectors ONLY in Neo4j as :Requirement.embedding node properties
(Aura-native vector search — no ChromaDB).

If requirement_enricher.py has been run, summaries stored on Requirement nodes
are prepended to the embedding input as a multi-representation prefix.

Usage:
    $ python -m src.compute_embeddings -i data/synthetic/requirements.jsonl
    $ python -m src.compute_embeddings -i data/synthetic/requirements.jsonl --batch-size 64
    $ python -m src.compute_embeddings -i data/synthetic/requirements.jsonl --clear
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
import time
from typing import List

from neo4j import GraphDatabase
from openai import OpenAI

from src.config import (
    NEO4J_PASSWORD,
    NEO4J_URI,
    NEO4J_USER,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_EMBEDDING_DIMENSIONS,
    OPENAI_EMBEDDING_MODEL,
)
from src.llm_utils import read_input

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("embeddings")


def embed_batch(
    client: OpenAI, texts: List[str], model: str, dimensions: int
) -> List[List[float]]:
    """Compute embeddings for a batch of texts via the OpenAI API."""
    response = client.embeddings.create(
        model=model,
        input=texts,
        dimensions=dimensions,
    )
    return [item.embedding for item in response.data]


def clear_embeddings(driver) -> None:
    """Remove the embedding property from every Requirement node."""
    with driver.session() as session:
        result = session.run(
            "MATCH (r:Requirement) WHERE r.embedding IS NOT NULL "
            "REMOVE r.embedding RETURN count(r) AS cnt"
        )
        cnt = result.single()["cnt"]
        logger.info(f"Cleared embeddings from {cnt} Requirement node(s)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compute OpenAI embeddings and store them on Neo4j Requirement nodes."
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="JSONL file, MD file, or directory of MD files",
    )
    parser.add_argument(
        "--batch-size", type=int, default=64, help="Embedding batch size (default 64)"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear r.embedding on all Requirement nodes before loading",
    )
    args = parser.parse_args()

    # Load requirements
    try:
        requirements = read_input(args.input)
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)
    logger.info(f"Loaded {len(requirements)} requirements")

    # Fetch LLM-generated summaries from Neo4j (if requirement_enricher.py was run)
    summary_map = {}
    try:
        driver_tmp = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        with driver_tmp.session() as session:
            result = session.run(
                "MATCH (r:Requirement) WHERE r.summary IS NOT NULL "
                "RETURN r.id AS id, r.summary AS summary"
            )
            for rec in result:
                if rec["summary"]:
                    summary_map[rec["id"]] = rec["summary"]
        driver_tmp.close()
        if summary_map:
            logger.info(
                f"Loaded {len(summary_map)} summaries for multi-representation embedding"
            )
    except Exception as e:
        logger.warning(
            f"Could not fetch summaries from Neo4j (continuing without): {e}"
        )

    # Prepare texts for embedding
    texts: List[str] = []
    valid_reqs: List[dict] = []
    for req in requirements:
        full_text = req.get("full_text", "")
        if not full_text:
            heading = req.get("heading", "")
            text = req.get("text", "")
            full_text = (
                f"{heading} -- {text}" if heading and text else heading or text
            )

        # Strip requirement table markers for cleaner embeddings
        full_text = re.sub(r"\s*\|\|\s*", " ", full_text)
        full_text = full_text.strip()

        # For tables: convert pipe-separated format to readable text
        if req.get("object_type") == "Table" and "|" in full_text:
            lines = full_text.split("\n")
            cleaned = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("|") and stripped.endswith("|"):
                    cells = [c.strip() for c in stripped.strip("|").split("|")]
                    cleaned.append(", ".join(c for c in cells if c))
                elif not re.match(r"^-{5,}$", stripped):
                    cleaned.append(stripped)
            full_text = "\n".join(cleaned)

        if full_text.strip():
            req_id = req.get("id", "")

            # Prepend summary if available (multi-representation embedding)
            summary = summary_map.get(req_id, "")
            if summary:
                full_text = f"[Summary] {summary}\n\n{full_text}"

            # Truncate to stay within model context (~8k tokens)
            if len(full_text) > 24000:
                full_text = full_text[:24000] + "..."
                logger.warning(
                    f"  Truncated long text: {req_id or '?'} ({len(full_text)} chars)"
                )
            texts.append(full_text)
            valid_reqs.append(req)

    logger.info(f"Embedding {len(texts)} non-empty texts...")

    # Initialize OpenAI embedding client
    client = OpenAI(
        api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=120.0
    )
    logger.info(
        f"Embedding model: {OPENAI_EMBEDDING_MODEL} "
        f"(dimensions={OPENAI_EMBEDDING_DIMENSIONS})"
    )

    # Compute embeddings in batches with retry
    all_embeddings: List[List[float]] = []
    failed_indices: List[int] = []
    batch_size = args.batch_size
    max_retries = 3
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_ok = False
        for attempt in range(max_retries):
            try:
                batch_embs = embed_batch(
                    client,
                    batch_texts,
                    OPENAI_EMBEDDING_MODEL,
                    OPENAI_EMBEDDING_DIMENSIONS,
                )
                all_embeddings.extend(batch_embs)
                batch_ok = True
                break
            except Exception as e:
                delay = 2 ** attempt  # 1s, 2s, 4s
                if attempt < max_retries - 1:
                    logger.warning(
                        f"  Batch {i // batch_size + 1} attempt {attempt + 1} "
                        f"failed: {e} — retrying in {delay}s"
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        f"  Batch {i // batch_size + 1} failed after "
                        f"{max_retries} attempts: {e}"
                    )
        if not batch_ok:
            failed_indices.extend(range(i, min(i + batch_size, len(texts))))
        logger.info(f"  Embedded: {min(i + batch_size, len(texts))}/{len(texts)}")

    # Remove failed requirements
    if failed_indices:
        failed_set = set(failed_indices)
        valid_reqs = [r for idx, r in enumerate(valid_reqs) if idx not in failed_set]
        texts = [t for idx, t in enumerate(texts) if idx not in failed_set]
        logger.warning(
            f"  {len(failed_indices)} texts failed, continuing with {len(valid_reqs)}"
        )

    if not all_embeddings:
        logger.error("No embeddings computed — all batches failed")
        sys.exit(1)

    logger.info(
        f"Embeddings computed: {len(all_embeddings)} vectors, "
        f"dim={len(all_embeddings[0])}"
    )

    # -----------------------------------------------
    # Store in Neo4j (Aura-native vector)
    # -----------------------------------------------
    logger.info("Storing embeddings in Neo4j...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    if args.clear:
        clear_embeddings(driver)

    NEO4J_BATCH = 100
    ids = [req["id"] for req in valid_reqs]
    neo4j_stored = 0
    with driver.session() as session:
        for i in range(0, len(ids), NEO4J_BATCH):
            batch_ids = ids[i : i + NEO4J_BATCH]
            batch_embs = all_embeddings[i : i + NEO4J_BATCH]

            records = [
                {"id": rid, "embedding": emb}
                for rid, emb in zip(batch_ids, batch_embs)
            ]

            try:
                session.run(
                    """
                    UNWIND $batch AS row
                    MATCH (r:Requirement {id: row.id})
                    SET r.embedding = row.embedding
                    """,
                    batch=records,
                )
                neo4j_stored += len(batch_ids)
            except Exception as e:
                logger.error(f"  Neo4j batch {i // NEO4J_BATCH + 1} failed: {e}")

            logger.info(f"  Neo4j: {min(i + NEO4J_BATCH, len(ids))}/{len(ids)}")

    driver.close()
    if neo4j_stored < len(ids):
        logger.warning(
            f"  Neo4j: {neo4j_stored}/{len(ids)} stored (some batches failed)"
        )

    logger.info("=" * 50)
    logger.info("  Embedding Pipeline Complete")
    logger.info(f"  Total vectors: {len(ids)}")
    logger.info(f"  Dimension: {len(all_embeddings[0])}")
    logger.info("  Storage: Neo4j Requirement.embedding (Aura-native vector)")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
