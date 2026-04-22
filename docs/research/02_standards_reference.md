# Aerospace Standards Reference for AeroScope

This document is a concise reference for the aerospace/avionics standards most
commonly cited by requirements in civil and military aircraft development. It is
the source of truth for the 1000 synthetic requirements generated for AeroScope.

All facts are taken from public sources; every entry links to the official
publisher. Requirements are written for the fictional integrator **AeroSys
Dynamics** and its fictional platforms **Stratos-7** (narrowbody commercial
jet), **AeroLynx-X2** (rotorcraft), **Skyrunner-T1** (training/light UAV),
and **Nimbus-C3** (high-altitude surveillance UAV).

---

## 1. RTCA DO-178C — Software Considerations in Airborne Systems and Equipment Certification

**Scope.** The primary document by which the FAA, EASA, and Transport Canada
approve commercial software-based aerospace systems; published by RTCA jointly
with EUROCAE (ED-12C) in 2011 and referenced by FAA AC 20-115D. It defines
71 total objectives distributed across five Design Assurance Levels (DAL) tied
to the failure-condition severity from the ARP4761 safety assessment:
**A Catastrophic, B Hazardous, C Major, D Minor, E No Effect**. Higher levels
require more objectives, more artifacts, and more objectives satisfied "with
independence" (verifier ≠ author).

**Typical citing requirements.** Software development-plan requirements,
structural coverage (MC/DC for Level A), verification independence,
traceability from high-level to low-level requirements, tool qualification,
configuration management.

**Example requirement.**
`SWR-STR7-044: The AeroSys Dynamics Stratos-7 Flight Guidance software shall
be developed to DAL A in accordance with RTCA DO-178C, with MC/DC structural
coverage demonstrated on the object code.`

**Publisher:** RTCA, Inc. — <https://www.rtca.org/products/do-178c-electronic/>

---

## 2. RTCA DO-254 — Design Assurance Guidance for Airborne Electronic Hardware

**Scope.** The hardware counterpart to DO-178C, co-published with EUROCAE as
ED-80 in 2000 and accepted by the FAA via AC 20-152. It applies to complex
custom micro-coded components such as FPGAs, PLDs, ASICs, and Line Replaceable
Units, using the same DAL A-E severity mapping.

**Typical citing requirements.** FPGA/ASIC design-assurance requirements,
elemental analysis, hardware requirements traceability, configuration
management of HDL, simple-vs-complex classification.

**Example requirement.**
`HWR-NIM3-017: The AeroSys Dynamics Nimbus-C3 Flight Control FPGA shall be
designed in accordance with RTCA DO-254 at DAL B, and elemental analysis shall
be performed on all implemented gates.`

**Publisher:** RTCA, Inc. — <https://www.rtca.org/do-178/> (DO-254 listed in
RTCA standards catalogue).

---

## 3. RTCA DO-160G — Environmental Conditions and Test Procedures for Airborne Equipment

**Scope.** The industry-standard environmental qualification specification for
airborne equipment, first issued 1975, current revision **DO-160G (2010)**,
referenced by FAA AC 21-16G. Twenty-six sections cover temperature, altitude,
vibration, humidity, salt fog, power input, conducted/radiated RF, lightning
(indirect effects), and electrostatic discharge.

**Typical citing requirements.** Environmental qualification, EMC/EMI
verification, power-input tolerance, lightning and HIRF protection.

**Example requirement.**
`ENV-AX2-022: The AeroLynx-X2 Main Gearbox Health Monitoring Unit shall pass
RTCA DO-160G Section 8 (Vibration, Category R) and Section 20 (RF
Susceptibility, Category T).`

**Publisher:** RTCA, Inc. — <https://www.rtca.org/products/do-160g-electronic/>

---

## 4. SAE ARP4754A / EUROCAE ED-79A — Guidelines for Development of Civil Aircraft and Systems

**Scope.** Released December 2010, this Aerospace Recommended Practice
addresses the full development lifecycle of aircraft and systems that
implement aircraft functions. It introduced the distinction between
**Functional Development Assurance Level (FDAL)** for aircraft/system
functions and **Item Development Assurance Level (IDAL)** for lower-level
items, and is the bridge between the aircraft-level safety process (ARP4761)
and item-level standards (DO-178C, DO-254).

**Typical citing requirements.** System-level development-plan requirements,
requirements capture and validation, architecture allocation, FDAL/IDAL
assignment rationale.

