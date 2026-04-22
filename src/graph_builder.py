"""
Knowledge graph builder for AeroScope requirements using Neo4j Aura.

Reads parsed requirements from a JSONL file (produced by ``md_to_jsonl.py``)
and constructs a Neo4j Aura knowledge graph with full traceability
relationships. The pipeline targets a managed Neo4j Aura instance (not an
on-prem deployment), so all Cypher is written to be compatible with Aura's
default configuration (no APOC, no custom plugins required).

Graph Schema:
    Nodes::
        (:Requirement {id, text, heading, module, module_path, object_type,
                        level, full_text, priority, status, platform, ...})
        (:Module {name, path})
        (:Platform {name})
        (:Standard {name})
        (:Component {name})
        (:TestProcedure {id})
        (:Stakeholder {name})
        (:Organization {name})
        (:Interface {name})
        (:OperationalMode {name})

    Relationships::
        (:Module)-[:CONTAINS]->(:Requirement)
        (:Requirement)-[:NEXT]->(:Requirement)          // document order
        (:Requirement)-[:SATISFIES]->(:Requirement)
        (:Requirement)-[:DERIVES_FROM]->(:Requirement)
        (:Requirement)-[:VERIFIES]->(:Requirement)
        ... and additional trace link types

Usage:
    $ python -m src.graph_builder -i data/synthetic/requirements.jsonl --clear
"""

import argparse
import logging
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

from neo4j import GraphDatabase

from src.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from src.llm_utils import read_input

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("graph_builder")


