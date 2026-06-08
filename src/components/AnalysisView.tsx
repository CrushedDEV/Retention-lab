import type { VideoAnalysisResult } from "@/lib/ai";
import { ArrowRightIcon, AlertIcon } from "@/components/icons";

const severityCls: Record<string, string> = {
  alta: "border-danger/30 bg-danger/10 text-danger",
  media: "border-warning/30 bg-warning/10 text-warning",
  baja: "border-line bg-surface2/60 text-muted",
};

export function AnalysisView({ result }: { result: VideoAnalysisResult }) {
  const score = result.scoreOutOf10 ?? 0;
  return (
    <div className="space-y-7">
      {/* Score */}
      <div className="flex items-center gap-5">
        <ScoreRing score={score} />
        <div>
          <p className="eyebrow mb-1">Resumen de rendimiento</p>
          <p className="text-sm leading-relaxed text-ink/90">
            {result.performanceSummary}
          </p>
        </div>
      </div>

      <Section title="Evaluación del hook">
        <p className="text-sm leading-relaxed text-muted">
          {result.hookAssessment}
        </p>
      </Section>

      <Section title="Posibles caídas de retención">
        {result.retentionDrops?.length ? (
          <ul className="space-y-2.5">
            {result.retentionDrops.map((d, i) => (
              <li
                key={i}
                className="rounded-lg border border-line bg-surface2/40 p-3.5"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                    {d.approxTimestamp}
                  </span>
                  <span
                    className={`badge ${severityCls[d.severity] ?? severityCls.baja}`}
                  >
                    {d.severity}
                  </span>
                </div>
                {d.segmentText && (
                  <p className="mb-1.5 border-l-2 border-line pl-2.5 text-xs italic text-muted">
                    “{d.segmentText}”
                  </p>
                )}
                <p className="text-sm leading-relaxed text-ink/90">{d.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No se detectaron caídas significativas.
          </p>
        )}
      </Section>

      <Section title="Patrones del creador">
        <BulletList items={result.creatorPatterns} />
      </Section>

      <Section title="Recomendaciones">
        <BulletList items={result.recommendations} accent />
      </Section>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[76px] w-[76px] flex-shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth="6"
        />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold text-ink">{score}</span>
        <span className="font-mono text-[10px] text-muted">/ 10</span>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2.5 font-display text-sm font-semibold tracking-tight">
        {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items, accent }: { items?: string[]; accent?: boolean }) {
  if (!items?.length) return <p className="text-sm text-muted">Sin datos.</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/90">
          {accent ? (
            <ArrowRightIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
          ) : (
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted" />
          )}
          {it}
        </li>
      ))}
    </ul>
  );
}