**Example requirement.**
`SYS-STR7-003: The AeroSys Dynamics Stratos-7 Electrical Power Generation
System shall be developed in accordance with SAE ARP4754A, with FDAL A
assigned to the "Provide AC Power to Essential Bus" function.`

**Publisher:** SAE International — <https://www.sae.org/standards/content/arp4754a/>

---

## 5. SAE ARP4761 — Guidelines and Methods for Conducting the Safety Assessment Process on Civil Airborne Systems and Equipment

**Scope.** First published 1996 to support compliance with FAR/JAR 25.1309,
ARP4761 describes the aircraft- and system-level safety assessment methodology:
**Functional Hazard Assessment (FHA)** at aircraft and system level,
**Preliminary System Safety Assessment (PSSA)**, **System Safety Assessment
(SSA)**, and **Common Cause Analysis** (Particular Risk, Zonal Safety, and
Common Mode).

**Typical citing requirements.** Safety requirements derived from hazard
classification, failure-rate budgets, independence/segregation requirements,
common-cause mitigation.

**Example requirement.**
`SAF-AX2-011: The AeroLynx-X2 Tail Rotor Drive Monitoring function shall have a
probability of undetected loss no greater than 1x10-9 per flight hour, as
derived from the ARP4761 System Safety Assessment for hazard H-TR-03
(Catastrophic).`

**Publisher:** SAE International — <https://www.sae.org/standards/content/arp4761/>

---

## 6. MIL-STD-1553B — Digital Time Division Command/Response Multiplex Data Bus

**Scope.** US DoD interface standard defining the mechanical, electrical,
and functional characteristics of a 1 Mbps dual-redundant serial data bus
widely used in military avionics and spacecraft. Supports up to 31 Remote
Terminals with a single Bus Controller using half-duplex command/response
time-division multiplexing on a Manchester II biphase physical layer.

**Typical citing requirements.** Bus interface compliance, Remote Terminal
protocol, stub and coupling requirements, bus-controller scheduling.

**Example requirement.**
`ICD-NIM3-007: The Nimbus-C3 Mission Computer shall operate as a Bus
Controller on a dual-redundant MIL-STD-1553B data bus, scheduling all
Remote Terminal transactions within a 20 ms minor frame.`

**Publisher:** US Department of Defense — <https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36973>

---

## 7. ARINC 429 — Mark 33 Digital Information Transfer System

**Scope.** Adopted 1977 by Aeronautical Radio, Incorporated, ARINC 429 is the
predominant point-to-point unidirectional avionics data bus on commercial and
transport aircraft. A single transmitter broadcasts to up to 20 receivers on a
shielded 78 Ω twisted pair at 12.5 kHz (low) or 100 kHz (high). Data is
carried in 32-bit words comprising an 8-bit octal label, data field, SSM, and
parity bit; data encodings include BNR and BCD.

**Typical citing requirements.** Interface Control Document (ICD) label
assignments, scaling and resolution of BNR data, refresh rates, parity.

**Example requirement.**
`ICD-STR7-014: The Stratos-7 Air Data Computer shall transmit indicated
airspeed on ARINC 429 label 206 (octal) as a BNR word with 0.125 kt
resolution, updated at 50 Hz.`

**Publisher:** ARINC (now SAE-ITC Aeronautical Standards) — <https://aviation-ia.sae-itc.com/standards/arinc429p1-17-429p1-17-mark-33-digital-information-transfer-system-dits-part-1-functional-description-electrical>

---

## 8. STANAG 4586 — Standard Interfaces of UAV Control System (UCS) for NATO UAV Interoperability

**Scope.** NATO Standardization Agreement, current Edition 4 (2017),
specifying architectures, message formats, and protocols required to achieve
defined **Levels of Interoperability (LOI 1-5)** between UAV Control Stations
and unmanned air vehicles. Companion publication AEP-84 Ed. A, maintained by
the NATO Standardization Office (NSO).

**Typical citing requirements.** UAV-to-UCS command/control message
compliance, LOI achievement, Vehicle Specific Module behavior, handover of
control.

**Example requirement.**
`UAV-NIM3-101: The Nimbus-C3 Air Vehicle shall support STANAG 4586 Edition 4
Level of Interoperability 4, including full mission control and payload
control from a NATO-compliant UCS.`

**Publisher:** NATO Standardization Office — <https://nso.nato.int/nso/nsdd/main/standards> (search AEP-84 / STANAG 4586).

---

