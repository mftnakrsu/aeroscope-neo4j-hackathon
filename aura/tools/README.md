# AeroScope — Aura Agent Setup Guide

Step-by-step guide to wiring AeroScope's three retrieval tools + eight Cypher Templates into Neo4j Aura Agent. End-to-end: **under 45 minutes**, assuming the graph is already loaded.

Extends [`docs/setup.md`](../../docs/setup.md) (which gets you to a loaded graph). Reference for tool fields: [`docs/research/03_aura_tools_reference.md`](../../docs/research/03_aura_tools_reference.md). Schema: [`docs/design/02_schema.md`](../../docs/design/02_schema.md) and [`aura/schema.cypher`](../schema.cypher).

---

## Part 1 — Prerequisites (2 min)

Before you touch the Agent tab, confirm all four of these are green:

| Check | How to verify | Expected |
|---|---|---|
| Aura Free instance running | [console.neo4j.io](https://console.neo4j.io/) → Instances | Status `Running` (not `Creating`) |
| Schema loaded | Run `cat aura/schema.cypher \| cypher-shell -a "$NEO4J_URI" -u neo4j -p "$NEO4J_PASSWORD"` — or paste the file into the Query tab | `db.indexes()` shows `requirement_embeddings` (VECTOR), `requirement_fulltext` (FULLTEXT), plus constraints for `:Requirement`, `:Module`, `:Platform`, `:Standard`, `:Component`, `:Interface`, `:TestProcedure`, `:Stakeholder`, `:Organization`, `:OperationalMode` |
| Data loaded | `make all` completed without error, or `MATCH (r:Requirement) RETURN count(r)` returns ~1 000 | ~1 000 `:Requirement` nodes, ~30 `:Module`, 4 `:Platform`, 14 `:Standard` |
| You are on the Agent tab | Select your instance in `console.neo4j.io` → **Data Services → Agents** → **Create agent** → name it `aeroscope` | The tool builder UI is open |

`[SCREENSHOT: empty Agent tab with "Add tool" dropdown visible]`

If anything fails, the fastest recovery is `make clean`, `MATCH (n) DETACH DELETE n` in the Aura Query tab, then `make all`.

---

## Part 2 — Tool 1: Similarity Search (5 min)

Semantic retrieval over `:Requirement.embedding`. The agent picks this tool whenever a user asks about requirements by concept, topic, or fuzzy wording instead of citing an ID.

### Steps

1. **Agent tab → Add Tool → Similarity Search.**
2. Fill fields exactly as below.

| Field | Value |
|---|---|
| **Name** | `SemanticRequirementSearch` |
| **Description** | `Finds requirements whose meaning is close to the user's question. Returns 5–10 semantically similar :Requirement nodes with id, text, module, summary, and classification.` |
| **When to use** | `Use when the user asks about requirements by concept, topic, or ambiguous wording without citing an ID. Good for "find me requirements about X" or paraphrased intents. Do NOT use when the user quotes a requirement ID like FCC-042 — the ID lookup template is better.` |
| **Embedding provider** | `OpenAI (via Azure)` |
| **Embedding model** | `text-embedding-3-small` |
| **Dimensions** | `1536` |
| **Vector index name** | `requirement_embeddings` |
| **Top K** | `10` |
| **OpenAI API key** | paste your `sk-...` from `.env` (`OPENAI_API_KEY`) |
| **Return fields** | `id`, `text`, `module`, `summary`, `classification` |

3. Click **Save**.

`[SCREENSHOT: filled Similarity Search form]`

### Why these values

Aura requires the query-time embedding model to **match** the model used at ingestion. AeroScope embeds with `text-embedding-3-small` (1536 dims); anything else returns nonsense. `top_k=10` is the sweet spot — enough for the agent, few enough to fit the LLM context window.

### Verify

Ask in the playground: *"Show me requirements about voltage thresholds."*

Expect 5–10 rows from power-module requirements, summaries mentioning 28V bus or undervoltage lockout. Zero hits → see Part 7.

---

## Part 3 — Tool 2: Text2Cypher (10 min)

Dynamic fallback for questions no template covers. Runs on a Neo4j-fine-tuned Gemini model — no API key from you.

### Steps

1. **Agent tab → Add Tool → Text2Cypher.**
2. Fill the fields.

| Field | Value |
|---|---|
| **Name** | `AdHocCypherFallback` |
| **Description** | `Free-form Cypher generation for questions no template covers. Good for multi-hop, novel, or compositional analytical queries — e.g. "which modules share more than 3 standards?" or "requirements simultaneously constrained by MIL-STD-1553B and DO-254". Do NOT use for simple ID lookups, single-module coverage, or concept-only searches — those have dedicated tools.` |
| **Schema reference** | paste the **Condensed schema block** below |
| **Instructions** | paste the **Instructions block** below |

3. Click **Save**.

### Condensed schema block (paste verbatim into the Schema field)

```
NODES
(:Requirement {id, text, full_text, summary, heading, module, object_type, classification, verification_method, safety_classification, dal, embedding})
(:Module {name, path, description})
(:Platform {name, platform_class, description})   -- Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3
(:Standard {name, authority, domain})              -- DO-178C, ARP4754A, DO-254, DO-160, MIL-STD-1553B, ARINC-429, STANAG 4586
(:Component {name, category})
(:Interface {name, protocol_family})               -- MIL-STD-1553B, ARINC 429, RS-422, CAN Bus, AFDX, Link-16
(:TestProcedure {id, title, method, expected_result})
(:Stakeholder {name, role, organization})
(:Organization {name, country, type})              -- AeroSys Dynamics, RTCA, SAE, EUROCAE
(:OperationalMode {name})                           -- Flight, Ground, Standby, Emergency, BIT, Combat

RELATIONSHIPS (all directed)
(:Module)-[:CONTAINS]->(:Requirement)
(:Module)-[:PART_OF]->(:Platform)
(:Requirement)-[:NEXT]->(:Requirement)                -- document order
(:Requirement)-[:ALLOCATED_TO]->(:Component)
(:Requirement)-[:ALLOCATED_TO]->(:Platform)
(:Requirement)-[:USES]->(:Interface)
(:Requirement)-[:SATISFIES|DERIVES_FROM|REFINES|CONFLICTS_WITH]->(:Requirement)
(:Requirement)-[:REFERENCES_STANDARD]->(:Standard)    -- properties: clause, dal
(:Requirement)-[:VERIFIES]->(:Requirement)
(:Requirement)-[:VERIFIED_BY]->(:TestProcedure)       -- coverage: 'full'|'partial'
(:TestProcedure)-[:COVERS]->(:Requirement)
(:Stakeholder)-[:AUTHORED]->(:Requirement)
(:Requirement)-[:INVOLVES_ORG]->(:Organization)
(:Requirement)-[:OPERATES_IN_MODE]->(:OperationalMode)

LLM-DISCOVERED (distinct types; properties: discovery_method='llm_implicit', confidence, rationale)
(:Requirement)-[:SEMANTICALLY_DEPENDS_ON]->(:Requirement)
(:Requirement)-[:COMPLEMENTS]->(:Requirement)
(:Requirement)-[:CONSTRAINS]->(:Requirement)
(:Requirement)-[:POTENTIALLY_CONFLICTS]->(:Requirement)

CATEGORICAL VALUES
requirement.classification    -> {Functional, Non-Functional, Safety, Interface, Performance}
requirement.dal               -> {A, B, C, D, E}            -- DO-178C DAL
requirement.verification_method -> {Analysis, Test, Inspection, Demonstration, Review, Simulation}
```

### Instructions block (paste verbatim into the Instructions field)

```
You are generating read-only Cypher for the AeroScope requirements graph.

RULES
- Use only labels and relationship types shown in the schema. Never invent new ones.
- Never use APOC procedures. Only core Cypher and db.* procedures allowed.
- Always add LIMIT 50 to open-ended list queries to protect the LLM context window.
- Return scalars and short properties — id, name, summary, heading, classification, count(*).
  Never RETURN whole nodes or the `embedding` property.
- Use DISTINCT when a pattern could double-count.
- Requirement IDs are like "FCC-042" or "PWR-017" — they are case-sensitive strings. Match exactly.
- Module names are uppercase acronyms: FCC, INS, POWER, CDL, COMM, NAV, FMS.
- Platform names are exactly: Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3.
- For coverage / gap queries use `NOT (r)-[:VERIFIED_BY]->(:TestProcedure)` — the negated pattern is the canonical form.
- For implicit links filter on `rel.discovery_method = 'llm_implicit'` and `rel.confidence > 0.7` unless the user explicitly asks for all confidences.

DO NOT USE THIS TOOL FOR
- Requirement ID lookup → GetRequirementById template
- Single-module coverage → ModuleCoverage template
- Concept-only search → SemanticRequirementSearch tool
```

### Verify

Ask three free-form questions. Expected tool: Text2Cypher. Check the generated Cypher is valid and uses only schema labels.

| Test question | Expected behaviour |
|---|---|
| *"Which modules share more than 3 standards?"* | `(:Module)-[:CONTAINS]->(:Requirement)-[:REFERENCES_STANDARD]->(:Standard)` aggregation + `count > 3` |
| *"Requirements constrained by both MIL-STD-1553B and DO-254 with no component allocation."* | Two `REFERENCES_STANDARD` patterns plus `OPTIONAL MATCH ... ALLOCATED_TO` and an `UNALLOCATED` case |
| *"Shortest path between FCC-118 and PWR-042 including implicit edges."* | `shortestPath` over the six trace + implicit types |

If the agent writes a query referencing an unknown label, the schema block wasn't saved — re-open and check.

---

## Part 4 — Tool 3: Cypher Templates (20 min — 8 templates)

Templates are the **preferred** tool for predictable question shapes: auditable, fast, cheap. Aim for templates to handle ≥70 % of traffic; Text2Cypher catches the rest.

Flow for **every** template:

1. **Agent tab → Add Tool → Cypher Template.**
2. Fill **Name**, **Description** (*what* it does), **When to use** (*when* to pick it), **Parameters** (name, type, description — the agent extracts values from user input using the parameter description), **Cypher query** with `$paramName` bindings.
3. **Test** in the playground with the example question.
4. **Save**.

### Template index

| # | Template | Example user question | Parameters |
|---|---|---|---|
| 1 | `GetRequirementById` | "Tell me about FCC-042" | `reqId: string` |
| 2 | `TraceDownstream` | "What does PWR-017 affect downstream up to 3 hops?" | `reqId: string`, `maxHops: integer` |
| 3 | `TraceUpstream` | "What parents does FCC-118 derive from?" | `reqId: string`, `maxHops: integer` |
| 4 | `ModuleCoverage` | "What's the test coverage on the POWER module?" | `moduleName: string` |
| 5 | `FindByClass` | "List all Safety-class requirements" | `requirementClass: string` |
| 6 | `StandardComplianceAudit` | "Which DO-178C DAL-B requirements lack verification?" | `standardName: string`, `dal: string` |
| 7 | `PlatformRequirements` | "Show every requirement allocated to Stratos-7 grouped by module." | `platformName: string` |
| 8 | `InterfaceImpact` | "If we drop RS-422 on AeroLynx-X2, what breaks?" | `interfaceName: string`, `platformName: string` |

Each template body below is copy-pasteable into the Cypher field.

---

### Template 1 — `GetRequirementById`

- **Description**: `Returns the full record for one requirement by its exact ID: id, heading, text, module, classification, DAL, verification method, allocated components, and standards referenced.`
- **When to use**: `Use whenever the user mentions a specific requirement ID like FCC-042, PWR-017, or NAV-099. Case-sensitive.`
- **Parameters**:
  - `reqId` — `string` — `The exact DOORS-style requirement ID, uppercase, e.g. "FCC-042" or "PWR-017".`

```cypher
MATCH (r:Requirement {id: $reqId})
OPTIONAL MATCH (r)-[:ALLOCATED_TO]->(c:Component)
OPTIONAL MATCH (r)-[:REFERENCES_STANDARD]->(s:Standard)
OPTIONAL MATCH (m:Module)-[:CONTAINS]->(r)
RETURN r.id AS id,
       r.heading AS heading,
       r.summary AS summary,
       r.classification AS classification,
       r.dal AS dal,
       r.verification_method AS verification_method,
       m.name AS module,
       collect(DISTINCT c.name) AS components,
       collect(DISTINCT s.name) AS standards
LIMIT 1;
```

---

### Template 2 — `TraceDownstream`

- **Description**: `Fans out from a requirement along SATISFIES, DERIVES_FROM, REFINES, and LLM-discovered implicit edges to find everything that would break if this requirement changed. Returns the dependent id, heading, and the chain of relationship types traversed.`
- **When to use**: `Use for impact-analysis questions: "what does X affect", "blast radius of X", "if we change X what breaks". Default maxHops to 3 if user doesn't specify.`
- **Parameters**:
  - `reqId` — `string` — `The exact requirement ID that serves as the anchor.`
  - `maxHops` — `integer` — `Maximum hop depth for the dependency walk. Default 3. Use 1–2 for quick impact, 4–5 for deep audits.`

```cypher
MATCH (anchor:Requirement {id: $reqId})
MATCH path = (anchor)<-[rels:DERIVES_FROM|SATISFIES|REFINES|SEMANTICALLY_DEPENDS_ON|CONSTRAINS*1..]-(dependent:Requirement)
WHERE length(path) <= $maxHops
OPTIONAL MATCH (dependent)-[:VERIFIED_BY]->(t:TestProcedure)
OPTIONAL MATCH (dependent)-[:REFERENCES_STANDARD]->(s:Standard)
RETURN DISTINCT dependent.id AS id,
       dependent.heading AS heading,
       dependent.module AS module,
       [r IN relationships(path) | type(r)] AS chain,
       length(path) AS hops,
       collect(DISTINCT t.id) AS tests_to_rerun,
       collect(DISTINCT s.name) AS standards_at_risk
ORDER BY hops ASC, id
LIMIT 50;
```

---

### Template 3 — `TraceUpstream`

- **Description**: `Walks upward along DERIVES_FROM and REFINES to find the parent requirements and stakeholder needs that justify a given requirement.`
- **When to use**: `Use for provenance / rationale questions: "why does this exist", "what parents does X derive from", "trace X back to source".`
- **Parameters**:
  - `reqId` — `string` — `The exact requirement ID to trace upward from.`
  - `maxHops` — `integer` — `Maximum hops upward. Default 3.`

```cypher
MATCH (r:Requirement {id: $reqId})
MATCH path = (r)-[:DERIVES_FROM|REFINES*1..]->(parent:Requirement)
WHERE length(path) <= $maxHops
OPTIONAL MATCH (:Stakeholder)-[:AUTHORED]->(parent)
RETURN DISTINCT parent.id AS parent_id,
       parent.heading AS parent_heading,
       parent.summary AS summary,
       parent.module AS module,
       length(path) AS hops
ORDER BY hops ASC, parent_id
LIMIT 50;
```

---

### Template 4 — `ModuleCoverage`

- **Description**: `Returns verification coverage stats for a single module: total requirements, verified count, gap count, and a list of the gap IDs.`
- **When to use**: `Use when the user asks about test coverage, verification status, or gaps in a specific named module like FCC, POWER, INS, NAV.`
- **Parameters**:
  - `moduleName` — `string` — `The exact uppercase module name. Examples: "FCC", "POWER", "INS", "NAV", "CDL".`

```cypher
MATCH (m:Module {name: $moduleName})-[:CONTAINS]->(r:Requirement)
OPTIONAL MATCH (r)-[:VERIFIED_BY]->(t:TestProcedure)
WITH m,
     count(DISTINCT r) AS total,
     count(DISTINCT t) AS verified,
     collect(DISTINCT CASE WHEN t IS NULL THEN r.id END) AS gap_ids
RETURN m.name AS module,
       total,
       verified,
       total - verified AS gaps,
       round(100.0 * verified / total, 1) AS coverage_pct,
       [id IN gap_ids WHERE id IS NOT NULL][0..20] AS gap_sample
LIMIT 1;
```

---

### Template 5 — `FindByClass`

- **Description**: `Lists requirements of a given classification (Functional, Non-Functional, Safety, Interface, Performance) with module + DAL.`
- **When to use**: `Use when the user asks for a filtered slice by category: "all safety requirements", "performance reqs on Nimbus-C3", "non-functional items".`
- **Parameters**:
  - `requirementClass` — `string` — `One of: "Functional", "Non-Functional", "Safety", "Interface", "Performance".`

```cypher
MATCH (r:Requirement {classification: $requirementClass})
OPTIONAL MATCH (m:Module)-[:CONTAINS]->(r)
RETURN r.id AS id,
       r.heading AS heading,
       r.summary AS summary,
       m.name AS module,
       r.dal AS dal
ORDER BY module, id
LIMIT 50;
```

---

### Template 6 — `StandardComplianceAudit`

- **Description**: `Audits requirements that reference a given standard at a given DAL — returns the list plus a verification gap marker per row.`
- **When to use**: `Use for certification audits: "DO-178C DAL-B gap report", "MIL-STD-1553B coverage", "who references ARP4754A and isn't tested".`
- **Parameters**:
  - `standardName` — `string` — `Canonical standard name: "DO-178C", "ARP4754A", "DO-254", "DO-160", "MIL-STD-1553B", "ARINC-429", "STANAG 4586".`
  - `dal` — `string` — `DO-178C Design Assurance Level. One of "A", "B", "C", "D", "E". Pass "ALL" to skip the DAL filter.`

```cypher
MATCH (r:Requirement)-[ref:REFERENCES_STANDARD]->(s:Standard {name: $standardName})
WHERE $dal = 'ALL' OR coalesce(ref.dal, r.dal) = $dal
OPTIONAL MATCH (r)-[:VERIFIED_BY]->(t:TestProcedure)
OPTIONAL MATCH (m:Module)-[:CONTAINS]->(r)
RETURN r.id AS id,
       r.heading AS heading,
       m.name AS module,
       coalesce(ref.dal, r.dal) AS dal,
       CASE WHEN t IS NULL THEN 'GAP' ELSE t.id END AS verification_status
ORDER BY verification_status DESC, module, id
LIMIT 50;
```

---

### Template 7 — `PlatformRequirements`

- **Description**: `Returns every requirement allocated to a named platform (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3) grouped by module, with a per-module count.`
- **When to use**: `Use for platform-scoped scans: "everything on Stratos-7", "what does AeroLynx-X2 carry", "requirements per module for Skyrunner-T1".`
- **Parameters**:
  - `platformName` — `string` — `Exact platform name. One of: "Stratos-7", "AeroLynx-X2", "Skyrunner-T1", "Nimbus-C3".`

```cypher
MATCH (p:Platform {name: $platformName})<-[:ALLOCATED_TO]-(r:Requirement)
OPTIONAL MATCH (m:Module)-[:CONTAINS]->(r)
RETURN m.name AS module,
       count(DISTINCT r) AS requirement_count,
       collect(DISTINCT r.id)[0..10] AS sample_ids
ORDER BY requirement_count DESC
LIMIT 50;
```

---

### Template 8 — `InterfaceImpact`

- **Description**: `Shows the ripple-effect of dropping or modifying an interface (RS-422, ARINC-429, MIL-STD-1553B, CAN Bus, AFDX, Link-16) on a given platform — returns affected requirement ids grouped by module plus a "shared with other platforms" flag.`
- **When to use**: `Use for "if we drop X interface on Y platform, what breaks" / interface retirement / bus migration questions.`
- **Parameters**:
  - `interfaceName` — `string` — `Exact interface name, e.g. "RS-422", "ARINC 429", "MIL-STD-1553B", "CAN Bus", "AFDX", "Link-16".`
  - `platformName` — `string` — `One of the four AeroScope platforms: "Stratos-7", "AeroLynx-X2", "Skyrunner-T1", "Nimbus-C3".`

```cypher
MATCH (i:Interface {name: $interfaceName})<-[:USES]-(r:Requirement)
      -[:ALLOCATED_TO]->(p:Platform {name: $platformName})
OPTIONAL MATCH (dependent:Requirement)-[:DERIVES_FROM|SATISFIES|SEMANTICALLY_DEPENDS_ON*0..2]->(r)
OPTIONAL MATCH (dependent)-[:ALLOCATED_TO]->(other:Platform)
WHERE other.name <> $platformName
WITH dependent, collect(DISTINCT other.name) AS also_on
RETURN dependent.module AS module,
       dependent.id AS id,
       dependent.heading AS heading,
       also_on AS shared_with_platforms
ORDER BY module, id
LIMIT 50;
```

After the last save you should see **10 tools** on the Agent tab: Similarity Search + Text2Cypher + the 8 templates.

`[SCREENSHOT: Agent tool list showing all 10 tools with green status dots]`

---

## Part 5 — Sanity check (5 min)

Fire these five at the playground. The tool actually called is visible in the agent's reasoning trace.

| # | Question | Expected tool | Expected answer shape |
|---|---|---|---|
| 1 | *"Tell me about FCC-042."* | `GetRequirementById` | Single row: id, heading, summary, module, allocated components, standards. |
| 2 | *"Show me requirements about 28V bus undervoltage protection."* | `SemanticRequirementSearch` | 5–10 PWR-adjacent rows ranked by cosine score. |
| 3 | *"Which DO-178C DAL-B requirements lack a test procedure?"* | `StandardComplianceAudit` | Table of ids with `verification_status = 'GAP'` sorted to top. |
| 4 | *"If we drop RS-422 on AeroLynx-X2, what breaks?"* | `InterfaceImpact` | Module-grouped orphan list plus `shared_with_platforms` flags. |
| 5 | *"Which pairs of modules share more than 3 standards?"* | `AdHocCypherFallback` (Text2Cypher) | Generated Cypher with aggregation + `count(s) > 3`, then a small result table. |

### When the agent picks the wrong tool

Most common failure: Text2Cypher fires when a template would fit, or Similarity Search fires for an ID lookup. Fix:

1. **Tighten `when_to_use` on the wrongly-fired tool.** Add an explicit negative: *"Do NOT use for questions that cite a requirement ID."*
2. **Strengthen `when_to_use` on the tool you wanted.** Add a concrete example: *"Use when the user says 'tell me about FCC-042' or 'what is requirement X'."*
3. **Re-test.** Tool selection is strictly prompt-engineered — there is no retraining.

Rule of thumb: a template firing on <70 % of target questions has a vague description.

---

## Part 6 — Publishing the agent (optional)

Default is **Internal**: callable from the Aura console playground by project members only. Free. Use this for development.

| Mode | Who can call it | Cost | Use for |
|---|---|---|---|
| Internal | Project members via console | Free | Development, team testing |
| External | Anyone with endpoint + OAuth bearer | **$0.35 / agent-hour** (from March 2026) | Public demo, judging, live link |

**Flip External on only during judging.** A weekend of External Access is ~$17 — nothing breaks if you leave it on, but there's no reason to before the demo.

Toggle: Agent settings → **External Access → ON** → **Update Agent**. Copy the endpoint URL, then under account → **API Keys** generate a client id + secret pair.

### MCP share (cleanest public option)

Same External Access panel has a one-click **Enable MCP server** toggle. Publishes an OAuth-secured MCP endpoint that plugs into Claude Desktop, Cursor, Microsoft Copilot, ChatGPT connectors, VSCode MCP.

Best hackathon play: enable MCP, paste the URL into Claude Desktop → Settings → Connectors → Add custom connector, capture a short video of Claude asking AeroScope the five sanity-check questions through the MCP bridge. No frontend required.

### Embedding in a website (Wave 4)

No Neo4j-provided iframe widget. If the AeroScope website needs embedded chat you must build a thin backend proxy — OAuth client secret stays server-side, browser POSTs chat messages to your backend, backend calls the REST endpoint, streams JSON back. Pattern lives in `website/` (Wave 4). Never ship the client secret to the browser.

---

## Part 7 — Troubleshooting

| Symptom | Most likely cause | Fix |
|---|---|---|
| Tool never fires on questions you expect it to | `when_to_use` too vague, or overlaps with another tool | Add explicit example phrasings to the intended tool; add explicit negatives (*"Do NOT use for …"*) to the rival tool. Re-test in the playground. |
| `Cypher error: Unknown label :Xxxx` | Schema not loaded, or label typo in template | Run `CALL db.labels()` in the Query tab. Expect: Requirement, Module, Platform, Standard, Component, Interface, TestProcedure, Stakeholder, Organization, OperationalMode. If missing, re-apply `aura/schema.cypher`. |
| `Cypher error: Unknown property key embedding` | Ingestion ran against a different instance or never reached the embed step | `MATCH (r:Requirement) WHERE r.embedding IS NOT NULL RETURN count(r)` — should be ~1 000. If 0, re-run `make embed`. |
| Similarity Search returns empty results | Embedding-model / dimension mismatch | Confirm the tool says `text-embedding-3-small` / `1536`. Cross-check the vector index: `SHOW INDEXES WHERE name = 'requirement_embeddings'` → the `options.indexConfig.vector.dimensions` must read `1536`. Any other number = recreate the index. |
| Similarity Search returns unrelated rows | Different model used at ingest vs query | Re-embed with `text-embedding-3-small` only. Mixed models inside one index is the #1 cause of "why are my results garbage". |
| `429 Rate Limited` from the Similarity Search tool | Your OpenAI key hit its RPM cap | Wait 60 s and retry, or raise your OpenAI usage tier. Only Similarity Search hits OpenAI — Text2Cypher uses Neo4j-hosted Gemini and is not affected. |
| Text2Cypher returns syntactically broken Cypher | Schema block truncated or malformed | Re-paste the exact condensed schema from Part 3. Keep under ~2 KB — the Text2Cypher guide warns that oversize schemas degrade generation quality. |
| Template parameter extracted wrong (e.g. agent passes `"fcc-042"` lowercase) | Parameter `description` doesn't signal case-sensitivity | Edit the parameter description to add *"case-sensitive, uppercase."* The agent reads parameter descriptions as part of the extraction prompt. |
| Agent picks Text2Cypher on a question a template covers | Template `description` too narrow or absent | Broaden the template description with more example phrasings. Templates are strictly cheaper and more reliable than Text2Cypher — keep them greedy. |
| Agent returns JSON instead of natural-language answer | Return clause exposes full nodes / too many rows | All templates in Part 4 return scalars and cap at 50 rows. If you edited one, verify it still returns `id / heading / count` style — never whole nodes — and exclude `r.embedding` from every RETURN. |

If nothing matches, the agent's reasoning trace shows the exact tool chosen, parameters passed, and raw Cypher executed. Nine out of ten times the trace makes the root cause obvious.

---

## Summary

You now have an AeroScope Aura Agent with:

- **1** Similarity Search tool (semantic recall)
- **1** Text2Cypher fallback (ad-hoc analytics)
- **8** Cypher Templates (ID lookup, bidirectional trace, module coverage, class filter, standards audit, platform scan, interface-impact)

Against ~1 000 synthetic requirements, ~30 modules, 4 fictional UAV platforms (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3), 14 public standards, and one fictional prime (AeroSys Dynamics), the agent answers the ten demo questions in [`demo/demo_queries.md`](../../demo/demo_queries.md) with full reasoning transparency.

Total setup time: **~42 minutes** (prerequisites 2 + Similarity Search 5 + Text2Cypher 10 + Templates 20 + sanity check 5).
