import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { fetchChannelVideos } from "@/lib/youtube";

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

    let imported = 0;
    for (const v of videos) {
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
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          isExternal: false,
        },
        update: {
          // refresca métricas en reimportaciones
          title: v.title,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
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
