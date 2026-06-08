import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCaptionsBestEffort } from "@/lib/youtube";

async function getOwnedVideo(videoId: string, userId: string) {
  return prisma.video.findFirst({ where: { id: videoId, userId } });
}

// POST: extrae captions automáticas de YouTube y crea los segmentos iniciales.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const video = await getOwnedVideo(params.id, session.user.id);
  if (!video)
    return NextResponse.json({ error: "Vídeo no encontrado" }, { status: 404 });

  try {
    const segments = await fetchCaptionsBestEffort(video.youtubeId);
    if (segments.length === 0) {
      await prisma.video.update({
        where: { id: video.id },
        data: { transcriptStatus: "NO_CAPTIONS" },
      });
      return NextResponse.json(
        { error: "No se encontraron captions para este vídeo." },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.transcriptSegment.deleteMany({ where: { videoId: video.id } }),
      prisma.transcriptSegment.createMany({
        data: segments.map((s, i) => ({
          videoId: video.id,
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text,
          order: i,
        })),
      }),
      prisma.video.update({
        where: { id: video.id },
        data: { transcriptStatus: "PENDING_REVIEW" },
      }),
    ]);

    return NextResponse.json({ ok: true, count: segments.length });
  } catch (err: any) {
    console.error("captions error", err);
    await prisma.video.update({
      where: { id: video.id },
      data: { transcriptStatus: "NO_CAPTIONS" },
    });
    return NextResponse.json(
      {
        error:
          "No se pudieron extraer las captions automáticamente. Pégalas manualmente abajo.",
      },
      { status: 404 }
    );
  }
}

const putSchema = z.object({
  segments: z.array(
    z.object({
      startTime: z.number(),
      endTime: z.number(),
      text: z.string(),
    })
  ),
  approve: z.boolean().optional(),
});

// PUT: guarda los segmentos editados y opcionalmente aprueba la transcripción.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const video = await getOwnedVideo(params.id, session.user.id);
  if (!video)
    return NextResponse.json({ error: "Vídeo no encontrado" }, { status: 404 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { segments, approve } = parsed.data;

  await prisma.$transaction([
    prisma.transcriptSegment.deleteMany({ where: { videoId: video.id } }),
    prisma.transcriptSegment.createMany({
      data: segments.map((s, i) => ({
        videoId: video.id,
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
        order: i,
      })),
    }),
    prisma.video.update({
      where: { id: video.id },
      data: {
        transcriptStatus: approve ? "APPROVED" : "PENDING_REVIEW",
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
