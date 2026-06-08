import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { fetchVideoAnalytics } from "@/lib/youtube-analytics";

// POST: obtiene retención + métricas avanzadas del vídeo y las guarda.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const video = await prisma.video.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!video)
    return NextResponse.json({ error: "Vídeo no encontrado" }, { status: 404 });

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken)
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero." },
      { status: 400 }
    );

  try {
    const analytics = await fetchVideoAnalytics(
      accessToken,
      video.youtubeId,
      video.publishedAt,
      video.durationSec
    );

    await prisma.video.update({
      where: { id: video.id },
      data: {
        avgViewDurationSec: analytics.avgViewDurationSec,
        avgViewPercentage: analytics.avgViewPercentage,
        subscribersGained: analytics.subscribersGained,
        retentionCurve: analytics.retentionCurve as unknown as object,
        statsUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, analytics });
  } catch (err: any) {
    console.error("stats error", err);
    return NextResponse.json(
      {
        error:
          "No se pudieron obtener las estadísticas. Reconecta YouTube en Ajustes para conceder permisos de Analytics.",
      },
      { status: 500 }
    );
  }
}
