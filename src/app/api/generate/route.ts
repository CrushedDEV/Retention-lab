import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateScript, MODEL } from "@/lib/ai";
import { getCreatorProfile, OWN_SOURCE } from "@/lib/creator-profile";
import {
  consumeTokens,
  refundTokens,
  getTokenBalance,
  TOKEN_COSTS,
} from "@/lib/tokens";

const schema = z.object({
  topic: z.string().min(3, "Describe un tema válido"),
  // Perfil de estilo a usar: "own" (por defecto) o el channelId de un creador externo
  sourceKey: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );

  // Reserva tokens de forma atómica antes de llamar a la IA.
  const COST = TOKEN_COSTS.generate;
  const charged = await consumeTokens(session.user.id, COST);
  if (!charged) {
    const balance = await getTokenBalance(session.user.id);
    return NextResponse.json(
      {
        error: `No te quedan tokens suficientes (necesitas ${COST}, tienes ${balance}).`,
        balance,
      },
      { status: 402 }
    );
  }

  try {
    const sourceKey = parsed.data.sourceKey || OWN_SOURCE;
    const profile = await getCreatorProfile(session.user.id, sourceKey);

    // Vídeos de referencia: del creador elegido (propio o externo)
    const videoWhere =
      sourceKey === OWN_SOURCE
        ? { userId: session.user.id, isExternal: false }
        : { userId: session.user.id, channelId: sourceKey };

    const topVideos = await prisma.video.findMany({
      where: videoWhere,
      orderBy: { views: "desc" },
      take: 5,
      select: { title: true, views: true, durationSec: true },
    });

    // Fragmentos reales de los guiones del creador (para imitar su voz):
    // los 3 vídeos con más vistas que tengan transcripción.
    const videosWithTranscript = await prisma.video.findMany({
      where: { ...videoWhere, segments: { some: {} } },
      orderBy: { views: "desc" },
      take: 3,
      select: {
        title: true,
        segments: {
          orderBy: { order: "asc" },
          take: 40,
          select: { text: true },
        },
      },
    });

    const styleExamples = videosWithTranscript.map((v) => ({
      title: v.title,
      excerpt: v.segments
        .map((s) => s.text)
        .join(" ")
        .slice(0, 900),
    }));

    const content = await generateScript({
      topic: parsed.data.topic,
      creatorProfile: profile,
      topVideos,
      styleExamples,
    });

    const saved = await prisma.generatedScript.create({
      data: {
        userId: session.user.id,
        topic: parsed.data.topic,
        title: content.title ?? parsed.data.topic,
        content: content as unknown as object,
        modelUsed: MODEL,
      },
    });

    const balance = await getTokenBalance(session.user.id);
    return NextResponse.json({
      ok: true,
      id: saved.id,
      title: saved.title,
      content,
      createdAt: saved.createdAt,
      balance,
    });
  } catch (err: any) {
    console.error("generate error", err);
    // Reembolsa los tokens reservados: la operación falló.
    await refundTokens(session.user.id, COST);
    return NextResponse.json(
      { error: err?.message ?? "Error generando el guion" },
      { status: 500 }
    );
  }
}
