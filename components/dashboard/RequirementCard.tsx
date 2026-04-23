import { PLATFORMS } from "@/lib/platforms";

/**
 * Shape accepted by the card. Tolerant on purpose: a few Cypher templates
 * return slightly different column sets, so the fields below are all
 * optional. The card renders whatever is present.
 */
export type RequirementRow = {
  requirement_id?: string | null;
  id?: string | null;
  /** The MD section the requirement sits under (e.g., "REQUIREMENTS > General"). */
  heading?: string | null;
  /** The full requirement body — what the engineer actually wrote. Preferred. */
  text?: string | null;
  /** Optional short summary (used when templates produce a compressed blurb). */
  summary?: string | null;
  module?: string | null;
  module_path?: string | null;
  object_type?: string | null;
  level?: number | null;
  platform?: string | null;
  platforms?: string[] | null;
  classification?: string | null;
  /** Safety classification (DAL-A, DAL-B, ...). */
  dal?: string | null;
  /** Priority / status come through when the underlying node has attributes. */
  priority?: string | null;
  /** Primary standard reference (e.g. "DO-178C"). */
  standard?: string | null;
  standards?: string[] | null;
  system?: string | null;
  component?: string | null;
  /** "COVERED" | "GAP" | "VERIFIED" | "OPEN" — card only surfaces positive signal. */
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

function pickBody(row: RequirementRow): string {
  // Prefer the full requirement text; fall back to summary; fall back to
  // heading only if neither body field is populated.
  return (
    (row.text && row.text.trim()) ||
    (row.summary && row.summary.trim()) ||
    (row.heading && row.heading.trim()) ||
    ""
  );
}

function isPositiveStatus(status: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return (
    s === "COVERED" ||
    s === "VERIFIED" ||
    s === "OK" ||
    s === "APPROVED" ||
    s === "PARTIAL"
  );
}

function statusChipClass(status: string | null): string {
  if (!status) return "chip";
  const s = status.toUpperCase();
  if (s === "COVERED" || s === "VERIFIED" || s === "OK" || s === "APPROVED")
    return "chip verified";
  if (s === "PARTIAL" || s === "DRAFT") return "chip partial";
  if (s === "CONFLICT" || s === "FAIL") return "chip danger";
  // GAP / OPEN / UNVERIFIED are noisy when everything is a gap — don't show.
  return "chip";
}

function shortPlatformCode(name: string): string {
  const match = PLATFORMS.find((p) => p.name === name);
  return match?.code ?? name;
}

export type RequirementCardProps = {
  row: RequirementRow;
  onSelect?: (row: RequirementRow) => void;
  active?: boolean;
};

export function RequirementCard({
  row,
  onSelect,
  active = false,
}: RequirementCardProps) {
  const id = pickId(row);
  const heading = row.heading ?? "";
  const body = pickBody(row);
  const status = pickStatus(row);
  const standards = pickStandards(row);
  const platforms = pickPlatforms(row);
  const showStatusChip = isPositiveStatus(status);

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
          {row.priority ? (
            <span className="chip">{row.priority}</span>
          ) : null}
        </div>
        {showStatusChip && status ? (
          <span className={statusChipClass(status)}>{status}</span>
        ) : null}
      </div>

      {/* Body — the actual requirement text, 3-line clamp for a dense list */}
      {body ? (
        <p
          className="text-[14px] leading-relaxed text-text mb-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {body}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-mono text-text-3">
        {row.module ? (
          <span className="inline-flex items-center gap-1">
            <span className="uppercase tracking-wider">Module</span>
            <span className="text-text-2">{row.module}</span>
          </span>
        ) : null}
        {heading ? (
          <span
            className="inline-flex items-center gap-1 truncate max-w-[320px]"
            title={heading}
          >
            <span className="uppercase tracking-wider">Section</span>
            <span className="text-text-2 truncate">{heading}</span>
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
        {onSelect ? (
          <span className="ml-auto text-text-4 group-hover:text-text-2">
            Click for details →
          </span>
        ) : null}
      </div>
    </Tag>
  );
}
