# 01 — Synthetic Aerospace Domain

**Document purpose:** Source of truth for the fictional aerospace domain used by AeroScope. This drives the ~1000-requirement synthetic corpus that feeds the Neo4j Aura Agents hackathon submission. Every name, ID, standard mapping, and trace link in the demo dataset is derived from this document.

**Status:** Design-frozen. Changes here must propagate to `src/generate_corpus.py`, `aura/schema.cypher`, and `docs/02_schema.md`.

---

## 1. Company profile (fictional)

**Name:** AeroSys Dynamics GmbH

**Headquarters:** Munich, Germany (secondary engineering site in Toulouse, France; flight-test range in Nevada, USA).

**Founded:** 1998, from a spin-off of a German avionics research group and a European propulsion consortium. Formed to address the gap between low-cost commercial UAVs and fully military-grade unmanned systems.

**Employees:** ~3,200 (of which ~1,400 engineers, ~280 dedicated to certification & safety).

**Product line summary:**
- Unmanned Aerial Systems — four platforms (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3).
- Mission systems avionics (flight-control computers, inertial navigation units, datalink modems).
- Ground control stations (single-operator tactical unit + multi-operator mission-command suite).
- Certification & integration services for third-party OEM platforms.

**Certifications and approvals held:**
- **AS9100D** quality management (aerospace).
- **DO-178C DAL-A** capability for safety-critical airborne software (prior programmes).
- **DO-254 Level A** for custom FPGA/ASIC designs (FCC and APM cards).
- **ISO/IEC 27001** for air-gapped engineering networks.
- **NADCAP** for special processes (conformal coating, wiring harness).
- **EASA Part 21 Subpart J** Design Organisation Approval (DOA).
- Member of **RTCA SC-228** (UAS Detect-And-Avoid) and **EUROCAE WG-73**.

**Corporate tone:** conservative European engineering house — prefers analytical-and-test over test-only, heavy investment in model-based systems engineering, DOORS Classic 9.7 still the reference tool for requirements.

---

## 2. Platform family — four fictional UAVs

| Platform | Role | MTOW | Ceiling | Range | Endurance | Engine | Typical Payload | Representative Operators (fictional) |
|---|---|---|---|---|---|---|---|---|
| **Stratos-7** | Heavy ISR / strike, medium-altitude long-endurance | ~6,000 kg | 44,000 ft | 3,400 nmi | 28 h | Single turbofan (8 kN class) | EO/IR gimbal (30 cm), SAR/GMTI pod, 4× hardpoints | Allied defence ministries of Westmark, Velor, and Greystate |
| **AeroLynx-X2** | Medium multi-role, tactical ISR + light strike | ~3,000 kg | 35,000 ft | 2,200 nmi | 22 h | Twin turboprop (2 × 960 shp) | EO/IR, L-band SAR, LRU-swappable comms | Coalition border patrol, maritime surveillance agency |
| **Skyrunner-T1** | Small tactical ISR, short endurance | ~600 kg | 20,000 ft | 550 nmi | 14 h | Single piston (Rotax-class, 115 hp) | Micro EO/IR, laser designator (optional) | Special forces units, civil protection (wildfire monitoring) |
| **Nimbus-C3** | Unmanned cargo / logistics resupply | ~4,500 kg | 30,000 ft | 1,800 nmi | 18 h | Single turboprop (1,200 shp) | Internal cargo bay 1.2 t, external under-fuselage pod | Commercial logistics operator LogiSky Inc., NATO-allied supply corps |

**Common avionics baseline:** all four platforms share a common Flight Control Computer (FCC) software core, a common Inertial Navigation System (INS) line-replaceable unit, and a common C-band / Ku-band datalink stack (CDL). Platform differences live in the propulsion, landing-gear, and payload modules.

---

## 3. Module / partition taxonomy — 30 modules

Requirements are authored in IBM DOORS Classic 9.7 modules. Every module belongs to exactly one parent subsystem and targets one or more platforms. Counts sum to **1,000**.

