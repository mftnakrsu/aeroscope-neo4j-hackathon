"""LLM-driven synthetic aerospace requirements corpus generator for AeroScope.

Produces one DOORS-style Markdown file per module, matching the format
consumed by `src.md_to_jsonl`. Grounds the LLM in the AeroSys Dynamics
fictional domain (docs/design/01_synthetic_domain.md), the 14 public
aerospace standards (docs/research/02_standards_reference.md), and the
EARS / DOORS conventions (docs/research/01_doors_conventions.md).

Usage:
    python -m src.generate_corpus --count 1000 --output data/synthetic/
    python -m src.generate_corpus --count 200 --modules FCC,INS,NAV --seed 42
    python -m src.generate_corpus --output data/synthetic/ --resume

This script never touches Neo4j; downstream is md_to_jsonl -> graph_builder.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import random
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from tqdm import tqdm
except ImportError:  # tqdm is in requirements.txt, but degrade gracefully
    def tqdm(it, **_k):  # type: ignore[misc]
        return it

try:
    from openai import OpenAI
except ImportError as exc:  # openai is in requirements.txt
    raise SystemExit(
        "openai package not installed. Run: pip install -r requirements.txt"
    ) from exc

# Allow both `python -m src.generate_corpus` and `python src/generate_corpus.py`.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config  # noqa: E402
from src.llm_utils import parse_llm_json  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("generate_corpus")


# ---------------------------------------------------------------------------
# DOMAIN CONSTANTS (docs/design/01_synthetic_domain.md is the source of truth)
# ---------------------------------------------------------------------------

COMPANY_NAME = "AeroSys Dynamics GmbH"
COMPANY_CITY = "Munich, Germany"

PLATFORMS: Dict[str, Dict[str, str]] = {
    "Stratos-7":    {"code": "STR7", "role": "Heavy ISR / strike MALE UAV",
                     "summary": "~6000 kg MTOW, 44000 ft, 28 h endurance, turbofan."},
    "AeroLynx-X2":  {"code": "ALX2", "role": "Medium multi-role tactical UAV",
                     "summary": "~3000 kg MTOW, 35000 ft, 22 h endurance, twin turboprop."},
    "Skyrunner-T1": {"code": "SKT1", "role": "Small tactical ISR UAV",
                     "summary": "~600 kg MTOW, 20000 ft, 14 h endurance, single piston."},
    "Nimbus-C3":    {"code": "NBC3", "role": "Unmanned cargo / logistics UAV",
                     "summary": "~4500 kg MTOW, 30000 ft, 18 h endurance, single turboprop."},
}


@dataclass(frozen=True)
class ModuleInfo:
    """Static metadata for one DOORS module."""
    short: str
    full_name: str
    parent_subsystem: str
    target_count: int
    platforms: Tuple[str, ...]
    purpose: str


_ALL = tuple(PLATFORMS)
_SAN = ("Stratos-7", "AeroLynx-X2", "Nimbus-C3")  # "no-Skyrunner" subset
MODULES: Tuple[ModuleInfo, ...] = (
    ModuleInfo("FCC", "Flight Control Computer", "Flight Control", 60, _ALL,
               "Inner/outer control loops, actuator arbitration, cross-channel monitoring."),
    ModuleInfo("FMS", "Flight Management System", "Flight Control", 45, _SAN,
               "Flight plan, lateral/vertical nav, mission waypointing."),
    ModuleInfo("AUTO", "Autopilot and Guidance Laws", "Flight Control", 50, _ALL,
               "Guidance law scheduling, autopilot engagement, mode transitions."),
    ModuleInfo("INS", "Inertial Navigation System", "Navigation", 55, _ALL,
               "Strapdown inertial solution, alignment, velocity/attitude output."),
    ModuleInfo("GPS", "GPS/GNSS Receiver", "Navigation", 35, _ALL,
               "GNSS acquisition, tracking, RAIM, multi-constellation."),
    ModuleInfo("NAV", "Navigation Integration and Fusion", "Navigation", 40, _ALL,
               "Fusion of INS, GNSS, air data, and radar altimeter into one nav solution."),
    ModuleInfo("ADS", "Air Data System", "Sensors", 30, _ALL,
               "Pitot-static processing, airspeed, altitude, AoA/AoS, SAT."),
    ModuleInfo("RADAR", "Radar Altimeter and Weather Radar", "Sensors", 25, _SAN,
               "Low-altitude radar altitude; weather-radar return processing."),
    ModuleInfo("CDL", "Common Data Link", "Comms", 45, _ALL,
               "C/Ku-band CDL: modem, waveform, link management."),
    ModuleInfo("COMM", "Voice and Beyond-Line-of-Sight Comms", "Comms", 30, _SAN,
               "Voice relay, SATCOM, BLOS command/telemetry."),
    ModuleInfo("DLNK", "Tactical Datalink (Link-16 class)", "Comms", 25,
               ("Stratos-7", "AeroLynx-X2"),
               "Tactical datalink entry, network management, message formats."),
    ModuleInfo("PWR", "Primary Electrical Power", "Power", 35, _ALL,
               "Main generator control, bus switching, load shedding, regulation."),
    ModuleInfo("APM", "Auxiliary Power Module and Battery", "Power", 40, _ALL,
               "APU/battery management, charge/discharge, thermal protection."),
    ModuleInfo("EPS", "Emergency Power and Bus Switching", "Power", 25, _SAN,
               "Emergency bus transfer, essential-load preservation, contactors."),
    ModuleInfo("ENG", "Engine Control (FADEC interface)", "Propulsion", 45, _ALL,
               "FADEC command/telemetry, thrust scheduling, start/shutdown."),
    ModuleInfo("FUEL", "Fuel System and Management", "Propulsion", 30, _ALL,
               "Fuel quantity, transfer pumps, centre-of-gravity, venting."),
    ModuleInfo("LDG", "Landing Gear and Braking", "Landing Gear", 35, _ALL,
               "Gear extension/retraction, wheel-speed, anti-skid, brake-by-wire."),
    ModuleInfo("PLD", "Payload Management Controller", "Payload", 40,
               ("Stratos-7", "AeroLynx-X2", "Skyrunner-T1"),
               "Payload bay resource allocation, gimbal routing, sensor tasking."),
    ModuleInfo("EOIR", "Electro-Optical / Infrared Sensor", "Payload", 30, _ALL,
               "EO/IR gimbal stabilisation, zoom, track, LRF interface."),
    ModuleInfo("SAR", "Synthetic Aperture Radar", "Payload", 25,
               ("Stratos-7", "AeroLynx-X2"),
               "SAR image formation, GMTI track reports, radar mode scheduling."),
    ModuleInfo("GCS", "Ground Control Station Core", "Ground Station", 40, _ALL,
               "Mission planning, command routing, telemetry distribution, recording."),
    ModuleInfo("HMI", "Operator HMI and Display", "Ground Station", 30, _ALL,
               "Operator displays, widget layout, alert banners, input handling."),
    ModuleInfo("EMS", "Emergency Management and Flight Termination", "Safety", 35, _ALL,
               "FTS logic, emergency state machine, parachute/autoland branches."),
    ModuleInfo("BIT", "Built-In Test and Health Management", "Safety", 40, _ALL,
               "Continuous BIT, initiated BIT, fault accommodation, health reporting."),
    ModuleInfo("FDR", "Flight Data Recorder", "Safety", 20, _ALL,
               "Crash-survivable recorder, parameter list, storage, readout."),
    ModuleInfo("TCS", "Thermal Control System", "Thermal", 25, _SAN,
               "Coldplate control, fan speed, bay temperature envelopes."),
    ModuleInfo("STR", "Structures and Airframe Loads", "Structures", 30, _ALL,
               "Load envelope, limit/ultimate loads, fatigue, structural health."),
    ModuleInfo("ICE", "De-Ice / Anti-Ice System", "Environmental", 20, _SAN,
               "Ice detection, bleed-air/heater control, operational limits."),
    ModuleInfo("LGT", "External Lighting", "Environmental", 15, _ALL,
               "Navigation, anti-collision, landing/taxi lights."),
    ModuleInfo("SEC", "Cyber and Secure Boot", "Security", 25, _ALL,
               "Secure boot chain, key management, tamper detection, cyber-resilience."),
)
MODULES_BY_SHORT: Dict[str, ModuleInfo] = {m.short: m for m in MODULES}

# Public standards we allow the LLM to cite. Kept terse for prompt budget.
STANDARDS: Tuple[Dict[str, str], ...] = (
    {"id": "RTCA DO-178C",   "use": "Airborne software, DAL A-E, MC/DC, traceability."},
    {"id": "RTCA DO-254",    "use": "FPGA/ASIC/LRU hardware assurance, DAL A-E."},
    {"id": "RTCA DO-160G",   "use": "Environmental qualification (EMC, power, lightning, vibration)."},
    {"id": "SAE ARP4754A",   "use": "System lifecycle, FDAL/IDAL allocation, validation."},
    {"id": "SAE ARP4761",    "use": "FHA, PSSA, SSA, common-cause analysis."},
    {"id": "MIL-STD-1553B",  "use": "Dual-redundant avionics bus, BC/RT protocol."},
    {"id": "ARINC 429",      "use": "Point-to-point 32-bit avionics bus, BNR/BCD labels."},
    {"id": "STANAG 4586",    "use": "UAV <-> UCS interoperability, LOI 1-5."},
    {"id": "STANAG 7085",    "use": "Tactical ISR datalink waveforms, CDL variants."},
    {"id": "MIL-STD-1760E",  "use": "Pylon/store interface: 28 VDC, 1553B data, discretes."},
    {"id": "MIL-STD-810H",   "use": "Ruggedization: temperature, vibration, shock, humidity."},
    {"id": "MIL-STD-882E",   "use": "Hazard tracking, risk codes, software Level of Rigor."},
    {"id": "RTCA DO-297",    "use": "IMA platform acceptance, partition isolation."},
    {"id": "ARINC 653",      "use": "APEX API, robust time/space partitioning RTOS."},
    {"id": "RTCA DO-326A",   "use": "Airworthiness-security process, threat analysis."},
    {"id": "RTCA DO-355",    "use": "In-service information-security management."},
    {"id": "RTCA DO-356A",   "use": "Airworthiness-security methods, vulnerability assessment."},
    {"id": "RTCA DO-278A",   "use": "Ground-segment software assurance (AL1-AL6)."},
)

# Trace keywords recognised by md_to_jsonl.extract_cross_refs. The LLM uses
# these verbatim (colon form) so the downstream parser can classify edges.
TRACE_KEYWORDS: Tuple[str, ...] = (
    "Satisfies", "Derives From", "Verifies", "Verified By", "Refines",
    "Refined By", "Allocated To", "Traces To", "Implements", "Depends On",
    "References",
)
REQUIREMENT_FLAVORS: Tuple[str, ...] = (
    "functional", "performance", "interface", "safety", "non-functional", "environmental",
)


# ---------------------------------------------------------------------------
# PLANNING
# ---------------------------------------------------------------------------

def plan_module_counts(total: int,
                       module_filter: Optional[Sequence[str]] = None
                       ) -> List[Tuple[ModuleInfo, int]]:
    """Allocate `total` requirements across modules in proportion to their
    baseline `target_count`. If `module_filter` is set, only those modules
    are considered and their shares are rescaled to sum to `total`."""
    selected: Tuple[ModuleInfo, ...] = MODULES
    if module_filter:
        wanted = {s.strip().upper() for s in module_filter if s.strip()}
        selected = tuple(m for m in MODULES if m.short in wanted)
        missing = wanted - {m.short for m in selected}
        if missing:
            logger.warning("Unknown modules (ignored): %s", ", ".join(sorted(missing)))
        if not selected:
            raise ValueError("No valid modules after filtering.")

    baseline = sum(m.target_count for m in selected)
    if baseline == 0:
        raise ValueError("Selected modules have zero baseline total.")

    scale = total / baseline
    raw = [(m, m.target_count * scale) for m in selected]
    plan = [(m, int(math.floor(v))) for m, v in raw]
    # Distribute rounding remainder to modules with the largest fractional parts.
    remainder = total - sum(v for _, v in plan)
    order = sorted(range(len(raw)),
                   key=lambda i: raw[i][1] - math.floor(raw[i][1]), reverse=True)
    for i in order:
        if remainder <= 0:
            break
        m, c = plan[i]
        plan[i] = (m, c + 1)
        remainder -= 1
    return [(m, max(0, c)) for m, c in plan]


# ---------------------------------------------------------------------------
# PROMPT BUILDERS
# ---------------------------------------------------------------------------

_SYSTEM_HEADER = f"""You are a senior aerospace systems-engineering author at
{COMPANY_NAME} ({COMPANY_CITY}). You write requirements in IBM DOORS Classic 9.7
in a conservative European engineering style.