## 9. STANAG 7085 — NATO Interoperable Data Links for ISR Systems

**Scope.** NATO waveform standard (companion publication AEDP-7085) for
real-time transmission of imagery, video, and other Intelligence, Surveillance
and Reconnaissance (ISR) data from airborne sensors to ground exploitation
stations. It covers point-to-point digital, broadcast digital, and analogue
ISR data links, commonly associated with Common Data Link (CDL) variants.

**Typical citing requirements.** Tactical data-link compliance, waveform
selection, encryption interfaces, ground-station interoperability.

**Example requirement.**
`DL-NIM3-204: The Nimbus-C3 ISR payload shall downlink full-motion video via a
STANAG 7085-compliant point-to-point digital data link operating in Ku-band
at up to 137 Mbps.`

**Publisher:** NATO Standardization Office — <https://nso.nato.int/nso/nsdd/main/standards> (search AEDP-7085).

---

## 10. MIL-STD-1760 — Aircraft/Store Electrical Interconnection System

**Scope.** US DoD interface standard (current revision MIL-STD-1760E) that
defines a common electrical and fiber-optic interface between aircraft and
stores (weapons, fuel tanks, pods, countermeasures). It specifies 28 VDC and
115/200 VAC or 270 VDC power, 32 input and 16 output discretes, a MIL-STD-1553
high-bandwidth digital data interface, and high-bandwidth coaxial paths.

**Typical citing requirements.** Weapon-station integration, power delivery
envelopes, discrete signal timing, safety interlock signals.

**Example requirement.**
`STR-STR7-402: Each Stratos-7 external pylon shall provide a MIL-STD-1760E
primary interface, including two independent 28 VDC power lines and a
MIL-STD-1553B digital data bus, to the carried store.`

**Publisher:** US Department of Defense — <https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=37120>

---

## 11. MIL-STD-810H — Environmental Engineering Considerations and Laboratory Tests

**Scope.** US DoD test-method standard (Revision H, 2019) covering laboratory
simulation of real-world environmental stresses. Twenty-eight test methods
include low/high temperature (501/502), temperature shock (503), humidity,
salt fog, sand and dust, altitude, vibration (514), shock (516), gunfire
vibration, explosive atmosphere, and combined environments (520). Tailoring
to mission profile is explicitly required rather than blanket application.

**Typical citing requirements.** Ruggedization, tailored environmental test
plans, transport and handling shock, operating temperature range.

**Example requirement.**
`ENV-SKY1-031: The Skyrunner-T1 Ground Control Station enclosure shall meet
MIL-STD-810H Method 514.8 Procedure I (general vibration) and Method 501.7
Procedure II (high-temperature operation at +55 °C).`

**Publisher:** US Department of Defense — <https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978>

---

## 12. MIL-STD-882E — Department of Defense Standard Practice, System Safety

**Scope.** DoD standard practice (current revision 882E, 2012, with Change 1)
identifying the systems-engineering approach to hazard identification and
risk mitigation across the full lifecycle of defense systems, including
hardware and software. Only Sections 3 and 4 are mandatory when invoked
without a specific task number; conforms to DoDI 5000.02 risk-acceptance
authorities.

**Typical citing requirements.** Hazard tracking database population, risk
assessment codes (catastrophic/critical/marginal/negligible), software
Level of Rigor tasks, residual-risk acceptance.

**Example requirement.**
`SAF-SKY1-009: A MIL-STD-882E System Safety Program shall be conducted for
the Skyrunner-T1 launch system, and any hazard assessed as "High" or
"Serious" shall be mitigated to "Medium" or lower prior to first flight.`

**Publisher:** US Department of Defense — <https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36027>

---

## 13. RTCA DO-297 — Integrated Modular Avionics (IMA) Development Guidance and Certification Considerations

**Scope.** Approved November 2005 and co-published with EUROCAE as ED-124,
DO-297 provides certification guidance for **Integrated Modular Avionics**,
where multiple software functions of mixed safety-criticality share a common
computing platform. It defines roles (platform supplier, application
supplier, integrator), incremental acceptance, and change-impact management.
Referenced by FAA AC 20-170.

**Typical citing requirements.** Platform acceptance, application-level
reuse, resource allocation, robust partitioning evidence, shared-resource
analysis.

**Example requirement.**
`IMA-STR7-055: The Stratos-7 IMA platform shall be certified as a reusable
platform per RTCA DO-297, supporting hosting of DAL A and DAL C applications
with robust time and space partitioning.`

