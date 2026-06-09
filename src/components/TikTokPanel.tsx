"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/format";
import {
  EyeIcon,
  HeartIcon,
  ChatIcon,
  ExternalIcon,
  SearchIcon,
} from "@/components/icons";

interface TikTokStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  url: string | null;
}

interface TikTokListVideo {
  id: string;
  title: string;
  views: number;
  cover: string | null;
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  let common = 0;
  wa.forEach((w) => {
    if (wb.has(w)) common++;
  });
  return common;
}

export function TikTokPanel({
  videoId,
  videoTitle,
  connected,
  initialStats,
}: {
  videoId: string;
  videoTitle: string;
  connected: boolean;
  initialStats: TikTokStats | null;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<TikTokStats | null>(initialStats);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState<TikTokListVideo[] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  async function link(body: { tiktokUrl?: string; tiktokVideoId?: string }) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/tiktok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al enlazar");
      return;
    }
    setStats(data.tiktok);
    setList(null);
    router.refresh();
  }

  async function loadList() {
    setListLoading(true);
    setError("");
    const res = await fetch("/api/tiktok/videos");
    const data = await res.json().catch(() => ({}));
    setListLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al cargar tus vídeos de TikTok");
      return;
    }
    const videos: TikTokListVideo[] = data.videos ?? [];
    // Auto-sugerencia: ordena por parecido del título con el vídeo de YouTube.
    videos.sort((a, b) => similarity(b.title, videoTitle) - similarity(a.title, videoTitle));
    setList(videos);
  }

  async function unlink() {
    if (!confirm("¿Desvincular este vídeo de TikTok?")) return;
    setLoading(true);
    await fetch(`/api/videos/${videoId}/tiktok`, { method: "DELETE" });
    setLoading(false);
    setStats(null);
    router.refresh();
  }

  const header = (
    <div className="mb-4 flex items-center gap-2">
      <TikTokGlyph className="h-5 w-5 text-ink" />
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Rendimiento en TikTok
      </h2>
    </div>
  );

  if (!connected) {
    return (
      <div className="card p-6">
        {header}
        <p className="text-sm text-muted">
          Conecta tu cuenta de TikTok en{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Ajustes
          </Link>{" "}
          para traer las estadísticas de la versión de este vídeo en TikTok.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {header}

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={<EyeIcon className="h-4 w-4" />} label="Views" value={stats.views} />
            <Stat icon={<HeartIcon className="h-4 w-4" />} label="Likes" value={stats.likes} />
            <Stat icon={<ChatIcon className="h-4 w-4" />} label="Comentarios" value={stats.comments} />
            <Stat icon={<ExternalIcon className="h-4 w-4" />} label="Compartidos" value={stats.shares} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            {stats.url && (
              <a
                href={stats.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                Ver en TikTok ↗
              </a>
            )}
            <button
              onClick={() => link({ tiktokVideoId: undefined, tiktokUrl: stats.url ?? undefined })}
              className="btn-ghost text-xs"
              disabled={loading}
            >
              Actualizar
            </button>
            <button onClick={unlink} className="btn-ghost text-xs text-danger" disabled={loading}>
              Desvincular
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Enlaza la versión de este vídeo en tu TikTok para ver y comparar sus
            estadísticas.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Pega la URL de TikTok…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              onClick={() => link({ tiktokUrl: url })}
              className="btn-primary"
              disabled={loading || url.trim().length === 0}
            >
              Enlazar
            </button>
          </div>

          <button
            onClick={loadList}
            className="btn-secondary mt-3"
            disabled={listLoading}
          >
            <SearchIcon className="h-4 w-4" />
            {listLoading ? "Cargando…" : "Elegir de mis vídeos de TikTok"}
          </button>

          {list && (
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {list.length === 0 && (
                <p className="text-sm text-muted">No se encontraron vídeos.</p>
              )}
              {list.map((v) => (
                <button
                  key={v.id}
                  onClick={() => link({ tiktokVideoId: v.id })}
                  disabled={loading}
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface/60 p-2 text-left hover:border-accent/40"
                >
                  {v.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover} alt="" className="h-12 w-9 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 flex-shrink-0 rounded bg-surface2" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {v.title}
                  </span>
                  <span className="flex-shrink-0 font-mono text-xs text-muted">
                    {formatNumber(v.views)} views
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-mono text-lg font-semibold text-ink">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function TikTokGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.5c-1.3 0-2.5-.4-3.5-1v6.1a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.6a3 3 0 1 0 2.1 2.8V3h2.5Z" />
    </svg>
  );
}
