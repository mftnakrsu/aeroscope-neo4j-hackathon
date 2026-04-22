# AeroScope — Setup Guide

Everything you need to get AeroScope running end-to-end: a synthetic
aerospace requirements corpus, a Neo4j Aura graph, and an agent that
answers traceability questions over it.

No GPU, no local Neo4j, no air-gapped machine. Aura holds the graph and
serves the agent; OpenAI does generation and embeddings.

---

## 1. Create an Aura Free instance

1. Go to [console.neo4j.io](https://console.neo4j.io/) and sign in.
2. Click **New Instance** and pick **AuraDB Free**. Name it `aeroscope`,
   any region.
3. Aura will generate a password and offer a `.txt` credentials file —
   **download it now**. You can't retrieve the password later. It contains:
   - `NEO4J_URI` (e.g. `neo4j+s://abc12345.databases.neo4j.io`)
   - `NEO4J_USERNAME` (almost always `neo4j`)
   - `NEO4J_PASSWORD`
4. Wait ~2 minutes for the instance to go from `Creating` to `Running`.

## 2. Get an OpenAI API key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Click **Create new secret key**, name it `aeroscope-hackathon`, copy the
   `sk-...` value. This is the only time you'll see it.
3. On a fresh OpenAI account, add a few dollars of credit — the full
   pipeline costs roughly **$1–$3** with `gpt-4o-mini` +
   `text-embedding-3-small`.

## 3. Copy and fill `.env`

```bash
cp .env.example .env
```

Paste in `NEO4J_URI`, `NEO4J_PASSWORD`, and `OPENAI_API_KEY`. Leave the
other defaults alone. The code loads `.env` automatically via
`python-dotenv`.

> `.env` is in `.gitignore`. Don't commit it.

## 4. Install and run the pipeline

Python 3.10+ and `make` required.

```bash
make install      # pip install -r requirements.txt
make all          # generate 1000 reqs → load to Aura → enrich → embed → link
```

`make all` runs every step in order. Each is also its own target:

| Step | What it does |
|---|---|
| `generate` | LLM-synthesizes 1000 requirements in DOORS MD format |
| `parse` | Turns MD files into `requirements.jsonl` |
| `schema` | Applies constraints + vector index via `cypher-shell` |
| `load` | Loads requirements, modules, and auto-discovered trace links |
| `entities` | Extracts standards, components, interfaces, etc. |
| `enrich` | Writes per-requirement summary + classification |
| `embed` | Computes embeddings and writes them to Aura |
| `link` | LLM discovers implicit semantic relationships |

Total: **~10–20 min** depending on OpenAI throughput. If a call hiccups,
re-run the failed target — everything is MERGE-based and safe to repeat.

> The `schema` target shells out to `cypher-shell`. If you don't have it,
> paste `aura/schema.cypher` into the Aura console's Query tab once
> instead.

## 5. Configure the Aura Agent

With the graph populated, wire up the agent in the Aura console:

1. Open your instance and click the **Agent** tab.
2. **Similarity Search** — target the `requirement_embeddings` vector index
   for semantic recall over requirement text + summaries.
3. **Cypher Template** — add the templates from `aura/cypher_templates/`.
   These are the predictable queries for impact analysis, coverage checks,
   and orphan detection.
4. **Text2Cypher** — point it at `aura/schema.cypher` so the LLM knows
   every label, relationship, and property it can use.

Screenshots and field-by-field settings land in
`docs/research/03_aura_tools_reference.md`.

## 6. Ask it something

- *"What requirements reference DO-178C DAL-B?"*
- *"If we change FCC-004, what's the blast radius?"*
- *"Which requirements verify the primary power bus, and what tests cover
  them?"*
- *"Find orphan requirements that don't trace up to any stakeholder need."*

More in [`demo/demo_queries.md`](../demo/demo_queries.md).

## Troubleshooting

- **`ServiceUnavailable` on `make load`** — Aura still provisioning. Wait,
  rerun.
- **`openai.RateLimitError`** — per-minute cap hit. Scripts retry with
  backoff; if it persists, drop `--count` on `generate`.
- **`cypher-shell: command not found`** — paste `aura/schema.cypher` into
  the Aura Query tab manually, then re-run `make load`.
- **Embeddings empty in Aura** — `OPENAI_EMBEDDING_DIMENSIONS` in `.env`
  must match the vector index dim in `aura/schema.cypher` (default 1536).

When in doubt: `make clean`, `MATCH (n) DETACH DELETE n` in Aura, rerun
`make all`.
