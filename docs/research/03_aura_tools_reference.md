# Neo4j Aura Agent — Tool Configuration Reference

**Purpose:** Definitive reference for configuring AeroScope's agent in Wave 4. Scope covers the three retrieval tools (Cypher Template, Text2Cypher, Similarity Search), Aura Free tier constraints, vector-index Cypher, supported LLM/embedding providers, and the publish/share flow for the hackathon submission.

**Status as of April 2026:** Aura Agent reached General Availability in **February 2026** after an Early Access preview. It is available on AuraDB **Free, Professional, and Business Critical** tiers. Agent-hour billing of **$0.35/agent-hour** applies from March 2026 onward; February 2026 was free (see [Neo4j GA blog](https://neo4j.com/blog/agentic-ai/neo4j-launches-aura-agent/)). Hackathon participants who finish the GraphAcademy course receive **$100 in Aura credits** ([hackathon thread](https://community.neo4j.com/t/start-here-register-get-aura-credits-aura-agent-hackathon-2026/77191)).

---

## 1. Tool overview

Aura Agent exposes exactly three retrieval tool types inside the no-code agent builder in `console.neo4j.io` → **Data Services → Agents** ([docs](https://neo4j.com/docs/aura/aura-agent/)):

| Tool | Best for | LLM involvement |
|---|---|---|
| **Cypher Template** | Predictable, repeated, precisely-controlled queries | None at query time (parameters filled by agent) |
| **Text2Cypher** | Unpredictable questions, aggregations, fallback | Fine-tuned Gemini generates Cypher on each call |
| **Similarity Search** | Semantic matching over node properties with embeddings | Embedding model (not LLM) embeds the query |

All agents run in GCP `europe-west1` (Belgium) and have **read-only** access to the backing AuraDB instance ([docs](https://neo4j.com/docs/aura/aura-agent/)).

---

## 2. Cypher Template

### 2.1 When to prefer it
Use Cypher Templates for every query whose shape you can write down in advance: ID lookup, 1–3 hop traversals, trace matrix slices, module-scoped filters, coverage counts. The agent picks the template by matching the user question to the tool **name + description**, then fills in the named parameters. Per the docs, this is the right choice for *"common and repeated questions, predictable results, complex queries, well-defined business logic patterns"* ([docs](https://neo4j.com/docs/aura/aura-agent/)).

### 2.2 Configuration schema
Fields required by the UI ([docs](https://neo4j.com/docs/aura/aura-agent/), [getting started](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/)):

- **Name** (required) — short identifier the agent reasons over
- **Description** (required) — tells the LLM when to pick this tool; be explicit about inputs
- **Cypher query** (required) — use `$paramName` for bindings
- **Parameters** — one entry per binding with:
  - `name` (matches `$name` in the Cypher)
  - `data type` — `integer`, `string`, `float`, `boolean`, or `list`
  - `description` — the LLM uses this to extract the value from the user's question

### 2.3 Parameter binding
Parameters are bound at runtime by the LLM. The model reads the **parameter description** and extracts the value from the user's input — e.g. parameter `skillName` described as "The name of a technical skill" will be filled with `"Python"` when the user asks *"How many Python developers do I have?"* ([getting started](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/)). No explicit prompt-engineering on your part.

### 2.4 Example (AeroScope-flavored)

```yaml
# Conceptual shape — the UI is a form, not YAML
name: CountRequirementsInModule
description: |
  Returns the total count of requirements within a given DOORS module.
  Use this when the user asks "how many requirements in <module>?"
cypher: |
  MATCH (m:Module {name: $moduleName})-[:CONTAINS]->(r:Requirement)
  RETURN count(r) AS requirement_count
parameters:
  - name: moduleName
    type: string
    description: The exact DOORS module name (e.g. "ASC_SPDU", "APM").
```

A real template from the official tutorial:

```cypher
MATCH (p:Person)-[:KNOWS]->(s:Skill {name: $skillName})
RETURN count(p) AS numberOfPeople
```

([getting started](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/))

### 2.5 Performance rules (from docs)
The docs give explicit guardrails ([docs](https://neo4j.com/docs/aura/aura-agent/)):

- **Return only relevant scalars** — not whole nodes/paths
- **Exclude embeddings** from the RETURN
- **Dedupe** with `DISTINCT` where possible
- **LIMIT 10–50 rows** — larger returns confuse the LLM and hit context caps
- **Always test** in the playground before saving

---

## 3. Text2Cypher

### 3.1 When to prefer it
Text2Cypher is the **dynamic fallback**. Pick it when the question shape isn't predictable or the user asks an aggregation you didn't template. The docs warn it *"relies on an LLM and this can potentially result in queries that contain inconsistencies or logical errors"* ([docs](https://neo4j.com/docs/aura/aura-agent/)) and the [Text2Cypher guide](https://medium.com/neo4j/text2cypher-guide-cc161518a509) recommends it only as "generic fallback" — frequently-asked or complex queries should become dedicated templates.

### 3.2 Model
Text2Cypher runs on a **Neo4j-fine-tuned Gemini model hosted on Vertex AI**, trained on Cypher dialects and schema idioms — chosen over frontier LLMs because they are *"slower and more expensive"* for this task ([Text2Cypher guide](https://medium.com/neo4j/text2cypher-guide-cc161518a509)).

### 3.3 Configuration schema
Three fields ([docs](https://neo4j.com/docs/aura/aura-agent/)):

- **Name** (required)
- **Description** (required) — tight scoping to reduce inappropriate fires
- **Instructions** (required) — free-form guidance that the tool prepends to every call. Docs recommend covering:
  - When to use / not use
  - Domain-specific schema aspects
  - Entities and searchable categorical properties
  - Attributes suitable for aggregation

### 3.4 Example (AeroScope)

```yaml
name: AdHocAggregationFallback
description: |
  Last-resort tool for aggregation or exploratory questions over the
  requirements graph that no Cypher template can answer. Do NOT use for
  ID lookups or single-module questions — those have dedicated tools.
instructions: |
  Graph schema essentials:
  - (:Requirement {id, full_text, module, requirement_class, summary})
  - (:Module {name})-[:CONTAINS]->(:Requirement)
  - (:Requirement)-[:SATISFIES|DERIVES_FROM|VERIFIES|REFERENCES]->(:Requirement)
  - requirement_class values: "Functional", "Non-Functional", "Safety",
    "Interface", "Performance"

  Always RETURN counts or ordered lists — never raw embeddings or nodes.
  Always add LIMIT 50 to open-ended queries.
```

### 3.5 Gotchas
- **Large schemas degrade quality** — the Text2Cypher guide notes *"large schema sizes may also impact the agent's ability to accurately generate database queries"*. For AeroScope's 1000-req corpus with 10+ entity labels this is manageable, but keep label names short.
- **No guarantee the query is semantically correct** — always pair Text2Cypher with a well-populated template library so it is rarely invoked.

---

## 4. Similarity Search

### 4.1 When to prefer it
For semantic matching on free-text properties — our `r.full_text`, `r.summary`, or image descriptions. Use cases the docs call out: *"document search, content discovery, finding similar clauses or terms, semantic matching"* ([docs](https://neo4j.com/docs/aura/aura-agent/)).

### 4.2 Configuration schema
Fields ([docs](https://neo4j.com/docs/aura/aura-agent/), [blog](https://neo4j.com/blog/genai/build-context-aware-graphrag-agent/)):

- **Name + description**
- **Embedding provider** — OpenAI (via Azure) or Vertex AI
- **Embedding model** — one of the six below
- **Vector index name** — must match an existing Neo4j vector index
- **Top K** — integer, number of nearest neighbours to return

### 4.3 Supported embedding models
Aura Agent handles the embedding-provider credentials for you — no API key management needed ([blog](https://neo4j.com/blog/genai/build-context-aware-graphrag-agent/)).

| Provider | Models |
|---|---|
| OpenAI (Azure) | `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002` |
| Vertex AI | `gemini-embedding-001`, `text-embedding-005`, `text-multi-lingual-embedding-002` |

**Critical:** you must embed your corpus with the **same model** you pick in the tool — *"Aura Agent performs vector similarity search using the same embedding model used to generate your stored embeddings"* ([docs](https://neo4j.com/docs/aura/aura-agent/)).

### 4.4 Example (AeroScope)

```yaml
name: SemanticRequirementSearch
description: |
  Finds requirements whose meaning is close to the user's question.
  Use for open-ended "find me requirements about X" queries or when
  no requirement ID is given.
embedding_provider: OpenAI
embedding_model: text-embedding-3-small      # 1536 dims
vector_index_name: requirement_embeddings
top_k: 10
```

---

## 5. Setting up the vector index (exact Cypher)

Aura fully supports vector indexes on all tiers ([Cypher manual — vector indexes](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/)). Run this in Neo4j Query before wiring the Similarity Search tool:

```cypher
CREATE VECTOR INDEX requirement_embeddings IF NOT EXISTS
FOR (r:Requirement) ON r.embedding
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine',
  `vector.quantization.enabled`: true
}}
```

- **Dimensions** — integer in `[1, 4096]`. Match your chosen embedding model exactly: `text-embedding-3-small` → 1536, `text-embedding-3-large` → 3072, `text-embedding-ada-002` → 1536, `gemini-embedding-001` → 768 (configurable), `text-embedding-005` → 768.
- **Similarity function** — `'cosine'` or `'euclidean'`. Use cosine for text; it's the default.
- **Quantization** — `true` by default in recent versions; halves memory with minor accuracy loss.

Query procedure (the Aura Agent runtime uses this under the hood):

```cypher
CALL db.index.vector.queryNodes('requirement_embeddings', 10, $queryEmbedding)
YIELD node AS r, score
RETURN r.id, r.summary, score
```

**Vector optimization** (paid tiers only): `Business Critical`, `Virtual Dedicated Cloud`, and `Professional` instances ≥ 4 GB can enable "Vector-optimized configuration" in Instance settings to reserve memory for the index. A 4 GB instance fits ~0.9 M × 768-dim vectors; 16 GB fits ~3.6 M ([Aura vector optimization docs](https://neo4j.com/docs/aura/managing-instances/vector-optimization/)). AuraDB Free does **not** support vector optimization — indexes still work, just without the reserved-memory boost, which is fine for a 1000-requirement corpus.

---

## 6. Aura Free tier constraints (hackathon-relevant)

Per [AuraDB FAQ](https://neo4j.com/cloud/platform/aura-graph-database/faq/) and the [Aura Free support article](https://support.neo4j.com/s/article/16094506528787-Support-resources-and-FAQ-for-Aura-Free-Tier):

| Limit | Free tier |
|---|---|
| Nodes | **200,000** |
| Relationships | **400,000** |
| Instances per account | 1 |
| Backups | 1 on-demand snapshot (no rolling 7-day) |
| Vector index | Supported (no dedicated vector memory) |
| Aura Agent | **Supported** across Free / Professional / Business Critical |
| Region | Limited regions (single-region deployment) |

AeroScope's target corpus (1000 requirements + entities + relationships) fits comfortably inside Free tier headroom.

**Storage / concurrent-connection caps** for Free are not publicly numbered in the FAQ — treat as "sufficient for demo workloads, not production scale." Mark this as **undocumented as of April 2026**.

---

## 7. Supported LLM providers for the agent itself

Important distinction: the LLM that **runs the agent's reasoning and tool-selection loop** is **not user-configurable**. Per the [GA announcement](https://neo4j.com/blog/agentic-ai/neo4j-launches-aura-agent/):

- Agent reasoning LLM: **Google Gemini Flash 2.5** (managed by Neo4j)
- Text2Cypher: **Neo4j-fine-tuned Gemini on Vertex AI**
- Embeddings (user-selectable): OpenAI via Azure or Vertex AI (six models, see §4.3)

You do **not** plug in OpenAI / Anthropic / Google API keys for the agent brain — Neo4j handles *"managed LLM inference and embeddings for agent runtime,"* removing the need for separate vendor accounts ([InfoWorld](https://www.infoworld.com/article/4139414/how-to-create-ai-agents-with-neo4j-aura-agent.html)). This is a hard constraint for AeroScope: if the hackathon requires a specific LLM, Aura Agent is Gemini-only.

---

## 8. Publishing, sharing, and embedding

### 8.1 Internal vs External visibility
- **Internal** — default. Free. Only project members can invoke the agent via the console playground ([docs](https://neo4j.com/docs/aura/aura-agent/)).
- **External** — toggle **External Access** in agent settings. Exposes two endpoints. *"Once you make an agent public, it starts to incur charges"* ([docs](https://neo4j.com/docs/aura/aura-agent/)) — $0.35/agent-hour.

### 8.2 REST endpoint (OAuth bearer)
The publish flow ([getting started tutorial](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/)):

1. Flip **External Access → ON**, click **Update Agent**. Endpoint URL appears in the UI.
2. In account settings → **API Keys**, **Generate API Key**. Save `Client ID` + `Client Secret`.
3. Exchange for a bearer token:

```bash
export BEARER_TOKEN=$(curl -s -X POST 'https://api.neo4j.io/oauth/token' \
  --user "$CLIENT_ID:$CLIENT_SECRET" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' | jq -r .access_token)
```

4. Call the agent:

```bash
curl -X POST "$ENDPOINT_URL" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"input": "How many Safety-class requirements are in module APM?"}'
```

Response includes `thinking`, `tool_calls`, intermediate outputs, and final `text` — full reasoning chain returned.

### 8.3 MCP server
Toggle **Enable MCP server** in the same External Access panel ([getting started](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/)). A cloud-hosted, **OAuth-secured** MCP endpoint appears. Compatible with Claude Desktop, Cursor, Microsoft Copilot, ChatGPT connectors, VSCode MCP. In Claude Desktop → **Settings → Connectors → Add custom connector**, paste the MCP URL, authenticate with Aura credentials — the agent becomes a tool for the external LLM.

### 8.4 Public shareable URL — clarification
There is **no one-click "publish to a public web page" feature**. "External" = API/MCP, not a hosted web UI. The hackathon thread confirms live links are **optional** in submissions ([hackathon rules](https://community.neo4j.com/t/start-here-register-get-aura-credits-aura-agent-hackathon-2026/77191)) — screenshots and a demo video satisfy judging.

**Embedding into a website**: no first-party widget or iframe. You must build a thin frontend (HTML + `fetch()` with an Aura OAuth bearer proxied through your own backend to keep the Client Secret off the browser). The REST endpoint returns JSON, so a vanilla chat UI or `streamText`-style component works. Marking this flow as **recommended pattern, not a documented Neo4j product** — there's no official SDK for browser embedding as of April 2026.

### 8.5 Hackathon submission checklist (from [rules](https://community.neo4j.com/t/start-here-register-get-aura-credits-aura-agent-hackathon-2026/77191))
Reply to the hackathon thread with:
- Agent name + short description
- Dataset details + why a graph is the right fit
- Aura console screenshot
- Demo screenshot or short video
- *Optional*: live agent link (REST or MCP)

Judging criteria: (1) graph-driven insight, (2) practical utility, (3) reasoning transparency, (4) innovation, (5) presentation. Deadline **June 15, 2026**.

---

## 9. Limits & gotchas summary

| Concern | Reality |
|---|---|
| Query timeout per tool call | **Undocumented** as of April 2026 — observed safe with 120 s client timeout in tutorial |
| Return-size cap | Not a hard cap; docs strongly advise **LIMIT 10–50 rows** for LLM context hygiene |
| Free tier node/rel ceiling | 200 k nodes / 400 k relationships |
| Agent tiers | Free ✓ / Professional ✓ / Business Critical ✓ ([GA blog](https://neo4j.com/blog/agentic-ai/neo4j-launches-aura-agent/)) |
| Agent region | Fixed to GCP `europe-west1` — all agents, regardless of DB region |
| Write queries | **Forbidden** — agents are read-only |
| Reasoning LLM choice | Locked to Gemini Flash 2.5 |
| Embedding model choice | 6 options across OpenAI/Vertex; must match stored embeddings dimension-for-dimension |
| Billing | $0.35 per agent-hour when External Access is on (from March 2026) |
| MCP exposure | One-click toggle; OAuth-secured; works with Claude, Cursor, Copilot, ChatGPT |
| Public web embed | No native widget — build your own with the REST endpoint + backend proxy |

---

## 10. Recommended AeroScope tool loadout (Wave 4 preview)

Based on the above, the minimal-but-winning tool set for the aerospace requirements agent:

1. **Cypher Template — `GetRequirementById`** (params: `reqId: string`). Covers "tell me about APM-C42".
2. **Cypher Template — `TraceDownstream`** (params: `reqId: string`, `maxHops: integer`). DO-178C trace matrix queries.
3. **Cypher Template — `ModuleCoverage`** (params: `moduleName: string`). Coverage stats per module.
4. **Cypher Template — `FindByClass`** (params: `requirementClass: string`). Safety/Functional/Interface slices.
5. **Similarity Search — `SemanticRequirementSearch`** on `:Requirement(embedding)` index, `text-embedding-3-small`, `top_k=10`. Open-ended semantic queries.
6. **Text2Cypher — `AggregationFallback`**. Last resort for "how many requirements reference MIL-STD-1553?"-style ad-hoc counts.

Four templates + one vector + one fallback keeps the LLM's tool-selection space small and the reasoning transparent — directly optimizing for judging criterion (3), reasoning transparency.

---

## Sources
- [Aura Agent docs](https://neo4j.com/docs/aura/aura-agent/)
- [Build a context-aware GraphRAG agent (blog)](https://neo4j.com/blog/genai/build-context-aware-graphrag-agent/)
- [Aura Agent getting-started tutorial](https://neo4j.com/developer/genai-ecosystem/aura-agent-getting-started/)
- [Neo4j launches Aura Agent (GA announcement)](https://neo4j.com/blog/agentic-ai/neo4j-launches-aura-agent/)
- [Aura Agent preview changelog](https://neo4j-aura.canny.io/changelog/aura-agent-preview)
- [InfoWorld: How to create AI agents with Neo4j Aura Agent](https://www.infoworld.com/article/4139414/how-to-create-ai-agents-with-neo4j-aura-agent.html)
- [Text2Cypher guide (Neo4j Dev blog)](https://medium.com/neo4j/text2cypher-guide-cc161518a509)
- [Cypher manual — vector indexes](https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/)
- [Aura vector optimization docs](https://neo4j.com/docs/aura/managing-instances/vector-optimization/)
- [AuraDB FAQ](https://neo4j.com/cloud/platform/aura-graph-database/faq/)
- [Aura Free support article](https://support.neo4j.com/s/article/16094506528787-Support-resources-and-FAQ-for-Aura-Free-Tier)
- [Aura Agent Hackathon 2026 — Start Here](https://community.neo4j.com/t/start-here-register-get-aura-credits-aura-agent-hackathon-2026/77191)
- [GraphAcademy — Aura Agents lesson](https://graphacademy.neo4j.com/courses/workshop-genai/3-agents/5-aura-agents/)
