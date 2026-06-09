"use client";

import { useState } from "react";
import { VideoIcon, ChartIcon, SparkIcon } from "@/components/icons";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  tokens: number;
  createdAt: string;
  counts: { videos: number; analyses: number; scripts: number };
}

export function AdminUsers({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function patch(id: string, body: Record<string, number>) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Error al actualizar");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, tokens: data.tokens } : u))
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-line bg-surface2/40 px-5 py-3 text-[11px] uppercase tracking-wider text-muted sm:grid">
          <span>Cuenta</span>
          <span className="text-center">Actividad</span>
          <span className="text-right">Tokens</span>
        </div>

        <div className="divide-y divide-line/60">
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4"
            >
              {/* Cuenta */}
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {u.name ?? "—"}
                </p>
                <p className="truncate font-mono text-xs text-muted">
                  {u.email}
                </p>
              </div>

              {/* Actividad */}
              <div className="flex gap-3 font-mono text-[11px] text-muted sm:justify-center">
                <span className="inline-flex items-center gap-1" title="Vídeos">
                  <VideoIcon className="h-3.5 w-3.5" /> {u.counts.videos}
                </span>
                <span className="inline-flex items-center gap-1" title="Análisis">
                  <ChartIcon className="h-3.5 w-3.5" /> {u.counts.analyses}
                </span>
                <span className="inline-flex items-center gap-1" title="Guiones">
                  <SparkIcon className="h-3.5 w-3.5" /> {u.counts.scripts}
                </span>
              </div>

              {/* Tokens + controles */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span
                  className={`mr-1 font-mono text-lg font-bold ${
                    u.tokens <= 10 ? "text-danger" : "text-accent"
                  }`}
                >
                  {u.tokens}
                </span>
                <div className="flex gap-1">
                  {[-50, -10, +10, +50].map((d) => (
                    <button
                      key={d}
                      onClick={() => patch(u.id, { delta: d })}
                      disabled={busyId === u.id}
                      className="btn-secondary px-2 py-1 text-xs"
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
                <SetTokens
                  current={u.tokens}
                  disabled={busyId === u.id}
                  onSet={(v) => patch(u.id, { setTokens: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetTokens({
  current,
  onSet,
  disabled,
}: {
  current: number;
  onSet: (v: number) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState(String(current));
  return (
    <div className="flex gap-1">
      <input
        type="number"
        min={0}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="input w-20 px-2 py-1 text-sm"
      />
      <button
        onClick={() => onSet(parseInt(val) || 0)}
        disabled={disabled}
        className="btn-primary px-3 py-1 text-xs"
      >
        Fijar
      </button>
    </div>
  );
}
