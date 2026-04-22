"use client";

import { useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";
import { ApiError, runQuery, type QueryRow } from "@/lib/api-client";

type ImpactRow = QueryRow & {
  anchor_id?: string;
  anchor_heading?: string;
  dependent_id?: string;
  dependent_heading?: string;
  dependent_module?: string;
  chain?: string[];
  provenance?: string[];
  hop_count?: number;
  tests_to_rerun?: string[];
  standards_at_risk?: string[];
};

export default function ImpactTab() {
  const [anchorId, setAnchorId] = useState("");
  const [description, setDescription] = useState("");
  const [hopDepth, setHopDepth] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<ImpactRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!anchorId.trim()) {
      setError("Enter a requirement ID to analyse (e.g. FCC-042).");
      return;
    }
    setSubmitting(true);
    setError(null);
    setRows(null);
    try {
      // Template param is `req_id`; we also forward hop_depth even though the
      // underlying template is hard-bounded to 1..2 — the server may clamp.
      const resp = await runQuery({
        template_id: "impact_analysis",
        params: {
          req_id: anchorId.trim(),
          anchor_id: anchorId.trim(),
          hop_depth: hopDepth,
        },
      });
      setRows((resp.rows ?? []) as ImpactRow[]);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impact analysis failed.";
      setError(message);
      setRows([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TabHeader
        title="Impact Analysis"
        crumbs={[{ label: "Analysis" }, { label: "Impact" }]}
        subtitle="Pick a change target and walk downstream to see which requirements, standards, and tests are at risk."
      />

      <form
        onSubmit={handleSubmit}
        className="card pad mb-6 grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-4"
      >
        <div className="vstack">
          <label
            htmlFor="anchor"
            className="text-[10px] font-mono uppercase tracking-wider text-text-3"
          >
            Change target (requirement ID)
          </label>
          <input
            id="anchor"
            type="text"
            placeholder="FCC-042"
            value={anchorId}
            onChange={(event) => setAnchorId(event.target.value)}
            className="input"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="vstack">
          <label
            htmlFor="hop"
            className="text-[10px] font-mono uppercase tracking-wider text-text-3"
          >
            Hop depth
          </label>
          <select
            id="hop"
            value={hopDepth}
            onChange={(event) => setHopDepth(Number(event.target.value))}
            className="input"
          >
            <option value={1}>1 — Direct</option>
            <option value={2}>2 — Transitive</option>
            <option value={3}>3 — Full blast</option>
          </select>
        </div>

        <div className="vstack justify-end">
          <label
            className="text-[10px] font-mono uppercase tracking-wider text-transparent select-none"
            aria-hidden
          >
            submit
          </label>
          <button
            type="submit"
            className="btn primary h-10"
            disabled={submitting}
          >
            {submitting ? "Analysing..." : "Run analysis →"}
          </button>
        </div>

        <div className="md:col-span-3 vstack">
          <label
            htmlFor="desc"
            className="text-[10px] font-mono uppercase tracking-wider text-text-3"
          >
            Change description (optional)
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Raise undervoltage threshold from 22V to 24V on main DC bus..."
            className="input h-auto py-2.5 resize-y"
          />
        </div>
      </form>

      {error ? (
        <div className="card pad border-red/40 mb-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-red mb-1">
            Error
          </div>
          <div className="text-sm text-text-2">{error}</div>
        </div>
      ) : null}

      {rows && rows.length > 0 ? (
        <ImpactTable rows={rows} anchorId={anchorId.trim()} />
      ) : rows && rows.length === 0 && !error ? (
        <div className="card pad text-center text-text-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 mb-2">
            No dependents
          </div>
          <div className="text-sm">
            No downstream dependencies found for{" "}
            <span className="mono text-text">{anchorId.trim() || "—"}</span>.
            Either the ID has no trace links or it does not exist in the graph.
          </div>
        </div>
      ) : null}
    </>
  );
}

function ImpactTable({ rows, anchorId }: { rows: ImpactRow[]; anchorId: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-bg-2">
        <div className="text-[12px] text-text-2">
          <span className="text-text-3 uppercase tracking-wider text-[10px] font-mono mr-2">
            Anchor
          </span>
          <span className="chip id">{anchorId || rows[0]?.anchor_id || "—"}</span>
          <span className="ml-2 text-text-3">
            {rows[0]?.anchor_heading ?? ""}
          </span>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
          {rows.length} affected
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-bg-2 text-text-3">
            <tr className="text-left">
              <Th>Dependent</Th>
              <Th>Module</Th>
              <Th>Relationship chain</Th>
              <Th>Hops</Th>
              <Th>Standards at risk</Th>
              <Th>Tests to rerun</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.dependent_id ?? idx}`}
                className="border-t border-line align-top hover:bg-bg-hover"
              >
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="chip id">{row.dependent_id ?? "—"}</span>
                  </div>
                  <div className="text-text-2 mt-1 max-w-[280px] line-clamp-2">
                    {row.dependent_heading ?? ""}
                  </div>
                </Td>
                <Td>
                  {row.dependent_module ? (
                    <span className="chip system">{row.dependent_module}</span>
                  ) : null}
                </Td>
                <Td>
                  <ChainView chain={row.chain ?? []} provenance={row.provenance ?? []} />
                </Td>
                <Td>
                  <span className="mono text-text-2">{row.hop_count ?? "—"}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(row.standards_at_risk ?? []).filter(Boolean).map((s) => (
                      <span key={s} className="chip standard">
                        {s}
                      </span>
                    ))}
                    {(row.standards_at_risk ?? []).length === 0 ? (
                      <span className="text-text-3">—</span>
                    ) : null}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(row.tests_to_rerun ?? []).filter(Boolean).map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                    {(row.tests_to_rerun ?? []).length === 0 ? (
                      <span className="text-red mono text-[11px]">gap</span>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 font-mono uppercase tracking-wider text-[10px] font-medium">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function ChainView({
  chain,
  provenance,
}: {
  chain: string[];
  provenance: string[];
}) {
  if (chain.length === 0) return <span className="text-text-3">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chain.map((rel, idx) => {
        const prov = provenance[idx] ?? "explicit";
        const inferred = prov !== "explicit";
        return (
          <span key={`${rel}-${idx}`} className="inline-flex items-center gap-1">
            <span
              className={inferred ? "chip partial" : "chip"}
              title={`provenance: ${prov}`}
            >
              {rel}
            </span>
            {idx < chain.length - 1 ? (
              <span aria-hidden className="text-text-3 mono">→</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
