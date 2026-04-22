# Aerospace Requirements Conventions — Reference for AeroScope Synthetic Corpus

Reference sheet for the 1000-req synthetic corpus generator. Distills how public aerospace requirements docs (NASA, FAA, RTCA/EUROCAE, INCOSE, ArduPilot, PX4, IBM DOORS) are structured and worded. Output must mimic the IBM DOORS Classic 9.7 MD-export format already parsed by `md_to_jsonl.py`.

---

## 1. Requirement ID formats

Real-world aerospace IDs are almost always `PROGRAM-DOCTYPE-NUMBER`, optionally with a module-scoped short form.

| Source | Format | Example |
|---|---|---|
| NASA Space Launch System | `SLS-RQMT-NNN` / `SLS-SPEC-NNN` | `SLS-RQMT-216`, `SLS-SPEC-159` |
| NASA Gateway | `DSG-RQMT-NNN` | `DSG-RQMT-001` |
| NASA MSFC | `MSFC-RQMT-NNNN` | `MSFC-RQMT-3479` |
| NASA Procedural Requirements | `NPR N.NN` | `NPR 7150.2C`, `NPR 7123.1C` |
| FAA regulations | `§ NN.NNNN(a)(1)(i)` | `14 CFR § 25.1309(b)(1)` |
| IBM DOORS (module-scoped) | `MODPREFIX-NNN` | `STK-43`, `APM-C42` |

Key facts:

- NASA does not mandate a single scheme — each program picks its own `PROGRAM-DOCTYPE-` stem ([NASA App. C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/)).
- In classic DOORS 9.x the object ID is scoped to the **module**, so the same short ID (e.g. `STK-43`) can appear in more than one module ([IBM support](https://www.ibm.com/support/pages/modifying-object-identifier-prefix-ibm-rational-doors)).
- FAA uses dotted section numbers with lettered/numbered subparagraphs: `(a) (1) (i)` ([14 CFR 25.1309](https://www.law.cornell.edu/cfr/text/14/25.1309)).

**Use** `PROGRAM-MODULE-NNN` (e.g. `NSA-FCC-042`). Never reuse numbers across modules.

---

## 2. Standard document section structure

NASA's Interface Requirements Document outline is the cleanest public template ([NASA SEH App. L](https://www.nasa.gov/seh/appendix-l-interface-requirements-document-outline)):

```
1.0 Introduction
  1.1 Purpose and Scope
  1.2 Precedence
  1.3 Responsibility and Change Authority
2.0 Documents
  2.1 Applicable Documents
  2.2 Reference Documents
3.0 Interfaces
  3.1 General
  3.2 Interface Requirements
    3.2.1 Mass Properties
    3.2.2 Structural/Mechanical
    3.2.3 Fluid
    3.2.4 Electrical (Power)
    3.2.5 Electronic (Signal)
    3.2.6 Software and Data
    3.2.7 Environments
```

NASA SRS (Software Requirements Specification) uses a parallel structure with a much deeper `CSCI requirements` branch ([NASA SWEHB](https://swehb.nasa.gov/display/SWEHBVB/SRS+-+Software+Requirements+Specification)):

```
a. System overview
b. CSCI requirements
   1. Functional requirements
   2. Required states and modes
   3. External interface requirements
   4. Internal interface requirements
   5. Internal data requirements
   6. Adaptation requirements
   7. Safety requirements
   8. Performance and timing requirements
   9. Security and privacy requirements
  10. Environment requirements
  11. Computer resource requirements
  12. Software quality characteristics
  13. Design and implementation constraints
c. Qualification provisions
d. Bidirectional requirements traceability
```

**Use** these headers per synthetic module: `PURPOSE`, `SCOPE`, `REFERENCES`, `DEFINITIONS`, `SYSTEM OVERVIEW`, `FUNCTIONAL REQUIREMENTS`, `PERFORMANCE`, `INTERFACE REQUIREMENTS`, `SAFETY`, `ENVIRONMENT`, `VERIFICATION`, `ANNEXES`.

---

## 3. The "shall" language and EARS patterns

### 3.1 Modal verbs

The canonical rule from NASA, INCOSE, and US government style guides ([NASA App. C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/), [ArgonDigital](https://argondigital.com/blog/product-management/using-the-correct-terms-shall-will-should/)):

| Verb | Meaning |
|---|---|
| **shall** | Mandatory requirement |
| **will** | Statement of fact or declaration of intent (not a requirement) |
| **should** | Goal or non-mandatory preference |
| **may** | Permission (optional behavior) |

Every requirement = one subject + one `shall` + one testable action. Avoid `minimize`, `maximize`, `optimize`, `user-friendly`, `as appropriate` — INCOSE "bad words" ([NASA App. C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/)).

### 3.2 EARS — Easy Approach to Requirements Syntax

EARS gives five clause patterns, all ending in a `shall` action ([Mavin EARS reference](https://alistairmavin.com/ears/)):

| Pattern | Template | Example (verbatim from source) |
|---|---|---|
| **Ubiquitous** | `The <system> shall <response>` | "The mobile phone shall have a mass of less than XX grams." |
| **State-driven** | `While <precondition>, the <system> shall <response>` | "While there is no card in the ATM, the ATM shall display 'insert card to begin'." |
| **Event-driven** | `When <trigger>, the <system> shall <response>` | "When 'mute' is selected, the laptop shall suppress all audio output." |
| **Optional feature** | `Where <feature is included>, the <system> shall <response>` | "Where the car has a sunroof, the car shall have a sunroof control panel on the driver door." |
| **Unwanted behavior** | `If <trigger>, then the <system> shall <response>` | "If an invalid credit card number is entered, then the website shall display 'please re-enter credit card details'." |

Complex example: *"While the aircraft is on ground, when reverse thrust is commanded, the engine control system shall enable reverse thrust."*

**Mix** roughly 40 % ubiquitous, 20 % event, 15 % state, 15 % unwanted, 10 % optional.

---

## 4. Trace link phrasing

DO-178C mandates **bidirectional traceability** between system requirements, high-level requirements, low-level requirements, source code, and test cases ([DO-178C Wikipedia](https://en.wikipedia.org/wiki/DO-178C), [Parasoft DO-178C](https://www.parasoft.com/learning-center/do-178c/what-is/)). NASA-STD-5012 and NPR 7150.2 extend this to all requirement levels ([NASA 6.2](https://www.nasa.gov/reference/6-2-requirements-management/)).

Standard DOORS attribute names (also the natural English phrasing in text) — see Stell's hardware traceability guide and the DO-178C RTM pattern ([Stell](https://stell-engineering.com/blog/what-is-requirement-traceability), [Parasoft RTM](https://www.parasoft.com/learning-center/do-178c/requirements-traceability/)):

| Trace link | Direction | Example phrasing in requirement body |
|---|---|---|
| `Satisfies:` | up (child → parent) | `Satisfies: SYS-FCC-001` |
| `Derives From:` | up | `Derives From: NSA-PWR-010, NSA-PWR-011` |
| `Refines:` | up | `Refines: HLR-NAV-003` |
| `Verifies:` | verification → req | `Verifies: FCC-042` |
| `Verified By:` | req → test case | `Verified By: TC-FCC-042-01` |
| `Allocated To:` | req → module/component | `Allocated To: FCC_OFP` |
| `Traces To:` | generic | `Traces To: DO-178C 6.3.1` |
| `References:` | weak, any direction | `References: ARP4754A §5.2` |

The FAA VRTM template uses `Requirement ID → Verification Method → Verification ID → Status` columns ([FAA VRTM](https://www.faa.gov/sites/faa.gov/files/2022-02/VVSPT-E5-GDE-017_VRTM_V3.0.pdf)).

**Each req** carries 0–3 trace links using the exact tokens above + colon + comma-separated IDs. The parser (`md_to_jsonl.py`) already recognizes these. Also embed raw `##Module.REQ-001` inline refs when prose cites another module.

---

## 5. Verification methods

The four canonical verification methods are baked into DO-178C, DO-160, and NASA's NPR 7150.2 ([NASA App. C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/), [DO-178C Wikipedia](https://en.wikipedia.org/wiki/DO-178C)):

| Method | Use case |
|---|---|
| **Test** | Execute under controlled inputs and observe outputs |
| **Analysis** | Math, simulation, similarity argument, static analysis of code |
| **Inspection** | Visual / documentary examination (markings, drawings, code review) |
| **Demonstration** | Observe behavior in operational scenario without instrumented measurements |

DO-178C adds **Review** (walkthroughs, formal inspections) ([Aerospace Innovations](https://aerospace-innovations.com/a-fresh-take-on-do-178c-software-reviews/)). Every req cites one primary method: `Verification: Test (HIL rig, case TC-FCC-042-01)`.

---

## 6. Module / partition naming

Public avionics acronym lists ([Wikipedia aviation abbreviations](https://en.wikipedia.org/wiki/List_of_aviation,_avionics,_aerospace_and_aeronautical_abbreviations), [FAA abbreviations](https://www.faa.gov/about/abbreviations)):

| Module | Expansion | Module | Expansion |
|---|---|---|---|
| FCC | Flight Control Computer | FMS | Flight Management System |
| INS | Inertial Navigation System | IRS | Inertial Reference System |
| IMU | Inertial Measurement Unit | AHRS | Attitude/Heading Reference |
| ADC | Air Data Computer | GPS | Global Positioning System |
| COMM | Communications | NAV | Navigation |
| PWR | Power / Electrical | HYD | Hydraulics |
| ECS | Environmental Control System | FADEC | Engine Control (Full-Authority Digital) |
| EICAS | Engine Indication / Crew Alerting | HUD | Head-Up Display |
| MFD | Multi-Function Display | BIT | Built-In Test |
| TCAS | Traffic Collision Avoidance | TAWS | Terrain Awareness and Warning |

ArduPilot flight modes: `Guided`, `Loiter`, `Auto`, `RTL`, `Acro`, `Stabilize` ([ArduPilot](https://ardupilot.org/copter/docs/flight-modes.html)). PX4: `Manual`, `Assisted`, `Auto` ([PX4](https://docs.px4.io/main/en/concept/flight_modes.html)).

**Pick ~15** modules from the table. Name them `PROGRAM_MODULE` (e.g. `NSA_FCC`).

---

## 7. Parametric table format

DOORS MD export uses pipe-separated tables with `------` row separators. Real aerospace tables typically carry `Name | Unit | Min | Max | Nominal | Notes`, matching NASA's rule that performance values be "complete with tolerances … less than, greater than or equal to, plus or minus, 3 sigma root sum squares" ([NASA App. C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/)).

Emit rows like this:

```
|Name|Unit|Range|Default|
|airspeed_max|kt|0-450|350|
----------------------------------------
|pitch_rate_limit|deg/s|-30 to +30|±25|
```

---

## 8. IBM DOORS export specifics

DOORS 9.7 module objects carry two attributes: `Object Heading` (section titles) and `Object Text` (prose). DXL export snippet ([SmartDXL](http://www.smartdxl.com/content/?page_id=88)):

```dxl
if (obj."Object Heading" "" != "") {
    displayRich(number(obj) " " obj."Object Heading" "")
}
if (obj."Object Text" "" != "") {
    displayRich(richTextWithOle(obj."Object Text"))
}
```

Our MD export preserves this split as `Header:` lines + body. `number(obj)` produces the outline number (e.g. `3.2.5`) — emit these as `Object_Heading_Number` so the graph-builder can rebuild the hierarchy.

---

## 9. Quick do / don't for the generator

| Do | Don't |
|---|---|
| Start every requirement with a subject + `shall` | Use `must`, `will`, or `should` for mandatory behavior |
| Add a `Verification:` line with one of {Test, Analysis, Inspection, Demonstration} | Leave verification implicit |
| Include 0–3 `Satisfies:` / `Derives From:` / `Verifies:` links per req | Invent new trace-link verbs |
| Mix all 5 EARS patterns | Use only ubiquitous `The system shall …` — unrealistically flat |
| Put numeric limits with units: `≤ 50 ms`, `350 kt` | Write `fast`, `optimal`, `user-friendly` |
| Use module prefixes `NSA_FCC`, `NSA_NAV` | Use any proprietary vehicle, platform, or vendor names — all names must be synthetic |
| Cite real public standards: DO-178C, DO-254, DO-160, ARP4754A, MIL-STD-1553, ARINC-429, STANAG 4586 | Invent fake standard numbers |

---

## Sources

- [NASA — App. C: How to Write a Good Requirement](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/)
- [NASA SEH — App. L: Interface Requirements Document Outline](https://www.nasa.gov/seh/appendix-l-interface-requirements-document-outline)
- [NASA SWEHB — SRS template](https://swehb.nasa.gov/display/SWEHBVB/SRS+-+Software+Requirements+Specification)
- [NASA 6.2 — Requirements Management](https://www.nasa.gov/reference/6-2-requirements-management/)
- [NASA NPR 7150.2C — Software Engineering Requirements](https://nodis3.gsfc.nasa.gov/displayAll.cfm?Internal_ID=N_PR_7150_002C_)
- [NASA DSG-RQMT-001 Gateway System Requirements](https://ntrs.nasa.gov/api/citations/20190029153/downloads/20190029153.pdf)
- [14 CFR Part 25 — eCFR](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-25?toc=1)
- [14 CFR § 25.1309 — Cornell LII](https://www.law.cornell.edu/cfr/text/14/25.1309)
- [FAA — Aerospace Acronyms and Abbreviations](https://www.faa.gov/about/abbreviations)
- [FAA — Verification Requirements Traceability Matrix template](https://www.faa.gov/sites/faa.gov/files/2022-02/VVSPT-E5-GDE-017_VRTM_V3.0.pdf)
- [DO-178C — Wikipedia](https://en.wikipedia.org/wiki/DO-178C)
- [Parasoft — DO-178C RTM](https://www.parasoft.com/learning-center/do-178c/requirements-traceability/)
- [Aerospace Innovations — DO-178C Software Reviews](https://aerospace-innovations.com/a-fresh-take-on-do-178c-software-reviews/)
- [Alistair Mavin — EARS reference](https://alistairmavin.com/ears/)
- [ArgonDigital — shall / will / should](https://argondigital.com/blog/product-management/using-the-correct-terms-shall-will-should/)
- [Stell — Hardware-first requirements traceability](https://stell-engineering.com/blog/what-is-requirement-traceability)
- [Wikipedia — Aviation/avionics abbreviations](https://en.wikipedia.org/wiki/List_of_aviation,_avionics,_aerospace_and_aeronautical_abbreviations)
- [ArduPilot — Copter Flight Modes](https://ardupilot.org/copter/docs/flight-modes.html)
- [PX4 — Flight Modes concept](https://docs.px4.io/main/en/concept/flight_modes.html)
- [IBM DOORS — object identifier prefix](https://www.ibm.com/support/pages/modifying-object-identifier-prefix-ibm-rational-doors)
- [IBM DOORS 9.7.2 — Attributes](https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/doors/9.7.2?topic=modules-attributes)
- [SmartDXL — Layout DXL](http://www.smartdxl.com/content/?page_id=88)
