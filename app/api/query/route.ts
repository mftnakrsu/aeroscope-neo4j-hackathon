import { NextRequest, NextResponse } from "next/server";
import neo4j from "neo4j-driver";
import { getDriver, serializeValue } from "@/lib/neo4j";
import {
  loadTemplate,
  listTemplates,
  type Template,
  type TemplateParam,
} from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 30;

const QUERY_TIMEOUT_MS = 15_000;
const LLM_TIMEOUT_MS = 20_000;

// System prompt for Text2Cypher. Pinned to AeroScope's actual schema +
// few-shot examples so the model emits queries that fit the data, with a
// hard read-only guarantee enforced both in the prompt and in code.
const TEXT2CYPHER_SYSTEM_PROMPT = `You are a Neo4j Cypher query generator for the AeroScope aerospace requirements graph. Translate the user's natural-language question into ONE valid, READ-ONLY Cypher query. Output ONLY the Cypher — no explanation, no markdown fences, no prose.

GRAPH SCHEMA

Node labels:
- Requirement {id, module, heading, text, full_text, object_type, level, has_ole, has_parameters, priority?, status?, verification_method?, safety_classification?, allocated_subsystem?, platform?, rationale?, compliance_standard?, performance_target?, test_procedure?, baseline?, project?}
- Module {name, path}
- Parameter {name}

Relationships (all directional, all between Requirement nodes unless noted):
- (Module)-[:CONTAINS]->(Requirement)
- (Requirement)-[:NEXT]->(Requirement)             // document order within a module
- (Requirement)-[:SATISFIES]->(Requirement)
- (Requirement)-[:DERIVES_FROM]->(Requirement)
- (Requirement)-[:VERIFIES]->(Requirement)
- (Requirement)-[:REFERENCES]->(Requirement)
- (Requirement)-[:REFINES]->(Requirement)
- (Requirement)-[:COVERS]->(Requirement)
- (Requirement)-[:DEPENDS_ON]->(Requirement)
- (Requirement)-[:CONFLICTS_WITH]->(Requirement)
- (Requirement)-[:IMPLEMENTS]->(Requirement)
- (Requirement)-[:ALLOCATED_TO]->(Requirement)
- (Requirement)-[:USES_PARAMETER]->(Parameter)

DOMAIN: Aerospace requirements traceability for the fictional company AeroSys Dynamics. 30 modules including FCC, FMS, AUTO, NAV, INS, GPS, ADS, COMM, RADAR, SAR, EOIR, GCS, HMI, PWR, EPS, ENG, FUEL, LDG, STR, SEC, BIT, FDR, EMS, TCS, ICE, LGT, PLD, APM, CDL, DLNK. Four UAV platforms: Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3.

RULES
1. READ-ONLY ONLY: never use CREATE, DELETE, SET, MERGE, REMOVE, DROP, FOREACH, LOAD CSV, or any write CALL procedure.
2. Always include a LIMIT (max 50) at the end.
3. Use case-insensitive regex for free-text matches: r.full_text =~ '(?i).*pattern.*'
4. For "impact" / "what depends on" / "what breaks if" — traverse SATISFIES, DERIVES_FROM, REFINES (and their reverse) with hops 1..3.
5. Always return useful columns including requirement_id, module, heading, text where applicable.
6. Emit ONE statement only — no semicolons separating multiple queries.

EXAMPLES

Q: Show me requirements in the FCC module
A:
MATCH (r:Requirement)
WHERE r.module = 'FCC' AND r.object_type = 'Requirement'
RETURN r.id AS requirement_id, r.module AS module, r.heading AS heading, r.text AS text
ORDER BY r.id
LIMIT 50

Q: Which requirements depend on the 28V undervoltage threshold?
A:
MATCH (anchor:Requirement)
WHERE anchor.full_text =~ '(?i).*28\\\\s*V.*undervolt.*'
OPTIONAL MATCH (dep:Requirement)-[:DERIVES_FROM|SATISFIES|DEPENDS_ON|REFINES*1..3]->(anchor)
WITH anchor, dep WHERE dep IS NOT NULL
RETURN DISTINCT anchor.id AS anchor_id, dep.id AS dependent_id, dep.module AS dependent_module, dep.heading AS heading, dep.text AS text
LIMIT 50

Q: What are orphan requirements with no upstream or downstream trace?
A:
MATCH (r:Requirement)
WHERE r.object_type = 'Requirement'
  AND NOT (r)<-[:SATISFIES|DERIVES_FROM|REFINES|VERIFIES]-()
  AND NOT (r)-[:SATISFIES|DERIVES_FROM|REFINES|VERIFIES]->()
RETURN r.id AS requirement_id, r.module AS module, r.heading AS heading, r.text AS text
ORDER BY r.module, r.id
LIMIT 50

Q: How is FCC-042 related to PWR-033?
A:
MATCH p = shortestPath((a:Requirement {id: 'FCC-042'})-[*..6]-(b:Requirement {id: 'PWR-033'}))
RETURN [n IN nodes(p) | n.id] AS path_ids, [r IN relationships(p) | type(r)] AS path_types, length(p) AS hops
LIMIT 1`;

