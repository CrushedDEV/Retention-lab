import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { fetchChannelVideos, detectFormat } from "@/lib/youtube";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero (Ajustes)." },
      { status: 400 }
    );
  }

  try {
    const videos = await fetchChannelVideos(accessToken, 25);

    // Detecta el formato (vertical/horizontal) de todos en paralelo.
    const formats = await Promise.all(
      videos.map((v) => detectFormat(v.youtubeId))
    );

    let imported = 0;
    for (let idx = 0; idx < videos.length; idx++) {
      const v = videos[idx];
      const format = formats[idx];
      await prisma.video.upsert({
        where: {
          userId_youtubeId: { userId: session.user.id, youtubeId: v.youtubeId },
        },
        create: {
          userId: session.user.id,
          youtubeId: v.youtubeId,
          title: v.title,
          url: v.url,
          thumbnail: v.thumbnail,
          publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          durationSec: v.durationSec,
          format,
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          isExternal: false,
        },
        update: {
          // refresca métricas y formato en reimportaciones
          title: v.title,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          format,
          channelId: v.channelId,
          channelTitle: v.channelTitle,
        },
      });
      imported++;
    }

    return NextResponse.json({ ok: true, imported });
  } catch (err: any) {
    console.error("import error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error importando vídeos" },
      { status: 500 }
    );
  }
}