| Short | Full Name | Parent Subsystem | Req Count | Applicable Platforms |
|---|---|---|---|---|
| FCC | Flight Control Computer | Flight Control | 60 | All four |
| FMS | Flight Management System | Flight Control | 45 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| AUTO | Autopilot & Guidance Laws | Flight Control | 50 | All four |
| INS | Inertial Navigation System | Navigation | 55 | All four |
| GPS | GPS/GNSS Receiver | Navigation | 35 | All four |
| NAV | Navigation Integration & Fusion | Navigation | 40 | All four |
| ADS | Air Data System | Sensors | 30 | All four |
| RADAR | Radar Altimeter & Weather Radar | Sensors | 25 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| CDL | Common Data Link | Comms | 45 | All four |
| COMM | Voice & Beyond-Line-of-Sight Comms | Comms | 30 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| DLNK | Tactical Datalink (Link-16 class) | Comms | 25 | Stratos-7, AeroLynx-X2 |
| PWR | Primary Electrical Power | Power | 35 | All four |
| APM | Auxiliary Power Module & Battery | Power | 40 | All four |
| EPS | Emergency Power & Bus Switching | Power | 25 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| ENG | Engine Control (FADEC interface) | Propulsion | 45 | All four |
| FUEL | Fuel System & Management | Propulsion | 30 | All four |
| LDG | Landing Gear & Braking | Landing Gear | 35 | All four |
| PLD | Payload Management Controller | Payload | 40 | Stratos-7, AeroLynx-X2, Skyrunner-T1 |
| EOIR | Electro-Optical / Infrared Sensor | Payload | 30 | All four |
| SAR | Synthetic Aperture Radar | Payload | 25 | Stratos-7, AeroLynx-X2 |
| GCS | Ground Control Station Core | Ground Station | 40 | All four |
| HMI | Operator HMI & Display | Ground Station | 30 | All four |
| EMS | Emergency Management & Flight Termination | Safety | 35 | All four |
| BIT | Built-In Test & Health Management | Safety | 40 | All four |
| FDR | Flight Data Recorder | Safety | 20 | All four |
| TCS | Thermal Control System | Thermal | 25 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| STR | Structures & Airframe Loads | Structures | 30 | All four |
| ICE | De-Ice / Anti-Ice System | Environmental | 20 | Stratos-7, AeroLynx-X2, Nimbus-C3 |
| LGT | External Lighting | Environmental | 15 | All four |
| SEC | Cyber & Secure Boot | Security | 25 | All four |

**Total:** 30 modules, **1,000 requirements**. Weighting is realistic: FCC / INS / AUTO / FMS / APM / PLD / GCS carry the bulk; ancillary modules (LGT, ICE, FDR) stay light.

---

## 4. Stakeholder roles — 13 fictional personas

Roles only — no real names. The corpus generator should emit `AUTHORED` relationships from stakeholders to the modules listed.

| Role | One-line description | Typically authors |
|---|---|---|
| Chief Systems Engineer | Owns end-to-end platform requirements and architecture baseline. | FCC, FMS, AUTO |
| Chief Software Engineer | Accountable for DO-178C DAL-A software lifecycle across all LRUs. | FCC, AUTO, SEC |
| Certification Lead | Interfaces with EASA / civil authorities, owns Means of Compliance. | FCC, EMS, STR, SEC |
| Safety Engineer | Authors ARP4761 safety cases, FHA, PSSA, SSA artefacts. | EMS, BIT, FCC, APM |
| Avionics Integration Lead | Owns cross-LRU interfaces and bus architecture. | CDL, COMM, INS, NAV |
| Navigation Systems Engineer | Owns INS/GNSS fusion, performance-based navigation. | INS, GPS, NAV, ADS |
| Power Systems Engineer | Owns electrical bus architecture and power budget. | PWR, APM, EPS |
| Propulsion Systems Engineer | Owns engine/fuel interface to airframe and FADEC. | ENG, FUEL, TCS |
| Payload & Mission Systems Architect | Owns payload bay, gimbal control, sensor tasking. | PLD, EOIR, SAR |
| Ground Systems Engineer | Owns GCS software, HMI, mission planning workflow. | GCS, HMI |
| Test Engineer Lead | Owns verification strategy, test procedures, test readiness. | (all modules — verification reqs) |
| Cyber Security Engineer | Owns secure boot, key management, cyber-resilience. | SEC, CDL, FDR |
| Structures & Loads Engineer | Owns airframe load envelope, landing-gear kinematics. | STR, LDG, ICE |

