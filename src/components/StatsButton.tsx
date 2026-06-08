"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartIcon } from "@/components/icons";

export function StatsButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/stats`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al obtener estadísticas");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={refresh} className="btn-secondary" disabled={loading}>
        <ChartIcon className="h-4 w-4" />
        {loading ? "Cargando…" : "Actualizar retención"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
