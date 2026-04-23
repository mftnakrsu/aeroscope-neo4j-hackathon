// Thin client wrapper around POST /api/query. The server route is owned by
// the API agent; this module just gives the dashboard a typed, one-import
// surface so we don't sprinkle raw `fetch` calls through every tab.

export type TemplateId =
  | "impact_analysis"
  | "trace_downstream"
  | "trace_upstream"
  | "module_coverage"
  | "orphan_requirements"
  | "platform_requirements"
  | "requirements_by_standard"
  | "conflicts_and_constraints"
  | "cross_module_refs"
  | "shortest_path"
  | "all_requirements"
  | "graph_slice";

export type QueryRequest =
  | {
      /** Run a registered Cypher template with structured params. */
      template_id: TemplateId;
      params: Record<string, unknown>;
      question?: string;
    }
  | {
      /** Natural-language path — server routes to Text2Cypher. */
      template_id: null;
      question: string;
      params?: Record<string, unknown>;
    };

export type QueryRow = Record<string, unknown>;

export type QueryResponse = {
  ok: boolean;
  /** The template that actually ran (may differ from the requested one). */
  template_id?: string | null;
  /** Generated Cypher, surfaced for the Query tab's transparency panel. */
  cypher?: string;
  /** Tabular result rows. Shape depends on the template. */
  rows?: QueryRow[];
  /** Column order if the server emits one; falls back to Object.keys(rows[0]). */
  columns?: string[];
  /** Server-side diagnostic message on failure. */
  error?: string;
  /** Elapsed server time, ms — useful for the status bar. */
  elapsed_ms?: number;
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Run a query against the server-side Aura agent. Throws `ApiError` on
 * non-2xx responses so tabs can render a clean error state.
 */
export async function runQuery(
  req: QueryRequest,
  init?: { signal?: AbortSignal },
): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: init?.signal,
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // leave body null, we'll report a generic error below
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ??
      `Query failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return (body ?? { ok: false }) as QueryResponse;
}

/** Convenience helper — calls Supabase signout then bounces to the landing page. */
export async function signOutAndRedirect(): Promise<void> {
  try {
    await fetch("/auth/signout", { method: "POST", cache: "no-store" });
  } catch {
    // Even if the request fails we still want to bounce the user.
  }
  window.location.href = "/";
}
