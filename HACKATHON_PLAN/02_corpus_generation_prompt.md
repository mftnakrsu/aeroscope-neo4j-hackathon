# Corpus Generation Prompt for Claude Opus 4.7 (deep research mode)

## How to use this file

1. Open a fresh Claude conversation with **Opus 4.7** + **deep research (extended thinking)** enabled.
2. Copy **everything below the horizontal rule** (the `===BEGIN PROMPT===` line) verbatim into the first message.
3. Claude will likely need **5–8 response turns** to produce all 30 modules (~300 K tokens of output total). After each response, reply with the single word `continue` until Claude emits `===END CORPUS===`.
4. Save Claude's entire conversation to a text file (or just paste chunks back to Claude Code) — I (Claude Code) will split each `===FILE: X.md ===` block into `data/synthetic/X.md` automatically.
5. Then we parse → load → enrich → embed.

You can also break it into 3–4 sessions (e.g. "do modules 1–10", "now 11–20", …) if you hit rate limits. The prompt is stateless within the module list, so any split works.

---

===BEGIN PROMPT===

# Role

You are a senior aerospace systems engineer and certification lead at **AeroSys Dynamics GmbH** (fictional, Munich, Germany). You have 20 years of hands-on experience in IBM DOORS Classic 9.7, DO-178C / ARP4754A / ARP4761 compliance, and writing certification-bound requirements for civil and military UAV programmes. You have authored or reviewed requirements on every aerospace platform you can imagine — your "shall" statements are testable, your parametric tables match real silicon, your trace links are never decorative.

# Mission

Produce a **synthetic but technically rigorous** requirements corpus for a Neo4j Aura Agent hackathon demo. The corpus must be indistinguishable from a real industrial DOORS export to any aerospace engineer reading it. Use **deep research** liberally — look up real DO-178C clauses, ARINC 429 word formats, MIL-STD-1553B bus characteristics, Vref/undervoltage thresholds on 28 V DC aircraft systems, realistic Mach/altitude envelopes for the platform classes listed below, typical FADEC interface timing, real N1/EGT limits for turbofans of the thrust class specified, etc. Ground every parameter in real practice.

**Total output target:** ~1000 requirements spread across 30 modules — exact per-module counts given in §3.

# Non-negotiable constraints

1. **English only** throughout (metadata, requirement text, trace links, tables, notes). No other language.
2. **No references** anywhere to: <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>, <redacted>. These are proprietary names and must not appear.
3. **Fictional names only** for the company and platforms — exactly as specified below. Do not invent new platforms or rename the given ones.
4. **Real public standards** are fine and encouraged: DO-178C, DO-254, DO-160G, ARP4754A, ARP4761, MIL-STD-1553B, ARINC 429, STANAG 4586, STANAG 7085, MIL-STD-1760, MIL-STD-810H, MIL-STD-882E, DO-297, ARINC 653, DO-278A, DO-326A, DO-355, DO-356A.
5. **Real international suppliers** may be cited (Boeing, Airbus, Honeywell, Collins, Safran, Leonardo, MBDA, GE, Pratt & Whitney, Rolls-Royce, Thales, Raytheon) as context; never as authors.
6. **Strict output format** — every requirement must be parseable by the regex described in §5. A single missing `||` or wrong keyword breaks the ingest pipeline.
7. **No prose between file blocks.** No "here's the next module…" narration. Just emit the files with the delimiters shown in §9.

# 1. Company profile

**AeroSys Dynamics GmbH**
- HQ: Munich, Germany. Secondary engineering site: Toulouse, France. Flight-test range: Nevada, USA.
- Founded 1998 from a spin-off of a German avionics research group and a European propulsion consortium.
- ~3 200 employees (~1 400 engineers, ~280 in certification & safety).
- Holds AS9100D, DO-178C DAL-A capability, DO-254 Level A, ISO/IEC 27001, NADCAP, EASA Part 21 Subpart J DOA.
- Member of RTCA SC-228 and EUROCAE WG-73.
- Conservative European engineering house — prefers analytical-and-test over test-only, heavy investment in model-based systems engineering, IBM DOORS Classic 9.7 is still the reference tool for requirements.

