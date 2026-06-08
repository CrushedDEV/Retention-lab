"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon } from "@/components/icons";

export function ImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleImport() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/youtube/import", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setMsg(data.error ?? "Error al importar");
      return;
    }
    setMsg(`Importados ${data.imported} vídeos`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="font-mono text-xs text-muted">{msg}</span>}
      <button onClick={handleImport} className="btn-primary" disabled={loading}>
        <DownloadIcon className="h-4 w-4" />
        {loading ? "Importando…" : "Importar de YouTube"}
      </button>
    </div>
  );
}