Company: {COMPANY_NAME}, founded 1998, ~3200 employees. Product line: four
UAV platforms (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3), mission
avionics, ground control stations, and certification services.

Never mention real-world aircraft programs, defense contractors, or
aerospace company names. All names are drawn solely from the fictional
AeroSys Dynamics domain."""


def _platform_block() -> str:
    return "\n".join(
        f"- {n} ({m['code']}): {m['role']}. {m['summary']}"
        for n, m in PLATFORMS.items()
    )


def _standards_block(standards: Sequence[Dict[str, str]]) -> str:
    return "\n".join(f"- {s['id']} — {s['use']}" for s in standards)


def _neighbor_block(module: ModuleInfo) -> str:
    """Same-parent siblings plus common-core modules give the LLM plausible
    cross-module trace targets for ##Module.ID syntax."""
    core = {"FCC", "INS", "NAV", "EMS", "BIT", "GCS", "CDL"}
    neighbours: List[ModuleInfo] = []
    seen = {module.short}
    for m in MODULES:
        if m.short in seen:
            continue
        if m.parent_subsystem == module.parent_subsystem or m.short in core:
            neighbours.append(m)
            seen.add(m.short)
        if len(neighbours) >= 6:
            break
    return "\n".join(f"- {m.short} ({m.full_name}): {m.purpose}" for m in neighbours) or "(none)"


