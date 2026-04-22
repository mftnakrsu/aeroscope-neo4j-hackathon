"""Seed AeroScope's Aura database with static domain entities.

Pre-populates the knowledge graph with :Platform, :Standard, :Stakeholder,
:Organization, :Interface, and :OperationalMode nodes BEFORE the requirements
pipeline runs. All entities here are fictional AeroSys Dynamics domain
(Stratos-7 / AeroLynx-X2 / Skyrunner-T1 / Nimbus-C3) or real public standards
and international suppliers. No real aircraft programs or contractors.

Sources:
  - docs/design/01_synthetic_domain.md (platforms, stakeholders, cert matrix)
  - docs/research/02_standards_reference.md (14 canonical standards)
  - aura/schema.cypher (node label contract)

Usage:
    python -m src.seed_entities                # seed (idempotent, MERGE-based)
    python -m src.seed_entities --clear        # drop + re-seed static labels
    python -m src.seed_entities --dry-run      # preview, no DB writes
"""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, ServiceUnavailable

from src.config import NEO4J_PASSWORD, NEO4J_URI, NEO4J_USER

try:
    from tqdm import tqdm
except ImportError:  # tqdm is optional
    def tqdm(iterable, **_kwargs):  # type: ignore[no-redef]
        return iterable

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


# =============================================================================
# Data classes
# =============================================================================


@dataclass(frozen=True)
class Platform:
    name: str
    role: str
    mtow_kg: int
    ceiling_ft: int
    range_nmi: int
    endurance_h: int
    engine: str
    payload: str
    operators: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class Standard:
    name: str
    full_name: str
    publisher: str
    category: str  # software / hardware / environmental / system / interface / safety / bus / comms
    url: str


@dataclass(frozen=True)
class Stakeholder:
    name: str
    role_description: str
    owns_modules: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class Organization:
    name: str
    category: str  # prime_contractor / international_supplier / standards_body
    country: str


@dataclass(frozen=True)
class Interface:
    name: str
    spec: str
    governing_standard: Optional[str]  # FK → Standard.name (may be None)


@dataclass(frozen=True)
class OperationalMode:
    name: str
    description: str


# =============================================================================
# Seed data — sourced from docs/design/01_synthetic_domain.md
# and docs/research/02_standards_reference.md
# =============================================================================


PLATFORMS: List[Platform] = [
    Platform(
        name="Stratos-7",
        role="Heavy ISR/strike UAV, medium-altitude long-endurance",
        mtow_kg=6000,
        ceiling_ft=44000,
        range_nmi=3400,
        endurance_h=28,
        engine="Single turbofan (8 kN class)",
        payload="EO/IR gimbal (30 cm), SAR/GMTI pod, 4x hardpoints",
        operators=["Westmark Defence Ministry", "Velor Armed Forces", "Greystate Defence"],
    ),
    Platform(
        name="AeroLynx-X2",
        role="Medium multi-role tactical ISR and light strike",
        mtow_kg=3000,
        ceiling_ft=35000,
        range_nmi=2200,
        endurance_h=22,
        engine="Twin turboprop (2 x 960 shp)",
        payload="EO/IR, L-band SAR, LRU-swappable comms",
        operators=["Coalition Border Patrol", "Maritime Surveillance Agency"],
    ),
    Platform(
        name="Skyrunner-T1",
        role="Small tactical ISR, short endurance",
        mtow_kg=600,
        ceiling_ft=20000,
        range_nmi=550,
        endurance_h=14,
        engine="Single piston (Rotax-class, 115 hp)",
        payload="Micro EO/IR, laser designator (optional)",
        operators=["Special Forces Units", "Civil Protection Wildfire Service"],
    ),
    Platform(
        name="Nimbus-C3",
        role="Unmanned cargo / logistics resupply",
        mtow_kg=4500,
        ceiling_ft=30000,
        range_nmi=1800,
        endurance_h=18,
        engine="Single turboprop (1,200 shp)",
        payload="Internal cargo bay 1.2 t, external under-fuselage pod",
        operators=["LogiSky Inc.", "NATO-allied Supply Corps"],
    ),
]


