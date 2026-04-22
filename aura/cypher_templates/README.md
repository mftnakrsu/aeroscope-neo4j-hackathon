# AeroScope — Cypher Template Tools

This folder contains the **Cypher Template** tool definitions that AeroScope registers with the Neo4j Aura Agent. Each JSON file describes one reusable, parameterised query over the requirements traceability graph: the agent's reasoning LLM (Gemini Flash 2.5) picks a template by matching the user's question against the `name` and `description`, fills in the listed `parameters` from the user's wording, and runs the fixed `cypher` block against the bound Aura instance. The template approach is faster, cheaper, and more auditable than Text2Cypher for any question whose shape we can anticipate — which covers the majority of aerospace-requirements workflows (impact analysis, trace matrices, coverage audits, conflict hunts). Open-ended semantic queries still route through the Similarity Search tool, and genuinely novel aggregations fall through to a small Text2Cypher fallback — see `aura/tools/` for those two.

## How to register these with Aura Agent

The Aura Agent console is a form-based no-code builder — there is no bulk import yet as of April 2026. For each JSON file in this folder, open `console.neo4j.io → Data Services → Agents → AeroScope → Add Tool → Cypher Template` and copy the fields across: `name`, `description`, the parameter list (name + type + description for each), and the `cypher` body verbatim. The `when_to_use` text should be folded into the description field — it is called out separately in the JSON so both the human reviewer and a future programmatic provisioning step can see the routing rationale without re-reading the entire description.

## Template catalogue

| Template | Tool type | Example user question | Parameters |
|---|---|---|---|
| `impact_analysis` | Cypher Template | *"What breaks if I change FCC-042?"* | `req_id` |
| `trace_upstream` | Cypher Template | *"What stakeholder needs does STR7-NAV-014 trace up to?"* | `req_id` |
| `trace_downstream` | Cypher Template | *"Which tests verify FCC-042 and its children?"* | `req_id` |
| `module_coverage` | Cypher Template | *"How many requirements in PWR have verifications?"* | `module` |
| `requirements_by_standard` | Cypher Template | *"Which reqs cite DO-178C at DAL-B?"* | `standard_name`, `dal_level` *(optional)* |
| `orphan_requirements` | Cypher Template | *"Which DAL-A requirements have no test procedure?"* | `dal_level` |
| `cross_module_refs` | Cypher Template | *"Show all requirements in FCC that reference PWR."* | `module_a`, `module_b` |
| `platform_requirements` | Cypher Template | *"All requirements allocated to Stratos-7."* | `platform_name` |
| `conflicts_and_constraints` | Cypher Template | *"Show explicit and potential conflicts for the PWR module."* | `module` |
| `shortest_path` | Cypher Template | *"How is FCC-118 related to PWR-042?"* | `req_a`, `req_b` |

## Design conventions

Every template follows the same rules so the agent's behaviour stays predictable:

- **Every `$param` in the Cypher body is declared in the `parameters` array** with a human-readable description, so the agent LLM knows how to lift values out of the user's wording.
- **No APOC procedures** — everything uses core Cypher so the templates work on AuraDB Free.
- **Labels and relationship types match `aura/schema.cypher` exactly**, with no hidden synonyms.
- **`RETURN DISTINCT`** is used everywhere that a traversal could surface the same row twice; empty sets are returned as zero rows rather than null-laden rows.
- **`OPTIONAL MATCH`** is preferred over inner joins when the secondary pattern may be absent (e.g. a requirement may not yet have a TestProcedure), so a missing edge does not hide the primary result.
- **Default `LIMIT 50`** per the Aura Agent docs' 10–50 row guidance. Aggregation templates that return a single rollup row override this to `limit: 1`.
- **Return shape favours scalars and short strings** (ids, headings, summaries, classifications) rather than whole nodes — embeddings are never returned, which keeps the LLM's context budget healthy and aligns with the performance rules in `docs/research/03_aura_tools_reference.md`.
- **LLM-discovered edges are surfaced with their `discovery_method` and `confidence`** whenever they appear in a result, so the agent can cite provenance and an auditor can filter to human-authored trace links only.

## How to add a new template

1. **Write the Cypher first** in the Neo4j Query tab against the live Aura instance. Iterate until it returns the right shape on real data, not just an empty plan. Verify `LIMIT 50` covers realistic result sizes without truncating important rows.
2. **Decide the parameters.** Every `$name` in the Cypher needs an entry in the JSON `parameters` array. Parameter descriptions are the single most important field — they are what the agent LLM reads to extract the value from the user's question, so write them as if you were briefing a new engineer: *"The Module.name exactly as stored in the graph, e.g. 'FCC', 'PWR'"* is useful; *"module"* is not.
3. **Draft the `description` and `when_to_use`.** The description tells the agent what the tool does; `when_to_use` gives it concrete example phrasings and negative examples (*"do not fire when…"*) to keep it out of the wrong lane. Both fields will be concatenated when you paste them into the Aura console.
4. **Save a JSON file** in this folder named `<slug>.json` where the slug matches the `name` field (snake_case, lowercase). Add a row to the catalogue table above.
5. **Register in the console** by copying the fields into the `Add Tool → Cypher Template` form. Test in the playground with three variations of the same question — the agent should route to your template every time. If routing is inconsistent, tighten the description with a more specific trigger phrase.
6. **Commit the JSON alongside the console change** so the repo stays the source of truth. A future provisioning script (or a manual re-registration after a credentials rotation) can rebuild the agent from these files alone.