def build_module_prompt(module: ModuleInfo,
                        standards: Sequence[Dict[str, str]],
                        n: int,
                        start_index: int,
                        section_hint: str) -> Tuple[str, str]:
    """Return (system_prompt, user_prompt) for one batch LLM call.

    The LLM emits STRICT JSON; we post-format to DOORS MD so IDs, trace
    lines, and pipe-tables are parser-correct regardless of LLM formatting
    quirks.
    """
    platform_names = ", ".join(module.platforms)
    platform_codes = ", ".join(PLATFORMS[p]["code"] for p in module.platforms)
    system_prompt = f"""{_SYSTEM_HEADER}

MODULE UNDER EDIT
Short: {module.short}
Full name: {module.full_name}
Parent: {module.parent_subsystem}
Applicable platforms: {platform_names} (codes: {platform_codes})
Purpose: {module.purpose}

APPLICABLE STANDARDS (cite IDs verbatim)
{_standards_block(standards)}

PLATFORM FAMILY
{_platform_block()}

ADJACENT MODULES (candidate cross-refs via ##Module.ID)
{_neighbor_block(module)}

WRITING RULES (MANDATORY)
1. One subject + 'shall' + one testable action per requirement. No
   'must' / 'will' / 'should' / 'may' for mandatory behaviour.
2. Mix EARS patterns across the batch: ~40% ubiquitous, ~20% event-driven
   ('When ...'), ~15% state-driven ('While ...'), ~15% unwanted-behaviour
   ('If ..., then ...'), ~10% optional-feature ('Where ...').
3. ~50% of requirements cite at least one standard from the list above
   (quote the standard ID exactly: RTCA DO-178C, MIL-STD-1553B, ...).
4. ~30% of requirements include at least one trace link using one of
   these tokens verbatim (colon form): {", ".join(TRACE_KEYWORDS)}.
   Values are comma-separated requirement IDs.
5. 10-15% reference a platform by name (e.g. 'the Stratos-7 shall ...').
6. Include numeric limits with units when plausible (Hz, ms, %, kt, deg,
   deg/s, kg, N, V, A, W, °C). Avoid 'fast' / 'optimal' / 'user-friendly'.
7. Use requirement IDs of the form <MODULE>-NNN or
   <PLATFORMCODE>-<MODULE>-NNN only — never FCC.1, FCC-X, FCC_042.
8. Vary flavour: functional, performance, interface, safety,
   non-functional, environmental.
9. Keep each requirement to 1-4 sentences. No Markdown in the text. No emojis.

OUTPUT FORMAT (STRICT JSON)
Return a single JSON object:

{{
  "requirements": [
    {{
      "id": "{module.short}-{start_index:03d}",
      "flavor": "functional",
      "ears_pattern": "ubiquitous",
      "text": "The {module.short} shall ...",
      "trace_links": [{{"type": "Satisfies", "targets": ["FCC-012"]}}],
      "standards": ["RTCA DO-178C"],
      "platform": null
    }}
  ]
}}

RULES FOR THE JSON
- `id` starts at {module.short}-{start_index:03d} and increments by 1.
  Use platform prefix (e.g. STR7-{module.short}-NNN) for platform-specific reqs.
- `flavor` in {list(REQUIREMENT_FLAVORS)}.
- `ears_pattern` in ["ubiquitous","event","state","optional","unwanted"].
- `trace_links` may be []. `type` in {list(TRACE_KEYWORDS)}. Max 3 per req.
- `standards` is a list of exact standard IDs from the list above or [].
- `platform` is null OR one of {list(PLATFORMS)}; if non-null the text
  MUST mention that platform by name and `id` SHOULD use its prefix.
- Output JSON ONLY — no Markdown fences, no preamble, no trailing prose."""

    user_prompt = (
        f"Generate {n} {section_hint.upper()} requirements for the "
        f"{module.short} ({module.full_name}) module starting at ID "
        f"{module.short}-{start_index:03d}. Follow every rule above and "
        f"return the JSON object only."
    )
    return system_prompt, user_prompt


