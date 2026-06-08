"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { parsePastedTranscript } from "@/lib/transcript-parse";
import { DownloadIcon, CheckIcon } from "@/components/icons";

interface Segment {
  startTime: number;
  endTime: number;
  text: string;
}

export function TranscriptEditor({
  videoId,
  initialSegments,
  status,
  durationSec,
}: {
  videoId: string;
  initialSegments: Segment[];
  status: "NO_CAPTIONS" | "PENDING_REVIEW" | "APPROVED";
  durationSec: number;
}) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [pasted, setPasted] = useState("");

  async function extract() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/transcript`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudieron extraer las captions");
      setShowManual(true); // ofrece el respaldo manual
      return;
    }
    router.refresh();
  }

  async function save(approve: boolean, segs: Segment[] = segments) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/transcript`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: segs, approve }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    router.refresh();
  }

  function loadManual() {
    const parsed = parsePastedTranscript(pasted, durationSec);
    if (parsed.length === 0) {
      setError("No se pudo interpretar el texto pegado.");
      return;
    }
    setSegments(parsed);
    save(false, parsed);
  }

  function updateText(i: number, text: string) {
    setSegments((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, text } : s))
    );
  }

  // ---- Estado vacío: extraer automático o pegar manual ----
  if (segments.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface2 text-muted">
            <DownloadIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted">
            Extrae la transcripción automáticamente o pégala a mano.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              onClick={extract}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Extrayendo…" : "Extraer automáticamente"}
            </button>
            <button
              onClick={() => setShowManual((v) => !v)}
              className="btn-secondary"
              disabled={loading}
            >
              Pegar manualmente
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        {showManual && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow mb-2">Pegado manual</p>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Abre tu vídeo en YouTube → «...» → «Mostrar transcripción» →
              copia y pega aquí. Detectamos los timestamps automáticamente; si
              no los hay, los repartimos por la duración del vídeo.
            </p>
            <textarea
              className="textarea font-mono text-xs"
              rows={8}
              placeholder={"0:00 Hola, en este vídeo...\n0:08 Lo primero que..."}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <button
              onClick={loadManual}
              className="btn-primary mt-3"
              disabled={loading || pasted.trim().length === 0}
            >
              {loading ? "Cargando…" : "Cargar transcripción"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- Editor de segmentos ----
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs text-muted">
          {segments.length} segmentos ·{" "}
          {status === "APPROVED" ? "aprobada" : "pendiente"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            className="btn-secondary"
            disabled={loading}
          >
            Guardar
          </button>
          <button
            onClick={() => save(true)}
            className="btn-primary"
            disabled={loading}
          >
            <CheckIcon className="h-4 w-4" />
            Aprobar
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <div className="card max-h-[520px] divide-y divide-line/60 overflow-y-auto">
        {segments.map((s, i) => (
          <div
            key={i}
            className="flex gap-3 p-3 transition-colors hover:bg-surface2/40"
          >
            <span className="mt-2 w-12 flex-shrink-0 font-mono text-[11px] text-accent/70">
              {formatDuration(s.startTime)}
            </span>
            <textarea
              value={s.text}
              onChange={(e) => updateText(i, e.target.value)}
              rows={Math.max(1, Math.ceil(s.text.length / 60))}
              className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed text-ink outline-none transition hover:border-line focus:border-accent/50 focus:bg-surface2/50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
