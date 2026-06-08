"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UsersIcon, CheckIcon, SettingsIcon } from "@/components/icons";
import type { CreatorProfileData } from "@/lib/ai";

export function ProfileCard({
  id,
  label,
  isOwn,
  analysesCount,
  data,
}: {
  id: string;
  label: string;
  isOwn: boolean;
  analysesCount: number;
  data: CreatorProfileData;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftLabel, setDraftLabel] = useState(label);
  const [draft, setDraft] = useState<CreatorProfileData>(data);

  function reset() {
    setDraft(data);
    setDraftLabel(label);
    setEditing(false);
    setError("");
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: draftLabel, data: draft }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al guardar");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        `¿Borrar la memoria de "${label}"? Se reconstruirá automáticamente cuando analices más vídeos de este creador.`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface2/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            {editing ? (
              <input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                className="input py-1 text-sm"
              />
            ) : (
              <p className="font-display font-semibold text-ink">
                {label}
                {isOwn && (
                  <span className="ml-1 align-middle text-xs text-accent">
                    (tú)
                  </span>
                )}
              </p>
            )}
            <p className="font-mono text-[11px] text-muted">
              {analysesCount} análisis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={reset} className="btn-ghost" disabled={busy}>
                Cancelar
              </button>
              <button onClick={save} className="btn-primary" disabled={busy}>
                <CheckIcon className="h-4 w-4" />
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary"
              >
                <SettingsIcon className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={remove}
                className="btn-ghost text-danger hover:bg-danger/10"
                disabled={busy}
              >
                Borrar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        {editing ? (
          <div className="space-y-4">
            <Field label="Resumen / identidad">
              <textarea
                className="textarea"
                rows={2}
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Estilo de hooks">
                <textarea
                  className="textarea"
                  rows={2}
                  value={draft.hookStyle}
                  onChange={(e) =>
                    setDraft({ ...draft, hookStyle: e.target.value })
                  }
                />
              </Field>
              <Field label="Tono y escritura">
                <textarea
                  className="textarea"
                  rows={2}
                  value={draft.writingTone}
                  onChange={(e) =>
                    setDraft({ ...draft, writingTone: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Duración media de éxito (minutos)">
              <input
                type="number"
                min={0}
                className="input"
                value={Math.round((draft.avgSuccessfulDurationSec ?? 0) / 60)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    avgSuccessfulDurationSec:
                      (parseInt(e.target.value) || 0) * 60,
                  })
                }
              />
            </Field>
            <ListEditor
              label="Estructuras narrativas"
              items={draft.narrativeStructures ?? []}
              onChange={(narrativeStructures) =>
                setDraft({ ...draft, narrativeStructures })
              }
            />
            <ListEditor
              label="Patrones de retención"
              items={draft.retentionPatterns ?? []}
              onChange={(retentionPatterns) =>
                setDraft({ ...draft, retentionPatterns })
              }
            />
            <ListEditor
              label="A evitar (anti-patrones)"
              items={draft.avoidPatterns ?? []}
              onChange={(avoidPatterns) =>
                setDraft({ ...draft, avoidPatterns })
              }
            />
          </div>
        ) : (
          <>
            <p className="font-display text-base leading-snug text-ink">
              {data.summary}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <View label="Estilo de hooks" value={data.hookStyle} />
              <View
                label="Duración media de éxito"
                value={`${Math.round((data.avgSuccessfulDurationSec ?? 0) / 60)} min`}
              />
              <View label="Tono y escritura" value={data.writingTone} />
              <ViewList
                label="Estructuras narrativas"
                items={data.narrativeStructures}
              />
              <ViewList
                label="Patrones de retención"
                items={data.retentionPatterns}
              />
              <ViewList label="A evitar" items={data.avoidPatterns} danger />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input py-1.5 text-sm"
              value={it}
              onChange={(e) =>
                onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
              }
            />
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="btn-ghost flex-shrink-0 px-2 text-danger"
              title="Quitar"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ""])}
          className="btn-ghost text-xs"
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}

function View({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/90">{value || "—"}</p>
    </div>
  );
}

function ViewList({
  label,
  items,
  danger,
}: {
  label: string;
  items?: string[];
  danger?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <ul className="mt-1 space-y-1.5">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/90">
            <span
              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                danger ? "bg-danger/70" : "bg-accent/60"
              }`}
            />
            {it}
          </li>
        ))}
        {(!items || items.length === 0) && (
          <li className="text-sm text-muted">—</li>
        )}
      </ul>
    </div>
  );
}
