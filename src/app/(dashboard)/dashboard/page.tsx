import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasGoogleConnected } from "@/lib/google-token";
import { ImportButton } from "@/components/ImportButton";
import { AnalysisBadge, TranscriptBadge } from "@/components/StatusBadges";
import { formatNumber, formatDate, formatDuration } from "@/lib/format";
import {
  EyeIcon,
  HeartIcon,
  ClockIcon,
  YoutubeIcon,
  VideoIcon,
  ArrowRightIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [videos, connected] = await Promise.all([
    prisma.video.findMany({
      where: { userId },
      orderBy: { publishedAt: "desc" },
    }),
    hasGoogleConnected(userId),
  ]);

  const analyzed = videos.filter((v) => v.analysisStatus === "ANALYZED").length;
  const totalViews = videos.reduce((s, v) => s + v.views, 0);

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Workspace · Vídeos</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Tu biblioteca
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Importa los vídeos de tu canal y analiza qué los hace funcionar.
          </p>
        </div>
        {connected ? (
          <ImportButton />
        ) : (
          <Link href="/settings" className="btn-primary">
            <YoutubeIcon className="h-4 w-4" />
            Conectar YouTube
          </Link>
        )}
      </div>

      {/* Resumen */}
      {videos.length > 0 && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <SummaryStat label="Vídeos" value={videos.length.toString()} />
          <SummaryStat label="Analizados" value={`${analyzed}/${videos.length}`} />
          <SummaryStat label="Vistas totales" value={formatNumber(totalViews)} />
        </div>
      )}

      {/* Lista */}
      {videos.length === 0 ? (
        <EmptyState connected={connected} />
      ) : (
        <div className="space-y-3">
          {videos.map((v, i) => (
            <Link
              key={v.id}
              href={`/videos/${v.id}`}
              className="card group flex items-center gap-5 p-4 transition-all hover:border-accent/40 hover:shadow-glow"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="relative h-[68px] w-[120px] flex-shrink-0 overflow-hidden rounded-lg bg-surface2">
                {v.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <VideoIcon className="h-6 w-6" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {formatDuration(v.durationSec)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink transition-colors group-hover:text-accent">
                  {v.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                  <span>{formatDate(v.publishedAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <EyeIcon className="h-3.5 w-3.5" /> {formatNumber(v.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HeartIcon className="h-3.5 w-3.5" /> {formatNumber(v.likes)}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <TranscriptBadge status={v.transcriptStatus} />
                  <AnalysisBadge status={v.analysisStatus} />
                </div>
              </div>

              <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-muted transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className="stat-value mt-2">{value}</p>
    </div>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <VideoIcon className="h-7 w-7" />
      </div>
      <p className="mt-5 font-display text-xl font-semibold">
        Aún no tienes vídeos
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {connected
          ? "Pulsa «Importar de YouTube» para traer los vídeos de tu canal."
          : "Conecta tu cuenta de YouTube en Ajustes para empezar a analizar."}
      </p>
      {!connected && (
        <Link href="/settings" className="btn-primary mt-6">
          <YoutubeIcon className="h-4 w-4" />
          Conectar YouTube
        </Link>
      )}
    </div>
  );
}
