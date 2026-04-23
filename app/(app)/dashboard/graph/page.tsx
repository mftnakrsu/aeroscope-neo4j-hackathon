"use client";

import { useEffect, useMemo, useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";
import { GraphViz, type GraphData, type GraphNode } from "@/components/dashboard/GraphViz";
import { runQuery, ApiError, type QueryRow } from "@/lib/api-client";

const MODULE_OPTIONS = ["All", "FCC", "FMS", "AUTO", "GPS", "INS"] as const;
const LIMIT_OPTIONS = [20, 50, 100] as const;

type ModuleChoice = (typeof MODULE_OPTIONS)[number];
type LimitChoice = (typeof LIMIT_OPTIONS)[number];

/**
 * Shape of one row emitted by the `graph_slice` Cypher template. Each row is
 * one Requirement plus its outgoing trace edges (already scoped to the same
 * slice on the server, so no dangling-edge filtering needed here).
 */
type GraphSliceRow = {
  id?: unknown;
  module?: unknown;
  heading?: unknown;
  object_type?: unknown;
  outgoing?: unknown;
};

type OutgoingEdge = {
  type?: unknown;
  target?: unknown;
};

function rowsToGraph(rows: QueryRow[]): GraphData {
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  const links: { source: string; target: string; type: string }[] = [];

  for (const raw of rows) {
    const row = raw as GraphSliceRow;
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) continue;
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({
        id,
        module: typeof row.module === "string" ? row.module : null,
        heading: typeof row.heading === "string" ? row.heading : null,
        type: typeof row.object_type === "string" ? row.object_type : null,
      });
    }
    const outgoing = Array.isArray(row.outgoing) ? (row.outgoing as OutgoingEdge[]) : [];
    for (const edge of outgoing) {
      const target = typeof edge?.target === "string" ? edge.target : null;
      const type = typeof edge?.type === "string" ? edge.type : null;
      if (!target || !type) continue;
      links.push({ source: id, target, type });
    }
  }

  // Drop any link whose endpoint is not in the node set (defensive — the
  // server already filters these, but a malformed row should not crash the
  // renderer).
  const nodeIds = new Set(nodes.map((n) => n.id));
  const safeLinks = links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

  return { nodes, links: safeLinks };
}

export default function GraphTab() {
  const [moduleChoice, setModuleChoice] = useState<ModuleChoice>("All");
  const [limit, setLimit] = useState<LimitChoice>(50);
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    setSelected(null);

    const params: Record<string, unknown> = { limit };
    if (moduleChoice !== "All") {
      params.module_name = moduleChoice;
    } else {
      // Explicit null lets the Cypher `$module_name IS NULL` guard short-circuit.
      params.module_name = null;
    }

    runQuery(
      {
        template_id: "graph_slice",
        params,
      },
      { signal: controller.signal },
    )
      .then((resp) => {
        const rows = (resp.rows ?? []) as QueryRow[];
        setData(rowsToGraph(rows));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error loading graph";
        setError(message);
        setData({ nodes: [], links: [] });
      });

    return () => controller.abort();
  }, [moduleChoice, limit, reloadKey]);

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      nodes: data.nodes.length,
      links: data.links.length,
    };
  }, [data]);

  return (
    <>
      <TabHeader
        title="Graph"
        crumbs={[{ label: "Analysis" }, { label: "Graph" }]}
        subtitle="Force-directed view of the traceability graph. Pick a module to scope the slice, then click any node for details."
        actions={
          <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
            {stats ? `${stats.nodes} nodes · ${stats.links} edges` : "Loading…"}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <section className="flex flex-col gap-4 min-w-0">
          <Controls
            moduleChoice={moduleChoice}
            limit={limit}
            onModuleChange={setModuleChoice}
            onLimitChange={setLimit}
            onReload={() => setReloadKey((n) => n + 1)}
            disabled={data === null}
          />

          <div className="card relative overflow-hidden">
            {data === null ? (
              <GraphLoading />
            ) : error && data.nodes.length === 0 ? (
              <GraphError message={error} />
            ) : data.nodes.length === 0 ? (
              <GraphEmpty module={moduleChoice} />
            ) : (
              <GraphViz
                data={data}
                onNodeSelect={setSelected}
                selectedId={selected?.id ?? null}
                height={520}
              />
            )}
          </div>
        </section>

        <aside className="min-w-0">
          <DetailsPanel node={selected} module={moduleChoice} />
        </aside>
      </div>
    </>
  );
}