---

## 5. Certification targets per platform

| Platform | DO-178C | DO-254 | ARP4754A | DO-160G | MIL-STD-1553B / ARINC 429 | STANAG 4586 | DO-278A (GCS) | Cyber (DO-326A/355/356A) |
|---|---|---|---|---|---|---|---|---|
| **Stratos-7** | DAL-A | Level A | Yes (Cat I civ. + mil. airworthiness) | Sections 7–22 full | Both — 1553B internal, 429 to payload | Level IV compliance | AL-3 | Full set, DAL-B SEC partition |
| **AeroLynx-X2** | DAL-A | Level A | Yes | Sections 7–22 full | Both — 1553B internal, 429 external | Level IV compliance | AL-3 | Full set, DAL-B SEC partition |
| **Skyrunner-T1** | DAL-B | Level B | Tailored (Cat II) | Sections 7–20 subset | ARINC 429 only | Not required (national) | AL-4 | DO-326A only |
| **Nimbus-C3** | DAL-B | Level B | Yes (civil cargo variant, SORA) | Sections 7–22 full | ARINC 429 + CAN | Level III compliance | AL-3 | DO-326A + DO-355 |

**Cross-cutting standards applicable to all four:**
- **RTCA DO-178C** airborne software.
- **RTCA DO-254** airborne electronic hardware.
- **SAE ARP4754A** / **ARP4761A** system development and safety assessment.
- **RTCA DO-160G** environmental qualification.
- **RTCA DO-326A / DO-355 / DO-356A** airworthiness security.
- **STANAG 4586** (UAS control-station interoperability — military variants).
- **ISO/IEC 27001** (ground-segment information security).

---

## 6. Requirement ID naming convention

**Authoritative rule (module-scoped, with optional platform prefix for platform-specific requirements):**

```
<PLATFORM_CODE>?-<MODULE>-<NNN>
```

- **`MODULE`** — one of the 30 module short names above (`FCC`, `INS`, `PWR`, `CDL`, …).
- **`NNN`** — zero-padded sequential number within the module, starting at `001`. No gaps in the published baseline.
- **`PLATFORM_CODE`** — optional prefix when a requirement is platform-specific. Valid codes:
  - `STR7` — Stratos-7
  - `ALX2` — AeroLynx-X2
  - `SKT1` — Skyrunner-T1
  - `NBC3` — Nimbus-C3
- Requirements that apply to **all platforms** use the unprefixed form: `FCC-001`.
- Platform-specific requirements use the prefix: `STR7-FCC-014`.

**Examples:**
- `FCC-001` — a common flight-control requirement that applies to every platform.
- `STR7-ENG-007` — a Stratos-7-only engine-control requirement (turbofan).
- `NBC3-LDG-003` — a Nimbus-C3 specific landing-gear requirement (reinforced gear for cargo payload).

**Why module-scoped rather than platform-scoped:** most requirements are reused across platforms (FCC is common to all four). Module-scoped IDs keep the common core stable and let platform-specific overrides stand out clearly. This mirrors how DOORS modules are typically organised in real programmes.

**Target distribution in the corpus:** ~70% unprefixed (common) IDs, ~30% platform-prefixed. This yields cross-platform trace chains and forces the graph to resolve platform scope via `APPLICABLE_TO` edges.

---

## 7. Five example section types

All documents follow the DOORS Classic 9.7 MD export format (see `data/placeholders/placeholder_template_3.md`). Each requirement document contains these five section types, authored in English.

### 7.1 PURPOSE

```
Header: PURPOSE
|| Requirement No:FCC-001 || Requirement: The purpose of this document is to specify the functional, performance, and interface requirements of the Flight Control Computer (FCC) software for the AeroSys Dynamics common flight-control core, applicable to the Stratos-7, AeroLynx-X2, Skyrunner-T1, and Nimbus-C3 platforms. ||
```

### 7.2 SCOPE

```
Header: SCOPE
|| Requirement No:FCC-002 || Requirement: This document covers the normal, degraded, and emergency operation of the FCC including control-law scheduling, actuator command arbitration, and cross-channel monitoring. It excludes the mechanical design of servo actuators (covered in STR) and the ground segment (covered in GCS/HMI). ||
```

