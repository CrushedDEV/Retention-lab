import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeVideo, MODEL } from "@/lib/ai";
import { getCreatorProfile, refreshCreatorProfile } from "@/lib/creator-profile";

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

  try {
    const profile = await getCreatorProfile(session.user.id);

    const result = await analyzeVideo({
      title: video.title,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      durationSec: video.durationSec,
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

    // El perfil del creador se actualiza automáticamente con cada análisis.
    await refreshCreatorProfile(session.user.id);

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
