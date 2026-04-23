"use client";

import { useEffect } from "react";
import type { RequirementRow } from "./RequirementCard";
import { PLATFORMS } from "@/lib/platforms";

type RequirementDrawerProps = {
  row: RequirementRow | null;
  onClose: () => void;
};

/**
 * Right-side drawer showing the full requirement detail. Opens when a
 * `RequirementCard` is clicked, closes on backdrop click or ESC.
 */
export function RequirementDrawer({ row, onClose }: RequirementDrawerProps) {
  useEffect(() => {
    if (!row) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Lock body scroll while drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [row, onClose]);

  if (!row) return null;

  const id = row.requirement_id ?? row.id ?? "—";
  const heading = row.heading ?? "";
  const body =
    (row.text && row.text.trim()) ||
    (row.summary && row.summary.trim()) ||
    "";
  const platforms =
    (row.platforms && row.platforms.length > 0
      ? row.platforms
      : row.platform
        ? [row.platform]
        : []) ?? [];
  const standards =
    (row.standards && row.standards.length > 0
      ? row.standards
      : row.standard
        ? [row.standard]
        : []) ?? [];

  const meta: Array<[string, string | null | undefined]> = [
    ["Module", row.module],
    ["Module path", row.module_path],
    ["Object type", row.object_type],
    ["Level", row.level != null ? String(row.level) : null],
    ["DAL", row.dal],
    ["Priority", row.priority],
    ["Status", row.status],
    ["Verification", row.verification_status],
    ["Classification", row.classification],
    ["System", row.system],
    ["Component", row.component],
  ];
  const metaFilled = meta.filter(([, v]) => v && v.length > 0);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[rgba(15,20,32,0.35)] backdrop-blur-[2px]"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="requirement-drawer-title"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] bg-bg-1 border-l border-line flex flex-col"
        style={{ boxShadow: "0 20px 60px rgba(15,20,32,0.15)" }}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="chip id">{id}</span>
              {row.dal ? <span className="chip warn">{row.dal}</span> : null}
              {row.priority ? (
                <span className="chip">{row.priority}</span>
              ) : null}
            </div>
            <div
              id="requirement-drawer-title"
              className="text-[13px] font-mono text-text-3 uppercase tracking-wider truncate"
              title={heading}
            >
              {heading || "Requirement"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn sm ghost"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Scrolling body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Full text */}
          <section>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
              Requirement text
            </h3>
            {body ? (
              <p className="text-[14px] leading-relaxed text-text whitespace-pre-wrap">
                {body}
              </p>
            ) : (
              <p className="text-[13px] text-text-3 italic">
                No body text — this chunk is a heading or table.
              </p>
            )}
          </section>

          {/* Standards */}
          {standards.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
                Standards
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {standards.map((s) => (
                  <span key={s} className="chip standard">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Platforms */}
          {platforms.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
                Allocated platforms
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => {
                  const meta = PLATFORMS.find((pf) => pf.name === p);
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 text-[12px] font-mono px-2.5 py-1 rounded-md border border-line bg-bg-2 text-text-2"
                      title={meta?.role ?? p}
                    >
                      <span className="uppercase tracking-wider text-text-3">
                        {meta?.code ?? p}
                      </span>
                      <span className="text-text">{p}</span>
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Metadata */}
          {metaFilled.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-text-3 mb-2">
                Metadata
              </h3>
              <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 gap-x-3 text-[12.5px]">
                {metaFilled.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono uppercase tracking-wider text-text-3 text-[10px] self-center">
                      {k}
                    </dt>
                    <dd className="text-text-2 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-line flex items-center justify-between gap-2 text-[11px] font-mono text-text-3">
          <span>ESC to close</span>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              if (id && id !== "—") {
                navigator.clipboard?.writeText(id).catch(() => {});
              }
            }}
          >
            Copy ID
          </button>
        </footer>
      </aside>
    </>
  );
}
