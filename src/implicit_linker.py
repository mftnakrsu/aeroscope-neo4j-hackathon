"""
LLM-based implicit relationship discovery between requirements.

Uses embedding similarity to pre-filter candidate pairs, then validates
each pair via LLM to determine if a meaningful semantic relationship exists.

This step runs AFTER compute_embeddings.py (needs vector index) and adds
relationships that regex-based auto-linking cannot discover — implicit
dependencies, complementary requirements, constraints, and conflicts.

Usage:
    $ python -m src.implicit_linker
    $ python -m src.implicit_linker --threshold 0.75 --top-k 15
    $ python -m src.implicit_linker --dry-run
    $ python -m src.implicit_linker --clear   # remove previous LLM-discovered links first
"""

from __future__ import annotations

import argparse
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple

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
from src.llm_utils import parse_llm_json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("implicit_linker")

# Relationship types discoverable by the LLM
IMPLICIT_REL_TYPES = {
    "semantic_dependency": "SEMANTICALLY_DEPENDS_ON",
    "complementary": "COMPLEMENTS",
    "constrains": "CONSTRAINS",
    "conflicts": "POTENTIALLY_CONFLICTS",
}

VALIDATION_PROMPT = """\
You are an aerospace requirements traceability auditor. Your job is to REJECT false relationships.

Given pairs of requirements, determine if a STRONG functional relationship exists.
You must answer "none" for MOST pairs. Only flag a relationship when there is a clear, direct, functional dependency.

Classification (use "none" unless you are highly confident):
- "none": DEFAULT. Use when requirements merely share terminology, belong to the same module, reference the same system/component, or describe similar-but-independent functions. Similar topic is NOT a relationship.
- "semantic_dependency": One requirement DIRECTLY depends on the other's output, value, or state. Example: REQ-A defines a signal, REQ-B explicitly consumes that signal.
- "complementary": Requirements define DIFFERENT PARTS of the SAME function that would break if not implemented together. Not just "related topics".
- "constrains": One requirement DIRECTLY limits a value, range, or behavior defined by the other. Must reference the same specific parameter.
- "conflicts": Requirements contain CONTRADICTORY values, conditions, or behaviors for the SAME thing. Not just different aspects.

Return JSON:
{"pairs": [{"id_a": "...", "id_b": "...", "relationship": "none", "reason": "no direct functional dependency"}]}

CRITICAL RULES:
- Default to "none". When in doubt, answer "none".
- At least 60-70% of pairs should be "none" — if you are flagging most pairs, you are being too permissive.
- Sharing the same module, system name, or component does NOT imply a relationship.
- Both requirements referencing the same table/message type does NOT imply a relationship unless one directly depends on the other.
- "complementary" requires that removing one would break the other — not just topical similarity.
"""


def get_candidate_pairs(
    driver, top_k: int = 20, threshold: float = 0.75, max_pairs: int = 10000
) -> List[Tuple[str, str, float]]:
    """Find candidate requirement pairs using the Neo4j vector index.

    Uses the vector index on Requirement.embedding for efficient HNSW search.
    Returns deduplicated (id_a, id_b, similarity) tuples above the threshold.
    """
    pairs: Dict[Tuple[str, str], float] = {}

    with driver.session() as session:
        # Get all requirement IDs that have embeddings
        result = session.run(
            "MATCH (r:Requirement) WHERE r.embedding IS NOT NULL "
            "RETURN r.id AS id"
        )
        req_ids = [rec["id"] for rec in result]
        logger.info(f"Requirements with embeddings: {len(req_ids)}")

        # For each requirement, find top-K most similar via vector index
        for i, req_id in enumerate(req_ids):
            try:
                result = session.run(
                    """
                    MATCH (source:Requirement {id: $id})
                    CALL db.index.vector.queryNodes(
                        'requirement_embeddings', $k, source.embedding
                    ) YIELD node, score
                    WHERE node.id <> $id
                    RETURN node.id AS neighbor_id, score
                    """,
                    id=req_id,
                    k=top_k,
                )

                for rec in result:
                    sim = rec["score"]
                    if sim >= threshold:
                        nid = rec["neighbor_id"]
                        # Deduplicate: use sorted pair as key
                        pair_key = tuple(sorted([req_id, nid]))
                        if pair_key not in pairs or sim > pairs[pair_key]:
                            pairs[pair_key] = sim

            except Exception as e:
                # Vector index may not exist — fall back to brute force
                if i == 0:
                    logger.warning(f"Vector index query failed: {e}")
                    logger.info("Falling back to pairwise cosine (slower)...")
                    return _fallback_pairwise(driver, threshold, max_pairs)
                continue

            if (i + 1) % 500 == 0:
                logger.info(
                    f"  Vector search: {i + 1}/{len(req_ids)} "
                    f"({len(pairs)} candidates)"
                )

    # Filter out pairs that already have explicit relationships
    filtered: List[Tuple[str, str, float]] = []
    with driver.session() as session:
        for (id_a, id_b), sim in sorted(pairs.items(), key=lambda x: -x[1]):
            if len(filtered) >= max_pairs:
                break
            result = session.run(
                """
                MATCH (a:Requirement {id: $a})-[r]-(b:Requirement {id: $b})
                RETURN count(r) AS cnt
                """,
                a=id_a,
                b=id_b,
            )
            if result.single()["cnt"] == 0:
                filtered.append((id_a, id_b, sim))

    logger.info(f"Candidate pairs after filtering: {len(filtered)}")
    return filtered