### 7.3 REFERENCES

```
Header: REFERENCES
|| Requirement No:FCC-003 || Requirement: This document references RTCA DO-178C, RTCA DO-254, SAE ARP4754A, MIL-STD-1553B, ARINC 429, and RTCA DO-160G. Compliance level for this module is DO-178C DAL-A and DO-254 Level A. ||
```

### 7.4 GLOSSARY / ABBREVIATIONS

```
Header: GLOSSARY
|Abbreviation|Definition|
--------------------------------------------------
|FCC|Flight Control Computer|
--------------------------------------------------
|INS|Inertial Navigation System|
--------------------------------------------------
|DAL|Design Assurance Level|
--------------------------------------------------
|LRU|Line-Replaceable Unit|
--------------------------------------------------
|MTOW|Maximum Take-Off Weight|
--------------------------------------------------
```

### 7.5 REQUIREMENTS (with sub-sections)

```
Header: REQUIREMENTS
Header: Modes
|| Requirement No:FCC-010 || Requirement: The FCC shall support the following operational modes:
    a) Ground
    b) Takeoff
    c) Cruise
    d) Emergency
Sub-modes of Cruise:
    1) Manual
    2) Autonomous ||

Header: General
|| Requirement No:FCC-020 || Requirement: The FCC shall execute the inner-loop control law at 200 Hz with a jitter less than 1 ms on 95% of cycles measured over any 10-second window. ||

Header: Interface
|| Requirement No:FCC-030 || Requirement: The FCC shall transmit the aircraft attitude message (FCC_ATT) on MIL-STD-1553B Bus A every 20 ms with the INS as the source. ||

Header: Tables
|Signal|Unit|Range|Default|Rate|
--------------------------------------------------
|pitch_cmd|deg|-30 to +30|0.0|200 Hz|
--------------------------------------------------
|roll_cmd|deg|-60 to +60|0.0|200 Hz|
--------------------------------------------------
|yaw_rate_cmd|deg/s|-15 to +15|0.0|200 Hz|
--------------------------------------------------

Header: Test
|| Requirement No:FCC-090 || Requirement: FCC-020 shall be verified by analysis of the 200 Hz control loop timing over a 10-minute HIL session, and by test case TP-FCC-020 on the iron-bird rig. ||
```

---

## 8. Three fully-worked example requirements

### 8.1 Easy — simple functional statement (INS, common)

```
#Requirement: INS-015
PROJECT NAME: AeroSys Common Avionics Core
MODULE NAME: INS
BASELINE: v2.3.0
ABSOLUTE PATH: /AeroSys/Common/INS/INS-015
Header: REQUIREMENTS
Header: General
|| Requirement No:INS-015 || Requirement: The INS shall provide aircraft attitude (pitch, roll, yaw) to the FCC at a minimum update rate of 200 Hz with a latency not exceeding 5 ms from sensor sample to MIL-STD-1553B bus output.
Satisfies: FCC-020
Derives From: ARP4754A-SYS-004
Verifies: TP-INS-015
Trace Down: INS-016, INS-017 ||
```

### 8.2 Conditional assignment — mode-driven behaviour (FCC, common)

```
#Requirement: FCC-045
PROJECT NAME: AeroSys Common Avionics Core
MODULE NAME: FCC
BASELINE: v2.3.0
ABSOLUTE PATH: /AeroSys/Common/FCC/FCC-045
Header: REQUIREMENTS
Header: Emergency Mode
|| Requirement No:FCC-045 || Requirement: When the Emergency Management System asserts the FLIGHT_TERMINATE signal AND the aircraft altitude is below 500 ft AGL, the FCC shall assign the CONTROL_MODE field to "AUTOLAND" and command the landing-gear down via LDG_CMD_DOWN within 200 ms.
Note: If altitude is at or above 500 ft AGL, refer to FCC-046 for parachute-recovery branch.
Satisfies: EMS-007, EMS-008
Derives From: FCC-040
Verifies: TP-FCC-045, TP-FCC-045-HIL
References: DO-178C-6.3.1 ||
```

### 8.3 Parametric table — platform-specific (Stratos-7 engine control, turbofan)

