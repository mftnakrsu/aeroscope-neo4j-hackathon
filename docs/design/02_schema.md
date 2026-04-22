# AeroScope — Graph Schema Design

Neo4j Aura Agents & Context Building Hackathon submission. This document is the contract between the ingestion pipeline, the Aura Agent tool configuration, and any downstream consumer (queries, dashboards, audits). If `aura/schema.cypher` and this file agree, a new engineer can rebuild AeroScope from scratch.

---

## 1. Executive summary

AeroScope models an aerospace requirements corpus as a property graph centred on a single atomic node label, `:Requirement`. Everything else — the originating `:Module`, the target `:Platform`, the invoked `:Standard`, the allocated `:Component`, the covering `:TestProcedure`, the accountable `:Stakeholder`, the involved `:Organization`, the consumed `:Interface`, and the active `:OperationalMode` — is expressed as a typed relationship so that traceability is a first-class graph traversal, not a SQL join. A vector index (1536 dims, cosine) over `:Requirement.embedding` and a full-text index over `(text, heading, summary)` give the Aura Agent both semantic and lexical retrieval without leaving Cypher. LLM-discovered implicit links live on their own relationship types so that regex-derived, export-derived, and LLM-derived knowledge are never confused at query time.

---

## 2. Node labels

| Label | Key Property | Other Properties | Cardinality Estimate | Description |
|---|---|---|---|---|
| `:Requirement` | `id` (string, unique) | `text`, `full_text`, `summary`, `heading`, `module`, `module_path`, `object_type`, `level`, `classification`, `verification_method`, `safety_classification`, `priority`, `status`, `allocated_subsystem`, `performance_target`, `rationale`, `embedding` (float[1536]) | ~1 000 | The atomic unit of traceability. One row of a DOORS module equals one `:Requirement`. |
| `:Module` | `name` (string, unique) | `path`, `description` | ~30 | A DOORS-style requirements module (e.g. FCC, INS, POWER, CDL). Groups requirements by authoring team / subsystem. |
| `:Platform` | `name` (string, unique) | `platform_class`, `description` | 4 | A fictional UAV airframe: Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3. |
| `:Standard` | `name` (string, unique) | `authority`, `domain`, `url` | ~14 | A public aerospace standard (DO-178C, ARP4754A, DO-254, DO-160G, MIL-STD-1553B, ARINC-429, STANAG 4586, etc.). |
| `:Component` | `name` (string, unique) | `category`, `description` | ~40 | A generic avionics component type (FCC, INS, IMU, GPS, MFD, HUD, FPGA). |
| `:TestProcedure` | `id` (string, unique) | `title`, `method`, `expected_result` | ~200 | A verification artefact — the test case that demonstrates a requirement is met. |
| `:Stakeholder` | `name` (string, unique) | `role`, `organization` | ~15 | A fictional engineering role (Chief Engineer, Certification Lead, Systems Architect). |
| `:Organization` | `name` (string, unique) | `country`, `type` | ~10 | A company or standards body (AeroSys Dynamics, RTCA, SAE, EUROCAE). |
| `:Interface` | `name` (string, unique) | `protocol_family`, `bandwidth`, `standard` | ~10 | A communication bus or protocol (MIL-STD-1553B, ARINC-429, Ethernet, RS-422, CAN Bus, AFDX, Link-16). |
| `:OperationalMode` | `name` (string, unique) | `description` | ~8 | An avionics state machine mode (Flight, Ground, Standby, Emergency, BIT, Combat). |

Total node count target: well under the Aura Free 200 000 limit (~1 330 nodes expected).

---

## 3. Relationship types

