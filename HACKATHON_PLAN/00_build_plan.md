# AeroScope Build Plan

**Target:** Neo4j Aura Agents & Context Building Hackathon
**Deadline:** 2026-06-15
**Submission format:** Thread reply with {Agent Name, What it does, Dataset + why graph, Aura console screenshot, demo screenshot/video, optional live agent link}.

---

## Agent identity

- **Name:** AeroScope
- **One-liner:** *An aerospace requirements traceability agent that reasons over a context-rich graph of requirements, standards, test procedures, and LLM-discovered implicit dependencies.*
- **Target user:** systems engineer / requirements manager / certification auditor.
- **Killer demo question:** *"If we change the 28V DC bus undervoltage threshold from 22 V to 24 V, which requirements are affected, which tests must rerun, and what standards could we fall out of compliance with?"*

## Architecture

```
[Synthetic corpus: 1000 reqs across 30 modules, 3 platforms]
      │   MD export format (IBM DOORS Classic 9.7 compatible)
      ▼
[Parser]  ─ md_to_jsonl.py ──▶  [JSONL]
                                   │
                                   ▼
                        ┌────────────────────┐
                        │ Neo4j Aura Free    │
                        │                    │
                        │ :Requirement       │
                        │ :Module :Platform  │
                        │ :Standard :Test…   │
                        │ 14+ rel types      │
                        │ vector index 1536d │
                        └────────────────────┘
                                   │
                                   ▼
                        ┌────────────────────┐
                        │  Aura Agent        │
                        │  · Cypher Template │
                        │  · Text2Cypher     │
                        │  · Similarity      │
                        │    Search          │
                        └────────────────────┘
                                   │
                                   ▼
                           User questions
```

## Schema (draft — finalised by Wave 2/A5)

**Node labels:**
- `:Requirement` — the atomic unit (id, text, summary, classification, embedding, module, heading, …)
- `:Module` — a DOORS module (FCC, INS, CDL, POWER, …)
- `:Platform` — fictional UAVs (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3)
- `:Standard` — public standards (DO-178C, ARP4754A, MIL-STD-1553B, ARINC 429, STANAG 4586, DO-254, DO-160, …)
- `:Component` — generic avionics components (FCC, INS, IMU, GPS, MFD, …)
- `:TestProcedure` — verification artefacts
- `:Stakeholder` — fictional roles (Chief Engineer, Certification Lead, …)
- `:Organization` — fictional + public (AeroSys Dynamics [fictional], Boeing, Airbus, Honeywell, …)
- `:Interface` — buses/protocols (MIL-STD-1553B, ARINC 429, Ethernet, RS-422, CAN Bus, AFDX, Link-16)
- `:OperationalMode` — Flight/Ground/Emergency/Standby/BIT/…

**Relationship types:**
- *Structural:* `CONTAINS`, `NEXT`, `ALLOCATED_TO`, `USES`, `PART_OF`
- *Trace:* `SATISFIES`, `DERIVES_FROM`, `VERIFIES`, `REFINES`, `CONFLICTS_WITH`, `REFERENCES_STANDARD`
- *Verification:* `VERIFIED_BY`, `COVERS`
- *Authorship:* `AUTHORED`
- *LLM-discovered:* `SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS`, `POTENTIALLY_CONFLICTS`

**Vector index:** `requirement_embeddings` on `:Requirement(embedding)`, 1536 dims (OpenAI `text-embedding-3-small`), cosine.

## Build waves

### Wave 0 — setup (done)
- [x] GitHub repo created (private): https://github.com/mftnakrsu/aeroscope-neo4j-hackathon
- [x] Local dir skeleton
- [x] Placeholder templates copied from old repo

### Wave 1 — bootstrap (in progress)
- [x] .gitignore
- [x] README stub
- [x] .env.example
- [x] Build plan (this file)
- [ ] Initial commit + push

### Wave 2 — 12 parallel agents
1. Research: public DOORS export format conventions
2. Research: aerospace standards (DO-178C / ARP4754A / MIL-STD / ARINC / STANAG / DO-254 / DO-160)
3. Research: Neo4j Aura Agent tool configuration syntax
4. Design: fictional company, 3 platforms, 30 modules, ~1000 req target distribution
5. Design: final graph schema → `aura/schema.cypher` + `docs/02_schema.md`
6. Port: `config.py` + `llm_utils.py` (OpenAI API based)
7. Port: `scripts/md_to_jsonl.py` → `src/md_to_jsonl.py` (strip Turkish-only logic but keep keyword aliases)
8. Port: `graph_builder.py` + `entity_extractor.py` (remove <redacted>/<redacted> regex, switch to generic aerospace)
9. Port: `requirement_enricher.py` + `implicit_linker.py` + `compute_embeddings.py`
10. Write: `requirements.txt` (pinned) + overall scaffolding files
11. Design: 10 "wow" demo queries → `demo/demo_queries.md`
12. Draft: submission text (what it does, dataset + why graph) → `docs/submission_draft.md`

### Wave 3 — corpus + Aura
- Implement `src/generate_corpus.py` (LLM-driven synthetic data generator)
- Run generation: 1000 requirements across 30 modules, 5 section types each
- Implement `src/load_to_aura.py`
- Manually create Aura Free instance
- Load + verify

### Wave 4 — Aura Agent + demo + website
- Configure Cypher Template tool
- Configure Text2Cypher tool
- Configure Similarity Search tool
- Test 10 demo queries in Aura Agent UI
- Capture screenshots
- Build landing page (deploy to Vercel or GitHub Pages)
- Record demo video

### Wave 5 — submit
- Flip repo to public
- Post to hackathon thread
- Share Aura Agent link (if publishable)
- Verify T-shirt eligibility
