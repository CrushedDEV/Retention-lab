"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SparkIcon } from "@/components/icons";
import { TOKEN_COSTS } from "@/lib/token-costs";

export function AnalyzeButton({
  videoId,
  hasTranscript,
  alreadyAnalyzed,
}: {
  videoId: string;
  hasTranscript: boolean;
  alreadyAnalyzed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/analyze`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error durante el análisis");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={analyze}
        className="btn-primary"
        disabled={loading || !hasTranscript}
        title={!hasTranscript ? "Necesitas una transcripción primero" : ""}
      >
        <SparkIcon className="h-4 w-4" />
        {loading
          ? "Analizando con IA…"
          : alreadyAnalyzed
            ? `Re-analizar (${TOKEN_COSTS.analyze})`
            : `Analizar vídeo (${TOKEN_COSTS.analyze})`}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!hasTranscript && (
        <p className="font-mono text-[11px] text-muted">
          Extrae la transcripción primero
        </p>
      )}
    </div>
  );
}