interface QueryRequestBody {
  template_id?: string | null;
  params?: Record<string, unknown>;
  question?: string | null;
}

interface CoercedParams {
  params: Record<string, unknown>;
}

interface ParamError {
  error: string;
}

function errorResponse(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { ok: false, error: message, ...(extra ?? {}) },
    { status }
  );
}

/**
 * Coerce a single user-supplied value to the declared template type.
 * Returns `{ error }` when the value cannot be coerced.
 */
function coerceParam(
  spec: TemplateParam,
  raw: unknown
): { value: unknown } | ParamError {
  const type = (spec.type ?? "string") as string;

  // Optional + null/undefined passes through (keeps Cypher `$param IS NULL` checks working).
  if (raw === null || raw === undefined) {
    if (spec.required) {
      return { error: `Parameter "${spec.name}" is required.` };
    }
    return { value: raw === undefined ? null : raw };
  }

  switch (type) {
    case "string": {
      if (typeof raw === "string") return { value: raw };
      if (typeof raw === "number" || typeof raw === "boolean") {
        return { value: String(raw) };
      }
      return {
        error: `Parameter "${spec.name}" must be a string; got ${typeof raw}.`,
      };
    }
    case "integer": {
      let n: number | null = null;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        n = Math.trunc(raw);
      } else if (typeof raw === "string" && raw.trim() !== "") {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) n = Math.trunc(parsed);
      }
      if (n === null) {
        return {
          error: `Parameter "${spec.name}" must be an integer; got ${JSON.stringify(
            raw
          )}.`,
        };
      }
      // Cypher expects a native number or neo4j.Integer; a plain number works fine.
      return { value: neo4j.int(n) };
    }
    case "array": {
      if (!Array.isArray(raw)) {
        return {
          error: `Parameter "${spec.name}" must be an array; got ${typeof raw}.`,
        };
      }
      // Pass arrays through as-is; Cypher will validate element types on its end.
      return { value: raw };
    }
    default: {
      // Unknown type — pass through untouched rather than crash.
      return { value: raw };
    }
  }
}

/** Build the final params map for the Cypher call. */
function buildParams(
  template: Template,
  userParams: Record<string, unknown>
): CoercedParams | ParamError {
  const out: Record<string, unknown> = {};
  const declared = template.parameters ?? [];

  for (const spec of declared) {
    const hasValue = Object.prototype.hasOwnProperty.call(
      userParams,
      spec.name
    );
    const raw = hasValue ? userParams[spec.name] : undefined;

    if (!hasValue) {
      if (spec.required) {
        return { error: `Missing required parameter "${spec.name}".` };
      }
      if (spec.default !== undefined) {
        out[spec.name] = spec.default;
      } else {
        // Allow the Cypher template's `$x IS NULL` guards to work.
        out[spec.name] = null;
      }
      continue;
    }

    const coerced = coerceParam(spec, raw);
    if ("error" in coerced) return coerced;
    out[spec.name] = coerced.value;
  }

  return { params: out };
}

