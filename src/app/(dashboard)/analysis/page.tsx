import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorProfiles } from "@/lib/creator-profile";
import { formatNumber, formatDate } from "@/lib/format";
import { ChartIcon, ArrowRightIcon, UsersIcon } from "@/components/icons";
import type { VideoAnalysisResult, CreatorProfileData } from "@/lib/ai";

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

function ProfileCard({
  label,
  isOwn,
  analysesCount,
  data,
}: {
  label: string;
  isOwn: boolean;
  analysesCount: number;
  data: CreatorProfileData;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface2/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-semibold text-ink">
              {label}{" "}
              {isOwn && (
                <span className="ml-1 align-middle text-xs text-accent">(tú)</span>
              )}
            </p>
            <p className="font-mono text-[11px] text-muted">
              {analysesCount} análisis
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="font-display text-base leading-snug text-ink">
          {data.summary}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Item label="Estilo de hooks" value={data.hookStyle} />
          <Item
            label="Duración media de éxito"
            value={`${Math.round((data.avgSuccessfulDurationSec ?? 0) / 60)} min`}
          />
          <Item label="Tono y escritura" value={data.writingTone} />
          <List label="Estructuras narrativas" items={data.narrativeStructures} />
          <List label="Patrones de retención" items={data.retentionPatterns} />
          <List label="A evitar" items={data.avoidPatterns} danger />
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/90">{value || "—"}</p>
    </div>
  );
}

function List({
  label,
  items,
  danger,
}: {
  label: string;
  items?: string[];
  danger?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <ul className="mt-1 space-y-1.5">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/90">
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
