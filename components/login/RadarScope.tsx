interface RadarScopeProps {
  className?: string;
}

// Fixed contact positions (stable across renders, no hydration drift)
const contacts: Array<{ cx: number; cy: number; r: number; delay: string; highlight?: boolean }> = [
  { cx: 220, cy: 180, r: 3, delay: "0s" },
  { cx: 340, cy: 260, r: 3.5, delay: "0.6s", highlight: true },
  { cx: 170, cy: 310, r: 2.5, delay: "1.1s" },
  { cx: 290, cy: 360, r: 3, delay: "1.6s" },
  { cx: 390, cy: 200, r: 2.5, delay: "0.3s" },
];

export function RadarScope({ className }: RadarScopeProps) {
  // Center at (250, 250), rings from 60 -> 220 in 40px increments
  const cx = 250;
  const cy = 250;
  const rings = [60, 100, 140, 180, 220];

  return (
    <svg
      className={className}
      viewBox="0 0 500 500"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.08" />
          <stop offset="70%" stopColor="var(--cyan)" stopOpacity="0.02" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0" />
          <stop offset="85%" stopColor="var(--cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.55" />
        </linearGradient>

        <clipPath id="radarClip">
          <circle cx={cx} cy={cy} r="220" />
        </clipPath>
      </defs>

      {/* Ambient disk glow */}
      <circle cx={cx} cy={cy} r="220" fill="url(#radarGlow)" />

      {/* Concentric rings */}
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          stroke="var(--cyan)"
          strokeOpacity={0.18 - i * 0.02}
          strokeWidth={i === rings.length - 1 ? 1 : 0.75}
          strokeDasharray={i % 2 === 0 ? "none" : "3 4"}
        />
      ))}

      {/* Cross-hair axes */}
      <line
        x1={cx - 220}
        y1={cy}
        x2={cx + 220}
        y2={cy}
        stroke="var(--line-2)"
        strokeOpacity="0.5"
        strokeWidth="0.75"
      />
      <line
        x1={cx}
        y1={cy - 220}
        x2={cx}
        y2={cy + 220}
        stroke="var(--line-2)"
        strokeOpacity="0.5"
        strokeWidth="0.75"
      />
      {/* Diagonal minor axes */}
      <line
        x1={cx - 155}
        y1={cy - 155}
        x2={cx + 155}
        y2={cy + 155}
        stroke="var(--line)"
        strokeOpacity="0.35"
        strokeWidth="0.5"
        strokeDasharray="2 5"
      />
      <line
        x1={cx - 155}
        y1={cy + 155}
        x2={cx + 155}
        y2={cy - 155}
        stroke="var(--line)"
        strokeOpacity="0.35"
        strokeWidth="0.5"
        strokeDasharray="2 5"
      />

      {/* Bearing tick marks */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const r1 = 215;
        const r2 = i % 3 === 0 ? 205 : 211;
        return (
          <line
            key={`tick-${i}`}
            x1={cx + Math.cos(rad) * r1}
            y1={cy + Math.sin(rad) * r1}
            x2={cx + Math.cos(rad) * r2}
            y2={cy + Math.sin(rad) * r2}
            stroke="var(--cyan)"
            strokeOpacity={i % 3 === 0 ? 0.4 : 0.2}
            strokeWidth="0.75"
          />
        );
      })}

      {/* Rotating sweep wedge (90deg) */}
      <g clipPath="url(#radarClip)">
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: "radar-sweep 4s linear infinite",
          }}
        >
          <path
            d={`M ${cx} ${cy} L ${cx + 220} ${cy} A 220 220 0 0 0 ${
              cx + 220 * Math.cos(-Math.PI / 2)
            } ${cy + 220 * Math.sin(-Math.PI / 2)} Z`}
            fill="url(#sweepGradient)"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + 220}
            y2={cy}
            stroke="var(--cyan)"
            strokeOpacity="0.85"
            strokeWidth="1"
          />
        </g>
      </g>

      {/* Center focal point */}
      <circle cx={cx} cy={cy} r="3.5" fill="var(--cyan)" fillOpacity="0.9" />
      <circle
        cx={cx}
        cy={cy}
        r="7"
        stroke="var(--cyan)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />

      {/* Pulsing contact dots */}
      {contacts.map((c, i) => {
        const color = c.highlight ? "var(--accent)" : "var(--cyan)";
        return (
          <g
            key={`contact-${i}`}
            style={{
              animation: `pulse 2s ease-in-out ${c.delay} infinite`,
            }}
          >
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r + 3}
              fill={color}
              fillOpacity="0.18"
            />
            <circle cx={c.cx} cy={c.cy} r={c.r} fill={color} />
          </g>
        );
      })}

      {/* Compass bearing labels */}
      <text
        x={cx}
        y={cy - 228}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--text-3)"
        opacity="0.7"
      >
        000
      </text>
      <text
        x={cx + 236}
        y={cy + 3}
        textAnchor="start"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--text-3)"
        opacity="0.7"
      >
        090
      </text>
      <text
        x={cx}
        y={cy + 240}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--text-3)"
        opacity="0.7"
      >
        180
      </text>
      <text
        x={cx - 236}
        y={cy + 3}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--text-3)"
        opacity="0.7"
      >
        270
      </text>
    </svg>
  );
}
