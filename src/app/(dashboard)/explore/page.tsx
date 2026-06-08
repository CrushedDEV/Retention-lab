import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExploreSearch } from "@/components/ExploreSearch";
import { AnalysisBadge, TranscriptBadge } from "@/components/StatusBadges";
import { formatNumber, formatDate } from "@/lib/format";
import { ArrowRightIcon, UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const session = await auth();
  const external = await prisma.video.findMany({
    where: { userId: session!.user.id, isExternal: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <p className="eyebrow mb-2">Workspace · Explorar</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Analiza a otros creadores
      </h1>
      <p className="mt-2 mb-8 max-w-lg text-sm text-muted">
        Busca vídeos de cualquier creador (o pega una URL) y analízalos. Crearás
        un perfil de su estilo que podrás usar en el generador.
      </p>

      <ExploreSearch />

      {/* Vídeos externos añadidos */}
      <div className="mt-10 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Vídeos externos añadidos
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>

      {external.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <UsersIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted">
            Aún no has añadido vídeos de otros creadores.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {external.map((v) => (
            <Link
              key={v.id}
              href={`/videos/${v.id}`}
              className="card group flex items-center gap-4 p-4 transition-all hover:border-accent/40"
            >
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail}
                  alt=""
                  className="h-14 w-24 flex-shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink group-hover:text-accent">
                  {v.title}
                </p>
                <p className="truncate text-xs text-muted">
                  {v.channelTitle} · {formatNumber(v.views)} vistas ·{" "}
                  {formatDate(v.publishedAt)}
                </p>
                <div className="mt-2 flex gap-2">
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
