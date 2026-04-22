interface FlightPathProps {
  className?: string;
}

export function FlightPath({ className }: FlightPathProps) {
  // 3 curved great-circle-style arcs + amber waypoints
  const arcs = [
    {
      d: "M 60 520 Q 480 120, 1180 360",
      dash: "6 8",
      delay: "0s",
      opacity: 0.55,
    },
    {
      d: "M 20 200 Q 540 560, 1220 180",
      dash: "4 10",
      delay: "1.2s",
      opacity: 0.4,
    },
    {
      d: "M 140 720 Q 700 300, 1240 640",
      dash: "8 6",
      delay: "2.3s",
      opacity: 0.3,
    },
  ];

  const waypoints = [
    { cx: 60, cy: 520, label: "ALPHA" },
    { cx: 480, cy: 260, label: "BRAVO" },
    { cx: 1180, cy: 360, label: "CHARLIE" },
    { cx: 20, cy: 200 },
    { cx: 1220, cy: 180 },
    { cx: 700, cy: 420 },
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 1280 800"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        {/* Per-arc gradient so arcs feel like trajectories with a "head" */}
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
          <stop offset="45%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="waypointGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {arcs.map((arc, i) => (
        <g key={`arc-${i}`} opacity={arc.opacity}>
          {/* Soft under-trace */}
          <path
            d={arc.d}
            stroke="var(--accent)"
            strokeOpacity="0.08"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Dashed flight line with animated offset */}
          <path
            d={arc.d}
            stroke="url(#arcGradient)"
            strokeWidth="1.5"
            strokeDasharray={arc.dash}
            strokeLinecap="round"
            style={{
              animation: `aeroscope-dash 14s linear ${arc.delay} infinite`,
            }}
          />
        </g>
      ))}

      {/* Waypoint dots (amber) */}
      {waypoints.map((w, i) => (
        <g key={`wp-${i}`}>
          <circle cx={w.cx} cy={w.cy} r="14" fill="url(#waypointGlow)" />
          <circle
            cx={w.cx}
            cy={w.cy}
            r="3.5"
            fill="var(--accent)"
            style={{
              animation: `pulse 2.4s ease-in-out ${i * 0.35}s infinite`,
            }}
          />
          <circle
            cx={w.cx}
            cy={w.cy}
            r="7"
            stroke="var(--accent)"
            strokeOpacity="0.4"
            strokeWidth="0.75"
            fill="none"
          />
          {w.label && (
            <text
              x={w.cx + 12}
              y={w.cy - 10}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--accent)"
              opacity="0.7"
              letterSpacing="0.1em"
            >
              {w.label}
            </text>
          )}
        </g>
      ))}

      {/* Tiny jet silhouette on the primary arc (generic, non-branded) */}
      <g
        transform="translate(760, 250) rotate(-18)"
        style={{
          animation: "pulse 3s ease-in-out infinite",
        }}
      >
        <path
          d="M -10 0 L 10 0 L 14 -1.2 L 10 0 L 10 3 L 4 3 L 2 7 L 0 7 L 2 3 L -8 3 L -10 5 L -12 3 L -10 0 Z"
          fill="var(--accent)"
          fillOpacity="0.85"
        />
      </g>

      <style>{`
        @keyframes aeroscope-dash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -280; }
        }
      `}</style>
    </svg>
  );
}
