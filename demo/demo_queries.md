# AeroScope — Demo Queries

This file curates the ten questions we use to demonstrate AeroScope to the Neo4j Aura Agents hackathon judges. Each query is chosen because it is load-bearing: it either asks something a plain-LLM-on-PDFs system cannot answer, or it returns an answer whose value comes from graph traversal — multi-hop trace links, combined relationship types, or LLM-discovered implicit dependencies surfaced alongside explicit ones.

For every query we list the natural-language phrasing (how a real systems engineer would ask it), the Aura Agent tool we expect to fire (Cypher Template, Text2Cypher, or Similarity Search), the traversal the agent should execute, the shape of the answer, and a one-sentence note on why the question matters in practice. The mix deliberately covers the three capabilities a requirements-engineering agent needs to prove: **impact analysis** under change, **compliance** against public standards (DO-178C, ARP4754A, MIL-STD-1553B, DO-254, DO-160, ARINC 429, STANAG 4586), and **coverage / gap detection** against a fictional fleet of four platforms — Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3.

The graph holds roughly 1,000 synthetic requirements across ~30 modules (FCC, INS, NAV, COMM, PWR, CDL, FMS, …) and the four platforms above. Fourteen relationship types connect them, including the four LLM-discovered implicit edges (`SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS`, `POTENTIALLY_CONFLICTS`) which are the secret sauce — they turn the graph from a filing cabinet into a reasoning surface.

---

### Query 1 — 28V DC bus threshold change (the killer demo)

**Question:** If we raise the 28V DC bus undervoltage threshold on Stratos-7 from 22 V to 24 V, which requirements are affected, which tests must rerun, and what standards could we fall out of compliance with?

**Which tool:** Cypher Template — the shape is fixed (pivot on a requirement, fan out on trace + verification + standard edges), so a parameterised template is faster and more deterministic than Text2Cypher.

**Expected traversal (Cypher):**
```cypher
MATCH (anchor:Requirement)
WHERE anchor.full_text =~ '(?i).*28\\s*V.*undervoltage.*'
  AND (anchor)-[:ALLOCATED_TO]->(:Platform {name: 'Stratos-7'})
CALL {
  WITH anchor
  MATCH path = (anchor)<-[:DERIVES_FROM|SATISFIES|REFINES|SEMANTICALLY_DEPENDS_ON|CONSTRAINS*1..3]-(dependent:Requirement)
  RETURN dependent, [r IN relationships(path) | type(r)] AS chain
}
OPTIONAL MATCH (dependent)-[:VERIFIED_BY]->(t:TestProcedure)
OPTIONAL MATCH (dependent)-[:REFERENCES_STANDARD]->(s:Standard)
RETURN dependent.id, dependent.heading, chain,
       collect(DISTINCT t.name)  AS tests_to_rerun,
       collect(DISTINCT s.name)  AS standards_at_risk
ORDER BY size(chain) ASC;
```

**Expected answer shape:**
- Anchor requirement (the 28V threshold clause) with its module and platform.
- For each affected requirement: its ID + heading, the exact chain of relationship types from the anchor (e.g. `[DERIVES_FROM, SATISFIES]`), and whether the link is explicit or LLM-discovered.
- A deduplicated list of test procedures that need to be re-executed.
- A deduplicated list of standards whose compliance evidence is invalidated by the change.
- A one-line justification per chain — *"because REQ-PWR-042 derives from this threshold, and REQ-FCC-118 satisfies REQ-PWR-042, changing the threshold invalidates the satisfaction evidence for REQ-FCC-118."*

**Why this matters:**
This is the single question every change-control board asks before approving an ECP; answering it by hand across 1,000 requirements takes days and almost always misses an implicit dependency.

---

### Query 2 — Ripple effect of retiring a sensor interface

**Question:** We are dropping the RS-422 payload link on AeroLynx-X2 in the next baseline — show me every requirement that would be left dangling, grouped by module, and flag any that also appear on other platforms.

