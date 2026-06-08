import { formatDuration } from "@/lib/format";

interface Point {
  t: number;
  watchRatio: number;
}

export function RetentionChart({
  curve,
  durationSec,
}: {
  curve: Point[];
  durationSec: number;
}) {
  if (!curve || curve.length < 2) return null;

  const W = 560;
  const H = 160;
  const pad = { top: 12, right: 12, bottom: 22, left: 30 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const maxRatio = Math.max(1, ...curve.map((p) => p.watchRatio));
  const x = (t: number) =>
    pad.left + (durationSec > 0 ? t / durationSec : 0) * innerW;
  const y = (r: number) => pad.top + (1 - r / maxRatio) * innerH;

  const line = curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(1)} ${y(p.watchRatio).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(curve[curve.length - 1].t).toFixed(1)} ${
    pad.top + innerH
  } L ${x(curve[0].t).toFixed(1)} ${pad.top + innerH} Z`;

  // Línea de referencia al 100%
  const baseY = y(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 100% ref */}
      <line
        x1={pad.left}
        y1={baseY}
        x2={W - pad.right}
        y2={baseY}
        stroke="rgb(var(--border))"
        strokeDasharray="3 3"
      />
      <text x={2} y={baseY + 3} className="fill-muted" fontSize="9">
        100%
      </text>

      <path d={area} fill="url(#retFill)" />
      <path
        d={line}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Ejes de tiempo */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text
          key={f}
          x={pad.left + f * innerW}
          y={H - 6}
          textAnchor="middle"
          className="fill-muted"
          fontSize="9"
        >
          {formatDuration(Math.round(f * durationSec))}
        </text>
      ))}
    </svg>
  );
}
