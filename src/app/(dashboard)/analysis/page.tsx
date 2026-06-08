import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorProfile } from "@/lib/creator-profile";
import { formatNumber, formatDate } from "@/lib/format";
import { ChartIcon, ArrowRightIcon } from "@/components/icons";
import type { VideoAnalysisResult } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [analyses, profile] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { createdAt: "desc" },
    }),
    getCreatorProfile(userId),
  ]);

  return (
    <div>
      <p className="eyebrow mb-2">Workspace · Análisis</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Inteligencia del creador
      </h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        El perfil aprende automáticamente de cada análisis y guía tus guiones.
      </p>

      {/* Perfil */}
      <div className="mt-8 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Tu perfil de creador
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      {profile ? (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-line bg-surface2/40 p-6">
            <p className="eyebrow mb-2">Identidad</p>
            <p className="font-display text-lg leading-snug text-ink">
              {profile.summary}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
            <ProfileItem label="Estilo de hooks" value={profile.hookStyle} />
            <ProfileItem
              label="Duración media de éxito"
              value={`${Math.round((profile.avgSuccessfulDurationSec ?? 0) / 60)} min`}
            />
            <ProfileItem label="Tono y escritura" value={profile.writingTone} />
            <ProfileList
              label="Estructuras narrativas"
              items={profile.narrativeStructures}
            />
            <ProfileList
              label="Patrones de retención"
              items={profile.retentionPatterns}
            />
            <ProfileList
              label="A evitar (anti-patrones)"
              items={profile.avoidPatterns}
              danger
            />
          </div>
        </div>
      ) : (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ChartIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted">
            Tu perfil se construirá automáticamente cuando analices tus primeros
            vídeos.
          </p>
        </div>
      )}

      {/* Lista de análisis */}
      <div className="mt-10 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Vídeos analizados
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      {analyses.length === 0 ? (
        <div className="card mt-4 p-6 text-sm text-muted">
          Todavía no has analizado ningún vídeo.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {analyses.map((a) => {
            const r = a.result as unknown as VideoAnalysisResult;
            return (
              <Link
                key={a.id}
                href={`/videos/${a.videoId}`}
                className="card group flex items-center gap-4 p-4 transition-all hover:border-accent/40"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 font-mono text-sm font-semibold text-accent">
                  {r.scoreOutOf10}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink group-hover:text-accent">
                    {a.video.title}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {r.performanceSummary}
                  </p>
                </div>
                <div className="hidden flex-shrink-0 text-right font-mono text-[11px] text-muted sm:block">
                  <p>{formatNumber(a.video.views)} vistas</p>
                  <p>{formatDate(a.createdAt)}</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-muted transition-all group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink/90">{value || "—"}</p>
    </div>
  );
}

function ProfileList({
  label,
  items,
  danger,
}: {
  label: string;
  items?: string[];
  danger?: boolean;
}) {
  return (
    <div className="bg-surface p-5">
      <p className="eyebrow">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {(items ?? []).map((it, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed text-ink/90"
          >
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
