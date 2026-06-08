"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/format";
import { SparkIcon, AlertIcon, ClockIcon } from "@/components/icons";
import type { GeneratedScriptContent } from "@/lib/ai";

export function GeneratorForm({ hasProfile }: { hasProfile: boolean }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [script, setScript] = useState<GeneratedScriptContent | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setScript(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error generando el guion");
      return;
    }
    setScript(data.content as GeneratedScriptContent);
  }

  return (
    <div>
      {!hasProfile && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3.5 text-sm text-warning">
          <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Aún no tienes un perfil de creador. El guion saldrá mucho mejor
            cuando analices algunos vídeos primero.
          </p>
        </div>
      )}

      <form onSubmit={generate} className="card p-6">
        <label className="mb-2 block text-sm font-medium text-ink">
          ¿Sobre qué quieres el guion?
        </label>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Ej: 5 errores que cometen los principiantes al editar vídeo"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary mt-4" disabled={loading}>
          <SparkIcon className="h-4 w-4" />
          {loading ? "Generando guion…" : "Generar guion"}
        </button>
      </form>

      {loading && <SkeletonScript />}

      {script && (
        <div className="card mt-6 animate-fade-up p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-bold leading-tight tracking-tight">
              {script.title}
            </h2>
            <span className="badge border-accent/30 bg-accent/10 text-accent">
              <ClockIcon className="h-3 w-3" />~
              {formatDuration(script.estimatedDurationSec)}
            </span>
          </div>

          <Block label="Hook" index="00">
            <p className="text-sm leading-relaxed text-ink/90">{script.hook}</p>
          </Block>

          {script.sections?.map((s, i) => (
            <Block
              key={i}
              index={(i + 1).toString().padStart(2, "0")}
              label={`${s.heading} · ~${formatDuration(s.approxDurationSec)}`}
            >
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">
                {s.content}
              </p>
            </Block>
          ))}

          <Block label="Cierre · CTA" index="→">
            <p className="text-sm leading-relaxed text-ink/90">
              {script.callToAction}
            </p>
          </Block>

          {script.notesForCreator?.length > 0 && (
            <div className="mt-6 rounded-lg border border-line bg-surface2/40 p-4">
              <p className="eyebrow mb-2">Notas de dirección</p>
              <ul className="space-y-1.5">
                {script.notesForCreator.map((n, i) => (
                  <li key={i} className="text-sm text-muted">
                    — {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  index,
  children,
}: {
  label: string;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 font-mono text-xs font-semibold text-accent">
          {index}
        </span>
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="flex-1 pb-1">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

function SkeletonScript() {
  return (
    <div className="card mt-6 space-y-4 p-7">
      <div className="h-7 w-2/3 animate-pulse rounded bg-surface2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-surface2" />
          <div className="h-3 w-full animate-pulse rounded bg-surface2" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-surface2" />
        </div>
      ))}
    </div>
  );
}