STANDARDS: List[Standard] = [
    Standard(
        name="DO-178C",
        full_name="Software Considerations in Airborne Systems and Equipment Certification",
        publisher="RTCA",
        category="software",
        url="https://www.rtca.org/products/do-178c-electronic/",
    ),
    Standard(
        name="DO-254",
        full_name="Design Assurance Guidance for Airborne Electronic Hardware",
        publisher="RTCA",
        category="hardware",
        url="https://www.rtca.org/do-178/",
    ),
    Standard(
        name="DO-160G",
        full_name="Environmental Conditions and Test Procedures for Airborne Equipment",
        publisher="RTCA",
        category="environmental",
        url="https://www.rtca.org/products/do-160g-electronic/",
    ),
    Standard(
        name="ARP4754A",
        full_name="Guidelines for Development of Civil Aircraft and Systems",
        publisher="SAE International",
        category="system",
        url="https://www.sae.org/standards/content/arp4754a/",
    ),
    Standard(
        name="ARP4761",
        full_name="Guidelines and Methods for Conducting the Safety Assessment Process on Civil Airborne Systems and Equipment",
        publisher="SAE International",
        category="safety",
        url="https://www.sae.org/standards/content/arp4761/",
    ),
    Standard(
        name="MIL-STD-1553B",
        full_name="Digital Time Division Command/Response Multiplex Data Bus",
        publisher="US Department of Defense",
        category="bus",
        url="https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36973",
    ),
    Standard(
        name="ARINC 429",
        full_name="Mark 33 Digital Information Transfer System",
        publisher="SAE-ITC / ARINC Industry Activities",
        category="bus",
        url="https://aviation-ia.sae-itc.com/standards/arinc429p1-17",
    ),
    Standard(
        name="STANAG 4586",
        full_name="Standard Interfaces of UAV Control System (UCS) for NATO UAV Interoperability",
        publisher="NATO Standardization Office",
        category="interface",
        url="https://nso.nato.int/nso/nsdd/main/standards",
    ),
    Standard(
        name="STANAG 7085",
        full_name="NATO Interoperable Data Links for ISR Systems",
        publisher="NATO Standardization Office",
        category="comms",
        url="https://nso.nato.int/nso/nsdd/main/standards",
    ),
    Standard(
        name="MIL-STD-1760",
        full_name="Aircraft/Store Electrical Interconnection System",
        publisher="US Department of Defense",
        category="interface",
        url="https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=37120",
    ),
    Standard(
        name="MIL-STD-810H",
        full_name="Environmental Engineering Considerations and Laboratory Tests",
        publisher="US Department of Defense",
        category="environmental",
        url="https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978",
    ),
    Standard(
        name="MIL-STD-882E",
        full_name="Department of Defense Standard Practice, System Safety",
        publisher="US Department of Defense",
        category="safety",
        url="https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36027",
    ),
    Standard(
        name="DO-297",
        full_name="Integrated Modular Avionics (IMA) Development Guidance and Certification Considerations",
        publisher="RTCA",
        category="system",
        url="https://my.rtca.org/nc__store",
    ),
    Standard(
        name="ARINC 653",
        full_name="Avionics Application Standard Software Interface",
        publisher="SAE-ITC / ARINC Industry Activities",
        category="software",
        url="https://aviation-ia.sae-itc.com/standards/arinc653p1-5",
    ),
]