| Type | Direction | Source → Target | Properties | Cardinality hint | Purpose |
|---|---|---|---|---|---|
| `CONTAINS` | out | `:Module` → `:Requirement` | — | 1 : many | Structural grouping — which module the requirement was exported from. |
| `NEXT` | out | `:Requirement` → `:Requirement` | — | many : 1 | Preserves document order within a module for narrative reconstruction. |
| `PART_OF` | out | `:Module` → `:Platform` | — | many : many | Which platform a module is delivered against. A shared module can be `PART_OF` multiple platforms. |
| `ALLOCATED_TO` | out | `:Requirement` → `:Component` | `allocation_type` | many : many | Maps the requirement to the component(s) that must implement it. |
| `USES` | out | `:Requirement` → `:Interface` | `role` | many : many | Declares which bus or protocol the requirement depends on. |
| `SATISFIES` | out | `:Requirement` → `:Requirement` | `source` (regex \| export \| manual) | many : many | Downward trace — a child requirement satisfies a parent. |
| `DERIVES_FROM` | out | `:Requirement` → `:Requirement` | `source` | many : many | Upward trace — a requirement was derived from another. |
| `REFINES` | out | `:Requirement` → `:Requirement` | `source` | many : many | One requirement elaborates another at a finer level of detail. |
| `CONFLICTS_WITH` | out | `:Requirement` → `:Requirement` | `source` | rare | A known conflict flagged by a reviewer or the parser. |
| `REFERENCES_STANDARD` | out | `:Requirement` → `:Standard` | `clause` | many : many | Compliance claim — "this requirement invokes clause X of DO-178C". |
| `VERIFIES` | out | `:Requirement` → `:Requirement` | — | many : many | Verification intent — one requirement is the verification of another. |
| `VERIFIED_BY` | out | `:Requirement` → `:TestProcedure` | `coverage` (full \| partial) | many : many | Verification artefact link. |
| `COVERS` | out | `:TestProcedure` → `:Requirement` | `coverage` | many : many | Inverse of `VERIFIED_BY`, stored explicitly to make coverage sweeps cheap. |
| `AUTHORED` | out | `:Stakeholder` → `:Requirement` | `date` | 1 : many | Accountability — who owns the requirement. |
| `INVOLVES_ORG` | out | `:Requirement` → `:Organization` | `role` (supplier \| integrator \| authority) | many : many | Organizational context for audit trails. |
| `OPERATES_IN_MODE` | out | `:Requirement` → `:OperationalMode` | — | many : many | Ties the requirement to the flight phase(s) in which it applies. |
| `SEMANTICALLY_DEPENDS_ON` | out | `:Requirement` → `:Requirement` | `discovery_method='llm_implicit'`, `confidence` | rare | LLM-inferred semantic dependency not captured by regex or export. |
| `COMPLEMENTS` | out | `:Requirement` → `:Requirement` | `discovery_method='llm_implicit'`, `confidence` | rare | LLM-inferred sibling requirements that reinforce each other. |
| `CONSTRAINS` | out | `:Requirement` → `:Requirement` | `discovery_method='llm_implicit'`, `confidence` | rare | LLM-inferred constraint: requirement A limits the design space of requirement B. |
| `POTENTIALLY_CONFLICTS` | out | `:Requirement` → `:Requirement` | `discovery_method='llm_implicit'`, `confidence` | rare | LLM-flagged soft conflict worth human review. |

Total relationship count target: roughly 3 000–6 000. Well inside Aura Free's 400 000-edge limit.

---

## 4. Relationship categories

### Structural (`CONTAINS`, `NEXT`, `PART_OF`, `ALLOCATED_TO`, `USES`)

Structural edges represent facts that are definitionally true about the corpus: which module a requirement lives in, which module belongs to which platform, the document order, and which physical/logical components and interfaces a requirement touches. They are built deterministically from the DOORS export and the design taxonomy — no LLM, no heuristic. Keeping them typed (rather than stuffing them into `Requirement` properties) gives us cheap pattern matches like `(:Platform {name:'Stratos-7'})<-[:PART_OF]-(:Module)-[:CONTAINS]->(:Requirement)`, which the Cypher Template tool can fill in with one parameter.

### Trace (`SATISFIES`, `DERIVES_FROM`, `REFINES`, `CONFLICTS_WITH`, `REFERENCES_STANDARD`)

Trace edges encode the requirements-engineering relationships the export files already assert or that a regex pass can reliably extract. The shape is intentionally flat (no intermediate "TraceLink" node) because each relationship answers exactly one question at traversal time and because the `source` property lets us distinguish export-asserted links from regex-discovered ones when we need to explain ourselves to a certification auditor. `REFERENCES_STANDARD` sits here rather than under "entity" because it is the load-bearing edge for compliance claims, not just a mention.

### Verification (`VERIFIES`, `VERIFIED_BY`, `COVERS`)

Verification edges are their own category because DO-178C / ARP4754A style certification audits walk this subgraph exclusively — "show me every requirement not verified by a green test case" is a one-hop traversal only if we keep it separate. `VERIFIES` stays within `:Requirement`-`:Requirement` (requirement-level verification intent), while `VERIFIED_BY` and `COVERS` connect to `:TestProcedure` nodes with a `coverage` property so a partial verification does not masquerade as a complete one.

### Entity (`AUTHORED`, `INVOLVES_ORG`, `OPERATES_IN_MODE`)

Entity edges link a requirement to the people, orgs, and state-machine modes that give it context. They are cheap to populate from a mix of regex, export metadata, and a small entity-extraction LLM pass. They matter less for the core certification story, but they unlock the Aura Agent's "who owns this" and "which requirements fire during Emergency mode" questions.

