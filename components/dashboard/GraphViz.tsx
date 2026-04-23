"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";

/**
 * Dynamic import with `ssr: false` is mandatory — react-force-graph-2d pulls
 * in `force-graph`, which reaches for the DOM at module init. Importing it
 * during Next.js server rendering throws `window is not defined`.
 */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

export type GraphNode = {
  id: string;
  module: string | null;
  heading: string | null;
  /** Node label / classification (e.g. Functional, Performance). */
  type?: string | null;
};

export type GraphLink = {
  source: string;
  target: string;
  type: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type GraphVizProps = {
  data: GraphData;
  /** Optional callback when a node is clicked — used to populate the side panel. */
  onNodeSelect?: (node: GraphNode | null) => void;
  /** Visually highlight a specific node id (matches side-panel selection). */
  selectedId?: string | null;
  /** Height in pixels; width follows the parent element. */
  height?: number;
};

// Four accent colors that all read on a white background (light theme values
// from app/globals.css). Cycled through by module so 1..4 modules each get a
// distinct hue and the 5th wraps back to the first.
const MODULE_COLORS = [
  "#0052cc", // --blue / --accent
  "#0694a2", // --cyan
  "#6f3fd1", // --magenta
  "#2c9d5d", // --green
  "#b87600", // --warn (amber on light theme)
] as const;

const FALLBACK_COLOR = "#6b7689"; // --text-3

const LINK_COLOR_GENERIC = "#cdd3dc"; // --line-2, subtle grey line
const LINK_COLOR_TRACE = "#0052cc"; // --accent, pops for trace edges

/**
 * Relationship types that count as "trace" edges and should render in the
 * accent color. Everything else uses the neutral line-2 grey.
 */
const TRACE_EDGE_TYPES = new Set(["SATISFIES", "DERIVES_FROM", "REFINES", "VERIFIES"]);

function colorForModule(module: string | null, palette: Map<string, string>): string {
  if (!module) return FALLBACK_COLOR;
  const cached = palette.get(module);
  if (cached) return cached;
  const color = MODULE_COLORS[palette.size % MODULE_COLORS.length] ?? FALLBACK_COLOR;
  palette.set(module, color);
  return color;
}

/**
 * Stable per-graph palette: keyed by module name so node + legend colors line
 * up even after a re-render. Using useMemo on the data identity keeps the
 * mapping consistent across hover events.
 */
function buildPalette(nodes: GraphNode[]): Map<string, string> {
  const palette = new Map<string, string>();
  // Two-pass so the allocation order is deterministic on module name rather
  // than node ordering inside the nodes array.
  const modules = Array.from(
    new Set(nodes.map((n) => n.module).filter((m): m is string => !!m)),
  ).sort();
  modules.forEach((m, idx) => {
    palette.set(m, MODULE_COLORS[idx % MODULE_COLORS.length] ?? FALLBACK_COLOR);
  });
  return palette;
}

/**
 * Force-directed canvas graph with module-colored nodes and trace-emphasised
 * edges. Renders client-side only; the Next.js dynamic import keeps us out of
 * trouble during server rendering. All colors are sourced from design tokens
 * that read on the light theme (which is the dashboard default).
 */
export function GraphViz({ data, onNodeSelect, selectedId, height = 520 }: GraphVizProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [width, setWidth] = useState(800);

  // The canvas needs an explicit pixel width. Observe the container and feed
  // its client width into ForceGraph2D; fall back to a sensible default.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      setWidth(w);
    });
    observer.observe(el);
    setWidth(Math.max(320, el.clientWidth));
    return () => observer.disconnect();
  }, []);

  const palette = useMemo(() => buildPalette(data.nodes), [data.nodes]);

  // react-force-graph mutates the input in place (adds vx/vy/etc.), so give
  // it a shallow clone to keep props immutable from React's perspective.
  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    };
  }, [data]);

  const modulesForLegend = useMemo(() => {
    return Array.from(palette.entries());
  }, [palette]);

  // Re-fit the graph when data changes so a module filter actually re-centers.
  useEffect(() => {
    if (!fgRef.current) return;
    if (graphData.nodes.length === 0) return;
    const id = window.setTimeout(() => {
      fgRef.current?.zoomToFit(400, 40);
    }, 250);
    return () => window.clearTimeout(id);
  }, [graphData]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height }}
    >
      <Legend modules={modulesForLegend} />

      {data.nodes.length === 0 ? (
        <EmptyCanvas />
      ) : (
        <ForceGraph2D
          ref={fgRef as React.MutableRefObject<ForceGraphMethods | undefined>}
          graphData={graphData}
          width={width}
          height={height}
          backgroundColor="#ffffff"
          nodeRelSize={5}
          nodeLabel={(node) => {
            const n = node as GraphNode;
            const mod = n.module ? `<span style="opacity:0.7">${escapeHtml(n.module)}</span>` : "";
            const heading = n.heading ? escapeHtml(n.heading) : "";
            return `<div style="font-family:ui-monospace,monospace;font-size:11px;max-width:260px;line-height:1.4">
              <div style="font-weight:600;color:#0f1420">${escapeHtml(n.id)}</div>
              ${mod ? `<div style="color:#3e4a5f;margin-top:2px">${mod}</div>` : ""}
              ${heading ? `<div style="color:#3e4a5f;margin-top:4px;white-space:normal">${heading}</div>` : ""}
            </div>`;
          }}
          nodeColor={(node) => colorForModule((node as GraphNode).module ?? null, palette)}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode & { x?: number; y?: number };
            if (n.x === undefined || n.y === undefined) return;
            const isSelected = selectedId && selectedId === n.id;
            if (isSelected) {
              ctx.beginPath();
              ctx.arc(n.x, n.y, 9, 0, 2 * Math.PI, false);
              ctx.strokeStyle = "#0052cc";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }
            // Only draw id labels when zoomed in — keeps things readable.
            if (globalScale >= 1.5) {
              const label = n.id;
              ctx.font = `${10 / globalScale}px ui-monospace, monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#0f1420";
              ctx.fillText(label, n.x, n.y + 7);
            }
          }}
          linkColor={(link) => {
            const l = link as GraphLink;
            return TRACE_EDGE_TYPES.has(l.type) ? LINK_COLOR_TRACE : LINK_COLOR_GENERIC;
          }}
          linkWidth={(link) => (TRACE_EDGE_TYPES.has((link as GraphLink).type) ? 1.4 : 0.8)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalArrowColor={(link) => {
            const l = link as GraphLink;
            return TRACE_EDGE_TYPES.has(l.type) ? LINK_COLOR_TRACE : LINK_COLOR_GENERIC;
          }}
          linkLabel={(link) => escapeHtml((link as GraphLink).type)}
          cooldownTicks={120}
          onNodeClick={(node) => {
            if (onNodeSelect) onNodeSelect(node as GraphNode);
          }}
          onBackgroundClick={() => {
            if (onNodeSelect) onNodeSelect(null);
          }}
        />
      )}
    </div>
  );
}

function Legend({ modules }: { modules: [string, string][] }) {
  if (modules.length === 0) return null;
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center gap-2 rounded-md border border-line bg-bg-1/90 backdrop-blur px-2 py-1 text-[10px] font-mono text-text-3">
      {modules.map(([name, color]) => (
        <span key={name} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
          <span>{name}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 pl-1 border-l border-line">
        <span
          className="inline-block w-3 h-0.5"
          style={{ background: LINK_COLOR_TRACE }}
          aria-hidden
        />
        <span>Trace</span>
      </span>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[12px] font-mono text-text-3">
      No nodes to render.
    </div>
  );
}

function GraphSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[12px] font-mono text-text-3">
      Loading graph renderer…
    </div>
  );
}

// Narrow utility — the library accepts HTML for tooltips, so we escape any
// text that may legitimately contain angle brackets or quotes before splicing
// into the tooltip string.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
