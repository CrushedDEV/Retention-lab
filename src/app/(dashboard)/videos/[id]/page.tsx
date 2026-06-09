import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalysisBadge, TranscriptBadge } from "@/components/StatusBadges";
import { RetentionChart } from "@/components/RetentionChart";
import { StatsButton } from "@/components/StatsButton";
import { formatNumber, formatDate, formatDuration } from "@/lib/format";
import {
  ArrowLeftIcon,
  ExternalIcon,
  EyeIcon,
  HeartIcon,
  ChatIcon,
  ClockIcon,
  SparkIcon,
  ChartIcon,
} from "@/components/icons";
import type { VideoAnalysisResult } from "@/lib/ai";
import type { RetentionPoint } from "@/lib/youtube-analytics";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const video = await prisma.video.findFirst({
    where: { id: params.id, userId: session!.user.id },
    include: {
      segments: { orderBy: { order: "asc" } },
      analysis: true,
    },
  });

  if (!video) notFound();

  const metrics = [
    { label: "Visualizaciones", value: formatNumber(video.views), Icon: EyeIcon },
    { label: "Likes", value: formatNumber(video.likes), Icon: HeartIcon },
    { label: "Comentarios", value: formatNumber(video.comments), Icon: ChatIcon },
    { label: "Duración", value: formatDuration(video.durationSec), Icon: ClockIcon },
  ];

  const analysisResult = video.analysis
    ? (video.analysis.result as unknown as VideoAnalysisResult)
    : null;

  const retentionCurve =
    (video.retentionCurve as unknown as RetentionPoint[]) ?? [];
  const hasRetention = retentionCurve.length >= 2;

  return (
    <div>
      <Link
        href={video.isExternal ? "/explore" : "/dashboard"}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="h-4 w-4" />{" "}
        {video.isExternal ? "Volver a Explorar" : "Volver a vídeos"}
      </Link>

      {video.isExternal && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface2/60 px-3 py-1 text-xs text-muted">
          <ChartIcon className="h-3.5 w-3.5" />
          Vídeo externo de{" "}
          <span className="text-ink">{video.channelTitle ?? "otro creador"}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            {video.title}
          </h1>
          <div className="mt-2 flex items-center gap-4 font-mono text-xs text-muted">
            <span>{formatDate(video.publishedAt)}</span>
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              Ver en YouTube <ExternalIcon className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge border-line bg-surface2/60 text-muted">
              {video.format === "SHORT" ? "Short" : "Vídeo largo"}
            </span>
            <TranscriptBadge status={video.transcriptStatus} />
            <AnalysisBadge status={video.analysisStatus} />
          </div>
        </div>
        <AnalyzeButton
          videoId={video.id}
          hasTranscript={video.segments.length > 0}
          alreadyAnalyzed={!!video.analysis}
        />
      </div>

      {/* Métricas */}
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="card p-4">
            <div className="flex items-center gap-2 text-muted">
              <m.Icon className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-wider">{m.label}</p>
            </div>
            <p className="stat-value mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Retención de audiencia (solo vídeos propios) */}
      <div className={`mt-5 card p-6 ${video.isExternal ? "hidden" : ""}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ChartIcon className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Retención de audiencia
            </h2>
          </div>
          <StatsButton videoId={video.id} />
        </div>

        {hasRetention ? (
          <>
            <div className="mb-5 grid grid-cols-3 gap-4">
              <MiniStat
                label="Retención media"
                value={`${video.avgViewPercentage}%`}
              />
              <MiniStat
                label="Duración media vista"
                value={formatDuration(video.avgViewDurationSec)}
              />
              <MiniStat
                label="Subs ganados"
                value={`+${formatNumber(video.subscribersGained)}`}
              />
            </div>
            <RetentionChart
              curve={retentionCurve}
              durationSec={video.durationSec}
            />
          </>
        ) : (
          <p className="text-sm text-muted">
            Pulsa «Actualizar retención» para traer la curva de retención real
            desde YouTube Analytics. Si falla, reconecta YouTube en Ajustes para
            conceder los permisos de Analytics.
          </p>
        )}
      </div>

      <div className="mt-9 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader>Transcripción · Guion</SectionHeader>
          <TranscriptEditor
            videoId={video.id}
            status={video.transcriptStatus}
            durationSec={video.durationSec}
            initialSegments={video.segments.map((s) => ({
              startTime: s.startTime,
              endTime: s.endTime,
              text: s.text,
            }))}
          />
        </section>

        <section>
          <SectionHeader>Análisis con IA</SectionHeader>
          {analysisResult ? (
            <div className="card p-6">
              <AnalysisView result={analysisResult} />
            </div>
          ) : (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <SparkIcon className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm text-muted">
                Aún no has analizado este vídeo. Pulsa{" "}
                <span className="text-ink">«Analizar vídeo»</span> para generar
                el análisis basado en métricas + guion.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3.5">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {children}
      </h2>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