**Which tool:** Cypher Template — the pattern (drop an interface, fan out through `USES`/`ALLOCATED_TO`/`DERIVES_FROM`) is a canonical impact-analysis shape we will reuse for other retirements.

**Expected traversal (Cypher):**
```cypher
MATCH (iface:Interface {name: 'RS-422'})<-[:USES]-(dir:Requirement)
      -[:ALLOCATED_TO]->(:Platform {name: 'AeroLynx-X2'})
CALL {
  WITH dir
  MATCH (dependent:Requirement)-[:DERIVES_FROM|SATISFIES|SEMANTICALLY_DEPENDS_ON*0..2]->(dir)
  RETURN dependent
}
OPTIONAL MATCH (dependent)-[:ALLOCATED_TO]->(other:Platform)
WHERE other.name <> 'AeroLynx-X2'
RETURN dependent.module, dependent.id, dependent.heading,
       collect(DISTINCT other.name) AS also_on
ORDER BY dependent.module, dependent.id;
```

**Expected answer shape:**
- A module-grouped list (FCC, CDL, COMM, …) of orphaned requirements.
- Per requirement: ID, one-line summary, the intermediate trace chain back to the RS-422 consumer.
- A "shared-use" flag showing any requirement that is also allocated to Stratos-7, Skyrunner-T1, or Nimbus-C3 — meaning the RS-422 retirement may leak into other platforms.
- A roll-up count per module so the engineer knows where to focus the re-architecture work first.

**Why this matters:**
Interface retirements are where programmes quietly accumulate technical debt; most teams find the dangling requirements only when a test fails six months later.

---

### Query 3 — Hidden conflict detector across modules

**Question:** Are there any pairs of requirements across FCC and PWR that our LLM flagged as potentially conflicting but that we have not formally documented as a conflict?

**Which tool:** Cypher Template — the join between `POTENTIALLY_CONFLICTS` (implicit) and the absence of `CONFLICTS_WITH` (explicit) is the whole point, and templates handle negation cleanly.

**Expected traversal (Cypher):**
```cypher
MATCH (a:Requirement {module: 'FCC'})-[p:POTENTIALLY_CONFLICTS]-(b:Requirement {module: 'PWR'})
WHERE NOT (a)-[:CONFLICTS_WITH]-(b)
  AND p.discovery_method = 'llm_implicit'
RETURN a.id, a.heading, b.id, b.heading,
       p.rationale AS why_llm_thinks_they_conflict,
       p.confidence;
```

**Expected answer shape:**
- A table of FCC↔PWR requirement pairs.
- For each pair: both IDs, both headings, the LLM's stored rationale (e.g. *"FCC-071 demands a 50 ms control-loop update while PWR-114 allows a 200 ms bus-arbitration delay"*), and a confidence score.
- Sorted by confidence descending so the engineer triages the sharpest conflicts first.

**Why this matters:**
Cross-module conflicts are the most expensive class of requirements defect to find at integration test — an agent that surfaces them from implicit edges before the test rig is even built is directly saving money.

---

### Query 4 — DO-178C DAL-B coverage audit

**Question:** List every requirement that references DO-178C at Design Assurance Level B, grouped by module, and tell me which ones do not yet have a linked verification procedure.

**Which tool:** Cypher Template — compliance queries are the archetype of a parameterised template (input: standard name + DAL, output: gap list).

**Expected traversal (Cypher):**
```cypher
MATCH (r:Requirement)-[ref:REFERENCES_STANDARD]->(s:Standard {name: 'DO-178C'})
WHERE ref.dal = 'B' OR r.dal = 'B'
OPTIONAL MATCH (r)-[:VERIFIED_BY]->(t:TestProcedure)
RETURN r.module,
       r.id,
       r.heading,
       CASE WHEN t IS NULL THEN 'GAP' ELSE t.name END AS verification_status
ORDER BY r.module, verification_status DESC, r.id;
```