# ---------------------------------------------------------------------------
# LLM CALL WRAPPER (retries + JSON parse)
# ---------------------------------------------------------------------------

def _call_llm_json(client: OpenAI, system_prompt: str, user_prompt: str, *,
                   model: str, temperature: float, max_tokens: int,
                   seed: Optional[int]) -> Optional[Dict[str, Any]]:
    """Chat completion with 3 exponential-backoff retries + robust JSON parse."""
    kwargs: Dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    if seed is not None:
        kwargs["seed"] = seed

    last_err: Optional[Exception] = None
    for attempt in range(3):
        try:
            try:
                resp = client.chat.completions.create(
                    response_format={"type": "json_object"}, **kwargs)
            except TypeError:  # older openai SDK without response_format
                resp = client.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content or ""
            parsed = parse_llm_json(content)
            if parsed is None:
                raise ValueError(
                    f"LLM returned non-JSON content (first 120 chars): {content[:120]!r}"
                )
            return parsed
        except Exception as exc:  # noqa: BLE001 — any transient failure triggers backoff
            last_err = exc
            wait = 2 ** attempt  # 1, 2, 4 s
            logger.warning("LLM call failed (attempt %d/3): %s — retry in %ds",
                           attempt + 1, exc, wait)
            time.sleep(wait)

    logger.error("LLM call failed after 3 attempts: %s", last_err)
    return None