# 2. Platform family

| Platform | Role | MTOW | Ceiling | Range | Endurance | Engine | Typical payload | Representative operators |
|---|---|---|---|---|---|---|---|---|
| **Stratos-7** | Heavy ISR / strike, MALE class | ~6 000 kg | 44 000 ft | 3 400 nmi | 28 h | Single turbofan (8 kN class) | EO/IR gimbal (30 cm), SAR/GMTI pod, 4× hardpoints | Defence ministries of Westmark, Velor, Greystate |
| **AeroLynx-X2** | Medium multi-role, tactical ISR + light strike | ~3 000 kg | 35 000 ft | 2 200 nmi | 22 h | Twin turboprop (2 × 960 shp) | EO/IR, L-band SAR, LRU-swap comms | Coalition border patrol, maritime surveillance |
| **Skyrunner-T1** | Small tactical ISR | ~600 kg | 20 000 ft | 550 nmi | 14 h | Single piston (~115 hp, Rotax-class) | Micro EO/IR, optional laser designator | Special forces, civil protection (wildfire monitoring) |
| **Nimbus-C3** | Unmanned cargo / logistics | ~4 500 kg | 30 000 ft | 1 800 nmi | 18 h | Single turboprop (~1 200 shp) | Internal cargo bay 1.2 t, external under-fuselage pod | LogiSky Inc. (commercial), NATO-allied supply corps |

**Common avionics baseline:** all four platforms share a common FCC software core, a common INS LRU, and a common C-band / Ku-band datalink stack (CDL). Platform differences live in propulsion, landing-gear, and payload modules.

**Platform codes** (used in ID prefixes when a requirement is platform-specific): `STR7` (Stratos-7), `ALX2` (AeroLynx-X2), `SKT1` (Skyrunner-T1), `NBC3` (Nimbus-C3).

# 3. Module taxonomy — 30 modules, exact target req counts

Every requirement belongs to exactly one module. Counts must sum to **1000**.

| Short | Full Name | Parent subsystem | Target count | Applicable platforms |
|---|---|---|---|---|
| FCC | Flight Control Computer | Flight Control | 60 | All |
| FMS | Flight Management System | Flight Control | 45 | STR7, ALX2, NBC3 |
| AUTO | Autopilot & Guidance Laws | Flight Control | 50 | All |
| INS | Inertial Navigation System | Navigation | 55 | All |
| GPS | GPS / GNSS Receiver | Navigation | 35 | All |
| NAV | Navigation Integration & Fusion | Navigation | 40 | All |
| ADS | Air Data System | Sensors | 30 | All |
| RADAR | Radar Altimeter & Weather Radar | Sensors | 25 | STR7, ALX2, NBC3 |
| CDL | Common Data Link | Comms | 45 | All |
| COMM | Voice & Beyond-Line-of-Sight Comms | Comms | 30 | STR7, ALX2, NBC3 |
| DLNK | Tactical Datalink (Link-16 class) | Comms | 25 | STR7, ALX2 |
| PWR | Primary Electrical Power | Power | 35 | All |
| APM | Auxiliary Power Module & Battery | Power | 40 | All |
| EPS | Emergency Power & Bus Switching | Power | 25 | STR7, ALX2, NBC3 |
| ENG | Engine Control (FADEC interface) | Propulsion | 45 | All |
| FUEL | Fuel System & Management | Propulsion | 30 | All |
| LDG | Landing Gear & Braking | Landing Gear | 35 | All |
| PLD | Payload Management Controller | Payload | 40 | STR7, ALX2, SKT1 |
| EOIR | Electro-Optical / Infrared Sensor | Payload | 30 | All |
| SAR | Synthetic Aperture Radar | Payload | 25 | STR7, ALX2 |
| GCS | Ground Control Station Core | Ground Station | 40 | All |
| HMI | Operator HMI & Display | Ground Station | 30 | All |
| EMS | Emergency Management & Flight Termination | Safety | 35 | All |
| BIT | Built-In Test & Health Management | Safety | 40 | All |
| FDR | Flight Data Recorder | Safety | 20 | All |
| TCS | Thermal Control System | Thermal | 25 | STR7, ALX2, NBC3 |
| STR | Structures & Airframe Loads | Structures | 30 | All |
| ICE | De-Ice / Anti-Ice System | Environmental | 20 | STR7, ALX2, NBC3 |
| LGT | External Lighting | Environmental | 15 | All |
| SEC | Cyber & Secure Boot | Security | 25 | All |