STAKEHOLDERS: List[Stakeholder] = [
    Stakeholder(
        name="Chief Systems Engineer",
        role_description="Owns end-to-end platform requirements and architecture baseline.",
        owns_modules=["FCC", "FMS", "AUTO"],
    ),
    Stakeholder(
        name="Chief Software Engineer",
        role_description="Accountable for DO-178C DAL-A software lifecycle across all LRUs.",
        owns_modules=["FCC", "AUTO", "SEC"],
    ),
    Stakeholder(
        name="Certification Lead",
        role_description="Interfaces with EASA / civil authorities, owns Means of Compliance.",
        owns_modules=["FCC", "EMS", "STR", "SEC"],
    ),
    Stakeholder(
        name="Safety Engineer",
        role_description="Authors ARP4761 safety cases, FHA, PSSA, SSA artefacts.",
        owns_modules=["EMS", "BIT", "FCC", "APM"],
    ),
    Stakeholder(
        name="Avionics Integration Lead",
        role_description="Owns cross-LRU interfaces and bus architecture.",
        owns_modules=["CDL", "COMM", "INS", "NAV"],
    ),
    Stakeholder(
        name="Navigation Systems Engineer",
        role_description="Owns INS/GNSS fusion and performance-based navigation.",
        owns_modules=["INS", "GPS", "NAV", "ADS"],
    ),
    Stakeholder(
        name="Power Systems Engineer",
        role_description="Owns electrical bus architecture and power budget.",
        owns_modules=["PWR", "APM", "EPS"],
    ),
    Stakeholder(
        name="Propulsion Systems Engineer",
        role_description="Owns engine/fuel interface to airframe and FADEC.",
        owns_modules=["ENG", "FUEL", "TCS"],
    ),
    Stakeholder(
        name="Payload and Mission Systems Architect",
        role_description="Owns payload bay, gimbal control, and sensor tasking.",
        owns_modules=["PLD", "EOIR", "SAR"],
    ),
    Stakeholder(
        name="Ground Systems Engineer",
        role_description="Owns GCS software, HMI, and mission planning workflow.",
        owns_modules=["GCS", "HMI"],
    ),
    Stakeholder(
        name="Test Engineer Lead",
        role_description="Owns verification strategy, test procedures, and test readiness.",
        owns_modules=[],  # verification reqs span all modules
    ),
    Stakeholder(
        name="Cyber Security Engineer",
        role_description="Owns secure boot, key management, and cyber-resilience.",
        owns_modules=["SEC", "CDL", "FDR"],
    ),
    Stakeholder(
        name="Structures and Loads Engineer",
        role_description="Owns airframe load envelope and landing-gear kinematics.",
        owns_modules=["STR", "LDG", "ICE"],
    ),
]


ORGANIZATIONS: List[Organization] = [
    Organization(name="AeroSys Dynamics", category="prime_contractor", country="Germany"),
    Organization(name="Boeing", category="international_supplier", country="United States"),
    Organization(name="Airbus", category="international_supplier", country="France"),
    Organization(name="Honeywell", category="international_supplier", country="United States"),
    Organization(name="Collins Aerospace", category="international_supplier", country="United States"),
    Organization(name="Safran", category="international_supplier", country="France"),
    Organization(name="Leonardo", category="international_supplier", country="Italy"),
    Organization(name="MBDA", category="international_supplier", country="France"),
    Organization(name="GE Aerospace", category="international_supplier", country="United States"),
    Organization(name="Pratt & Whitney", category="international_supplier", country="United States"),
    Organization(name="Rolls-Royce", category="international_supplier", country="United Kingdom"),
    Organization(name="Thales", category="international_supplier", country="France"),
    Organization(name="Raytheon", category="international_supplier", country="United States"),
]