# ---------------------------------------------------------------------------
# REQUIREMENT VALIDATION + MD FORMATTING
# ---------------------------------------------------------------------------

# Parser-safe ID shapes: MODULE-NNN or PLATFORM-MODULE-NNN.
_ID_RE = re.compile(r"^(?:[A-Z]{2,5}-)?[A-Z]+-\d{3,4}$")


def _validate_requirement(req: Dict[str, Any], module: ModuleInfo) -> Optional[str]:
    """Return an error string if `req` fails validation, else None."""
    if not isinstance(req, dict):
        return "not a dict"
    rid, text = req.get("id"), req.get("text")
    if not isinstance(rid, str) or not _ID_RE.match(rid):
        return f"bad id: {rid!r}"
    if not isinstance(text, str) or not text.strip():
        return "missing text"
    if not re.search(rf"(?:^|-){re.escape(module.short)}-\d{{3,4}}$", rid):
        return f"id {rid} does not belong to module {module.short}"
    if "||" in text:
        return "text contains '||' (would confuse md_to_jsonl parser)"
    return None


def _format_trace_lines(req: Dict[str, Any]) -> List[str]:
    """Render structured trace_links into parser-friendly colon-form lines."""
    out: List[str] = []
    for link in req.get("trace_links") or []:
        if not isinstance(link, dict):
            continue
        ltype = link.get("type")
        targets = link.get("targets") or []
        if ltype not in TRACE_KEYWORDS:
            continue
        cleaned = [t.strip() for t in targets if isinstance(t, str) and t.strip()]
        if cleaned:
            out.append(f"{ltype}: {', '.join(cleaned)}")
    return out


def _format_requirement_block(req: Dict[str, Any]) -> str:
    """Render a validated requirement dict into a DOORS MD block.

    Format: || Requirement No:ID || Requirement: TEXT \\n trace_lines \\n ||
    """
    body = (req["text"] or "").strip().replace("\r", "")
    trace_lines = _format_trace_lines(req)
    standards = [s for s in (req.get("standards") or []) if isinstance(s, str)]
    if standards and not any(s in body for s in standards) \
            and not any(l.lower().startswith("references:") for l in trace_lines):
        trace_lines.append(f"References: {', '.join(standards)}")
    inner = body if not trace_lines else body + "\n" + "\n".join(trace_lines)
    return f"|| Requirement No:{req['id']} || Requirement: {inner} ||"


def _format_glossary_table(module: ModuleInfo) -> str:
    """Pipe-separated glossary: `|Abbr|Def|` rows with `-----` separators."""
    rows: List[Tuple[str, str]] = [
        (module.short, module.full_name),
        ("DAL", "Design Assurance Level"),
        ("FHA", "Functional Hazard Assessment"),
        ("LRU", "Line-Replaceable Unit"),
        ("MTOW", "Maximum Take-Off Weight"),
        ("OFP", "Operational Flight Program"),
        ("WOW", "Weight-on-Wheels"),
    ]
    sep = "-" * 50
    lines = ["|Abbreviation|Definition|", sep]
    for abbr, definition in rows:
        lines.append(f"|{abbr}|{definition}|")
        lines.append(sep)
    return "\n".join(lines)