**Total: 1000.** Do not drop, merge, or rename modules.

# 4. Certification matrix per platform

| Platform | DO-178C | DO-254 | ARP4754A | DO-160G | 1553B / ARINC 429 | STANAG 4586 | DO-278A (GCS) | Cyber (DO-326A/355/356A) |
|---|---|---|---|---|---|---|---|---|
| **Stratos-7** | DAL-A | Level A | Yes (Cat I civ. + mil.) | §7–22 full | Both: 1553B internal, 429 to payload | Level IV | AL-3 | Full, DAL-B SEC partition |
| **AeroLynx-X2** | DAL-A | Level A | Yes | §7–22 full | Both | Level IV | AL-3 | Full, DAL-B SEC partition |
| **Skyrunner-T1** | DAL-B | Level B | Tailored (Cat II) | §7–20 subset | ARINC 429 only | Not required (national) | AL-4 | DO-326A only |
| **Nimbus-C3** | DAL-B | Level B | Yes (civil cargo, SORA) | §7–22 full | ARINC 429 + CAN | Level III | AL-3 | DO-326A + DO-355 |

Use these DAL / Level assignments when authoring safety / verification / assurance requirements.

# 5. Output format — the DOORS MD export specification (CRITICAL)

Every file you emit must parse cleanly against this regex contract. Breaking the format breaks the ingest pipeline — deviations will invalidate the corpus.

## 5.1 File-level metadata (first 5 lines of every file)

```
#Requirement: REQ-<MODULE>
PROJECT NAME: <Project Name String>
MODULE NAME: <MODULE>
BASELINE: <BL-X.Y or vN.N.N>
ABSOLUTE PATH: /AeroSys/<Scope>/<MODULE>
```

Examples for the PROJECT NAME field depending on platform applicability:
- Common to all: `AeroSys Common Avionics Core`
- Stratos-7-only module: `Stratos-7 Platform Extensions`
- AeroLynx-X2-only: `AeroLynx-X2 Platform Extensions`
- Skyrunner-T1-only: `Skyrunner-T1 Platform Extensions`
- Nimbus-C3-only: `Nimbus-C3 Platform Extensions`

Examples for ABSOLUTE PATH:
- Common: `/AeroSys/Common/FCC`
- Platform-specific: `/AeroSys/Stratos-7/ENG`

## 5.2 Section headers

Use `Header: <SectionName>` on its own line. Required sections (in this order):

```
Header: PURPOSE
Header: SCOPE
Header: REFERENCES
Header: GLOSSARY
Header: REQUIREMENTS
  Header: Modes
  Header: General
  Header: Interface
  Header: Tables
  Header: Test
Header: APPENDICES        (optional; only if module needs appendices)
```

The REQUIREMENTS sub-sections (Modes / General / Interface / Tables / Test) should appear with approximate distribution:
- **Modes:** 10–15% of the module's reqs
- **General:** 45–55% (functional behaviour)
- **Interface:** 15–20% (bus / protocol / signal)
- **Tables:** 5–10% (parametric tables + the requirements that describe them)
- **Test:** ~15% (verification reqs)

