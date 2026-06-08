"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/format";
import {
  SparkIcon,
  AlertIcon,
  ClockIcon,
  CheckIcon,
  DownloadIcon,
  LogoutIcon,
} from "@/components/icons";
import type { GeneratedScriptContent } from "@/lib/ai";

interface SavedScript {
  id: string;
  title: string;
  topic: string;
  content: GeneratedScriptContent;
  createdAt: string;
}

interface ProfileOption {
  sourceKey: string;
  label: string;
}

export function GeneratorWorkspace({
  profiles,
  initialScripts,
}: {
  profiles: ProfileOption[];
  initialScripts: SavedScript[];
}) {
  const hasProfile = profiles.length > 0;
  const [sourceKey, setSourceKey] = useState<string>(
    profiles[0]?.sourceKey ?? "own"
  );
  const [scripts, setScripts] = useState<SavedScript[]>(initialScripts);
  const [activeId, setActiveId] = useState<string | null>(
    initialScripts[0]?.id ?? null
  );
  const [draft, setDraft] = useState<GeneratedScriptContent | null>(
    initialScripts[0]?.content ?? null
  );

  const [topic, setTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  function selectScript(s: SavedScript) {
    setActiveId(s.id);
    setDraft(structuredClone(s.content));
    setDirty(false);
    setError("");
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    setError("");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, sourceKey }),
    });
    const data = await res.json().catch(() => ({}));
    setGenLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error generando el guion");
      return;
    }
    const newScript: SavedScript = {
      id: data.id,
      title: data.title,
      topic,
      content: data.content,
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    setScripts((prev) => [newScript, ...prev]);
    setActiveId(newScript.id);
    setDraft(structuredClone(newScript.content));
    setDirty(false);
    setTopic("");
  }

  function patch(p: Partial<GeneratedScriptContent>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  }

  function patchSection(i: number, p: Partial<GeneratedScriptContent["sections"][number]>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: d.sections.map((s, idx) =>
              idx === i ? { ...s, ...p } : s
            ),
          }
        : d
    );
    setDirty(true);
  }

  function addSection() {
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: [
              ...d.sections,
              { heading: "Nueva sección", content: "", approxDurationSec: 30 },
            ],
          }
        : d
    );
    setDirty(true);
  }

  function removeSection(i: number) {
    setDraft((d) =>
      d ? { ...d, sections: d.sections.filter((_, idx) => idx !== i) } : d
    );
    setDirty(true);
  }

  async function saveDraft() {
    if (!activeId || !draft) return;
    setSaveLoading(true);
    setError("");
    const res = await fetch(`/api/scripts/${activeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, content: draft }),
    });
    setSaveLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setScripts((prev) =>
      prev.map((s) =>
        s.id === activeId ? { ...s, title: draft.title, content: draft } : s
      )
    );
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function deleteScript(id: string) {
    const res = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setDraft(null);
    }
  }

  function copyToClipboard() {
    if (!draft) return;
    const text = [
      draft.title,
      "",
      `HOOK: ${draft.hook}`,
      "",
      ...draft.sections.map((s) => `${s.heading}\n${s.content}`),
      "",
      `CTA: ${draft.callToAction}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Columna izquierda: generar + guardados */}
      <div className="space-y-5">
        {!hasProfile && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3.5 text-sm text-warning">
            <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Analiza algunos vídeos primero para un guion más afinado.</p>
          </div>
        )}

        <form onSubmit={generate} className="card p-5">
          {profiles.length > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-ink">
                Estilo del creador
              </label>
              <select
                className="input"
                value={sourceKey}
                onChange={(e) => setSourceKey(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.sourceKey} value={p.sourceKey}>
                    {p.sourceKey === "own" ? `${p.label} (tú)` : p.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                El guion imitará el estilo de este creador.
              </p>
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-ink">
            Nuevo guion sobre…
          </label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Ej: 5 errores al editar vídeo"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          {error && !draft && (
            <p className="mt-2 text-sm text-danger">{error}</p>
          )}
          <button
            type="submit"
            className="btn-primary mt-3 w-full"
            disabled={genLoading}
          >
            <SparkIcon className="h-4 w-4" />
            {genLoading ? "Generando…" : "Generar"}
          </button>
        </form>

        <div>
          <p className="eyebrow mb-2 px-1">Guiones guardados ({scripts.length})</p>
          <div className="space-y-1.5">
            {scripts.length === 0 && (
              <p className="px-1 text-sm text-muted">Aún no hay guiones.</p>
            )}
            {scripts.map((s) => (
              <button
                key={s.id}
                onClick={() => selectScript(s)}
                className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                  activeId === s.id
                    ? "border-accent/40 bg-accent/5"
                    : "border-line bg-surface/60 hover:border-ink/20"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {s.title || s.topic}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScript(s.id);
                  }}
                  className="flex-shrink-0 rounded p-1 text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  title="Eliminar"
                >
                  <LogoutIcon className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Columna derecha: editor del guion */}
      <div>
        {genLoading && <SkeletonScript />}

        {!genLoading && !draft && (
          <div className="card flex flex-col items-center px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <SparkIcon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm text-muted">
              Genera un guion nuevo o selecciona uno guardado para editarlo.
            </p>
          </div>
        )}

        {!genLoading && draft && (
          <div className="card p-7">
            {/* Barra de acciones */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <span className="badge border-accent/30 bg-accent/10 text-accent">
                <ClockIcon className="h-3 w-3" />~
                {formatDuration(draft.estimatedDurationSec)}
              </span>
              <div className="flex items-center gap-2">
                {savedFlash && (
                  <span className="font-mono text-xs text-success">
                    Guardado ✓
                  </span>
                )}
                <button onClick={copyToClipboard} className="btn-ghost">
                  <DownloadIcon className="h-4 w-4" />
                  Copiar
                </button>
                <button
                  onClick={saveDraft}
                  className="btn-primary"
                  disabled={saveLoading || !dirty}
                >
                  <CheckIcon className="h-4 w-4" />
                  {saveLoading
                    ? "Guardando…"
                    : dirty
                      ? "Guardar cambios"
                      : "Guardado"}
                </button>
              </div>
            </div>

            {error && draft && (
              <p className="mb-3 text-sm text-danger">{error}</p>
            )}

            {/* Título */}
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="w-full border-none bg-transparent font-display text-2xl font-bold tracking-tight text-ink outline-none"
              placeholder="Título del vídeo"
            />

            {/* Hook */}
            <EditBlock label="Hook" index="00">
              <AutoTextarea
                value={draft.hook}
                onChange={(v) => patch({ hook: v })}
              />
            </EditBlock>

            {/* Secciones */}
            {draft.sections.map((s, i) => (
              <EditBlock
                key={i}
                index={(i + 1).toString().padStart(2, "0")}
                headingInput={
                  <input
                    value={s.heading}
                    onChange={(e) => patchSection(i, { heading: e.target.value })}
                    className="w-full border-none bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted outline-none"
                  />
                }
                onRemove={() => removeSection(i)}
              >
                <AutoTextarea
                  value={s.content}
                  onChange={(v) => patchSection(i, { content: v })}
                />
              </EditBlock>
            ))}

            <button
              onClick={addSection}
              className="btn-ghost mb-4 ml-11 text-xs"
            >
              + Añadir sección
            </button>

            {/* CTA */}
            <EditBlock label="Cierre · CTA" index="→">
              <AutoTextarea
                value={draft.callToAction}
                onChange={(v) => patch({ callToAction: v })}
              />
            </EditBlock>

            {/* Notas */}
            {draft.notesForCreator?.length > 0 && (
              <div className="mt-6 rounded-lg border border-line bg-surface2/40 p-4">
                <p className="eyebrow mb-2">Notas de dirección</p>
                <ul className="space-y-1.5">
                  {draft.notesForCreator.map((n, i) => (
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
    </div>
  );
}

function EditBlock({
  label,
  index,
  children,
  headingInput,
  onRemove,
}: {
  label?: string;
  index: string;
  children: React.ReactNode;
  headingInput?: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="mb-4 flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 font-mono text-xs font-semibold text-accent">
          {index}
        </span>
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="flex-1 pb-1">
        <div className="mb-1 flex items-center gap-2">
          {headingInput ?? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {label}
            </p>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-muted hover:text-danger"
              title="Quitar sección"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={Math.max(2, Math.ceil((value.length || 1) / 70))}
      className="w-full resize-none rounded-md border border-transparent bg-transparent text-sm leading-relaxed text-ink/90 outline-none transition hover:border-line focus:border-accent/50 focus:bg-surface2/40 focus:px-2 focus:py-1.5"
    />
  );
}

function SkeletonScript() {
  return (
    <div className="card space-y-4 p-7">
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
