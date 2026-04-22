"""
Entity extraction for AeroScope requirements — rule-based + optional LLM.

Extracts aerospace domain entities (systems, standards, components,
organizations, interfaces, parameters, test methods, operational modes) and
creates entity nodes + relationships in Neo4j Aura. The LLM path talks to the
OpenAI API (``text-embedding-3-small`` / ``gpt-4o-mini`` by default, fully
configurable through ``src/config.py``).

Modes:
    regex   -- Fast rule-based extraction only (no LLM calls)
    llm     -- LLM-based extraction only (OpenAI API)
    hybrid  -- Regex first, then LLM enrichment (default, best quality)

Usage:
    $ python -m src.entity_extractor -i data/synthetic/requirements.jsonl
    $ python -m src.entity_extractor -i data/synthetic/requirements.jsonl --mode regex
    $ python -m src.entity_extractor -i data/synthetic/requirements.jsonl --mode hybrid --batch-size 5
"""

import argparse
import logging
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Set

from neo4j import GraphDatabase
from openai import OpenAI

from src.config import (
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD,
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
logger = logging.getLogger("entity_extractor")

# Neo4j labels and relationship types per entity type
ENTITY_TYPES: Dict[str, str] = {
    "system": "System",
    "standard": "Standard",
    "component": "Component",
    "organization": "Organization",
    "interface": "Interface",
    "parameter": "Parameter",
    "test_method": "TestMethod",
    "mode": "OperationalMode",
}

ENTITY_RELATIONS: Dict[str, str] = {
    "system": "MENTIONS_SYSTEM",
    "standard": "REFERENCES_STANDARD",
    "component": "USES_COMPONENT",
    "organization": "INVOLVES_ORG",
    "interface": "USES_INTERFACE",
    "parameter": "HAS_PARAMETER",
    "test_method": "VERIFIED_BY_METHOD",
    "mode": "OPERATES_IN_MODE",
}

# Node colors for visualization (used by optional graph viz UI)
ENTITY_COLORS: Dict[str, str] = {
    "System": "#E74C3C",
    "Standard": "#F39C12",
    "Component": "#9B59B6",
    "Organization": "#1ABC9C",
    "Interface": "#E67E22",
    "Parameter": "#95A5A6",
    "TestMethod": "#3498DB",
    "OperationalMode": "#E91E63",
}

# ----------------------------------------------------------------
# REGEX PATTERNS (aerospace domain, English only)
# ----------------------------------------------------------------

_STANDARD_RE = re.compile(
    r'\b(?:'
    r'DO-\d+\w*|ARP\s*\d+\w*|MIL-STD-\d+\w*|MIL-PRF-\d+\w*|'
    r'STANAG\s*\d+|DEF[\s-]?STAN\s*\d+[-\d]*|'
    r'ISO\s*\d+|IEEE\s*\d+|RTCA\s+DO-\d+|SAE\s+\w+\d+|'
    r'AS\d{4}\w*|ASTM\s*\w+\d+|IEC\s*\d+|EN\s*\d+'
    r')\b',
    re.IGNORECASE,
)

_INTERFACE_RE = re.compile(
    r'\b(?:'
    r'MIL-STD-1553\w*|ARINC[\s-]?\d+|RS-\d+|'
    r'CAN[\s-]?Bus|Ethernet|USB|SPI|I2C|UART|'
    r'RS-422|RS-232|IEEE[\s-]?802\.\d+\w*|'
    r'LVDS|SpaceWire|TTP|AFDX|FC-AE|Link[\s-]?16'
    r')\b',
    re.IGNORECASE,
)

# Fictional AeroScope platforms (Stratos / AeroLynx / Skyrunner / Nimbus)
_SYSTEM_RE = re.compile(
    r'\b(?:'
    r'Stratos[-\s]?\d+[A-Z]*|'
    r'AeroLynx[-\s]?X?\d*[A-Z]*|'
    r'Skyrunner[-\s]?T?\d+[A-Z]*|'
    r'Nimbus[-\s]?[A-Z]?\d*'
    r')\b'
)

# International aerospace organizations + fictional AeroSys Dynamics
_ORG_RE = re.compile(
    r'\b(?:'
    r'AeroSys\s+Dynamics|'
    r'Boeing|Airbus|Lockheed|Northrop|Raytheon|Thales|'
    r'Honeywell|Collins|Safran|Leonardo|MBDA|'
    r'GE|Pratt|Rolls-Royce'
    r')\b',
    re.IGNORECASE,
)

_COMPONENT_RE = re.compile(
    r'\b(?:'
    # Avionics computers and processors
    r'ASC|FCC|MC|IOP|OFP|BSP|'
    # Navigation and sensors
    r'INS|IMU|GPS|GNSS|ADS|AHRS|ADC|IRS|'
    r'FLIR|EO|IR|SAR|LIDAR|'
    # Communication and data
    r'CDU|MFD|HUD|UFC|HOTAS|'
    r'AGM|HVT|TM|TC|CDL|'
    # Memory and hardware
    r'NVRAM|EEPROM|FPGA|DSP|'
    # Test and monitoring
    r'BIT|IBIT|CBIT|PBIT|'
    # Protocols and checksums
    r'CRC|DMA'
    r')\b'
)

# Verification / validation methods (DO-178C, ARP4754A style)
_TEST_METHOD_RE = re.compile(
    r'\b(?:'
    r'Analysis|Test|Inspection|Demonstration|Review|'
    r'Simulation|Verification|Validation'
    r')\b'
)

# Operational modes (avionics state machines, English only)
_MODE_RE = re.compile(
    r'\b(?:'
    r'[Ff]light\s+[Mm]ode|[Gg]round\s+[Mm]ode|[Ss]tandby\s+[Mm]ode|'
    r'[Ee]mergency\s+[Mm]ode|[Nn]avigation\s+[Mm]ode|'
    r'[Mm]aintenance\s+[Mm]ode|[Ss]tartup\s+[Mm]ode|[Tt]raining\s+[Mm]ode|'
    r'[Oo]perational\s+[Mm]ode|[Dd]egraded\s+[Mm]ode|[Nn]ormal\s+[Mm]ode|'
    # Generic: BIT Mode, WOW Mode, Air Mode
    r'BIT\s+[Mm]od[eu]?|WOW\s+[Mm]od[eu]?|Air\s+[Mm]od[eu]?'
    r')\b'
)


def extract_entities_regex(text: str) -> Dict[str, Set[str]]:
    """Rule-based entity extraction for the aerospace domain."""
    entities: Dict[str, Set[str]] = {t: set() for t in ENTITY_TYPES}

    for m in _STANDARD_RE.finditer(text):
        entities["standard"].add(m.group().strip())

    for m in _INTERFACE_RE.finditer(text):
        val = m.group().strip()
        # MIL-STD-1553 is both standard and interface -- prefer interface
        entities["interface"].add(val)
        entities["standard"].discard(val)

    for m in _COMPONENT_RE.finditer(text):
        entities["component"].add(m.group().strip())

    for m in _SYSTEM_RE.finditer(text):
        entities["system"].add(m.group().strip())

    for m in _ORG_RE.finditer(text):
        entities["organization"].add(m.group().strip())

    for m in _TEST_METHOD_RE.finditer(text):
        entities["test_method"].add(m.group().strip())

    for m in _MODE_RE.finditer(text):
        entities["mode"].add(m.group().strip())

    return entities


# ----------------------------------------------------------------
# LLM-BASED EXTRACTION
# ----------------------------------------------------------------

EXTRACTION_PROMPT = """\
You are an aerospace domain entity extractor.
Extract named entities from each requirement below. Return ONLY a valid JSON object.

Entity types:
- system: Aircraft / UAV / platform names (e.g. Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3)
- standard: Standards / specs (DO-178C, ARP4754A, MIL-STD-1760, STANAG 4586, DO-254, DO-160, ISO/IEEE/SAE standards, etc.)
- component: HW/SW components (INS, GPS, radar, FCC, IMU, pitot, servo, MFD, HUD, FPGA, etc.)
- organization: Companies / institutions (AeroSys Dynamics, Boeing, Airbus, Lockheed, Honeywell, Collins, Safran, Thales, etc.)
- interface: Protocols / buses (MIL-STD-1553, ARINC 429, Ethernet, RS-422, CAN Bus, AFDX, Link-16, etc.)
- parameter: Measurable values with units (speed 250 kt, altitude 40000 ft, 28V DC, 400Hz, etc.)
- test_method: Verification / validation methods (Analysis, Test, Inspection, Demonstration, Review, Simulation, Verification, Validation)
- mode: Operational modes (Flight Mode, Ground Mode, Standby Mode, Emergency Mode, BIT Mode, Degraded Mode, Normal Mode, etc.)

Rules:
- Extract exact names as they appear in the text. Do NOT invent entities.
- Use empty arrays for types with no matches.
- Return a JSON object keyed by requirement ID.

Return format:
{"REQ-ID": {"system": [], "standard": [], "component": [], "organization": [], "interface": [], "parameter": [], "test_method": [], "mode": []}}
"""


def extract_entities_llm(
    client: OpenAI, batch: List[Dict], model: str
) -> Dict[str, Dict[str, List[str]]]:
    """LLM extraction for a batch of requirements.

    Returns ``{req_id: {type: [names]}}``. Retries once on parse failure.
    """
    context_parts = []
    for req in batch:
        req_id = req.get("id", "?")
        text = req.get("full_text", "") or req.get("text", "")
        heading = req.get("heading", "")
        content = f"{heading} -- {text}" if heading else text
        context_parts.append(f"[{req_id}]\n{content}")

    user_prompt = "\n\n".join(context_parts)

    last_err: Exception = None  # type: ignore[assignment]
    for attempt in range(2):
        try:
            messages: List[Dict[str, str]] = [
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
            if attempt == 1:
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Output ONLY valid JSON. No thinking, no "
                            "explanation, no markdown fences."
                        ),
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
                f"LLM returned unparseable JSON (attempt {attempt + 1}): "
                f"{raw[:500] if raw else 'EMPTY'}"
            )

        except Exception as e:
            last_err = e
            if attempt == 0:
                logger.warning(f"LLM call failed (retrying): {e}")
                continue
            raise

    if last_err:
        logger.warning(f"LLM extraction failed after retries: {last_err}")
    return {}