**Expected answer shape:**
- Module-grouped list of all DAL-B DO-178C-scoped requirements.
- Per row: requirement ID, heading, and either the verification procedure name or an explicit `GAP` marker.
- A summary header at the top: *"X requirements in scope, Y covered, Z gaps (coverage = Y/X %)"*.
- Gaps listed first within each module so an auditor's eye lands on them immediately.

**Why this matters:**
This is the exact evidence pack a DER asks for at a Stage-of-Involvement audit — producing it in 30 seconds instead of two days is the kind of thing that wins the demo.

---

### Query 5 — Multi-standard compliance cross-walk

**Question:** Which requirements are simultaneously constrained by MIL-STD-1553B and DO-254, and do any of them lack hardware-component allocation?

**Which tool:** Text2Cypher — the question composes two standard filters with an optional-match on a structural edge; it is the kind of two-axis question where giving the LLM the schema is simpler than maintaining one template per pair.

**Expected traversal (Cypher):**
```cypher
MATCH (r:Requirement)-[:REFERENCES_STANDARD]->(:Standard {name: 'MIL-STD-1553B'})
MATCH (r)-[:REFERENCES_STANDARD]->(:Standard {name: 'DO-254'})
OPTIONAL MATCH (r)-[:ALLOCATED_TO]->(c:Component)
RETURN r.id, r.heading, r.module,
       CASE WHEN c IS NULL THEN 'UNALLOCATED' ELSE c.name END AS component,
       [(r)-[:REFERENCES_STANDARD]->(s) | s.name] AS all_standards;
```

**Expected answer shape:**
- A focused list (expected to be small — the intersection of two standards is narrow by design).
- Per row: requirement ID, heading, module, the allocated component or an `UNALLOCATED` flag, and the full list of standards it cites.
- A short textual note beneath the table explaining *why* the intersection matters (MIL-STD-1553B constrains the bus-layer behaviour, DO-254 constrains the hardware that implements it — an unallocated requirement in this intersection is a process red flag).

**Why this matters:**
Bus-protocol requirements that escape hardware allocation are the classic source of late-stage DO-254 findings; catching them at requirements level is 10-100× cheaper than at board bring-up.

---

### Query 6 — Similarity-guided duplication hunt

**Question:** Find me other requirements across the fleet that describe the same behaviour as REQ-FCC-118 (pitch-rate limiter during recovery), even if they are written in different words or live in different modules.

**Which tool:** Similarity Search — this is the exact "vague wording, same intent" problem embeddings were invented for; Cypher alone would miss paraphrases.

**Expected traversal (Cypher):**
```cypher
// Step 1: similarity search returns top-K by cosine on the embedding index
MATCH (anchor:Requirement {id: 'REQ-FCC-118'})
CALL db.index.vector.queryNodes('requirement_embeddings', 15, anchor.embedding)
YIELD node AS candidate, score
WHERE candidate.id <> anchor.id

// Step 2: enrich each candidate with graph context so the agent can explain the match
OPTIONAL MATCH (candidate)-[:ALLOCATED_TO]->(p:Platform)
OPTIONAL MATCH (candidate)-[:DERIVES_FROM|SATISFIES|SEMANTICALLY_DEPENDS_ON]-(anchor)
RETURN candidate.id, candidate.module, candidate.heading, score,
       collect(DISTINCT p.name) AS platforms,
       exists((candidate)--(anchor)) AS already_linked;
```

**Expected answer shape:**
- Top ~10 semantically similar requirements, ranked by cosine score.
- Per row: ID, module, heading, platforms it is allocated to, and a boolean `already_linked` that tells the engineer whether this pair is already connected by any relationship.
- An "action" column suggesting whether the pair is a candidate for merging, for adding an explicit `REFINES` edge, or is a legitimate parallel implementation on a different platform.

**Why this matters:**
Duplicate-but-unlinked requirements are how 1000-requirement corpora quietly grow to 1500 — finding them early prevents a maintenance nightmare and also sharpens the trace graph for every downstream query.

---

### Query 7 — Soft-intent semantic search with graph context

