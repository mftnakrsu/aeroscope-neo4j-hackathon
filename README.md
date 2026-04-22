# AeroScope

> An aerospace requirements traceability agent on Neo4j Aura.

**Submission for:** Neo4j Aura Agents & Context Building Hackathon (April–June 2026)
**Status:** 🚧 Work in progress — see [HACKATHON_PLAN/](HACKATHON_PLAN/) for the build plan.

---

## What it does

AeroScope is an agent that reasons over aerospace requirements like an experienced systems engineer would. Ask it a question like:

> *"Which safety-critical requirements depend on the bus voltage threshold we're about to change?"*

…and it walks the graph: finds the target requirement, traces it upstream to stakeholder needs, downstream to test procedures, flags the standards it must comply with (DO-178C, ARP4754A, MIL-STD-1553B…), and surfaces implicit dependencies that an LLM discovered offline — explaining **why** each connection matters, not just returning a list.

## Dataset and why a graph fits

- **Corpus:** 1000 synthetic aerospace requirements generated from the same MD export format used by IBM DOORS Classic 9.7. Covers ~30 modules across three fictional UAV platforms.
- **Why a graph:** Requirements engineering is *nothing but* relationships — `SATISFIES`, `DERIVES_FROM`, `VERIFIES`, `REFERENCES_STANDARD`, `ALLOCATED_TO`. Document retrieval can find *a* requirement; only a graph can answer "what breaks if I change this one?"
- **Extra context layer:** LLM-discovered `SEMANTICALLY_DEPENDS_ON`, `COMPLEMENTS`, `CONSTRAINS` relationships surface dependencies that aren't written down.

## Tools the agent uses

| Tool | What it handles |
|---|---|
| **Cypher Template** | Predictable trace queries (impact analysis, coverage, orphan detection) |
| **Text2Cypher** | Free-form questions against the full schema |
| **Similarity Search** | Vector search over requirement text + summary embeddings |

## Repo layout

```
src/          Python data pipeline (parse → graph → enrich → embed)
aura/         Cypher schema + Aura Agent tool configs
data/         Placeholder templates + generated synthetic corpus
demo/         Curated demo queries with expected traversals
docs/         Design docs (domain, schema, tools)
website/      Landing page for the submission
HACKATHON_PLAN/  Build plan, per-step progress notes
```

## Try it

*(Setup instructions will be filled in once the pipeline is complete.)*

```bash
# High level (coming soon)
pip install -r requirements.txt
python src/generate_corpus.py --count 1000 --output data/synthetic/
python src/load_to_aura.py
# Then: open your Aura Agent and ask away
```

## License

MIT.