**Publisher:** RTCA, Inc. — <https://my.rtca.org/nc__store> (search DO-297).

---

## 14. ARINC 653 — Avionics Application Standard Software Interface

**Scope.** ARINC specification (initial release 1996; current series ARINC
653P0-P5) defining robust time and space **partitioning** for safety-critical
avionics real-time operating systems, used to implement the DO-297 IMA
concept. It defines the **APEX (APplication EXecutive)** API, partition and
process management, inter-partition communication (sampling/queueing ports),
intra-partition communication (buffers, blackboards, semaphores), and health
monitoring.

**Typical citing requirements.** RTOS API conformance, partition schedule
configuration, port contracts between applications, health-monitor tables.

**Example requirement.**
`SW-STR7-071: The Stratos-7 IMA platform RTOS shall conform to ARINC 653P1-5
APEX services, and no application partition shall exceed its configured
time window under worst-case execution-time analysis.`

**Publisher:** SAE-ITC / ARINC Industry Activities — <https://aviation-ia.sae-itc.com/standards/arinc653p1-5-653p1-5-avionics-application-software-standard-interface-part-1-required-services>

---

## Sources

- [DO-178C - Wikipedia](https://en.wikipedia.org/wiki/DO-178C)
- [DO-178C, Software Considerations - RTCA](https://www.rtca.org/training/do-178c-training/)
- [DO-178C - Electronic - RTCA Products](https://www.rtca.org/products/do-178c-electronic/)
- [DO-254 - Wikipedia](https://en.wikipedia.org/wiki/DO-254)
- [DO-254 Training - RTCA](https://www.rtca.org/training/do-254-training/)
- [FAA AC 20-152 - RTCA DO-254](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/22211)
- [DO-160 - Wikipedia](https://en.wikipedia.org/wiki/DO-160)
- [DO-160G - Electronic - RTCA](https://www.rtca.org/products/do-160g-electronic/)
- [FAA AC 21-16G - DO-160](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_21-16G.pdf)
- [ARP4754 - Wikipedia](https://en.wikipedia.org/wiki/ARP4754)
- [ARP4754A - SAE International](https://www.sae.org/standards/content/arp4754a/)
- [ARP4761 - Wikipedia](https://en.wikipedia.org/wiki/ARP4761)
- [ARP4761 - SAE International](https://www.sae.org/standards/content/arp4761/)
- [MIL-STD-1553 - Wikipedia](https://en.wikipedia.org/wiki/MIL-STD-1553)
- [ESA: MIL-STD-1553](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Onboard_Computers_and_Data_Handling/Mil-STD-1553)
- [MIL-STD-1553 - DLA QuickSearch](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36973)
- [ARINC 429 - Wikipedia](https://en.wikipedia.org/wiki/ARINC_429)
- [ARINC 429 Specification (MaxT)](https://www.maxt.com/mxf/arinc_429_spec.html)
- [STANAG 4586 - Wikipedia](https://en.wikipedia.org/wiki/STANAG_4586)
- [STANAG 4586 Ed 4 - NISP Nation](https://nisp.nw3.dk/coverdoc/nato-stanag4586ed4.html)
- [NATO STO: STANAG 4586](https://www.sto.nato.int/document/stanag-4586-standard-interfaces-of-uav-control-system-ucs-for-nato-uav-interoperability/)
- [STANAG 7085 / AEDP-7085 - GlobalSpec](https://standards.globalspec.com/std/14351672/stanag-7085)
- [MIL-STD-1760 - Wikipedia](https://en.wikipedia.org/wiki/MIL-STD-1760)
- [MIL-STD-1760 - DLA QuickSearch](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=37120)
- [MIL-STD-810 - Wikipedia](https://en.wikipedia.org/wiki/MIL-STD-810)
- [MIL-STD-810 - DLA QuickSearch](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=35978)
- [MIL-STD-882E - AcqNotes](https://acqnotes.com/acqnote/tasks/mil-std-882e-system-safety)
- [MIL-STD-882E - DLA QuickSearch](https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=36027)
- [DO-297 - Wikipedia](https://en.wikipedia.org/wiki/DO-297)
- [FAA AC 20-170 - DO-297 / ARINC 653](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_20-170_w-chg_1.pdf)
- [ARINC 653 - Wikipedia](https://en.wikipedia.org/wiki/ARINC_653)
- [NATO Standardization Office (NSO) public standards](https://nso.nato.int/nso/nsdd/main/standards)