Not every module needs all five — use judgement. If a module has no operational modes (e.g. LGT has lights), skip `Modes` for that file.

## 5.3 Requirement block format (strict)

```
|| Requirement No:<ID> || Requirement: <body text> ||
```

`<ID>` is one of:
- `<MODULE>-<NNN>` — common-to-all-platforms (e.g. `FCC-042`)
- `<PLATFORM_CODE>-<MODULE>-<NNN>` — platform-specific (e.g. `STR7-ENG-007`)

`<NNN>` is 3-digit zero-padded, sequential within the module starting at `001`. No gaps.

**Multi-line requirement** — body continues until the closing `||`, which can be on its own line:
```
|| Requirement No:FCC-010 || Requirement: The FCC shall support the following operational modes:
    a) Ground
    b) Takeoff
    c) Cruise
    d) Emergency
Sub-modes of Cruise:
    1) Manual
    2) Autonomous ||
```

**Note absorption:** lines starting with `Note:` (or `Note 1:`, `Note-1:`) immediately after a multi-line body are absorbed into the parent requirement. Example:

```
|| Requirement No:FCC-020 || Requirement: The FCC shall execute the inner-loop control law at 200 Hz with a jitter not exceeding 1 ms on 95 % of cycles measured over any 10-second window.
Note: The 200 Hz rate is bounded by DO-178C DAL-A timing determinism objectives. ||
```

## 5.4 Trace link phrasing

Inside the requirement body (before the closing `||`), include trace links on their own line, using these exact keywords followed by a comma-separated ID list:

```
Satisfies: <ID>[, <ID>…]
Derives From: <ID>[, <ID>…]
Verifies: <ID>[, <ID>…]
Verified By: <ID>[, <ID>…]
Refines: <ID>[, <ID>…]
Allocated To: <ID>[, <ID>…]
Traces To: <ID>[, <ID>…]
Conflicts With: <ID>[, <ID>…]
References: <standard, e.g. DO-178C-6.3.1> or <ID>
```

## 5.5 Cross-module reference (inside requirement body)

Use `##<MODULE>.<ID>` in free text:

```
|| Requirement No:APM-018 || Requirement: When in EMERGENCY mode, APM shall energise only the FCC, INS, and CDL buses per ##FCC.FCC-001, ##INS.INS-001, and ##CDL.CDL-001. ||
```

## 5.6 Parametric table format (exact)

