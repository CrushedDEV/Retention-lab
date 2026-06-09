import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { fetchVideoById, extractVideoId, detectFormat } from "@/lib/youtube";

const schema = z.object({ videoIdOrUrl: z.string().min(5) });

// POST: importa un vídeo de OTRO creador para analizarlo (isExternal=true).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const videoId = extractVideoId(parsed.data.videoIdOrUrl);
  if (!videoId)
    return NextResponse.json(
      { error: "No se reconoce el vídeo (pega una URL o ID válidos)." },
      { status: 400 }
    );

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken)
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero." },
      { status: 400 }
    );

  try {
    const v = await fetchVideoById(accessToken, videoId);
    if (!v)
      return NextResponse.json(
        { error: "Vídeo no encontrado" },
        { status: 404 }
      );

    const format = await detectFormat(v.youtubeId, parsed.data.videoIdOrUrl);

    const saved = await prisma.video.upsert({
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
        isExternal: true,
      },
      update: {
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        format,
        channelId: v.channelId,
        channelTitle: v.channelTitle,
      },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err: any) {
    console.error("external import error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error importando el vídeo" },
      { status: 500 }
    );
  }
}
