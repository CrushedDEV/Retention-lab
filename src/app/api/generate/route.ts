import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateScript, MODEL } from "@/lib/ai";
import { getCreatorProfile, OWN_SOURCE } from "@/lib/creator-profile";

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

    const content = await generateScript({
      topic: parsed.data.topic,
      creatorProfile: profile,
      topVideos,
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

    return NextResponse.json({
      ok: true,
      id: saved.id,
      title: saved.title,
      content,
      createdAt: saved.createdAt,
    });
  } catch (err: any) {
    console.error("generate error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error generando el guion" },
      { status: 500 }
    );
  }
}