Tables live under `Header: Tables` (or inline in a requirement's body). Use pipe-delimited rows with dash separators between rows (not standard Markdown):

```
Table Type: MESSAGE
Table Name or Description: Bus_Voltage_Limits
Table: Bus_Voltage_Limits
|Name|Unit|Range|Default Value|
--------------------------------------------------
|bus_voltage|V|22.0 to 32.0|28.0|
--------------------------------------------------
|undervoltage_threshold|V|20.0 to 23.0|22.0|
--------------------------------------------------
|overvoltage_threshold|V|30.0 to 33.0|32.0|
--------------------------------------------------
```

A table may either (a) sit as its own block that a nearby requirement references ("as specified in the Bus_Voltage_Limits table above"), or (b) be embedded inside a requirement's body. Both are valid. Prefer (a) for tables with ≥4 rows.

Always end dash rows with at least 40 dashes (the parser needs `-{5,}` but longer is safer and more readable).

## 5.7 Glossary table (same pipe-separator format)

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
```

# 6. Content rules per module

Every module file must include:

1. **PURPOSE** — 1 requirement stating the document's purpose. Mention which platforms the module applies to and the applicable DAL (DO-178C).
2. **SCOPE** — 1–2 requirements bounding what's in and what's out.
3. **REFERENCES** — 1–2 requirements listing the governing standards and related documents.
4. **GLOSSARY** — 6–12 abbreviation rows in the pipe-table format.
5. **REQUIREMENTS** — the bulk, split into the Modes / General / Interface / Tables / Test sub-sections.
6. **APPENDICES** — optional, only if you want to drop message definitions or derivation rationale.

## 6.1 Distribution targets

- **~70 %** of requirements should be common (unprefixed IDs, e.g. `FCC-042`).
- **~30 %** platform-prefixed (e.g. `STR7-ENG-012`), proportioned according to which modules have platform-specific behaviour (see §3 applicable-platforms column).
- **~50 %** of requirements should cite at least one standard (either in the body prose — "per DO-178C DAL-A" — or via a `References:` trailer line).
- **~30 %** should carry at least one explicit trace link (`Satisfies:`, `Derives From:`, `Verifies:`, `Refines:`, `Allocated To:`, or `Conflicts With:`).
- **~25 %** should carry at least one cross-module `##<MODULE>.<ID>` reference — spread these across modules to form a realistic traceability web (e.g. PWR references FCC, FCC references INS, EMS references FCC + APM, etc.).
- Every module should include **2–3 parametric tables**.

## 6.2 Requirement type mix (per module, approximate)

- **Functional** (the system shall do X when Y): 50 %
- **Interface** (bus, signal, message): 20 %
- **Safety** (DAL-A/B, failure conditions, hazard mitigation): 15 %
- **Performance** (timing, throughput, accuracy): 10 %
- **Non-functional** (installation, maintainability, documentation): 5 %

## 6.3 Writing style

- Always use "**shall**". No "should", no "will", no "must".
- Prefer **EARS patterns** (Event-Driven: "When … the <system> shall …"; Unwanted-behaviour: "If … the <system> shall …"; State-driven: "While in <state> the <system> shall …"; Ubiquitous: "The <system> shall …"; Optional: "Where <feature> is present the <system> shall …").
- Every shall-statement must be **testable** — include concrete numbers, units, rates, thresholds. Do not write "the FCC shall be fast"; write "the FCC shall execute the inner-loop control law at 200 Hz with jitter ≤ 1 ms on 95 % of cycles over any 10-second window."
- Respect aerospace unit conventions (ft for altitude, nmi for range, kt for speed, lbs or kg for weight, °C for temperature, V DC, A, W, Hz, ms, μs, dBm, °, °/s, rad, rad/s, g for load factor).
- Cite real DO-178C clauses where relevant (e.g. "DO-178C § 6.3.1" for low-level requirements traceability).

## 6.4 Cross-module trace realism

Use these inter-module relationships liberally:
- PWR ↔ APM ↔ EPS (power distribution)
- FCC ← INS ← GPS ← NAV (sensor fusion)
- FCC ↔ AUTO ↔ FMS (control laws ↔ guidance)
- CDL ↔ COMM ↔ DLNK (comms stack)
- ENG ↔ FUEL ↔ TCS (propulsion chain)
- EMS ↔ BIT ↔ FDR (safety cluster)
- PLD ↔ EOIR ↔ SAR (payload chain)
- GCS ↔ HMI (ground segment)
- SEC ↔ CDL ↔ FCC (cyber on the critical path)
- All modules ↔ STR (structural allocations for mounted LRUs)

When you write `Satisfies: ##OTHER_MOD.OTHER_ID`, **make sure `OTHER_ID` exists** — either a common module's ID you've already defined or a plausible target in a module you'll define later. Pre-commit a small mental map before starting. To simplify: forward-reference freely (e.g. FCC-042 can reference INS-015 even if INS hasn't been written yet), but keep the referenced ID within the valid range for that module's req count.

# 7. Realism anchors — use deep research

Before writing requirements for a technical area, spend a search query or two to verify realism. Examples:

