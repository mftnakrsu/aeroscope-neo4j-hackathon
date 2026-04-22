"use client";

import { useMemo, useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";

// Static sample nodes/edges so the panel has something to render before the
// real force-directed viz lands. Layout is hand-placed to feel like a trace
// matrix: anchor on the left, dependents fanning right, tests on the far right.

type SampleNode = {
  id: string;
  x: number;
  y: number;
  kind: "requirement" | "module" | "test" | "standard";
  label: string;
};

type SampleEdge = {
  from: string;
  to: string;
  rel: string;
};

const SAMPLE_NODES: SampleNode[] = [
  { id: "FCC-042", x: 90, y: 220, kind: "requirement", label: "FCC-042" },
  { id: "FCC-018", x: 230, y: 120, kind: "requirement", label: "FCC-018" },
  { id: "FCC-071", x: 230, y: 200, kind: "requirement", label: "FCC-071" },
  { id: "NAV-014", x: 230, y: 290, kind: "requirement", label: "NAV-014" },
  { id: "PWR-033", x: 230, y: 370, kind: "requirement", label: "PWR-033" },
  { id: "PAY-007", x: 380, y: 80, kind: "requirement", label: "PAY-007" },
  { id: "COM-019", x: 380, y: 170, kind: "requirement", label: "COM-019" },
  { id: "NAV-052", x: 380, y: 260, kind: "requirement", label: "NAV-052" },
  { id: "PWR-055", x: 380, y: 360, kind: "requirement", label: "PWR-055" },
  { id: "MOD-FCC", x: 530, y: 130, kind: "module", label: "FCC" },
  { id: "MOD-NAV", x: 530, y: 230, kind: "module", label: "NAV" },
  { id: "MOD-PWR", x: 530, y: 340, kind: "module", label: "PWR" },
  { id: "STD-DO178C", x: 680, y: 100, kind: "standard", label: "DO-178C" },
  { id: "STD-ARP4754A", x: 680, y: 210, kind: "standard", label: "ARP4754A" },
  { id: "STD-DO254", x: 680, y: 330, kind: "standard", label: "DO-254" },
  { id: "TP-101", x: 830, y: 90, kind: "test", label: "TP-101" },
  { id: "TP-117", x: 830, y: 180, kind: "test", label: "TP-117" },
  { id: "TP-233", x: 830, y: 280, kind: "test", label: "TP-233" },
  { id: "TP-319", x: 830, y: 360, kind: "test", label: "TP-319" },
  { id: "TP-408", x: 830, y: 430, kind: "test", label: "TP-408" },
];

const SAMPLE_EDGES: SampleEdge[] = [
  { from: "FCC-042", to: "FCC-018", rel: "SATISFIES" },
  { from: "FCC-042", to: "FCC-071", rel: "DERIVES_FROM" },
  { from: "FCC-042", to: "NAV-014", rel: "SATISFIES" },
  { from: "FCC-042", to: "PWR-033", rel: "CONSTRAINS" },
  { from: "FCC-018", to: "PAY-007", rel: "REFINES" },
  { from: "FCC-018", to: "COM-019", rel: "DERIVES_FROM" },
  { from: "NAV-014", to: "NAV-052", rel: "SATISFIES" },
  { from: "PWR-033", to: "PWR-055", rel: "REFINES" },
  { from: "PAY-007", to: "MOD-FCC", rel: "PART_OF" },
  { from: "COM-019", to: "MOD-FCC", rel: "PART_OF" },
  { from: "NAV-052", to: "MOD-NAV", rel: "PART_OF" },
  { from: "PWR-055", to: "MOD-PWR", rel: "PART_OF" },
  { from: "MOD-FCC", to: "STD-DO178C", rel: "REFERENCES_STANDARD" },
  { from: "MOD-NAV", to: "STD-ARP4754A", rel: "REFERENCES_STANDARD" },
  { from: "MOD-PWR", to: "STD-DO254", rel: "REFERENCES_STANDARD" },
  { from: "STD-DO178C", to: "TP-101", rel: "VERIFIES" },
  { from: "STD-DO178C", to: "TP-117", rel: "VERIFIES" },
  { from: "STD-ARP4754A", to: "TP-233", rel: "VERIFIES" },
  { from: "STD-DO254", to: "TP-319", rel: "VERIFIES" },
  { from: "STD-DO254", to: "TP-408", rel: "VERIFIES" },
];

const REL_TYPES = [
  "SATISFIES",
  "DERIVES_FROM",
  "REFINES",
  "VERIFIES",
  "REFERENCES_STANDARD",
  "CONSTRAINS",
  "PART_OF",
] as const;

const NODE_COLORS: Record<SampleNode["kind"], string> = {
  requirement: "var(--accent)",
  module: "var(--blue)",
  test: "var(--green)",
  standard: "var(--cyan)",
};

const SAMPLE_SEARCH_RESULTS = [
  { id: "FCC-042", heading: "Autopilot command authority hand-off" },
  { id: "FCC-018", heading: "Primary flight control loop closure" },
  { id: "NAV-014", heading: "GNSS-denied dead-reckoning fallback" },
  { id: "PWR-033", heading: "Undervoltage threshold on main bus" },
  { id: "COM-019", heading: "Secure datalink reacquisition" },
  { id: "PAY-007", heading: "ISR payload gimbal stabilisation" },
];

export default function GraphTab() {
  const [hopDepth, setHopDepth] = useState(2);
  const [enabledRels, setEnabledRels] = useState<Set<string>>(new Set(REL_TYPES));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>("FCC-042");

  const nodeById = useMemo(() => new Map(SAMPLE_NODES.map((n) => [n.id, n])), []);

  const visibleEdges = useMemo(
    () => SAMPLE_EDGES.filter((e) => enabledRels.has(e.rel)),
    [enabledRels],
  );

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SAMPLE_SEARCH_RESULTS;
    return SAMPLE_SEARCH_RESULTS.filter(
      (r) =>
        r.id.toLowerCase().includes(q) || r.heading.toLowerCase().includes(q),
    );
  }, [search]);

  function toggleRel(rel: string) {
    setEnabledRels((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  }

  return (
    <>
      <TabHeader
        title="Graph"
        crumbs={[{ label: "Analysis" }, { label: "Graph" }]}
        subtitle="Explore traceability as a graph — pick a requirement on the left, walk hops on the right."
        actions={
          <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
            Depth {hopDepth} · {enabledRels.size} rel types
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* LEFT: search + result list */}
        <aside className="card pad">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
            Find requirement
          </div>
          <input
            type="search"
            placeholder="FCC-042, undervoltage, gimbal..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input h-9 text-[13px]"
          />
          <ul className="mt-3 flex flex-col gap-1 max-h-[400px] overflow-y-auto">
            {filteredResults.map((r) => {
              const active = selected === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.id)}
                    className={[
                      "w-full text-left rounded-md border px-2.5 py-2 transition-colors",
                      active
                        ? "border-accent/50 bg-accent/10"
                        : "border-line bg-bg-2 hover:bg-bg-hover",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="chip id">{r.id}</span>
                    </div>
                    <div className="text-[12px] text-text-2 mt-1 line-clamp-2">
                      {r.heading}
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredResults.length === 0 ? (
              <li className="text-[12px] text-text-3 px-1 py-3">No matches.</li>
            ) : null}
          </ul>
        </aside>

        {/* RIGHT: viz + controls */}
        <section className="flex flex-col gap-4">
          <div className="card relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-wider text-text-3">
              Interactive viz coming soon
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono text-text-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.requirement }} />
                Req
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.module }} />
                Module
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.standard }} />
                Standard
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.test }} />
                Test
              </span>
            </div>
            <svg
              viewBox="0 0 920 500"
              className="w-full h-[460px] block"
              role="img"
              aria-label="Sample graph preview"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--cyan)" opacity="0.5" />
                </marker>
              </defs>

              {/* Edges */}
              <g>
                {visibleEdges.map((edge, idx) => {
                  const from = nodeById.get(edge.from);
                  const to = nodeById.get(edge.to);
                  if (!from || !to) return null;
                  const highlighted =
                    selected === edge.from || selected === edge.to;
                  return (
                    <line
                      key={`${edge.from}-${edge.to}-${idx}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="var(--cyan)"
                      strokeOpacity={highlighted ? 0.75 : 0.22}
                      strokeWidth={highlighted ? 1.4 : 0.9}
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {SAMPLE_NODES.map((n) => {
                  const active = selected === n.id;
                  const color = NODE_COLORS[n.kind];
                  const r = n.kind === "requirement" ? 16 : 12;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x} ${n.y})`}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(n.id)}
                    >
                      <circle
                        r={r + (active ? 4 : 0)}
                        fill="transparent"
                        stroke={color}
                        strokeOpacity={active ? 0.9 : 0}
                        strokeWidth="1.5"
                      />
                      <circle r={r} fill={color} fillOpacity={active ? 0.3 : 0.15} stroke={color} strokeWidth="1" />
                      <text
                        y="4"
                        textAnchor="middle"
                        className="mono"
                        fontSize="10"
                        fill="var(--text)"
                      >
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="card pad">
              <label
                htmlFor="hop-depth"
                className="text-[10px] font-mono uppercase tracking-wider text-text-3"
              >
                Hop depth
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  id="hop-depth"
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={hopDepth}
                  onChange={(event) => setHopDepth(Number(event.target.value))}
                  className="w-full accent-[color:var(--accent)]"
                />
                <span className="mono text-accent text-sm min-w-[1.5rem] text-right">
                  {hopDepth}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono text-text-3">
                <span>Direct</span>
                <span>Transitive</span>
                <span>Full blast</span>
              </div>
            </div>

            <div className="card pad">
              <div className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
                Relationship types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REL_TYPES.map((rel) => {
                  const active = enabledRels.has(rel);
                  return (
                    <label
                      key={rel}
                      className={[
                        "inline-flex items-center gap-1.5 chip cursor-pointer select-none",
                        active ? "standard" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleRel(rel)}
                        className="accent-[color:var(--accent)]"
                      />
                      {rel}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