**Question:** Show me everything in the corpus about "protecting the flight control loop from bad sensor data" — I do not know the exact wording or which module it lives in.

**Which tool:** Similarity Search — the phrasing is intentionally fuzzy; embedding retrieval is the only tool that can land on the right neighbourhood without the engineer guessing keywords.

**Expected traversal (Cypher):**
```cypher
// Embed the free-text question, then similarity search
CALL db.index.vector.queryNodes('requirement_embeddings', 25, $query_embedding)
YIELD node AS r, score
WITH r, score
ORDER BY score DESC

// Attach graph context: related standards + whether it has verification
OPTIONAL MATCH (r)-[:REFERENCES_STANDARD]->(s:Standard)
OPTIONAL MATCH (r)-[:VERIFIED_BY]->(t:TestProcedure)
OPTIONAL MATCH (r)-[:COMPLEMENTS]-(sibling:Requirement)
RETURN r.id, r.module, r.heading, r.summary, score,
       collect(DISTINCT s.name) AS standards,
       count(DISTINCT t)         AS test_count,
       collect(DISTINCT sibling.id)[0..3] AS llm_siblings;
```

**Expected answer shape:**
- A ranked list of ~15 requirements, each with a one-line LLM-generated summary (already stored as `r.summary`).
- For each hit: which standards it cites, how many tests cover it, and up to three LLM-discovered sibling requirements (`COMPLEMENTS`) so the engineer sees the neighbourhood, not just the node.
- A brief auto-written explanation of *why* the cluster matters — i.e. that most hits concentrate around the INS↔FCC boundary, which is where sensor-fusion validation is done.

**Why this matters:**
Engineers rarely know the exact term used by the original author; combining embeddings with one-hop graph context turns "vague search" into "guided exploration."

---

### Query 8 — Test orphans and verification gaps

**Question:** Which safety-critical requirements (DAL A or B) on any platform have no linked `VERIFIED_BY` edge and no test procedure anywhere in the graph?

**Which tool:** Cypher Template — pure negation on a relationship against a filtered node set is a classic template, and the DAL filter is easy to parameterise for future audits.

**Expected traversal (Cypher):**
```cypher
MATCH (r:Requirement)
WHERE r.dal IN ['A', 'B']
  AND NOT (r)-[:VERIFIED_BY]->(:TestProcedure)
  AND NOT (r)<-[:VERIFIES]-(:TestProcedure)
MATCH (r)-[:ALLOCATED_TO]->(p:Platform)
OPTIONAL MATCH (r)-[:DERIVES_FROM|SATISFIES*1..2]->(parent:Requirement)-[:VERIFIED_BY]->(t:TestProcedure)
RETURN r.id, r.module, r.heading, r.dal, p.name AS platform,
       collect(DISTINCT t.name) AS inherited_tests_if_any
ORDER BY r.dal, p.name, r.module;
```

**Expected answer shape:**
- A table of orphan requirements at DAL A/B, platform-grouped.
- Per row: ID, heading, module, DAL, platform.
- A clever "inherited tests" column: if the parent requirement has coverage, list it — because in many programmes a child requirement inherits its parent's test; this column tells the engineer whether the gap is a true hole or a trace-link hygiene issue.
- A footer count: *"N true gaps, M hygiene gaps (missing `VERIFIED_BY` edge but parent is tested)"*.

**Why this matters:**
Test coverage gaps at DAL A/B are the single most common reason a DO-178C programme slips certification; surfacing the hygiene-vs-true-gap split is how a good agent earns trust.

---

### Query 9 — Orphan requirements with nothing upstream

**Question:** Which requirements in the whole graph have no parent — nothing they `SATISFY`, nothing they `DERIVE_FROM`, and no stakeholder author — yet still show up on one of the four platforms?

**Which tool:** Cypher Template — triple-negation plus a required-edge filter is predictable and parameter-free; we want it to run the same way every time for audit repeatability.