def _format_parametric_table(title: str, header: Sequence[str],
                             rows: Sequence[Sequence[str]]) -> str:
    """Parser-friendly parametric table (|col|col| rows + --- separators)."""
    sep = "-" * 50
    lines: List[str] = [f"Table Name or Description: {title}",
                        "|" + "|".join(header) + "|", sep]
    for row in rows:
        lines.append("|" + "|".join(row) + "|")
        lines.append(sep)
    return "\n".join(lines)


def _pick_parametric_tables(module: ModuleInfo, rng: random.Random) -> List[str]:
    """Return 2-3 deterministic (given rng) parametric tables for a module."""
    header = ["Parameter", "Unit", "Min", "Max", "Default", "Rate"]
    candidates: List[Tuple[str, List[List[str]]]] = [
        ("Core Signals", [
            ["sample_rate", "Hz", "50", "400", "200", "N/A"],
            ["latency_max", "ms", "0", "10", "5", "N/A"],
            ["temp_op", "°C", "-40", "+70", "+25", "N/A"],
        ]),
        ("Discretes and Limits", [
            ["voltage_in", "V", "22", "32", "28", "N/A"],
            ["current_peak", "A", "0", "20", "5", "5 A/s"],
            ["fault_threshold", "count", "0", "5", "3", "N/A"],
        ]),
        ("Performance Envelope", [
            ["update_rate", "Hz", "1", "200", "50", "N/A"],
            ["jitter_max", "ms", "0", "2", "1", "N/A"],
            ["availability", "%", "99.0", "100.0", "99.9", "N/A"],
        ]),
    ]
    rng.shuffle(candidates)
    n = rng.randint(2, 3)
    return [_format_parametric_table(f"{module.short} {title}", header, rows)
            for title, rows in candidates[:n]]


def _metadata_header(module: ModuleInfo) -> str:
    return (
        f"#Requirement: REQ-{module.short}\n"
        f"PROJECT NAME: AeroSys Common Avionics Core\n"
        f"MODULE NAME: {module.short}\n"
        f"BASELINE: v1.0.0\n"
        f"ABSOLUTE PATH: /AeroSys/Common/{module.short}/{module.short}-ROOT\n"
    )


def _section(header: str) -> str:
    return f"Header: {header}\n"


def _intro_blocks(module: ModuleInfo) -> Tuple[str, str, str]:
    """PURPOSE / SCOPE / REFERENCES — off the LLM budget as near-boilerplate.

    Reserves <MODULE>-001 through <MODULE>-003 so the LLM can safely start
    at <MODULE>-010 without collisions.
    """
    platforms = ", ".join(module.platforms)
    purpose = (
        f"|| Requirement No:{module.short}-001 || Requirement: "
        f"The purpose of this document is to specify the functional, performance, "
        f"interface, and safety requirements of the {module.full_name} ({module.short}) "
        f"of the {COMPANY_NAME} common avionics core, applicable to the following "
        f"platforms: {platforms}. ||"
    )
    scope = (
        f"|| Requirement No:{module.short}-002 || Requirement: "
        f"This document covers normal, degraded, and emergency operation of the "
        f"{module.short}, including {module.purpose.lower()} "
        f"Mechanical installation and power wiring are covered in the STR and PWR modules. ||"
    )
    refs = (
        f"|| Requirement No:{module.short}-003 || Requirement: "
        f"This document references RTCA DO-178C, RTCA DO-254, SAE ARP4754A, "
        f"MIL-STD-1553B, ARINC 429, and RTCA DO-160G. Unless otherwise noted, "
        f"{module.short} software is developed to DO-178C DAL-B and hardware to "
        f"DO-254 Level B. ||"
    )
    return purpose, scope, refs