- **Electrical buses:** real civil aircraft 28 V DC characteristics per MIL-STD-704F (nominal 28 V, normal 22–29 V, transient limits).
- **MIL-STD-1553B:** 1 Mbps dual-redundant, Manchester II encoding, 31 RTs, 20-bit word (sync + 16-bit data + parity).
- **ARINC 429:** 32-bit word with 8-bit label (octal) + 19-bit data + 2-bit SSM + 2-bit SDI + parity; 12.5 kbps and 100 kbps.
- **FADEC:** typical 50 Hz update rate on torque/N1 commands; turbofan thrust response 0–100 % in ~5–8 s; EGT redline depends on engine class.
- **IMU performance:** tactical-grade ring-laser gyros ~0.01 °/h bias, accelerometers ~50 µg bias; coarse-align vs fine-align vs in-flight-align timing.
- **GPS/GNSS:** TTFF cold start 30–60 s, warm start 5–30 s, hot start < 5 s; typical accuracy 5 m CEP; SBAS augmentation reduces to < 1 m; anti-spoofing via authenticated signals.
- **DO-178C DAL-A:** 71 objectives, MC/DC coverage mandatory, independence required; DAL-B is 69 objectives with modified-condition-decision relaxed.
- **DO-254 Level A:** hardware assurance equivalent, separate lifecycle artefacts.
- **ARP4754A:** 5 main phases (planning, allocation, design, V&V, certification).
- **DO-326A / DO-355 / DO-356A:** airworthiness security framework (threat analysis, continued airworthiness, security assurance).
- **STANAG 4586:** 5 levels of interoperability (LOI 1 monitoring only → LOI 5 full handover).
- **DO-160G:** 26 test sections (temperature, altitude, humidity, vibration, EMC, lightning, HIRF, fluid susceptibility, etc.).

Use deep research **especially** when writing: ENG (FADEC details), ADS (pitot-static thresholds), RADAR (altimeter frequency bands), SAR (range resolution formulas), INS (alignment procedures), CDL/COMM/DLNK (protocol specifics), EMS (flight-termination triggers), SEC (DO-326A TVRA outputs).

# 8. Quality checklist — run this against every file before emitting

- [ ] First 5 lines are the exact metadata header (no blank lines, no extra commas).
- [ ] Every `|| Requirement No:…` line closes with `||` (either on same line or on a later line).
- [ ] All IDs are `<MODULE>-<NNN>` or `<PLATFORM>-<MODULE>-<NNN>` — NNN zero-padded 3 digits.
- [ ] No duplicate IDs within the module.
- [ ] Sequential IDs (001, 002, 003, …) with no gaps.
- [ ] Trace link lines use the exact keywords from §5.4.
- [ ] Cross-refs use `##<MODULE>.<ID>` (no space after `##`).
- [ ] Every "shall" is testable (has numbers / rates / units).
- [ ] Table rows have `-{40,}` separator lines between them (dash count permissive, minimum 40 for safety).
- [ ] No <redacted> / <redacted> / <redacted> / <redacted> / <redacted> / <redacted> / <redacted> / <redacted> / <redacted> anywhere.
- [ ] Platform names are exactly: Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3.
- [ ] DAL assignments per §4.
- [ ] Req type mix per §6.2 (roughly).
- [ ] Standard-citation rate ≈ 50 %, trace-link rate ≈ 30 %, cross-module-ref rate ≈ 25 %.

# 9. Delivery format — machine-readable sentinels

Emit all 30 module files back-to-back, each wrapped between these exact sentinel lines on their own lines:

```
===FILE: <MODULE>.md ===
<entire file content, no prose, no markdown fences>
===END FILE: <MODULE>.md ===
```

Emit files in this exact order:
FCC, FMS, AUTO, INS, GPS, NAV, ADS, RADAR, CDL, COMM, DLNK, PWR, APM, EPS, ENG, FUEL, LDG, PLD, EOIR, SAR, GCS, HMI, EMS, BIT, FDR, TCS, STR, ICE, LGT, SEC.

After emitting all 30 files, end with:

```
===END CORPUS===
```

Between files, emit NOTHING — no blank narrative, no "next up", no "here is module 2". Just the next `===FILE: X.md ===` sentinel.

## 9.1 If you run out of tokens mid-generation

End your response with the line:

```
===CONTINUE FROM: <next module> ===
```

(where `<next module>` is the module you were about to write but didn't get to).

The user will send `continue` and you will pick up at that module, starting cleanly with `===FILE: <next module>.md ===`. Do not repeat modules you've already emitted.

## 9.2 Per-file size budget

A typical module (~33 reqs) produces ~40–80 KB of MD. Plan accordingly — you can probably fit 3–5 modules per response turn.

# 10. Golden example (read this carefully before generating)

This is a full, canonical example of what **one requirement** should look like — every pattern you need is in here. Follow this shape.

```
#Requirement: REQ-FCC
PROJECT NAME: AeroSys Common Avionics Core
MODULE NAME: FCC
BASELINE: v2.3.0
ABSOLUTE PATH: /AeroSys/Common/FCC

Header: PURPOSE
|| Requirement No:FCC-001 || Requirement: This document specifies the functional, performance, interface, and safety requirements of the Flight Control Computer (FCC) software for the AeroSys Dynamics common flight-control core, applicable to the Stratos-7, AeroLynx-X2, Skyrunner-T1, and Nimbus-C3 platforms. The FCC software shall be developed at DO-178C DAL-A on Stratos-7 and AeroLynx-X2, and at DAL-B on Skyrunner-T1 and Nimbus-C3. ||

Header: SCOPE
|| Requirement No:FCC-002 || Requirement: This document covers the normal, degraded, and emergency operation of the FCC including control-law scheduling, actuator command arbitration, cross-channel monitoring, and fail-safe behaviour. It excludes the mechanical design of servo actuators (##STR.STR-001) and the ground segment (##GCS.GCS-001). References: ARP4754A. ||

Header: REFERENCES
|| Requirement No:FCC-003 || Requirement: The following documents are governing references for this module: RTCA DO-178C, RTCA DO-254, SAE ARP4754A, SAE ARP4761, MIL-STD-1553B, ARINC 429, RTCA DO-160G, RTCA DO-326A. Compliance level for this module is DO-178C DAL-A (Stratos-7, AeroLynx-X2) or DAL-B (Skyrunner-T1, Nimbus-C3) and DO-254 Level A/B respectively. ||

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
|MC/DC|Modified Condition / Decision Coverage|
--------------------------------------------------
|BIT|Built-In Test|
--------------------------------------------------

Header: REQUIREMENTS

Header: Modes
|| Requirement No:FCC-010 || Requirement: The FCC shall support the following operational modes:
    a) Ground
    b) Takeoff
    c) Cruise
    d) Approach
    e) Emergency
Transitions between modes are governed by the Mode Transition Table (FCC-015). ||

|| Requirement No:FCC-011 || Requirement: When transitioning from Ground to Takeoff, the FCC shall complete the pre-takeoff BIT sequence within 3 s, and shall inhibit control-surface commands until the sequence completes successfully.
Verifies: BIT-003
Satisfies: ##EMS.EMS-002
References: DO-178C-6.3.1 ||

Header: General
|| Requirement No:FCC-020 || Requirement: The FCC shall execute the inner-loop control law at 200 Hz with a cycle-to-cycle jitter not exceeding 1 ms on 95 % of cycles measured over any 10-second window.
Note: Timing determinism supports DO-178C DAL-A low-level testing objectives.
Derives From: ARP4754A-SYS-004 ||

|| Requirement No:FCC-021 || Requirement: The FCC shall receive attitude data (pitch, roll, yaw) from the INS via ##INS.INS-015 at a minimum 200 Hz rate with a transport latency not exceeding 5 ms. When the measured rate drops below 180 Hz for more than 50 ms, the FCC shall set the INS_DEGRADED flag and switch to the secondary attitude source per FCC-022.
Satisfies: INS-015
Refines: FCC-020 ||

Header: Interface
|| Requirement No:FCC-030 || Requirement: The FCC shall transmit the attitude message (FCC_ATT) on MIL-STD-1553B Bus A every 20 ms with the INS as the data source. On loss of Bus A (3 consecutive missed cycles), the FCC shall fail over to Bus B within 20 ms.
References: MIL-STD-1553B ||

Header: Tables
|| Requirement No:FCC-040 || Requirement: The FCC shall command the primary flight-control surfaces within the ranges and rates specified in the Flight_Control_Limits table.
|Signal|Unit|Range|Default|Max Rate|
--------------------------------------------------
|pitch_cmd|deg|-30 to +30|0.0|60 deg/s|
--------------------------------------------------
|roll_cmd|deg|-60 to +60|0.0|120 deg/s|
--------------------------------------------------
|yaw_rate_cmd|deg/s|-15 to +15|0.0|30 deg/s/s|
--------------------------------------------------
|throttle_cmd|%|0 to 100|0.0|20 %/s|
--------------------------------------------------
Commands outside these ranges shall be clamped to the nearest limit and the EXCEEDANCE flag shall be set per FCC-041.
References: DO-178C-6.3.1 ||

Header: Test
|| Requirement No:FCC-090 || Requirement: Requirements FCC-020, FCC-021, and FCC-030 shall be verified by analysis of 200 Hz loop timing over a 10-minute HIL session, and by test case TP-FCC-020 on the iron-bird rig.
Verifies: FCC-020, FCC-021, FCC-030
References: DO-178C-6.4.4.2 ||
```

**Note** — this example is illustrative; the real FCC module has 60 requirements, so the real file will be ~8× this length. Use this as the pattern, not the content.

# 11. Platform-specific tips

- **Stratos-7** sections reference turbofan specifics (thrust class ~8 kN, SFC around 0.75 lb/(lbf·h), cruise ~Mach 0.7 at FL400), and heavy ISR payloads (SAR 0.3 m resolution, EO/IR 30 cm gimbal). DAL-A everywhere.
- **AeroLynx-X2** references twin turboprops (~960 shp each), medium altitude, L-band SAR (lower resolution, wider swath). DAL-A.
- **Skyrunner-T1** references piston/EFI specifics, short endurance, DAL-B only. Avoid cyber beyond DO-326A. Lightweight, less redundancy.
- **Nimbus-C3** references cargo handling (1.2 t internal bay), SORA (specific operations risk assessment), commercial logistics context, DO-355 continued airworthiness security.

# 12. Begin generation

Start with `===FILE: FCC.md ===` and proceed through the 30-module list in §3, order given in §9. Remember: no prose between files, no markdown code fences around files, just raw MD content between sentinels. When done with all 30, emit `===END CORPUS===`.

If you need to think through a module's design before writing, do so in extended-thinking (reasoning) scratch — do **not** emit that thinking as prose in the output. The output should be purely `===FILE: ...===` blocks.

Go.

===END PROMPT===

---

## Notes on what to do with the output

1. Claude will emit blocks like:
   ```
   ===FILE: FCC.md ===
   #Requirement: REQ-FCC
   PROJECT NAME: AeroSys Common Avionics Core
   ...
   ===END FILE: FCC.md ===
   ```
2. Paste each chunk (or the entire transcript) back into Claude Code. I have a splitter that will auto-extract each `===FILE: X.md ===` block into `data/synthetic/X.md`.
3. After all 30 files are in, run:
   ```
   make parse    # md_to_jsonl → requirements.jsonl
   make load     # load into Aura (nodes + auto-linked trace edges)
   make embed    # OpenAI text-embedding-3-small (~$0.02 total)
   make enrich   # optional — summary + classification (Gemini free or OpenAI ~$0.50)
   make link     # optional — LLM-discovered implicit edges (~$0.40)
   ```
4. If you go the Gemini route for `enrich` + `link`, swap these two env vars in `.env`:
   ```
   OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
   OPENAI_MODEL=gemini-2.0-flash-exp
   ```
   Embeddings stay on OpenAI (~$0.02) unless you set up Vertex.