function Controls({
  moduleChoice,
  limit,
  onModuleChange,
  onLimitChange,
  onReload,
  disabled,
}: {
  moduleChoice: ModuleChoice;
  limit: LimitChoice;
  onModuleChange: (m: ModuleChoice) => void;
  onLimitChange: (n: LimitChoice) => void;
  onReload: () => void;
  disabled: boolean;
}) {
  return (
    <div className="card pad flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <label
          htmlFor="graph-module"
          className="text-[10px] font-mono uppercase tracking-wider text-text-3"
        >
          Module
        </label>
        <select
          id="graph-module"
          value={moduleChoice}
          onChange={(event) => onModuleChange(event.target.value as ModuleChoice)}
          className="input h-9 text-[13px]"
        >
          {MODULE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[200px] grow">
        <div className="flex items-center justify-between">
          <label
            htmlFor="graph-limit"
            className="text-[10px] font-mono uppercase tracking-wider text-text-3"
          >
            Node limit
          </label>
          <span className="mono text-accent text-[12px]">{limit}</span>
        </div>
        <div className="flex items-center gap-1">
          {LIMIT_OPTIONS.map((n) => {
            const active = n === limit;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onLimitChange(n)}
                className={[
                  "btn sm flex-1 justify-center",
                  active ? "primary" : "",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn sm"
          onClick={onReload}
          disabled={disabled}
        >
          Reload graph
        </button>
      </div>
    </div>
  );
}

function DetailsPanel({
  node,
  module,
}: {
  node: GraphNode | null;
  module: ModuleChoice;
}) {
  if (!node) {
    return (
      <div className="card pad">
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
          Node details
        </div>
        <p className="text-[13px] text-text-2">
          Click any node to inspect its id, module, and heading.
        </p>
        <div className="mt-4 text-[11px] text-text-3">
          Current scope:{" "}
          <span className="mono text-text-2">{module === "All" ? "all modules" : module}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card pad">
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
        Node details
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="chip id">{node.id}</span>
        {node.module ? <span className="chip system">{node.module}</span> : null}
        {node.type ? <span className="chip standard">{node.type}</span> : null}
      </div>
      <div className="text-[14px] font-semibold text-text leading-snug mb-1">
        {node.heading ?? "Untitled requirement"}
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
        <dt className="text-text-3 font-mono uppercase tracking-wider text-[10px] self-center">
          ID
        </dt>
        <dd className="mono text-text-2">{node.id}</dd>
        <dt className="text-text-3 font-mono uppercase tracking-wider text-[10px] self-center">
          Module
        </dt>
        <dd className="text-text-2">{node.module ?? "—"}</dd>
        {node.type ? (
          <>
            <dt className="text-text-3 font-mono uppercase tracking-wider text-[10px] self-center">
              Type
            </dt>
            <dd className="text-text-2">{node.type}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function GraphLoading() {
  return (
    <div className="h-[520px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-[12px] font-mono text-text-3">
        <div className="animate-pulse w-40 h-2 rounded bg-bg-3" />
        <span>Fetching graph slice…</span>
      </div>
    </div>
  );
}

function GraphError({ message }: { message: string }) {
  return (
    <div className="h-[520px] p-6 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-mono uppercase tracking-wider text-red mb-2">
        Graph error
      </div>
      <div className="text-[13px] text-text-2 max-w-md">{message}</div>
    </div>
  );
}

function GraphEmpty({ module }: { module: ModuleChoice }) {
  return (
    <div className="h-[520px] p-6 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
        No data
      </div>
      <div className="text-[13px] text-text-2 max-w-md">
        The <span className="mono text-text">graph_slice</span> template returned no
        requirements for{" "}
        <span className="mono text-text">
          {module === "All" ? "the current scope" : module}
        </span>
        . Seed the Aura corpus or pick a different module.
      </div>
    </div>
  );
}