def _split_by_section(reqs: Sequence[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Distribute requirements into DOORS sub-sections (Modes / General /
    Interface / Parametric Tables / Verification / Safety)."""
    buckets: Dict[str, List[Dict[str, Any]]] = {
        "Modes": [], "General": [], "Interface": [],
        "Parametric Tables": [], "Verification": [], "Safety": [],
    }
    for req in reqs:
        flavor = (req.get("flavor") or "functional").lower()
        ears = (req.get("ears_pattern") or "ubiquitous").lower()
        head = (req.get("text") or "").lower()[:80]
        if flavor == "safety":
            buckets["Safety"].append(req)
        elif flavor == "interface":
            buckets["Interface"].append(req)
        elif ears == "state" or "mode" in head:
            buckets["Modes"].append(req)
        elif flavor == "performance":
            buckets["Verification"].append(req)
        else:
            buckets["General"].append(req)
    return buckets


def assemble_module_markdown(module: ModuleInfo,
                             requirements: Sequence[Dict[str, Any]],
                             rng: random.Random) -> str:
    """Stitch validated requirement dicts into a DOORS-style MD document."""
    buckets = _split_by_section(requirements)
    purpose, scope, refs = _intro_blocks(module)
    parts: List[str] = [
        _metadata_header(module),
        _section("PURPOSE"), purpose + "\n",
        _section("SCOPE"), scope + "\n",
        _section("REFERENCES"), refs + "\n",
        _section("GLOSSARY"), _format_glossary_table(module) + "\n",
        _section("REQUIREMENTS"),
    ]
    for sub in ("Modes", "General", "Interface", "Parametric Tables",
                "Verification", "Safety"):
        parts.append(_section(sub))
        for req in buckets[sub]:
            parts.append(_format_requirement_block(req) + "\n")
        if sub == "Parametric Tables":
            for tbl in _pick_parametric_tables(module, rng):
                parts.append(tbl + "\n")
    parts.append(_section("APPENDICES"))
    parts.append(
        f"|| Requirement No:{module.short}-A01 || Requirement: "
        f"This appendix lists the verification artefacts for the {module.short} module, "
        f"including HIL test procedures, analysis reports, and review records required "
        f"by the applicable DAL. ||\n"
    )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# MODULE ORCHESTRATION
# ---------------------------------------------------------------------------

@dataclass
class BatchStats:
    """Per-module run telemetry for logs + manifest."""
    module: str
    batches: int = 0
    requested: int = 0
    returned: int = 0
    accepted: int = 0
    duplicates: int = 0
    invalid: int = 0
    elapsed_s: float = 0.0


def _choose_batch_size(remaining: int) -> int:
    """Pick a batch size in [8, 12]. Keeps the LLM prompt budget predictable."""
    if remaining <= 12:
        return remaining
    return 10 if remaining % 10 in (0, 1, 2, 3) else 12


def generate_module(client: OpenAI, module_name: str, n: int, *,
                    model: str, temperature: float, seed: Optional[int],
                    rng: random.Random, max_tokens: int = 3500
                    ) -> Tuple[str, BatchStats]:
    """Generate the full MD document for one module.

    Returns (md_text, stats). Never raises on a single bad batch — logs and
    continues so one flaky module cannot stall the whole corpus run.
    """
    if module_name not in MODULES_BY_SHORT:
        raise ValueError(f"Unknown module: {module_name}")
    module = MODULES_BY_SHORT[module_name]

    stats = BatchStats(module=module.short)
    requirements: List[Dict[str, Any]] = []
    seen_ids: set = set()
    next_index = 10  # reserves -001..-003 for intro and -A01 for appendix
    remaining = n
    start = time.time()

    hints = ("general and interface", "modes and safety",
             "performance and environmental")

    while remaining > 0:
        batch_n = _choose_batch_size(remaining)
        hint = hints[stats.batches % len(hints)]
        sys_prompt, user_prompt = build_module_prompt(
            module, STANDARDS, batch_n, next_index, hint)
        batch_seed = None if seed is None else seed + stats.batches

        parsed = _call_llm_json(
            client, sys_prompt, user_prompt,
            model=model, temperature=temperature,
            max_tokens=max_tokens, seed=batch_seed,
        )
        stats.batches += 1
        stats.requested += batch_n

        if not parsed or not isinstance(parsed.get("requirements"), list):
            logger.error("Batch %d returned no usable JSON for %s; advancing.",
                         stats.batches, module.short)
            remaining -= 1
            next_index += 1
            continue

        items = parsed["requirements"]
        stats.returned += len(items)
        accepted_this_batch = 0
        for item in items:
            err = _validate_requirement(item, module)
            if err:
                stats.invalid += 1
                continue
            if item["id"] in seen_ids:
                stats.duplicates += 1
                continue
            seen_ids.add(item["id"])
            requirements.append(item)
            accepted_this_batch += 1
            stats.accepted += 1
            m = re.search(r"-(\d{3,4})$", item["id"])
            if m:
                next_index = max(next_index, int(m.group(1)) + 1)

        if accepted_this_batch == 0:
            logger.warning("Module %s batch %d: 0 accepted (invalid=%d, dup=%d)",
                           module.short, stats.batches, stats.invalid, stats.duplicates)
            remaining -= batch_n
        else:
            remaining = max(0, n - len(requirements))

    stats.elapsed_s = round(time.time() - start, 2)
    logger.info(
        "Module %s: %d accepted in %d batch(es), %d invalid, %d dupes, %.1fs",
        module.short, stats.accepted, stats.batches,
        stats.invalid, stats.duplicates, stats.elapsed_s,
    )
    return assemble_module_markdown(module, requirements, rng), stats


# ---------------------------------------------------------------------------
# MAIN CLI
# ---------------------------------------------------------------------------

def _build_client() -> OpenAI:
    if not config.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is empty; API calls will likely fail.")
    return OpenAI(
        api_key=config.OPENAI_API_KEY or "missing",
        base_url=config.OPENAI_BASE_URL,
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(
        prog="generate_corpus",
        description="Generate the AeroScope synthetic requirements corpus as DOORS-style MD.",
    )
    p.add_argument("--count", type=int, default=1000,
                   help="Total requirements across all modules (default: 1000).")
    p.add_argument("--output", type=str, default="data/synthetic",
                   help="Output directory; one <MODULE>.md file per module.")
    p.add_argument("--modules", type=str, default="",
                   help="Comma-separated subset of module short codes (e.g. FCC,INS,NAV).")
    p.add_argument("--seed", type=int, default=None,
                   help="Seed for LLM + local RNG; makes the run near-deterministic.")
    p.add_argument("--resume", action="store_true",
                   help="Skip modules whose <MODULE>.md already exists in --output.")
    p.add_argument("--model", type=str, default=None,
                   help="Override OPENAI_MODEL (default: config.OPENAI_MODEL).")
    p.add_argument("--temperature", type=float, default=0.7,
                   help="Sampling temperature (default: 0.7).")
    p.add_argument("--max-tokens", type=int, default=3500,
                   help="Max tokens per LLM call (default: 3500).")
    args = p.parse_args(argv)

    if args.seed is not None:
        random.seed(args.seed)
    rng = random.Random(args.seed)

    module_filter = ([s for s in args.modules.split(",") if s.strip()]
                     if args.modules else None)
    plan = plan_module_counts(args.count, module_filter)
    total_planned = sum(c for _, c in plan)
    logger.info("Plan: %d modules, %d total reqs (requested %d).",
                len(plan), total_planned, args.count)
    for m, c in plan:
        logger.info("  %-6s %4d reqs — %s", m.short, c, m.full_name)

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    client = _build_client()
    model = args.model or config.OPENAI_MODEL

    manifest: Dict[str, Any] = {
        "total_requested": args.count,
        "total_generated": 0,
        "seed": args.seed,
        "model": model,
        "modules": {},
    }

    progress = tqdm(plan, desc="modules", unit="mod", dynamic_ncols=True,
                    disable=not sys.stderr.isatty())
    for module, count in progress:
        progress.set_postfix_str(f"{module.short} ({count})")
        md_path = out_dir / f"{module.short}.md"

        if args.resume and md_path.exists():
            logger.info("Resume: skipping %s (already exists)", md_path.name)
            manifest["modules"][module.short] = {"skipped": True, "path": md_path.name}
            continue
        if count <= 0:
            logger.info("Skip %s (planned count = 0)", module.short)
            continue

        try:
            md_text, stats = generate_module(
                client=client, module_name=module.short, n=count,
                model=model, temperature=args.temperature, seed=args.seed,
                rng=rng, max_tokens=args.max_tokens,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Module %s failed: %s", module.short, exc)
            manifest["modules"][module.short] = {"error": str(exc), "accepted": 0}
            continue

        md_path.write_text(md_text, encoding="utf-8")
        manifest["modules"][module.short] = {
            "path": md_path.name,
            "planned": count,
            "accepted": stats.accepted,
            "invalid": stats.invalid,
            "duplicates": stats.duplicates,
            "batches": stats.batches,
            "elapsed_s": stats.elapsed_s,
        }
        manifest["total_generated"] += stats.accepted
        logger.info("Wrote %s (%d reqs)", md_path, stats.accepted)

    manifest_path = out_dir / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    logger.info("Manifest: %s", manifest_path)
    logger.info("Generated %d / %d requested reqs across %d module(s).",
                manifest["total_generated"], args.count,
                sum(1 for v in manifest["modules"].values()
                    if isinstance(v, dict) and v.get("accepted", 0) > 0))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