class GraphBuilder:
    """Builds a Neo4j Aura knowledge graph from parsed AeroScope requirements."""

    LINK_TYPE_TO_REL: Dict[str, str] = {
        "satisfies": "SATISFIES",
        "satisfied_by": "SATISFIED_BY",
        "derives_from": "DERIVES_FROM",
        "derives": "DERIVES",
        "derives_to": "DERIVES_TO",
        "verifies": "VERIFIES",
        "verified_by": "VERIFIED_BY",
        "implements": "IMPLEMENTS",
        "implemented_by": "IMPLEMENTED_BY",
        "traces_to": "TRACES_TO",
        "traced_from": "TRACED_FROM",
        "allocated_to": "ALLOCATED_TO",
        "allocates": "ALLOCATES",
        "refines": "REFINES",
        "refined_by": "REFINED_BY",
        "covers": "COVERS",
        "covered_by": "COVERED_BY",
        "depends_on": "DEPENDS_ON",
        "related_to": "RELATED_TO",
        "conflicts_with": "CONFLICTS_WITH",
        "references": "REFERENCES",
        "references_standard": "REFERENCES_STANDARD",
        # Neutral link types (kept for forward compatibility with optional
        # figure / table chunk flows).
        "illustrates": "ILLUSTRATES",
        "illustrated_by": "ILLUSTRATED_BY",
        "describes": "DESCRIBES",
        "described_by": "DESCRIBED_BY",
    }

    def __init__(self) -> None:
        self.driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self._verify_connection()

    def _verify_connection(self) -> None:
        with self.driver.session() as session:
            result = session.run("RETURN 1 AS n")
            result.single()
        logger.info("Neo4j connection OK")

    def close(self) -> None:
        self.driver.close()

    def clear_database(self) -> None:
        """Remove all nodes and relationships."""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        logger.info("Database cleared")

    def create_constraints_and_indexes(self) -> None:
        """Create uniqueness constraints, indexes, full-text + vector indexes.

        Targets Neo4j Aura with the embedding dimension aligned to OpenAI's
        ``text-embedding-3-small`` model (1536 dims, cosine similarity).
        """
        queries: List[str] = [
            # Uniqueness constraints — one per node label
            "CREATE CONSTRAINT req_id IF NOT EXISTS FOR (r:Requirement) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT mod_name IF NOT EXISTS FOR (m:Module) REQUIRE m.name IS UNIQUE",
            "CREATE CONSTRAINT platform_name IF NOT EXISTS FOR (p:Platform) REQUIRE p.name IS UNIQUE",
            "CREATE CONSTRAINT standard_name IF NOT EXISTS FOR (s:Standard) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT component_name IF NOT EXISTS FOR (c:Component) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT testprocedure_id IF NOT EXISTS FOR (t:TestProcedure) REQUIRE t.id IS UNIQUE",
            "CREATE CONSTRAINT stakeholder_name IF NOT EXISTS FOR (s:Stakeholder) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT organization_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE",
            "CREATE CONSTRAINT interface_name IF NOT EXISTS FOR (i:Interface) REQUIRE i.name IS UNIQUE",
            "CREATE CONSTRAINT operationalmode_name IF NOT EXISTS FOR (m:OperationalMode) REQUIRE m.name IS UNIQUE",
            # Secondary indexes on Requirement for common filter paths
            "CREATE INDEX req_module IF NOT EXISTS FOR (r:Requirement) ON (r.module)",
            "CREATE INDEX req_type IF NOT EXISTS FOR (r:Requirement) ON (r.object_type)",
            "CREATE INDEX req_heading IF NOT EXISTS FOR (r:Requirement) ON (r.heading)",
            "CREATE INDEX req_platform IF NOT EXISTS FOR (r:Requirement) ON (r.platform)",
            # Full-text index across the main human-readable fields
            """CREATE FULLTEXT INDEX requirement_text_ft IF NOT EXISTS
               FOR (r:Requirement) ON EACH [r.text, r.heading, r.summary]""",
            # Vector index: OpenAI text-embedding-3-small = 1536 dims, cosine
            """CREATE VECTOR INDEX requirement_embeddings IF NOT EXISTS
               FOR (r:Requirement) ON r.embedding
               OPTIONS {indexConfig: {
                   `vector.dimensions`: 1536,
                   `vector.similarity_function`: 'cosine'
               }}""",
        ]
        with self.driver.session() as session:
            for q in queries:
                try:
                    session.run(q)
                except Exception as e:
                    logger.warning(f"Index/constraint warning: {e}")

        logger.info("Constraints and indexes created")

    def load_requirements(self, jsonl_path: str) -> Dict[str, int]:
        """Load requirements from a JSONL file (or MD/dir) into Neo4j."""
        path = Path(jsonl_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        requirements = read_input(str(path))
        logger.info(f"Loaded {len(requirements)} requirements from {path.name}")

        stats = {
            "nodes": 0,
            "modules": 0,
            "links": 0,
            "next_links": 0,
            "parameters": 0,
        }

        # Create module nodes
        modules: Dict[str, str] = {}
        for r in requirements:
            mod_name = r.get("module", "")
            if mod_name and mod_name not in modules:
                modules[mod_name] = r.get("module_path", "")

        with self.driver.session() as session:
            for mod_name, mod_path in modules.items():
                session.run(
                    "MERGE (m:Module {name: $name}) SET m.path = $path",
                    name=mod_name,
                    path=mod_path,
                )
                stats["modules"] += 1

        # Create requirement nodes in batches
        BATCH_SIZE = 500
        for i in range(0, len(requirements), BATCH_SIZE):
            batch = requirements[i : i + BATCH_SIZE]
            batch_params = []

            for req in batch:
                attrs = req.get("attributes", {})
                node_props = {
                    "id": req["id"],
                    "text": req.get("text", ""),
                    "heading": req.get("heading", ""),
                    "module": req.get("module", ""),
                    "module_path": req.get("module_path", ""),
                    "object_type": req.get("object_type", ""),
                    "level": req.get("level", 0),
                    "full_text": req.get("full_text", ""),
                    "has_ole": len(req.get("ole_files", [])) > 0,
                    "has_parameters": len(req.get("parameters", [])) > 0,
                }
                # Only set non-empty attributes (avoid storing "" in Neo4j)
                for key in [
                    "priority",
                    "status",
                    "verification_method",
                    "safety_classification",
                    "allocated_subsystem",
                    "platform",
                    "rationale",
                    "compliance_standard",
                    "performance_target",
                    "test_procedure",
                    "baseline",
                    "project",
                ]:
                    val = attrs.get(key, "")
                    if val:
                        node_props[key] = val
                batch_params.append(node_props)

            with self.driver.session() as session:
                session.run(
                    """
                    UNWIND $batch AS req
                    MERGE (r:Requirement {id: req.id})
                    SET r += req
                    """,
                    batch=batch_params,
                )
                stats["nodes"] += len(batch)

            logger.info(
                f"  Created nodes: {min(i + BATCH_SIZE, len(requirements))}/"
                f"{len(requirements)}"
            )

        # Create Module -[:CONTAINS]-> Requirement
        with self.driver.session() as session:
            session.run(
                """
                MATCH (r:Requirement)
                WHERE r.module IS NOT NULL AND r.module <> ''
                MATCH (m:Module {name: r.module})
                MERGE (m)-[:CONTAINS]->(r)
                """
            )

        # Create NEXT relationships (document order within modules)
        with self.driver.session() as session:
            for mod_name in modules:
                mod_reqs = [
                    r for r in requirements if r.get("module") == mod_name
                ]
                for j in range(len(mod_reqs) - 1):
                    session.run(
                        """
                        MATCH (a:Requirement {id: $id_a})
                        MATCH (b:Requirement {id: $id_b})
                        MERGE (a)-[:NEXT]->(b)
                        """,
                        id_a=mod_reqs[j]["id"],
                        id_b=mod_reqs[j + 1]["id"],
                    )
                    stats["next_links"] += 1

        # Create Parameter nodes and USES_PARAMETER relationships
        all_params: Set[str] = set()
        for req in requirements:
            for p in req.get("parameters", []):
                all_params.add(p)

        if all_params:
            with self.driver.session() as session:
                for param_name in all_params:
                    session.run(
                        "MERGE (p:Parameter {name: $name})",
                        name=param_name,
                    )
                    stats["parameters"] += 1

                for req in requirements:
                    for p in req.get("parameters", []):
                        session.run(
                            """
                            MATCH (r:Requirement {id: $req_id})
                            MATCH (p:Parameter {name: $param_name})
                            MERGE (r)-[:USES_PARAMETER]->(p)
                            """,
                            req_id=req["id"],
                            param_name=p,
                        )

        # Create trace links (both explicit and incoming)
        link_count = 0
        with self.driver.session() as session:
            for req in requirements:
                for link in req.get("outgoing_links", []):
                    target_id = link.get("target_id", "")
                    if not target_id:
                        continue
                    link_type = link.get("link_type", "related_to")
                    rel_type = self.LINK_TYPE_TO_REL.get(link_type, "RELATED_TO")
                    link_module = link.get("link_module", "")

                    session.run(
                        f"""
                        MATCH (a:Requirement {{id: $source_id}})
                        MATCH (b:Requirement {{id: $target_id}})
                        MERGE (a)-[r:{rel_type}]->(b)
                        SET r.link_module = $link_module
                        """,
                        source_id=req["id"],
                        target_id=target_id,
                        link_module=link_module,
                    )
                    link_count += 1

                for link in req.get("incoming_links", []):
                    source_id = link.get("source_id", "")
                    if not source_id:
                        continue
                    link_type = link.get("link_type", "related_to")
                    rel_type = self.LINK_TYPE_TO_REL.get(link_type, "RELATED_TO")
                    link_module = link.get("link_module", "")

                    session.run(
                        f"""
                        MATCH (a:Requirement {{id: $source_id}})
                        MATCH (b:Requirement {{id: $target_id}})
                        MERGE (a)-[r:{rel_type}]->(b)
                        SET r.link_module = $link_module
                        """,
                        source_id=source_id,
                        target_id=req["id"],
                        link_module=link_module,
                    )
                    link_count += 1

        stats["links"] = link_count

        # Auto-discover cross-references by scanning requirement texts
        auto_links = self._auto_link_requirements(requirements)
        stats["auto_links"] = auto_links

        logger.info("=" * 50)
        logger.info("  Graph Build Statistics")
        logger.info("=" * 50)
        logger.info(f"  Requirement nodes: {stats['nodes']}")
        logger.info(f"  Module nodes:      {stats['modules']}")
        logger.info(f"  Parameter nodes:   {stats['parameters']}")
        logger.info(f"  Trace links:       {stats['links']}")
        logger.info(f"  Auto-discovered:   {stats['auto_links']}")
        logger.info(f"  Next links:        {stats['next_links']}")
        logger.info("=" * 50)

        return stats

    # Context keywords -> relationship type
    # (searched within 80 chars before the ID match)
    _LINK_CONTEXT = [
        (re.compile(r'satisf', re.IGNORECASE), "SATISFIES"),
        (re.compile(r'derives?\s*from', re.IGNORECASE), "DERIVES_FROM"),
        (re.compile(r'derives?\s*to|derives?\b', re.IGNORECASE), "DERIVES"),
        (re.compile(r'verif', re.IGNORECASE), "VERIFIES"),
        (re.compile(r'implement', re.IGNORECASE), "IMPLEMENTS"),
        (re.compile(r'trace', re.IGNORECASE), "TRACES_TO"),
        (re.compile(r'allocat', re.IGNORECASE), "ALLOCATED_TO"),
        (re.compile(r'refine', re.IGNORECASE), "REFINES"),
        (re.compile(r'cover', re.IGNORECASE), "COVERS"),
        (re.compile(r'depend', re.IGNORECASE), "DEPENDS_ON"),
        (re.compile(r'conflict', re.IGNORECASE), "CONFLICTS_WITH"),
    ]

    def _detect_link_type(self, text: str, match_start: int) -> str:
        """Detect relationship type from context words near the ID match."""
        # Look at 80 chars before the match
        context_start = max(0, match_start - 80)
        context = text[context_start:match_start].lower()
        for pattern, rel_type in self._LINK_CONTEXT:
            if pattern.search(context):
                return rel_type
        return "REFERENCES"

    def _auto_link_requirements(self, requirements: List[Dict]) -> int:
        """Scan requirement texts for references to other known requirement IDs.

        Format-agnostic: works with any DOORS export format. Catches:
        - Bare IDs in text: "see SysRS-001"
        - Trace columns: "Trace Down: SysRS-001, SysRS-002"
        - Cross-refs: "##SysRS.SysRS-001"
        - Comma-separated lists: "SysRS-001, SysRS-002, SysRS-003"
        """
        # Collect all known requirement IDs
        known_ids: Set[str] = set()
        req_texts: Dict[str, str] = {}  # id -> full searchable text
        req_modules: Dict[str, str] = {}  # id -> module

        for req in requirements:
            req_id = req.get("id", "")
            if req_id:
                known_ids.add(req_id)
                text = req.get("full_text", "") or ""
                heading = req.get("heading", "")
                req_texts[req_id] = f"{heading} {text}"
                req_modules[req_id] = req.get("module", "")

        if not known_ids:
            return 0

        # Build a regex that matches any known ID (escaped, word-boundary)
        # Sort by length descending so longer IDs match first
        sorted_ids = sorted(known_ids, key=len, reverse=True)
        # Escape special regex chars in IDs
        escaped = [re.escape(rid) for rid in sorted_ids]
        # Build pattern in chunks to avoid regex size limits
        CHUNK = 500
        patterns = []
        for i in range(0, len(escaped), CHUNK):
            chunk = escaped[i : i + CHUNK]
            patterns.append(re.compile(r'(?<!\w)(' + '|'.join(chunk) + r')(?!\w)'))

        logger.info(
            f"Auto-linking: scanning {len(req_texts)} requirements "
            f"for {len(known_ids)} known IDs..."
        )

        # Scan each requirement for references to other IDs
        auto_links: List[Tuple[str, str, str]] = []  # (source, target, rel_type)
        seen: Set[Tuple[str, str]] = set()  # avoid duplicates

        for source_id, text in req_texts.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    target_id = match.group(1)
                    # Skip self-references
                    if target_id == source_id:
                        continue
                    # Skip duplicates
                    key = (source_id, target_id)
                    if key in seen:
                        continue
                    seen.add(key)

                    rel_type = self._detect_link_type(text, match.start())
                    auto_links.append((source_id, target_id, rel_type))

        if not auto_links:
            logger.info("  Auto-linking: no cross-references found in texts")
            return 0

        # Create relationships in Neo4j (batch by relationship type)
        link_count = 0
        with self.driver.session() as session:
            for source_id, target_id, rel_type in auto_links:
                try:
                    session.run(
                        f"""
                        MATCH (a:Requirement {{id: $source_id}})
                        MATCH (b:Requirement {{id: $target_id}})
                        MERGE (a)-[r:{rel_type}]->(b)
                        SET r.auto_discovered = true
                        """,
                        source_id=source_id,
                        target_id=target_id,
                    )
                    link_count += 1
                except Exception as e:
                    logger.warning(
                        f"  Auto-link failed {source_id}->{target_id}: {e}"
                    )

        # Log summary by type
        type_counts: Dict[str, int] = {}
        for _, _, rt in auto_links:
            type_counts[rt] = type_counts.get(rt, 0) + 1
        for rt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            logger.info(f"  Auto-link: {rt}: {count}")

        return link_count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build Neo4j Aura graph from parsed AeroScope requirements"
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="Path to JSONL file, MD file, or directory of MD files",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear database before loading",
    )
    args = parser.parse_args()

    builder = GraphBuilder()

    try:
        if args.clear:
            builder.clear_database()

        builder.create_constraints_and_indexes()
        builder.load_requirements(args.input)
    finally:
        builder.close()


if __name__ == "__main__":
    main()
