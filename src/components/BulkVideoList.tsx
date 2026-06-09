"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisBadge, TranscriptBadge } from "@/components/StatusBadges";
import { formatNumber, formatDate, formatDuration } from "@/lib/format";
import { EyeIcon, HeartIcon, VideoIcon, SparkIcon, CheckIcon } from "@/components/icons";

type TStatus = "NO_CAPTIONS" | "PENDING_REVIEW" | "APPROVED";
type AStatus = "NOT_ANALYZED" | "ANALYZING" | "ANALYZED";

export interface VideoRow {
  id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  likes: number;
  durationSec: number;
  publishedAt: string | null;
  transcriptStatus: TStatus;
  analysisStatus: AStatus;
}

type RowState =
  | "idle"
  | "transcribing"
  | "analyzing"
  | "done"
  | "no-transcript"
  | "error";

const stateLabel: Record<RowState, string> = {
  idle: "",
  transcribing: "Transcribiendo…",
  analyzing: "Analizando…",
  done: "Listo ✓",
  "no-transcript": "Sin transcripción auto — hazla a mano",
  error: "Error",
};

export function BulkVideoList({ videos }: { videos: VideoRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [notice, setNotice] = useState("");

  function toggle(id: string) {
    if (running) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(videos.map((v) => v.id)));
  }
  function selectUnanalyzed() {
    setSelected(
      new Set(videos.filter((v) => v.analysisStatus !== "ANALYZED").map((v) => v.id))
    );
  }
  function clearSel() {
    setSelected(new Set());
  }

  async function runBulk() {
    const ids = videos.filter((v) => selected.has(v.id)).map((v) => v.id);
    if (ids.length === 0) return;
    setRunning(true);
    setNotice("");
    setProgress({ done: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const v = videos.find((x) => x.id === id)!;
      try {
        // 1) Asegura transcripción (no consume tokens)
        if (v.transcriptStatus === "NO_CAPTIONS") {
          setStates((s) => ({ ...s, [id]: "transcribing" }));
          const r = await fetch(`/api/videos/${id}/transcript`, {
            method: "POST",
          });
          if (!r.ok) {
            setStates((s) => ({ ...s, [id]: "no-transcript" }));
            setProgress((p) => ({ ...p, done: i + 1 }));
            continue;
          }
        }
        // 2) Analiza (consume tokens)
        setStates((s) => ({ ...s, [id]: "analyzing" }));
        const a = await fetch(`/api/videos/${id}/analyze`, { method: "POST" });
        if (a.status === 402) {
          // Sin tokens: detiene el lote.
          const d = await a.json().catch(() => ({}));
          setStates((s) => ({ ...s, [id]: "idle" }));
          setNotice(d.error ?? "Te has quedado sin tokens.");
          break;
        }
        setStates((s) => ({ ...s, [id]: a.ok ? "done" : "error" }));
      } catch {
        setStates((s) => ({ ...s, [id]: "error" }));
      }
      setProgress((p) => ({ ...p, done: i + 1 }));
    }

    setRunning(false);
    router.refresh();
  }

  const selectedCount = selected.size;

  return (
    <div>
      {/* Barra de acciones en lote */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/60 p-3">
        <button onClick={selectAll} className="btn-ghost text-xs" disabled={running}>
          Seleccionar todos
        </button>
        <button onClick={selectUnanalyzed} className="btn-ghost text-xs" disabled={running}>
          Solo sin analizar
        </button>
        {selectedCount > 0 && (
          <button onClick={clearSel} className="btn-ghost text-xs" disabled={running}>
            Limpiar ({selectedCount})
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {running && (
            <span className="font-mono text-xs text-muted">
              {progress.done}/{progress.total}
            </span>
          )}
          <button
            onClick={runBulk}
            className="btn-primary"
            disabled={running || selectedCount === 0}
          >
            <SparkIcon className="h-4 w-4" />
            {running
              ? "Procesando…"
              : `Transcribir y analizar (${selectedCount})`}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {notice}
        </div>
      )}

      <div className="space-y-3">
        {videos.map((v) => {
          const st = states[v.id] ?? "idle";
          const checked = selected.has(v.id);
          return (
            <div
              key={v.id}
              className={`card flex items-center gap-4 p-4 transition-all ${
                checked ? "border-accent/50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(v.id)}
                disabled={running}
                className="h-4 w-4 flex-shrink-0 accent-[rgb(var(--accent))]"
              />

              <Link
                href={`/videos/${v.id}`}
                className="group flex min-w-0 flex-1 items-center gap-4"
              >
                <div className="relative h-[60px] w-[106px] flex-shrink-0 overflow-hidden rounded-lg bg-surface2">
                  {v.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <VideoIcon className="h-5 w-5" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[10px] text-white">
                    {formatDuration(v.durationSec)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink transition-colors group-hover:text-accent">
                    {v.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                    <span>{formatDate(v.publishedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" /> {formatNumber(v.views)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <HeartIcon className="h-3.5 w-3.5" /> {formatNumber(v.likes)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TranscriptBadge status={v.transcriptStatus} />
                    <AnalysisBadge status={v.analysisStatus} />
                  </div>
                </div>
              </Link>

              {/* Estado del proceso en lote */}
              {st !== "idle" && (
                <span
                  className={`flex-shrink-0 font-mono text-xs ${
                    st === "done"
                      ? "text-success"
                      : st === "error" || st === "no-transcript"
                        ? "text-danger"
                        : "text-warning"
                  }`}
                >
                  {st === "done" && <CheckIcon className="mr-1 inline h-3.5 w-3.5" />}
                  {stateLabel[st]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