/**
 * Serialize the records returned by the driver into the API's row/column
 * contract: `{ columns, rows }` where each row is a plain object keyed by
 * column name and every value is JSON-safe.
 */
function serializeRecords(records: Array<{ keys: readonly string[]; get: (k: string) => unknown }>): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  if (records.length === 0) {
    return { columns: [], rows: [] };
  }
  const columns = [...records[0].keys];
  const rows = records.map((rec) => {
    const row: Record<string, unknown> = {};
    for (const k of columns) {
      row[k] = serializeValue(rec.get(k));
    }
    return row;
  });
  return { columns, rows };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  let body: QueryRequestBody;
  try {
    body = (await req.json()) as QueryRequestBody;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (!body || typeof body !== "object") {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const templateId = body.template_id;
  const userParams =
    body.params && typeof body.params === "object" && !Array.isArray(body.params)
      ? (body.params as Record<string, unknown>)
      : {};

  // Text2Cypher path — generate Cypher with the LLM, then run it read-only.
  if (!templateId) {
    if (typeof body.question === "string" && body.question.trim()) {
      return await handleText2Cypher(body.question.trim(), startedAt);
    }
    return errorResponse(
      "Either template_id or question is required.",
      400,
    );
  }

  if (typeof templateId !== "string") {
    return errorResponse("template_id must be a string.", 400);
  }

  // Whitelist against files actually present on disk.
  const availableIds = await listTemplates();
  if (!availableIds.includes(templateId)) {
    return errorResponse(
      `Unknown template_id "${templateId}".`,
      404,
      { available: availableIds }
    );
  }

  const template = await loadTemplate(templateId);
  if (!template) {
    return errorResponse(
      `Template "${templateId}" failed to load.`,
      500
    );
  }

  const built = buildParams(template, userParams);
  if ("error" in built) {
    return errorResponse(built.error, 400);
  }

  // Connect + execute with a per-query timeout cap.
  let driver;
  try {
    driver = getDriver();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Neo4j init failed.";
    return errorResponse(msg, 500);
  }

  // Aura instances often use a non-default database name (typically the
  // instance ID). Read NEO4J_DATABASE from env; if unset, omit the option
  // and let the driver target the DBMS's default database.
  const databaseName = process.env.NEO4J_DATABASE?.trim();
  const session = driver.session({
    ...(databaseName ? { database: databaseName } : {}),
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const queryPromise = session.executeRead((tx) =>
      tx.run(template.cypher, built.params)
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Query timed out after 15s.")),
        QUERY_TIMEOUT_MS
      );
    });

    const result = (await Promise.race([queryPromise, timeoutPromise])) as {
      records: Array<{ keys: readonly string[]; get: (k: string) => unknown }>;
    };

    const { columns, rows } = serializeRecords(result.records);
    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      template: { id: template.id, name: template.name },
      cypher: template.cypher,
      params: userParams,
      columns,
      rows,
      stats: {
        records: rows.length,
        elapsed_ms: elapsedMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Map common driver errors to useful status codes without leaking internals.
    let status = 500;
    if (/timed out/i.test(message)) status = 504;
    else if (/unauthori[sz]ed|authentication/i.test(message)) status = 502;
    else if (/ServiceUnavailable|routing|connection/i.test(message))
      status = 503;
    else if (/Syntax|parameter/i.test(message)) status = 400;

    return errorResponse(message, status, {
      template: { id: template.id, name: template.name },
      elapsed_ms: Date.now() - startedAt,
    });
  } finally {
    try {
      await session.close();
    } catch {
      // Session cleanup failures are non-fatal for the response.
    }
  }
}

// ---------------------------------------------------------------------------
// Text2Cypher: ask the LLM for Cypher, validate it's read-only, run it.
// ---------------------------------------------------------------------------

const WRITE_KEYWORDS_RE =
  /\b(CREATE|DELETE|DETACH\s+DELETE|SET|MERGE|REMOVE|DROP|FOREACH|LOAD\s+CSV|CALL\s+(?:db|dbms|apoc\.create|apoc\.refactor|apoc\.merge|apoc\.delete|apoc\.do))\b/i;

function isReadOnlyCypher(cypher: string): boolean {
  return !WRITE_KEYWORDS_RE.test(cypher);
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:cypher|sql|neo4j)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

async function generateCypher(question: string): Promise<string> {
  const rawBase = process.env.OPENAI_BASE_URL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (!rawBase || !apiKey) {
    throw new Error(
      "Text2Cypher not configured on the server. Set OPENAI_BASE_URL, OPENAI_API_KEY, and OPENAI_MODEL in Vercel.",
    );
  }

  // Tolerate users setting OPENAI_BASE_URL with /responses or trailing slash.
  const baseURL = rawBase
    .replace(/\/responses\/?$/i, "")
    .replace(/\/+$/, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Bearer for OpenAI / OpenAI-compat; api-key for Azure-style auth.
        // Sending both is harmless and maximises endpoint coverage.
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: TEXT2CYPHER_SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("LLM request timed out after 20s.");
    }
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    const trimmed = body.length > 300 ? body.slice(0, 300) + "…" : body;
    throw new Error(`LLM call failed (${response.status}): ${trimmed}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const raw =
    data.choices?.[0]?.message?.content ??
    data.output_text ??
    data.output?.[0]?.content?.[0]?.text ??
    "";

  const cleaned = stripCodeFences(raw);
  if (!cleaned) {
    throw new Error("LLM returned an empty response.");
  }
  return cleaned;
}

async function handleText2Cypher(
  question: string,
  startedAt: number,
): Promise<NextResponse> {
  let cypher: string;
  try {
    cypher = await generateCypher(question);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM call failed.";
    return errorResponse(msg, 502, {
      template: { id: "text2cypher", name: "Natural Language" },
      elapsed_ms: Date.now() - startedAt,
    });
  }

  if (!isReadOnlyCypher(cypher)) {
    return errorResponse(
      "The generated Cypher contained write keywords and was rejected for safety. Re-phrase the question or use a Cypher Template.",
      400,
      {
        template: { id: "text2cypher", name: "Natural Language" },
        cypher,
        elapsed_ms: Date.now() - startedAt,
      },
    );
  }

  let driver;
  try {
    driver = getDriver();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Neo4j init failed.";
    return errorResponse(msg, 500, {
      template: { id: "text2cypher", name: "Natural Language" },
      cypher,
    });
  }

  const databaseName = process.env.NEO4J_DATABASE?.trim();
  const session = driver.session({
    ...(databaseName ? { database: databaseName } : {}),
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const queryPromise = session.executeRead((tx) => tx.run(cypher));
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Query timed out after 15s.")),
        QUERY_TIMEOUT_MS,
      );
    });

    const result = (await Promise.race([queryPromise, timeoutPromise])) as {
      records: Array<{ keys: readonly string[]; get: (k: string) => unknown }>;
    };

    const { columns, rows } = serializeRecords(result.records);
    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      template: { id: "text2cypher", name: "Natural Language" },
      template_id: "text2cypher",
      cypher,
      params: {},
      columns,
      rows,
      stats: { records: rows.length, elapsed_ms: elapsedMs },
      elapsed_ms: elapsedMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (/timed out/i.test(message)) status = 504;
    else if (/unauthori[sz]ed|authentication/i.test(message)) status = 502;
    else if (/ServiceUnavailable|routing|connection/i.test(message))
      status = 503;
    else if (/Syntax|parameter|Variable .* not defined/i.test(message))
      status = 400;

    return errorResponse(message, status, {
      template: { id: "text2cypher", name: "Natural Language" },
      cypher,
      elapsed_ms: Date.now() - startedAt,
    });
  } finally {
    try {
      await session.close();
    } catch {
      // non-fatal
    }
  }
}
