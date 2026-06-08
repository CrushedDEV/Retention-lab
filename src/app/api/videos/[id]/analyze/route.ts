import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeVideo, MODEL } from "@/lib/ai";
import {
  getCreatorProfile,
  refreshCreatorProfile,
  sourceKeyForVideo,
} from "@/lib/creator-profile";
import { getGoogleAccessToken } from "@/lib/google-token";
import {
  fetchVideoAnalytics,
  detectRetentionDrops,
  type RetentionPoint,
} from "@/lib/youtube-analytics";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const video = await prisma.video.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  if (!video)
    return NextResponse.json({ error: "Vídeo no encontrado" }, { status: 404 });

  if (video.segments.length === 0) {
    return NextResponse.json(
      { error: "Este vídeo no tiene transcripción. Extráela y revísala primero." },
      { status: 400 }
    );
  }

  await prisma.video.update({
    where: { id: video.id },
    data: { analysisStatus: "ANALYZING" },
  });

  const sourceKey = sourceKeyForVideo(video);
  const sourceLabel = video.isExternal
    ? video.channelTitle ?? "Creador externo"
    : "Tu canal";

  try {
    const profile = await getCreatorProfile(session.user.id, sourceKey);

    // Intenta obtener/actualizar la retención real antes de analizar.
    // Solo para vídeos PROPIOS (Analytics requiere ser dueño del canal).
    let retentionCurve = (video.retentionCurve as unknown as RetentionPoint[]) ?? [];
    let avgViewPercentage = video.avgViewPercentage;
    let avgViewDurationSec = video.avgViewDurationSec;
    try {
      const token = video.isExternal
        ? null
        : await getGoogleAccessToken(session.user.id);
      if (token) {
        const a = await fetchVideoAnalytics(
          token,
          video.youtubeId,
          video.publishedAt,
          video.durationSec
        );
        if (a.retentionCurve.length > 0) retentionCurve = a.retentionCurve;
        avgViewPercentage = a.avgViewPercentage || avgViewPercentage;
        avgViewDurationSec = a.avgViewDurationSec || avgViewDurationSec;
        await prisma.video.update({
          where: { id: video.id },
          data: {
            avgViewDurationSec: a.avgViewDurationSec,
            avgViewPercentage: a.avgViewPercentage,
            subscribersGained: a.subscribersGained,
            retentionCurve: a.retentionCurve as unknown as object,
            statsUpdatedAt: new Date(),
          },
        });
      }
    } catch (e) {
      console.error("analytics during analyze (no bloqueante)", e);
    }

    const result = await analyzeVideo({
      title: video.title,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      durationSec: video.durationSec,
      avgViewPercentage,
      avgViewDurationSec,
      retentionDropsData: detectRetentionDrops(retentionCurve),
      segments: video.segments.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
      })),
      creatorProfile: profile,
    });

    await prisma.analysis.upsert({
      where: { videoId: video.id },
      create: {
        videoId: video.id,
        userId: session.user.id,
        result: result as unknown as object,
        modelUsed: MODEL,
      },
      update: {
        result: result as unknown as object,
        modelUsed: MODEL,
      },
    });

    await prisma.video.update({
      where: { id: video.id },
      data: { analysisStatus: "ANALYZED" },
    });

    // El perfil de ESA fuente (propio o creador externo) se actualiza
    // automáticamente con cada análisis.
    await refreshCreatorProfile(session.user.id, sourceKey, sourceLabel);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("analyze error", err);
    await prisma.video.update({
      where: { id: video.id },
      data: { analysisStatus: "NOT_ANALYZED" },
    });
    return NextResponse.json(
      { error: err?.message ?? "Error durante el análisis" },
      { status: 500 }
    );
  }
}
