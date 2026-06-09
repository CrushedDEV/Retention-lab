import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasGoogleConnected } from "@/lib/google-token";
import { ImportButton } from "@/components/ImportButton";
import { BulkVideoList } from "@/components/BulkVideoList";
import { formatNumber } from "@/lib/format";
import { YoutubeIcon, VideoIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [videos, connected] = await Promise.all([
    prisma.video.findMany({
      where: { userId, isExternal: false },
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

      {/* Lista con selección múltiple */}
      {videos.length === 0 ? (
        <EmptyState connected={connected} />
      ) : (
        <BulkVideoList
          videos={videos.map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail,
            views: v.views,
            likes: v.likes,
            durationSec: v.durationSec,
            publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
            transcriptStatus: v.transcriptStatus,
            analysisStatus: v.analysisStatus,
          }))}
        />
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
