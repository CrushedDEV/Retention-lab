"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
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
}: {
  videoId: string;
  initialSegments: Segment[];
  status: "NO_CAPTIONS" | "PENDING_REVIEW" | "APPROVED";
}) {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      return;
    }
    router.refresh();
  }

  async function save(approve: boolean) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/transcript`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments, approve }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    router.refresh();
  }

  function updateText(i: number, text: string) {
    setSegments((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, text } : s))
    );
  }

  if (segments.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface2 text-muted">
          <DownloadIcon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm text-muted">
          Este vídeo todavía no tiene transcripción.
        </p>
        <button onClick={extract} className="btn-primary mt-5" disabled={loading}>
          {loading ? "Extrayendo…" : "Extraer captions de YouTube"}
        </button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    );
  }

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
