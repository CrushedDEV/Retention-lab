"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, PlusIcon, CheckIcon } from "@/components/icons";

interface Result {
  youtubeId: string;
  title: string;
  channelTitle: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
}

export function ExploreSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [added, setAdded] = useState<Record<string, "loading" | "done">>({});

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error en la búsqueda");
      return;
    }
    setResults(data.results ?? []);
  }

  async function add(r: Result) {
    setAdded((a) => ({ ...a, [r.youtubeId]: "loading" }));
    const res = await fetch("/api/youtube/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIdOrUrl: r.youtubeId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAdded((a) => ({ ...a, [r.youtubeId]: undefined as any }));
      setError(data.error ?? "No se pudo añadir");
      return;
    }
    setAdded((a) => ({ ...a, [r.youtubeId]: "done" }));
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Busca por tema, creador… o pega una URL de YouTube"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((r) => {
          const state = added[r.youtubeId];
          return (
            <div key={r.youtubeId} className="card flex gap-3 p-3">
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbnail}
                  alt=""
                  className="h-[68px] w-[120px] flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-[68px] w-[120px] flex-shrink-0 rounded-lg bg-surface2" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="line-clamp-2 text-sm font-medium text-ink">
                  {r.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {r.channelTitle}
                </p>
                <div className="mt-auto pt-2">
                  <button
                    onClick={() => add(r)}
                    disabled={state === "loading" || state === "done"}
                    className={state === "done" ? "btn-secondary" : "btn-primary"}
                  >
                    {state === "done" ? (
                      <>
                        <CheckIcon className="h-4 w-4" /> Añadido
                      </>
                    ) : state === "loading" ? (
                      "Añadiendo…"
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" /> Analizar este vídeo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