```
#Requirement: STR7-ENG-012
PROJECT NAME: Stratos-7 Platform Extensions
MODULE NAME: ENG
BASELINE: STR7-v1.1.0
ABSOLUTE PATH: /AeroSys/Stratos-7/ENG/STR7-ENG-012
Header: REQUIREMENTS
Header: Tables
|| Requirement No:STR7-ENG-012 || Requirement: The engine control interface shall accept thrust commands within the ranges and rates specified in the following table. Commands outside these ranges shall be clamped to the nearest limit and the EXCEEDANCE flag shall be set.
|Parameter|Unit|Min|Max|Default|Max Rate|
--------------------------------------------------
|thrust_cmd|%|0|100|0|20 %/s|
--------------------------------------------------
|n1_ref|rpm|0|28000|IDLE|2000 rpm/s|
--------------------------------------------------
|egt_limit|°C|400|950|850|N/A|
--------------------------------------------------
|fuel_flow_ref|kg/h|50|1800|IDLE|400 kg/h/s|
--------------------------------------------------
Satisfies: ENG-004, STR7-PLD-001
Derives From: STR7-SYS-002
Verifies: TP-STR7-ENG-012
References: DO-178C-6.3.1, MIL-STD-1553B ||
```

---

## 9. Corpus statistics target

**Volume:**
- Total requirements: **~1,000**.
- Average per module: **~33** (min 15 for LGT, max 60 for FCC).
- 30 modules across 4 platforms.
- ~70% common requirements (no platform prefix), ~30% platform-prefixed.

**Relational density:**
- **Explicit trace links** (`SATISFIES`, `DERIVES_FROM`, `VERIFIES`, `REFINES`): **~1,500 total**, averaging ~1.5 per requirement.
  - SATISFIES ≈ 500
  - DERIVES_FROM ≈ 450
  - VERIFIES ≈ 400
  - REFINES ≈ 150
- **Cross-module references**: **~30% of requirements** cite at least one requirement in a different module, producing ~300 cross-module `REFERENCES` edges.
- **Standard references**: ~600 `REFERENCES_STANDARD` edges (DO-178C, DO-254, ARP4754A, MIL-STD-1553B, ARINC 429, DO-160G, STANAG 4586, DO-326A).
- **Entity mentions** (components, interfaces, operational modes): ~2,000 total.
- **Implicit (LLM-discovered) links**: target **~200** semantic dependencies / complements / constraints / potential conflicts, with ~94% precision (same bar as the reference pipeline — keep false-positives low).

**Section composition per document:**
- Every module's root document contains PURPOSE, SCOPE, REFERENCES, GLOSSARY, REQUIREMENTS.
- REQUIREMENTS sub-sections per module: Modes (10–15%), General (45–55%), Interface (15–20%), Tables (5–10%), Test (15%).

**Document artefacts expected after pipeline run:**
- Neo4j: ~1,000 `:Requirement`, 30 `:Module`, 4 `:Platform`, 13 `:Stakeholder`, ~10 `:Standard`, ~15 `:Component`, ~8 `:Interface`, ~6 `:OperationalMode`.
- ChromaDB: 1,000 embeddings, 1024-dim, cosine.
- Vector index on `:Requirement(embedding)` ready for Aura Agent Similarity Search tool.

**Realism sanity check — what a systems engineer should recognise:**
- Heavy weighting on FCC / INS / AUTO (control-critical modules always have more reqs).
- DAL-A on the FCC, DAL-B on the Skyrunner-T1 cousin (small UAVs fly lower assurance).
- MIL-STD-1553B internal bus, ARINC 429 to peripherals (civil-mil hybrid).
- DO-326A/355/356A across the board (cyber is no longer optional).
- Emergency Management + Flight Termination + FDR form a dedicated safety cluster.
- GCS governed by DO-278A, not DO-178C (ground software has its own standard).

---

## 10. Out-of-scope for this document

- Specific wording of the ~1,000 requirements — delegated to `src/generate_corpus.py`.
- Final Cypher schema — lives in `docs/design/02_schema.md` and `aura/schema.cypher`.
- Aura Agent tool configuration — lives in `docs/03_agent_config.md`.
- Demo query bank — lives in `demo/demo_queries.md`.

**Downstream consumers of this document:** corpus generator prompts, schema migration, entity-extractor regex tuning, demo-question authoring, submission write-up.
