"use client";

import { useEffect, useMemo, useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";
import { RequirementCard, type RequirementRow } from "@/components/dashboard/RequirementCard";
import { SkeletonCardList } from "@/components/dashboard/SkeletonCard";
import { runQuery, ApiError, type QueryRow } from "@/lib/api-client";
import { PLATFORMS } from "@/lib/platforms";

const PAGE_SIZE = 10;

export default function RequirementsTab() {
  const [platform, setPlatform] = useState<string>(PLATFORMS[0].name);
  const [rows, setRows] = useState<RequirementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setError(null);
    setPage(1);

    runQuery(
      {
        template_id: "platform_requirements",
        // NB: the underlying Cypher template's param is `platform_name`;
        // we send both so either server-side normalisation works.
        params: { platform_name: platform, platform, limit: 50 },
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
  }, [platform]);

  const totalPages = useMemo(() => {
    if (!rows) return 1;
    return Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  }, [rows]);

  const paginated = useMemo(() => {
    if (!rows) return [];
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  return (
    <>
      <TabHeader
        title="Requirements"
        crumbs={[{ label: "Analysis" }, { label: "Requirements" }]}
        subtitle={`Browse requirements allocated to ${platform}. Filter by platform to scope the corpus.`}
        actions={
          <>
            <label className="sr-only" htmlFor="platform-filter">
              Platform
            </label>
            <select
              id="platform-filter"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="input h-8 text-[12px] w-auto min-w-[160px]"
            >
              {PLATFORMS.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name} — {p.role}
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
        <EmptyState platform={platform} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {paginated.map((row, idx) => (
              <RequirementCard key={`${row.requirement_id ?? row.id ?? idx}`} row={row} />
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

function EmptyState({ platform }: { platform: string }) {
  return (
    <div className="card pad text-center text-text-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 mb-2">
        No results
      </div>
      <div className="text-sm">
        No requirements returned for <span className="mono text-text">{platform}</span>.
        The corpus may not be seeded yet, or the allocation for this platform is empty.
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
