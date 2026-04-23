"use client";

import { useEffect, useMemo, useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";
import { RequirementCard, type RequirementRow } from "@/components/dashboard/RequirementCard";
import { RequirementDrawer } from "@/components/dashboard/RequirementDrawer";
import { SkeletonCardList } from "@/components/dashboard/SkeletonCard";
import { runQuery, ApiError, type QueryRow } from "@/lib/api-client";
import { MODULES } from "@/lib/modules";

const PAGE_SIZE = 10;
const ALL = "__all__";

export default function RequirementsTab() {
  const [module, setModule] = useState<string>(ALL);
  const [rows, setRows] = useState<RequirementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RequirementRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setError(null);
    setPage(1);

    const params: Record<string, unknown> = { limit: 50 };
    if (module !== ALL) {
      params.module_name = module;
    }

    runQuery(
      {
        template_id: "all_requirements",
        params,
      },
      { signal: controller.signal },
    )
      .then((resp) => {
        const payload = (resp.rows ?? []) as QueryRow[];
        setRows(payload as RequirementRow[]);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error loading requirements";
        setError(message);
        setRows([]);
      });

    return () => controller.abort();
  }, [module]);

  const totalPages = useMemo(() => {
    if (!rows) return 1;
    return Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  }, [rows]);

  const paginated = useMemo(() => {
    if (!rows) return [];
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const scopeLabel =
    module === ALL ? "all modules" : `the ${module} module`;

  return (
    <>
      <TabHeader
        title="Requirements"
        crumbs={[{ label: "Analysis" }, { label: "Requirements" }]}
        subtitle={`Browse requirements across ${scopeLabel}. Filter by module to scope the corpus.`}
        actions={
          <>
            <label className="sr-only" htmlFor="module-filter">
              Module
            </label>
            <select
              id="module-filter"
              value={module}
              onChange={(event) => setModule(event.target.value)}
              className="input h-8 text-[12px] w-auto min-w-[200px]"
            >
              <option value={ALL}>All modules (loaded)</option>
              {MODULES.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
            <button type="button" className="btn sm" disabled>
              Export
            </button>
          </>
        }
      />

      {rows === null ? (
        <SkeletonCardList count={6} />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState scopeLabel={scopeLabel} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {paginated.map((row, idx) => (
              <RequirementCard
                key={`${row.requirement_id ?? row.id ?? idx}`}
                row={row}
                onSelect={setSelected}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={rows.length}
            onPage={setPage}
          />
        </>
      )}

      <RequirementDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (next: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="mt-4 flex items-center justify-between text-[12px] text-text-2">
      <div className="font-mono text-text-3">
        {start}–{end} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="font-mono text-text-3">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn sm"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function EmptyState({ scopeLabel }: { scopeLabel: string }) {
  return (
    <div className="card pad text-center text-text-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 mb-2">
        No results
      </div>
      <div className="text-sm">
        No requirements returned for{" "}
        <span className="mono text-text">{scopeLabel}</span>. The module may
        not be loaded into Aura yet — run <span className="mono">make load</span>{" "}
        after generating more synthetic corpus.
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card pad border-red/40">
      <div className="text-[11px] font-mono uppercase tracking-wider text-red mb-1">
        Query error
      </div>
      <div className="text-sm text-text-2">{message}</div>
    </div>
  );
}
