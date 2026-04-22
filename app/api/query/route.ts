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
export const maxDuration = 20;

const QUERY_TIMEOUT_MS = 15_000;

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

  // Text2Cypher fallback — explicitly not wired yet.
  if (!templateId) {
    if (typeof body.question === "string" && body.question.trim()) {
      return errorResponse(
        "Text2Cypher not yet wired. Provide template_id.",
        501
      );
    }
    return errorResponse(
      "Either template_id or question is required.",
      400
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

  const session = driver.session({
    database: "neo4j",
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