# ----------------------------------------------------------------
# NEO4J STORAGE
# ----------------------------------------------------------------

def create_entity_constraints(driver) -> None:
    """Create uniqueness constraints for entity node types."""
    with driver.session() as session:
        for label in ENTITY_TYPES.values():
            try:
                session.run(
                    f"CREATE CONSTRAINT {label.lower()}_name IF NOT EXISTS "
                    f"FOR (e:{label}) REQUIRE e.name IS UNIQUE"
                )
            except Exception as e:
                logger.warning(f"Constraint warning ({label}): {e}")


def store_entities(driver, req_id: str, entities: Dict[str, list]) -> None:
    """Create entity nodes and link them to the requirement."""
    with driver.session() as session:
        for etype, names in entities.items():
            label = ENTITY_TYPES.get(etype)
            rel = ENTITY_RELATIONS.get(etype)
            if not label or not rel or not names:
                continue
            for name in names:
                name = str(name).strip()
                if not name or len(name) < 2:
                    continue
                session.run(
                    f"MERGE (e:{label} {{name: $name}}) "
                    f"WITH e "
                    f"MATCH (r:Requirement {{id: $req_id}}) "
                    f"MERGE (r)-[:{rel}]->(e)",
                    name=name,
                    req_id=req_id,
                )


