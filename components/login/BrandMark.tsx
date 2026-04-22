interface BrandMarkProps {
  size?: number;
  withWordmark?: boolean;
}

export function BrandMark({ size = 32, withWordmark = true }: BrandMarkProps) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="relative grid place-items-center rounded-[6px]"
        style={{
          width: size,
          height: size,
          background: "var(--accent)",
          color: "#000",
          boxShadow:
            "0 0 0 1px rgba(255, 176, 32, 0.35), 0 6px 18px rgba(255, 176, 32, 0.18)",
        }}
        aria-hidden="true"
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized node-graph compass glyph */}
          <circle cx="12" cy="12" r="2.2" fill="#000" stroke="none" />
          <circle cx="12" cy="4" r="1.4" fill="#000" stroke="none" />
          <circle cx="20" cy="12" r="1.4" fill="#000" stroke="none" />
          <circle cx="12" cy="20" r="1.4" fill="#000" stroke="none" />
          <circle cx="4" cy="12" r="1.4" fill="#000" stroke="none" />
          <line x1="12" y1="6" x2="12" y2="10" />
          <line x1="14" y1="12" x2="18" y2="12" />
          <line x1="12" y1="14" x2="12" y2="18" />
          <line x1="6" y1="12" x2="10" y2="12" />
        </svg>
      </div>
      {withWordmark && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-text">
            AeroScope
          </div>
          <div
            className="text-[9px] font-mono uppercase tracking-[0.16em]"
            style={{ color: "var(--text-3)" }}
          >
            Mission Console
          </div>
        </div>
      )}
    </div>
  );
}