INTERFACES: List[Interface] = [
    Interface(
        name="MIL-STD-1553B",
        spec="1 Mbps dual-redundant serial command/response bus, up to 31 RTs, Manchester II biphase",
        governing_standard="MIL-STD-1553B",
    ),
    Interface(
        name="ARINC 429",
        spec="Point-to-point unidirectional, 12.5 kHz (low) / 100 kHz (high), 32-bit words, shielded twisted pair",
        governing_standard="ARINC 429",
    ),
    Interface(
        name="RS-422",
        spec="Differential point-to-multipoint serial, up to 10 Mbps / 1200 m, multi-drop (1 driver, 10 receivers)",
        governing_standard=None,
    ),
    Interface(
        name="CAN Bus",
        spec="Multi-master broadcast serial, up to 1 Mbps classical / 5 Mbps FD, differential twisted pair",
        governing_standard=None,
    ),
    Interface(
        name="Ethernet",
        spec="IEEE 802.3 packet-switched LAN, 10/100/1000 Mbps, twisted-pair or fibre",
        governing_standard=None,
    ),
    Interface(
        name="AFDX",
        spec="Deterministic Ethernet (ARINC 664 P7), 100 Mbps virtual links with bandwidth-allocation gap",
        governing_standard=None,
    ),
    Interface(
        name="SpaceWire",
        spec="ECSS-E-ST-50-12C full-duplex serial, 2-400 Mbps, LVDS signalling, point-to-point or routed",
        governing_standard=None,
    ),
    Interface(
        name="Link-16",
        spec="TDMA tactical datalink, Ku-band, STANAG 5516 / MIDS terminal class, jam-resistant",
        governing_standard="STANAG 4586",
    ),
]


OPERATIONAL_MODES: List[OperationalMode] = [
    OperationalMode(
        name="Flight Mode",
        description="Aircraft is airborne under normal control laws; all flight-critical functions active.",
    ),
    OperationalMode(
        name="Ground Mode",
        description="Aircraft is on the ground with weight-on-wheels asserted; taxi and pre-flight operations enabled.",
    ),
    OperationalMode(
        name="Standby Mode",
        description="System is powered and initialised but not actively commanding actuators or sensors.",
    ),
    OperationalMode(
        name="Emergency Mode",
        description="Flight-termination or emergency-landing sequence active; recovery logic in control.",
    ),
    OperationalMode(
        name="Navigation Mode",
        description="INS/GNSS fusion active, waypoint-following and guidance-law scheduling engaged.",
    ),
    OperationalMode(
        name="Maintenance Mode",
        description="Ground-only configuration for built-in test execution, log retrieval, and software loading.",
    ),
    OperationalMode(
        name="Startup Mode",
        description="Power-on initialisation, self-tests, and alignment before transitioning to Standby.",
    ),
    OperationalMode(
        name="Training Mode",
        description="Simulated flight envelope for operator training; actuator commands inhibited or redirected.",
    ),
    OperationalMode(
        name="Degraded Mode",
        description="One or more non-critical functions lost; reduced-capability operation with crew alerts.",
    ),
    OperationalMode(
        name="Normal Mode",
        description="Nominal operation with all subsystems healthy and full-capability control laws active.",
    ),
    OperationalMode(
        name="BIT Mode",
        description="Built-in test execution (PBIT/IBIT/CBIT) for fault detection and health reporting.",
    ),
]


# =============================================================================
# Certification matrix — from docs/design/01_synthetic_domain.md section 5
# Drives (:Platform)-[:COMPLIES_WITH]->(:Standard)
# =============================================================================

# Standards every platform complies with (cross-cutting)
COMMON_STANDARDS: List[str] = [
    "DO-178C",
    "DO-254",
    "ARP4754A",
    "ARP4761",
    "DO-160G",
]

# Platform-specific additions / differences
PLATFORM_STANDARDS: Dict[str, List[str]] = {
    "Stratos-7": ["MIL-STD-1553B", "ARINC 429", "STANAG 4586", "STANAG 7085", "MIL-STD-1760", "DO-297", "ARINC 653"],
    "AeroLynx-X2": ["MIL-STD-1553B", "ARINC 429", "STANAG 4586", "DO-297"],
    "Skyrunner-T1": ["ARINC 429", "MIL-STD-810H", "MIL-STD-882E"],
    "Nimbus-C3": ["ARINC 429", "STANAG 4586", "STANAG 7085"],
}


# =============================================================================
# Cypher writers
# =============================================================================