def _fallback_pairwise(
    driver, threshold: float, max_pairs: int
) -> List[Tuple[str, str, float]]:
    """Fallback: compute pairwise cosine in Cypher (for when vector index is absent)."""
    pairs: List[Tuple[str, str, float]] = []
    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Requirement), (b:Requirement)
            WHERE a.embedding IS NOT NULL AND b.embedding IS NOT NULL
            AND a.id < b.id
            WITH a, b,
                 gds.similarity.cosine(a.embedding, b.embedding) AS sim
            WHERE sim >= $threshold
            AND NOT (a)-[]-(b)
            RETURN a.id AS id_a, b.id AS id_b, sim
            ORDER BY sim DESC
            LIMIT $limit
            """,
            threshold=threshold,
            limit=max_pairs,
        )
        for rec in result:
            pairs.append((rec["id_a"], rec["id_b"], rec["sim"]))

    logger.info(f"Fallback pairwise found {len(pairs)} candidates")
    return pairs


def get_req_texts(driver, req_ids: List[str]) -> Dict[str, str]:
    """Fetch requirement texts for a list of IDs."""
    texts: Dict[str, str] = {}
    with driver.session() as session:
        result = session.run(
            """
            UNWIND $ids AS rid
            MATCH (r:Requirement {id: rid})
            RETURN r.id AS id,
                   coalesce(r.summary, '') AS summary,
                   coalesce(r.full_text, '') AS text,
                   coalesce(r.heading, '') AS heading
            """,
            ids=req_ids,
        )
        for rec in result:
            parts = []
            if rec["summary"]:
                parts.append(f"[Summary] {rec['summary']}")
            if rec["heading"]:
                parts.append(f"[Section] {rec['heading']}")
            parts.append(rec["text"])
            texts[rec["id"]] = "\n".join(parts)
    return texts


def validate_batch(
    client: OpenAI,
    pairs: List[Tuple[str, str, float]],
    texts: Dict[str, str],
    model: str,
) -> List[Dict]:
    """Validate a batch of candidate pairs via the LLM.

    Returns list of {"id_a", "id_b", "relationship", "reason"} dicts.
    """
    context_parts = []
    for id_a, id_b, sim in pairs:
        text_a = texts.get(id_a, "(no text)")
        text_b = texts.get(id_b, "(no text)")
        context_parts.append(
            f"--- Pair: {id_a} <-> {id_b} (similarity: {sim:.3f}) ---\n"
            f"[{id_a}]\n{text_a}\n\n[{id_b}]\n{text_b}"
        )

    user_prompt = "\n\n".join(context_parts)

    for attempt in range(2):
        try:
            messages = [
                {"role": "system", "content": VALIDATION_PROMPT},
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
                return parsed.get("pairs", [])

            logger.warning(
                f"LLM validation: unparseable JSON (attempt {attempt + 1}): "
                f"{raw[:500] if raw else 'EMPTY'}"
            )
            continue

        except Exception as e:
            if attempt == 0:
                logger.warning(f"LLM validation failed (retrying): {e}")
                continue
            raise

    return []


def store_implicit_link(
    driver, id_a: str, id_b: str, rel_type: str, reason: str
) -> None:
    """Create an implicit relationship in Neo4j."""
    neo4j_rel = IMPLICIT_REL_TYPES.get(rel_type)
    if not neo4j_rel:
        return

    with driver.session() as session:
        session.run(
            f"MATCH (a:Requirement {{id: $a}}) "
            f"MATCH (b:Requirement {{id: $b}}) "
            f"MERGE (a)-[r:{neo4j_rel}]->(b) "
            f"SET r.auto_discovered = true, "
            f"    r.discovery_method = 'llm_implicit', "
            f"    r.llm_reason = $reason",
            a=id_a,
            b=id_b,
            reason=reason,
        )


def clear_implicit_links(driver) -> None:
    """Remove all LLM-discovered implicit relationships."""
    with driver.session() as session:
        result = session.run(
            "MATCH ()-[r {discovery_method: 'llm_implicit'}]-() "
            "DELETE r RETURN count(r) AS cnt"
        )
        cnt = result.single()["cnt"]
        logger.info(f"Cleared {cnt} implicit links")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Discover implicit relationships between requirements via LLM"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.75,
        help="Minimum cosine similarity for candidate pairs (default 0.75)",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=20,
        help="Number of similar requirements to check per requirement (default 20)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Pairs per LLM validation call (default 5)",
    )
    parser.add_argument(
        "--workers", type=int, default=4, help="Parallel LLM workers (default 4)"
    )
    parser.add_argument(
        "--max-pairs",
        type=int,
        default=10000,
        help="Maximum candidate pairs to process (default 10000)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print candidates and LLM decisions without writing to Neo4j",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Remove all LLM-discovered implicit links before running",
    )
    args = parser.parse_args()

    # Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()

    if args.clear:
        clear_implicit_links(driver)

    # Step 1: Find candidate pairs via embedding similarity
    logger.info(
        f"Finding candidates (threshold={args.threshold}, top_k={args.top_k})..."
    )
    candidates = get_candidate_pairs(
        driver,
        top_k=args.top_k,
        threshold=args.threshold,
        max_pairs=args.max_pairs,
    )

    if not candidates:
        logger.info("No candidate pairs found. Check threshold or embeddings.")
        driver.close()
        return

    # Fetch requirement texts for all candidates
    all_ids = set()
    for id_a, id_b, _ in candidates:
        all_ids.add(id_a)
        all_ids.add(id_b)
    texts = get_req_texts(driver, list(all_ids))
    logger.info(f"Fetched text for {len(texts)} requirements")

    # Step 2: LLM validation in batches (parallel)
    logger.info(
        f"Validating {len(candidates)} pairs via LLM ({args.workers} workers)..."
    )
    client = OpenAI(
        api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL, timeout=120.0
    )
    bs = args.batch_size

    link_counts = {k: 0 for k in IMPLICIT_REL_TYPES}
    none_count = 0
    failed_count = 0

    # Build batch list
    batches = []
    for i in range(0, len(candidates), bs):
        batches.append((i, candidates[i : i + bs]))

    def _run_validate_batch(batch_info):
        idx, batch = batch_info
        try:
            return idx, batch, validate_batch(client, batch, texts, OPENAI_MODEL), None
        except Exception as e:
            return idx, batch, None, e

    completed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(_run_validate_batch, b): b for b in batches}
        for future in as_completed(futures):
            idx, batch, decisions, error = future.result()
            completed += len(batch)

            if error:
                logger.error(f"  Batch {idx // bs + 1} failed: {error}")
                failed_count += len(batch)
                continue

            for decision in decisions:
                rel = decision.get("relationship", "none")
                id_a = decision.get("id_a", "")
                id_b = decision.get("id_b", "")
                reason = decision.get("reason", "")

                if rel == "none" or rel not in IMPLICIT_REL_TYPES:
                    none_count += 1
                    continue

                if args.dry_run:
                    neo4j_rel = IMPLICIT_REL_TYPES[rel]
                    logger.info(
                        f"  [DRY-RUN] {id_a} --[{neo4j_rel}]--> {id_b}: {reason}"
                    )
                else:
                    try:
                        store_implicit_link(driver, id_a, id_b, rel, reason)
                        link_counts[rel] = link_counts.get(rel, 0) + 1
                    except Exception as e:
                        logger.error(f"  Store failed for {id_a}-{id_b}: {e}")
                        failed_count += 1

            logger.info(f"  Progress: {completed}/{len(candidates)}")

    driver.close()

    # Stats
    total_links = sum(link_counts.values())
    logger.info("=" * 50)
    logger.info("  Implicit Link Discovery Complete")
    logger.info("=" * 50)
    logger.info(f"  Candidates evaluated: {len(candidates)}")
    logger.info(f"  Links created: {total_links}")
    logger.info(f"  No relationship: {none_count}")
    logger.info(f"  Failed: {failed_count}")
    if total_links:
        logger.info("  Breakdown:")
        for rel_key, neo4j_rel in IMPLICIT_REL_TYPES.items():
            cnt = link_counts.get(rel_key, 0)
            if cnt:
                logger.info(f"    {neo4j_rel:30s}: {cnt}")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
