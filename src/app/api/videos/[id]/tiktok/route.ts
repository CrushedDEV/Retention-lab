import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getValidTikTokToken,
  queryTikTokVideos,
  resolveTikTokVideoId,
} from "@/lib/tiktok";

const schema = z.object({
  // URL de TikTok o ID directo
  tiktokUrl: z.string().min(3).optional(),
  tiktokVideoId: z.string().min(3).optional(),
});

// POST /api/videos/[id]/tiktok → enlaza/actualiza las stats de TikTok del vídeo.
export async function POST(
  req: Request,
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const token = await getValidTikTokToken(session.user.id);
  if (!token)
    return NextResponse.json(
      { error: "Conecta tu cuenta de TikTok primero (Ajustes)." },
      { status: 400 }
    );

  // Determina el ID de TikTok
  let tiktokId = parsed.data.tiktokVideoId ?? null;
  if (!tiktokId && parsed.data.tiktokUrl) {
    tiktokId = await resolveTikTokVideoId(parsed.data.tiktokUrl);
  }
  if (!tiktokId)
    return NextResponse.json(
      { error: "No se reconoce el vídeo de TikTok (pega una URL válida)." },
      { status: 400 }
    );

  try {
    const results = await queryTikTokVideos(token, [tiktokId]);
    const tk = results[0];
    if (!tk)
      return NextResponse.json(
        {
          error:
            "No se encontró ese vídeo en tu cuenta de TikTok (¿es tuyo y la cuenta conectada es la correcta?).",
        },
        { status: 404 }
      );

    const updated = await prisma.video.update({
      where: { id: video.id },
      data: {
        tiktokVideoId: tk.id,
        tiktokUrl: tk.shareUrl ?? parsed.data.tiktokUrl ?? null,
        tiktokViews: tk.views,
        tiktokLikes: tk.likes,
        tiktokComments: tk.comments,
        tiktokShares: tk.shares,
        tiktokStatsUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      tiktok: {
        views: updated.tiktokViews,
        likes: updated.tiktokLikes,
        comments: updated.tiktokComments,
        shares: updated.tiktokShares,
        url: updated.tiktokUrl,
      },
    });
  } catch (err: any) {
    console.error("tiktok link error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error obteniendo las stats de TikTok" },
      { status: 500 }
    );
  }
}

// DELETE → desvincula TikTok del vídeo.
export async function DELETE(
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

  await prisma.video.update({
    where: { id: video.id },
    data: {
      tiktokVideoId: null,
      tiktokUrl: null,
      tiktokViews: 0,
      tiktokLikes: 0,
      tiktokComments: 0,
      tiktokShares: 0,
      tiktokStatsUpdatedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