def seed_platforms(tx, platforms: List[Platform]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (p:Platform {name: row.name})
    SET p.role = row.role,
        p.mtow_kg = row.mtow_kg,
        p.ceiling_ft = row.ceiling_ft,
        p.range_nmi = row.range_nmi,
        p.endurance_h = row.endurance_h,
        p.engine = row.engine,
        p.payload = row.payload,
        p.operators = row.operators
    RETURN count(p) AS n
    """
    rows = [p.__dict__ for p in platforms]
    return tx.run(query, rows=rows).single()["n"]


def seed_standards(tx, standards: List[Standard]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (s:Standard {name: row.name})
    SET s.full_name = row.full_name,
        s.publisher = row.publisher,
        s.category = row.category,
        s.url = row.url
    RETURN count(s) AS n
    """
    rows = [s.__dict__ for s in standards]
    return tx.run(query, rows=rows).single()["n"]


def seed_stakeholders(tx, stakeholders: List[Stakeholder]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (s:Stakeholder {name: row.name})
    SET s.role_description = row.role_description,
        s.owns_modules = row.owns_modules
    RETURN count(s) AS n
    """
    rows = [s.__dict__ for s in stakeholders]
    return tx.run(query, rows=rows).single()["n"]


def seed_organizations(tx, orgs: List[Organization]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (o:Organization {name: row.name})
    SET o.category = row.category,
        o.country = row.country
    RETURN count(o) AS n
    """
    rows = [o.__dict__ for o in orgs]
    return tx.run(query, rows=rows).single()["n"]


def seed_interfaces(tx, interfaces: List[Interface]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (i:Interface {name: row.name})
    SET i.spec = row.spec,
        i.governing_standard = row.governing_standard
    RETURN count(i) AS n
    """
    rows = [i.__dict__ for i in interfaces]
    return tx.run(query, rows=rows).single()["n"]


def seed_operational_modes(tx, modes: List[OperationalMode]) -> int:
    query = """
    UNWIND $rows AS row
    MERGE (m:OperationalMode {name: row.name})
    SET m.description = row.description
    RETURN count(m) AS n
    """
    rows = [m.__dict__ for m in modes]
    return tx.run(query, rows=rows).single()["n"]


def link_platforms_to_standards(tx) -> int:
    """Create (:Platform)-[:COMPLIES_WITH]->(:Standard) from the cert matrix."""
    pairs: List[Dict[str, str]] = []
    for platform in PLATFORMS:
        standards = list(COMMON_STANDARDS) + PLATFORM_STANDARDS.get(platform.name, [])
        for std in standards:
            pairs.append({"platform": platform.name, "standard": std})

    query = """
    UNWIND $pairs AS pair
    MATCH (p:Platform {name: pair.platform})
    MATCH (s:Standard {name: pair.standard})
    MERGE (p)-[:COMPLIES_WITH]->(s)
    """
    tx.run(query, pairs=pairs)
    return len(pairs)


def link_interfaces_to_standards(tx) -> int:
    """Create (:Interface)-[:GOVERNED_BY]->(:Standard) where a standard is cited."""
    pairs = [
        {"interface": i.name, "standard": i.governing_standard}
        for i in INTERFACES
        if i.governing_standard
    ]
    query = """
    UNWIND $pairs AS pair
    MATCH (i:Interface {name: pair.interface})
    MATCH (s:Standard {name: pair.standard})
    MERGE (i)-[:GOVERNED_BY]->(s)
    """
    tx.run(query, pairs=pairs)
    return len(pairs)


# TODO: Wire up (:Organization)-[:OPERATES]->(:Platform) once the fictional
# operator data stabilises. Platform.operators holds candidate organisation
# names, but we do not auto-create :Organization nodes for them here — the
# current ORGANIZATIONS list covers prime contractor + real international
# suppliers only, not fictional end-user operators.


def clear_seed_labels(tx) -> None:
    """Delete static seed nodes (not :Requirement/:Module — those belong to
    the ingestion pipeline)."""
    labels = ["Platform", "Standard", "Stakeholder", "Organization", "Interface", "OperationalMode"]
    for label in labels:
        tx.run(f"MATCH (n:{label}) DETACH DELETE n")


# =============================================================================
# Orchestration
# =============================================================================


def _dry_run_counts() -> Dict[str, int]:
    """Return what the writes would have been, without touching the DB."""
    return {
        ":Platform": len(PLATFORMS),
        ":Standard": len(STANDARDS),
        ":Stakeholder": len(STAKEHOLDERS),
        ":Organization": len(ORGANIZATIONS),
        ":Interface": len(INTERFACES),
        ":OperationalMode": len(OPERATIONAL_MODES),
        "COMPLIES_WITH": sum(
            len(COMMON_STANDARDS) + len(PLATFORM_STANDARDS.get(p.name, []))
            for p in PLATFORMS
        ),
        "GOVERNED_BY": sum(1 for i in INTERFACES if i.governing_standard),
    }


def run_seed(driver, dry_run: bool = False, clear: bool = False) -> Dict[str, int]:
    """Write all seed entities + relationships. Returns per-label counts."""
    if dry_run:
        return _dry_run_counts()

    counts: Dict[str, int] = {}

    steps = [
        (":Platform", lambda tx: seed_platforms(tx, PLATFORMS)),
        (":Standard", lambda tx: seed_standards(tx, STANDARDS)),
        (":Stakeholder", lambda tx: seed_stakeholders(tx, STAKEHOLDERS)),
        (":Organization", lambda tx: seed_organizations(tx, ORGANIZATIONS)),
        (":Interface", lambda tx: seed_interfaces(tx, INTERFACES)),
        (":OperationalMode", lambda tx: seed_operational_modes(tx, OPERATIONAL_MODES)),
    ]

    with driver.session() as session:
        if clear:
            logger.info("Clearing existing seed nodes ...")
            session.execute_write(clear_seed_labels)

        for label, writer in tqdm(steps, desc="Seeding entities", unit="label"):
            counts[label] = session.execute_write(writer)

        counts["COMPLIES_WITH"] = session.execute_write(link_platforms_to_standards)
        counts["GOVERNED_BY"] = session.execute_write(link_interfaces_to_standards)

    return counts


def print_stats(counts: Dict[str, int], dry_run: bool) -> None:
    header = "Would seed (dry-run):" if dry_run else "Seeded:"
    print(header)
    print(f"  :Platform         {counts.get(':Platform', 0)}")
    print(f"  :Standard         {counts.get(':Standard', 0)}")
    print(f"  :Stakeholder      {counts.get(':Stakeholder', 0)}")
    print(f"  :Organization     {counts.get(':Organization', 0)}")
    print(f"  :Interface        {counts.get(':Interface', 0)}")
    print(f"  :OperationalMode  {counts.get(':OperationalMode', 0)}")
    print(f"  [:COMPLIES_WITH]  {counts.get('COMPLIES_WITH', 0)}")
    print(f"  [:GOVERNED_BY]    {counts.get('GOVERNED_BY', 0)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--clear", action="store_true", help="Delete existing seed nodes first")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    logger.info("Connecting to Neo4j at %s as %s", NEO4J_URI, NEO4J_USER)

    if args.dry_run:
        # Avoid a connection in dry-run mode so the script is runnable offline.
        counts = _dry_run_counts()
        print_stats(counts, dry_run=True)
        return 0

    if not NEO4J_PASSWORD:
        logger.error("NEO4J_PASSWORD is empty. Set it via .env or environment.")
        return 1

    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
    except (AuthError, ServiceUnavailable) as exc:
        logger.error("Failed to connect to Neo4j: %s", exc)
        return 1
    except Exception as exc:  # pragma: no cover — surface any unexpected driver error
        logger.error("Unexpected driver failure: %s", exc)
        return 1

    try:
        counts = run_seed(driver, dry_run=False, clear=args.clear)
        print_stats(counts, dry_run=False)
    finally:
        driver.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