**Expected traversal (Cypher):**
```cypher
MATCH (r:Requirement)-[:ALLOCATED_TO]->(p:Platform)
WHERE NOT (r)-[:SATISFIES]->(:Requirement)
  AND NOT (r)-[:DERIVES_FROM]->(:Requirement)
  AND NOT (r)-[:REFINES]->(:Requirement)
  AND NOT (r)<-[:AUTHORED]-(:Stakeholder)
RETURN p.name AS platform, r.module, r.id, r.heading, r.requirement_class
ORDER BY p.name, r.module;
```

**Expected answer shape:**
- Platform-grouped list of orphan requirements with no upstream traceability.
- Columns: platform, module, requirement ID, heading, and its functional/non-functional/safety classification.
- A summary strip: *"Stratos-7: 4 orphans, AeroLynx-X2: 9, Skyrunner-T1: 2, Nimbus-C3: 7."*
- A callout that distinguishes orphans that are likely legitimate (e.g. top-level stakeholder needs that simply lack a stakeholder link) from orphans that are clearly errors (e.g. a detailed implementation requirement with no parent).

**Why this matters:**
Every requirements baseline has orphans; finding them in one query instead of an afternoon of spreadsheet work is a direct ROI story.

---

### Query 10 — Cross-module bridge (the "why are these connected?" query)

**Question:** How is REQ-FCC-118 (pitch-rate limiter) actually connected to REQ-PWR-042 (28V bus stability)? Show me the shortest explanatory path and tell me which hops are explicit versus LLM-discovered.

**Which tool:** Text2Cypher — shortest-path queries with mixed explicit/implicit edge types and edge-provenance annotation are more expressive in free-form Cypher than in a template parameter slot.

**Expected traversal (Cypher):**
```cypher
MATCH (a:Requirement {id: 'REQ-FCC-118'}),
      (b:Requirement {id: 'REQ-PWR-042'})
MATCH path = shortestPath((a)-[:SATISFIES|DERIVES_FROM|REFINES|VERIFIES|SEMANTICALLY_DEPENDS_ON|COMPLEMENTS|CONSTRAINS*1..6]-(b))
WITH path,
     [rel IN relationships(path) |
        {type: type(rel),
         provenance: coalesce(rel.discovery_method, 'explicit'),
         rationale:  rel.rationale}] AS hops,
     [n IN nodes(path) | {id: n.id, heading: n.heading, module: n.module}] AS stops
RETURN stops, hops, size(hops) AS hop_count;
```

**Expected answer shape:**
- An ordered list of requirement stops from REQ-FCC-118 to REQ-PWR-042 (e.g. FCC-118 → FCC-071 → PWR-114 → PWR-042).
- A parallel list of hops annotated with: relationship type, provenance (`explicit` or `llm_implicit`), and the stored rationale string for implicit hops.
- A plain-English paragraph written by the agent: *"The pitch-rate limiter depends on the FCC control-loop timing (explicit `DERIVES_FROM`), which the LLM flagged as semantically dependent on the PWR arbitration budget (implicit `SEMANTICALLY_DEPENDS_ON`, confidence 0.87), which in turn is satisfied by the 28V bus stability requirement (explicit `SATISFIES`)."*

**Why this matters:**
"Why is this connected to that?" is the hardest question in requirements engineering; an agent that answers it with a labelled path and distinguishes human-authored trace links from LLM-discovered ones demonstrates exactly what the graph-plus-agent combination is for.

---

## How to test these in Aura Agent

1. Open the Aura Agent console, select the AeroScope agent, and confirm that all three tools (`Cypher Template`, `Text2Cypher`, `Similarity Search`) are enabled and bound to the populated database.
2. For queries 1–5, 8, 9 paste the natural-language question into the chat — the agent should auto-route to a Cypher template; for queries 6, 7 the agent should route to Similarity Search; for queries 5 and 10 expect Text2Cypher.
3. Capture each response as a screenshot (result card + generated Cypher visible), drop them into `demo/screenshots/`, and reference them in the submission video storyboard.
