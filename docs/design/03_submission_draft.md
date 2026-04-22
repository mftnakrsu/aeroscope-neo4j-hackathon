# AeroScope — Hackathon Submission Draft

**Hackathon:** Neo4j Aura Agents & Context Building Hackathon (April 15 – June 15, 2026)
**Status:** Draft v1 — screenshot / demo link placeholders to be swapped before posting.

---

## Variant A — Main submission post (~350 words)

### Agent Name
**AeroScope**

### What it does
AeroScope is a requirements-engineering agent for aerospace teams — the person it's built for is the systems engineer who just got a change request at 4pm and has to answer *"what else does this break?"* before standup tomorrow. Instead of paging through a thousand requirements in IBM DOORS, the engineer asks AeroScope in plain English and gets a traced, cited answer: upstream stakeholder needs, downstream test procedures, the standards clauses at risk, and the implicit dependencies no one wrote down. It is not "RAG over PDFs." It is an agent that walks a graph of engineering intent, names its trace path, and explains its reasoning, one hop at a time. Certification auditors use the same agent to ask the inverse question — *"show me every requirement that claims to satisfy DO-178C DAL-B, and prove it with a verification chain"* — and get a machine-checkable answer rather than a 200-page PDF.

### Dataset and why a graph fits
The corpus is 1000 synthetic aerospace requirements spread across ~30 modules, 4 fictional platforms (**Stratos-7**, **AeroLynx-X2**, **Skyrunner-T1**, **Nimbus-C3**) built by the fictional company **AeroSys Dynamics**, referencing 14 real public standards (DO-178C, ARP4754A, MIL-STD-1553B, ARINC 429, STANAG 4586, DO-254, DO-160, …). The files are generated in the MD export format used by IBM DOORS Classic 9.7, so the pipeline works on real industry exports the same way.

In requirements engineering, **the relationships *are* the data**. `SATISFIES`, `DERIVES_FROM`, `VERIFIES`, `REFERENCES_STANDARD`, `ALLOCATED_TO` — take these away and you're left with a thousand disconnected sentences. A document store can locate *a* requirement; only a graph can answer *"if I change this one, what breaks?"* That's a multi-hop traversal question, not a similarity question, and it's the question engineers actually ask.

### Tools the agent uses
- **Cypher Template** — predictable trace queries: impact analysis, coverage gaps, orphan detection, standards compliance sweeps.
- **Text2Cypher** — open-ended questions across the full schema ("show me all safety-critical requirements on Stratos-7 that are only verified by analysis").
- **Similarity Search** — concept and ambiguous-wording queries over requirement text + LLM-generated summary embeddings (1536d, cosine), for when the engineer knows the *idea* but not the ID.

### What makes it interesting
Three things. **(1)** An offline LLM pass discovers `SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS`, and `POTENTIALLY_CONFLICTS` edges — the dependencies that are real in the system but never written into a formal trace link because the two engineers who understood them never worked on the same module in the same week. Plain-text RAG cannot find these; a graph that was enriched once and then reused every day can. **(2)** The agent doesn't just return hits, it **explains why** each one showed up: "this requirement depends on yours because it allocates to the same FCC component, shares the DO-178C DAL-B obligation, and its verification procedure reuses the same 28V bus rig." That explanation is the trace path itself, serialised into English — which means the engineer can defend the answer to a reviewer without trusting the LLM. **(3)** Aerospace requirements engineering is a domain that still runs on Excel, Word tables, and 20-year-old tooling; showing what a modern graph + agent stack does here is genuinely new ground, and the same pattern transfers directly to medical devices, automotive ISO 26262 work, and any other discipline where trace links are the product.

### Screenshots and demo
- Screenshot — agent in the Aura console: *[placeholder — to be added]*
- Screenshot / short demo — agent in action on the killer query: *[placeholder]*
- Link to the agent (if publishable): *[placeholder]*

---

## Variant B — Three alternative taglines

Each under 20 words, distinct angle.

1. **Technical angle**
   *AeroScope: a requirements agent that walks 14 relationship types and LLM-discovered implicit edges to answer "what breaks if I change this?"*

2. **Humanistic angle**
   *AeroScope is the colleague who has read every requirement, remembers every trace link, and tells you the parts nobody wrote down.*

3. **Competitive angle**
   *A thousand aerospace requirements, four platforms, fourteen standards — one graph that reasons, cites, and explains. Not another search bar.*

---

## Variant C — Short version (~100 words)

> **AeroScope** — a Neo4j Aura agent that reasons over 1,000 aerospace requirements the way a systems engineer does: trace links upstream, test procedures downstream, standards clauses flagged, implicit dependencies surfaced. Because in requirements engineering the relationships *are* the data — `SATISFIES`, `DERIVES_FROM`, `VERIFIES`, plus LLM-discovered edges no document store can find. The wow moment: ask *"if we change the 28V bus undervoltage threshold, what breaks?"* and the agent returns the affected requirements, the tests to rerun, and the standards at risk — each with an explanation of *why*. Built for the engineer staring down a 4pm change request.

---

## Notes for the poster (not for publication)

- Swap in the Aura console screenshot and the demo clip before posting.
- Keep the "change the 28V DC bus undervoltage threshold" example as the lead demo — it maps cleanly to impact analysis across trace, verification, and standards edges in a single screen.
- If a live agent link is publishable at submission time, add it under **Screenshots and demo**; otherwise the demo clip carries the load.
- Tone check: professional, grounded, no hype vocabulary ("revolutionary", "disruptive", "cutting-edge" all avoided). First-person plural reserved for the team line if needed.
- No platform/company name overlaps with real-world programmes — everything aerospace-specific is fictional (AeroSys Dynamics, Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3); the standards referenced are public.
