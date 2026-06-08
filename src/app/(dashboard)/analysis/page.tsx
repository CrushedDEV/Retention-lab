import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorProfiles } from "@/lib/creator-profile";
import { formatNumber, formatDate } from "@/lib/format";
import { ChartIcon, ArrowRightIcon } from "@/components/icons";
import { ProfileCard } from "@/components/ProfileCard";
import type { VideoAnalysisResult } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [analyses, profiles] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { createdAt: "desc" },
    }),
    getCreatorProfiles(userId),
  ]);

  return (
    <div>
      <p className="eyebrow mb-2">Workspace · Análisis</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Inteligencia del creador
      </h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Cada perfil aprende automáticamente de los análisis (lo que funciona) y
        registra los errores a evitar.
      </p>

      {/* Perfiles */}
      <div className="mt-8 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Perfiles de creador ({profiles.length})
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      {profiles.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ChartIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted">
            Los perfiles se construirán automáticamente cuando analices vídeos
            (tuyos o de otros creadores).
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {profiles.map((p) => (
            <ProfileCard
              key={p.sourceKey}
              id={p.id}
              label={p.label}
              isOwn={p.sourceKey === "own"}
              analysesCount={p.analysesCount}
              data={p.data}
            />
          ))}
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
                    {a.video.isExternal && a.video.channelTitle
                      ? `${a.video.channelTitle} · `
                      : ""}
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