# ----------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract entities from AeroScope requirements"
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
        default=5,
        help="Requirements per LLM call",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Parallel LLM workers (default 4)",
    )
    parser.add_argument(
        "--mode",
        choices=["llm", "regex", "hybrid"],
        default="hybrid",
        help="regex=fast rules only, llm=LLM only, hybrid=both (default)",
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
    create_entity_constraints(driver)

    # Collect entities per requirement
    all_entities: Dict[str, Dict[str, list]] = {}

    # --- Pass 1: Regex ---
    if args.mode in ("regex", "hybrid"):
        logger.info("Pass 1: Rule-based extraction...")
        for req in requirements:
            req_id = req.get("id", "")
            text = (
                req.get("full_text", "")
                or f"{req.get('heading', '')} {req.get('text', '')}"
            )
            regex_ents = extract_entities_regex(text)
            all_entities[req_id] = {k: list(v) for k, v in regex_ents.items()}

        regex_total = sum(
            len(n) for ents in all_entities.values() for n in ents.values()
        )
        logger.info(f"  Regex found: {regex_total} entity mentions")

    # --- Pass 2: LLM (parallel) ---
    if args.mode in ("llm", "hybrid"):
        logger.info(f"Pass 2: LLM-based extraction ({args.workers} workers)...")
        llm = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            timeout=120.0,
        )
        bs = args.batch_size

        # Build batch list
        batches = []
        for i in range(0, len(requirements), bs):
            batches.append((i, requirements[i : i + bs]))

        def _run_llm_batch(batch_info):
            idx, batch = batch_info
            try:
                return (
                    idx,
                    batch,
                    extract_entities_llm(llm, batch, OPENAI_MODEL),
                    None,
                )
            except Exception as e:
                return idx, batch, None, e

        completed = 0
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(_run_llm_batch, b): b for b in batches}
            for future in as_completed(futures):
                idx, batch, llm_result, error = future.result()
                completed += len(batch)

                if error:
                    logger.error(f"  Batch {idx // bs + 1} failed: {error}")
                    continue

                # Merge LLM results with regex results
                for req in batch:
                    req_id = req.get("id", "")
                    if req_id not in all_entities:
                        all_entities[req_id] = {t: [] for t in ENTITY_TYPES}

                    llm_ents = llm_result.get(req_id, {})
                    for etype in ENTITY_TYPES:
                        existing = set(all_entities[req_id].get(etype, []))
                        for name in llm_ents.get(etype, []):
                            if isinstance(name, str) and name.strip():
                                existing.add(name.strip())
                        all_entities[req_id][etype] = list(existing)

                logger.info(f"  LLM: {completed}/{len(requirements)}")

    # --- Store in Neo4j ---
    logger.info("Storing entities in Neo4j...")
    unique: Dict[str, set] = {t: set() for t in ENTITY_TYPES}
    total_links = 0

    for req_id, entities in all_entities.items():
        try:
            store_entities(driver, req_id, entities)
            for etype, names in entities.items():
                for n in names:
                    unique[etype].add(n)
                    total_links += 1
        except Exception as e:
            logger.error(f"  Store failed for {req_id}: {e}")

    driver.close()

    # Stats
    logger.info("=" * 50)
    logger.info("  Entity Extraction Complete")
    logger.info("=" * 50)
    total_unique = 0
    for etype, names in unique.items():
        if names:
            label = ENTITY_TYPES[etype]
            logger.info(f"  {label:15s}: {len(names)} unique")
            for n in sorted(names)[:10]:
                logger.info(f"    - {n}")
            if len(names) > 10:
                logger.info(f"    ... +{len(names) - 10} more")
            total_unique += len(names)
    logger.info(f"  Total unique entities: {total_unique}")
    logger.info(f"  Total entity-requirement links: {total_links}")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
