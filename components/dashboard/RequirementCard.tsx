import { PLATFORMS } from "@/lib/platforms";

/**
 * Shape accepted by the card. Tolerant on purpose: the `platform_requirements`
 * Cypher template returns (requirement_id, heading, summary, module, dal,
 * classification, verification_status, platform), but this component may also
 * be rendered with corpus rows that have different casing. The optional
 * fields below let other agents (corpus browser, search results) reuse it
 * without mapping through an adapter.
 */
export type RequirementRow = {
  requirement_id?: string | null;
  id?: string | null;
  heading?: string | null;
  summary?: string | null;
  module?: string | null;
  platform?: string | null;
  /** List of additional platforms the requirement is allocated to. */
  platforms?: string[] | null;
  classification?: string | null;
  /** Safety classification (DAL-A, DAL-B, ...). */
  dal?: string | null;
  /** Primary standard reference (e.g. "DO-178C"). */
  standard?: string | null;
  standards?: string[] | null;
  system?: string | null;
  component?: string | null;
  /** "COVERED" | "GAP" | "VERIFIED" | "OPEN" — we default styling on these. */
  verification_status?: string | null;
  status?: string | null;
};

function pickId(row: RequirementRow): string {
  return row.requirement_id ?? row.id ?? "—";
}

function pickStatus(row: RequirementRow): string | null {
  return row.verification_status ?? row.status ?? null;
}

function pickStandards(row: RequirementRow): string[] {
  if (row.standards && row.standards.length > 0) return row.standards;
  if (row.standard) return [row.standard];
  return [];
}

function pickPlatforms(row: RequirementRow): string[] {
  if (row.platforms && row.platforms.length > 0) return row.platforms;
  if (row.platform) return [row.platform];
  return [];
}

function statusChipClass(status: string | null): string {
  if (!status) return "chip";
  const s = status.toUpperCase();
  if (s === "COVERED" || s === "VERIFIED" || s === "OK") return "chip verified";
  if (s === "GAP" || s === "OPEN" || s === "UNVERIFIED") return "chip gap";
  if (s === "PARTIAL" || s === "DRAFT") return "chip partial";
  if (s === "CONFLICT" || s === "FAIL") return "chip danger";
  return "chip";
}

function shortPlatformCode(name: string): string {
  const match = PLATFORMS.find((p) => p.name === name);
  return match?.code ?? name;
}

export type RequirementCardProps = {
  row: RequirementRow;
  /** Optional click handler — used by the Graph tab's search panel. */
  onSelect?: (row: RequirementRow) => void;
  /** Visual emphasis for the active / focused row. */
  active?: boolean;
};

/**
 * Canonical requirement card used across tabs. Layout:
 *
 *   [id-chip] [system] [component] [standard]        [status]
 *   Heading (1 line, bold)
 *   Summary (2 line clamp, muted)
 *   Module · Platform badges · DAL
 */
export function RequirementCard({ row, onSelect, active = false }: RequirementCardProps) {
  const id = pickId(row);
  const heading = row.heading ?? row.summary ?? "Untitled requirement";
  const summary = row.summary ?? "";
  const status = pickStatus(row);
  const standards = pickStandards(row);
  const platforms = pickPlatforms(row);

  const Tag = onSelect ? "button" : "div";

  return (
    <Tag
      type={onSelect ? "button" : undefined}
      onClick={onSelect ? () => onSelect(row) : undefined}
      className={[
        "card pad w-full text-left transition-colors",
        onSelect ? "hover:border-line-2 hover:bg-bg-hover cursor-pointer" : "",
        active ? "border-accent/60 shadow-glow" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="chip id">{id}</span>
          {row.system ? <span className="chip system">{row.system}</span> : null}
          {row.component ? (
            <span className="chip component">{row.component}</span>
          ) : null}
          {standards.slice(0, 2).map((s) => (
            <span key={s} className="chip standard">
              {s}
            </span>
          ))}
          {row.dal ? <span className="chip warn">{row.dal}</span> : null}
        </div>
        {status ? <span className={statusChipClass(status)}>{status}</span> : null}
      </div>

      <div className="font-semibold text-[14px] leading-snug text-text mb-1 line-clamp-1">
        {heading}
      </div>

      {summary ? (
        <p
          className="text-[13px] leading-relaxed text-text-2 mb-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {summary}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-3">
        {row.module ? (
          <span className="inline-flex items-center gap-1">
            <span className="uppercase tracking-wider">Module</span>
            <span className="text-text-2">{row.module}</span>
          </span>
        ) : null}
        {platforms.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span className="uppercase tracking-wider">Platform</span>
            <span className="flex items-center gap-1">
              {platforms.map((p) => (
                <span
                  key={p}
                  title={p}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-line bg-bg-3 text-text-2"
                >
                  {shortPlatformCode(p)}
                </span>
              ))}
            </span>
          </span>
        ) : null}
        {row.classification ? (
          <span className="inline-flex items-center gap-1">
            <span className="uppercase tracking-wider">Class</span>
            <span className="text-text-2">{row.classification}</span>
          </span>
        ) : null}
      </div>
    </Tag>
  );
}