### LLM-discovered (`SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS`, `POTENTIALLY_CONFLICTS`)

LLM-discovered edges are isolated on purpose. They are the only edges in the graph that are not derivable by a deterministic rule: a large language model reads two requirements and decides, via a high-precision prompt, that a relationship exists. Every LLM edge carries `discovery_method='llm_implicit'` and a `confidence` score so downstream consumers can filter them out of audit-grade queries while still using them for impact analysis and change-set exploration. Keeping the relationship types distinct (rather than overloading `RELATED_TO`) prevents "the LLM said so" edges from polluting regex- or export-sourced trace queries.

---

## 5. Design rationale

**Why `:Requirement` stays atomic.** It is tempting to decompose requirements into `:Section`, `:Clause`, `:Statement` layers. We resist that for three reasons. First, the DOORS export already defines a chunk per requirement; the ingestion pipeline would have to re-chunk synthetic content to manufacture sub-nodes we would then have to stitch back together for every query. Second, traceability relationships are asserted between requirement IDs (not sub-parts), so any sub-node layer would force two hops on every trace query for zero new information. Third, the embedding and the full-text index are most useful at the requirement level — smaller chunks fragment context and larger chunks dilute precision. A single atomic node label with rich properties is the right shape for ~1 000 synthetic requirements. If we later grow to 100 000, the right evolution is a `:Section` parent node for scoping, not decomposing the requirement.

**Why `:Module` and `:Platform` are both nodes (not properties on `:Requirement`).** Making them nodes buys us three capabilities. First, the Aura Agent's Cypher Template tool can take `{platform}` as a single parameter and expand it into a multi-hop traversal, which is impossible if `platform` is a scalar property, because a requirement can be allocated to multiple platforms. Second, analytic queries like "which modules are shared across all four platforms?" become simple pattern matches. Third, storing `Platform.description`, `Platform.platform_class`, and future per-platform metadata on a node keeps it out of every `:Requirement` row. The cost — a slightly denser graph — is negligible at this scale.

**Why LLM-discovered relationships are separate types.** The four LLM-discovered types (`SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS`, `POTENTIALLY_CONFLICTS`) are rhetorically distinct from their regex counterparts. A regex-discovered `DEPENDS_ON` edge is backed by a keyword match in the source text — auditable, reproducible, deterministic. An LLM-discovered `SEMANTICALLY_DEPENDS_ON` edge is a model's judgement. Certification auditors need to be able to filter the graph to "only edges I can defend in front of a regulator"; keeping the vocabularies disjoint makes that filter a single `WHERE type(r) IN ['SATISFIES','DERIVES_FROM',...]` clause rather than a per-relationship property inspection. We also keep the LLM names grammatically different (`POTENTIALLY_CONFLICTS` not `CONFLICTS_WITH`) so that even casual inspection of a query result makes the provenance clear.

---

## 6. Example Cypher queries

**Structural — requirements for a platform through a module.**

```cypher
MATCH (p:Platform {name: 'Stratos-7'})<-[:PART_OF]-(m:Module)-[:CONTAINS]->(r:Requirement)
RETURN m.name AS module, count(r) AS requirements
ORDER BY requirements DESC;
```

**Trace — upstream parents of a given requirement.**

```cypher
MATCH (r:Requirement {id: 'FCC-REQ-0042'})-[:DERIVES_FROM|REFINES*1..3]->(parent:Requirement)
RETURN DISTINCT parent.id, parent.heading, parent.summary;
```

**Verification — coverage gaps in a module.**

```cypher
MATCH (m:Module {name: 'POWER'})-[:CONTAINS]->(r:Requirement)
WHERE NOT (r)-[:VERIFIED_BY]->(:TestProcedure)
RETURN r.id, r.heading, r.safety_classification;
```

**Entity — requirements active in Emergency mode authored by the Certification Lead.**

```cypher
MATCH (s:Stakeholder {name: 'Certification Lead'})-[:AUTHORED]->(r:Requirement)
      -[:OPERATES_IN_MODE]->(:OperationalMode {name: 'Emergency'})
RETURN r.id, r.summary, r.safety_classification;
```

**LLM-discovered — implicit impact of a candidate change.**

```cypher
MATCH (r:Requirement {id: 'POWER-REQ-0017'})
      -[rel:SEMANTICALLY_DEPENDS_ON|CONSTRAINS|POTENTIALLY_CONFLICTS]-(other:Requirement)
WHERE rel.confidence > 0.7
RETURN other.id, type(rel) AS relation, rel.confidence;
```

---

## 7. Vector index notes

The vector index `requirement_embeddings` is configured for 1 536 dimensions with cosine similarity, which exactly matches OpenAI's `text-embedding-3-small` — the embedding provider assumed by the hackathon reference architecture. Cosine is the right choice because `text-embedding-3-small` returns unit-normalized vectors by default, so cosine and dot-product are equivalent in ranking but cosine is explicit about intent.

The canonical query pattern:

```cypher
CALL db.index.vector.queryNodes('requirement_embeddings', 10, $queryEmbedding)
YIELD node AS r, score
RETURN r.id, r.heading, r.summary, score
ORDER BY score DESC;
```

The Aura Agent's Similarity Search tool wraps exactly this call. We compute `$queryEmbedding` from the user question with the same `text-embedding-3-small` model used at ingestion, preserving the asymmetric query / document pattern by prefixing with a short instruction. Downstream callers can post-filter with any of the indexed `:Requirement` properties (module, classification, safety_classification) without losing the vector ranking.

Two practical notes. First, 1 536 dims is well inside Aura Free's per-node property limits; a full corpus of 1 000 requirements × 1 536 floats is roughly 6 MB of vector data, trivial at this scale. Second, we index only `:Requirement.embedding` — the other labels are small enough to enumerate by name, so paying for an embedding and an index on every `:Standard` or `:Module` buys nothing.

---

## 8. Full-text index notes

The full-text index `requirement_fulltext` covers three fields on `:Requirement`: `text` (raw requirement body), `heading` (section title), and `summary` (LLM-generated one-liner). The three fields complement each other — `text` catches exact phrases and acronyms, `heading` catches section titles that the LLM summary sometimes omits, and `summary` catches paraphrases.

It is the fallback path when vector search underperforms, typically in three cases:

1. **Requirement ID lookup**: a user types "FCC-REQ-0042" — vector search is weak on opaque identifiers, full-text nails it.
2. **Exact acronym or standard name**: "ARP4754A" — cosine similarity to a standard name is noisy; full-text is a direct hit.
3. **Rare multi-word phrases**: "undervoltage lockout threshold" — embeddings smooth this into generic power-electronics space, full-text preserves the exact phrase.

Query pattern:

```cypher
CALL db.index.fulltext.queryNodes('requirement_fulltext', $query)
YIELD node AS r, score
RETURN r.id, r.heading, r.summary, score
LIMIT 20;
```

---

## 9. Aura Agent tool mapping

| Tool | Answers | Uses | Index / Relationship path |
|---|---|---|---|
| Cypher Template | Known-shape questions ("all requirements for platform X", "coverage gaps in module Y") | Parameterised templates with `{platform}`, `{module}`, `{requirement_id}` | `:Platform` ← `:Module` → `:Requirement` → `:VERIFIED_BY` → `:TestProcedure`; `:Requirement` → `DERIVES_FROM*` |
| Text2Cypher | Open-ended analytical questions ("which modules share more than 3 standards?") | LLM-generated Cypher against schema | All relationship types, full-text index as a disambiguator |
| Similarity Search | Semantic / paraphrase questions ("anything about undervoltage protection on the 28V bus?") | `db.index.vector.queryNodes` | `requirement_embeddings` vector index on `:Requirement.embedding` |

The three tools are complementary. Cypher Template is the fastest and most auditable. Text2Cypher unlocks questions we did not anticipate. Similarity Search is the retrieval front door for natural-language questions and is routinely combined with a follow-up Cypher Template call — vector search finds the seed requirement, the template expands the trace graph around it.

---

## 10. Schema evolution

Adding a new relationship type is a strictly additive operation and does not require touching existing queries:

1. Add the new type to a `CREATE`/`MERGE` in the ingestion code — Neo4j does not declare relationship types up front.
2. If the new type needs to be in audit-grade queries, add it to the allow-list in whichever Cypher Template or Text2Cypher prompt filters on `type(r)`. If it is exploratory, leave the filters alone.
3. Update this document's relationship table so the Aura Agent's schema prompt reflects reality.

Adding a new node label is slightly heavier but still localized:

1. Add a uniqueness constraint in `aura/schema.cypher` with `IF NOT EXISTS`.
2. Add indexes for any hot filter properties on the new label.
3. Append a row to the node-labels table in this document.

Breaking changes — renaming an existing relationship type or node label — are deliberately avoided. Instead we dual-write for one release and retire the old name only after every template and tool config has moved over. The rule is: the schema is append-only until a full integration test sweep says otherwise.

---

*Engineered for the Neo4j Aura Agents & Context Building Hackathon. Dataset: 1 000 synthetic aerospace requirements across 30 modules and 4 fictional UAV platforms, referencing 14 public standards. Zero proprietary data.*
