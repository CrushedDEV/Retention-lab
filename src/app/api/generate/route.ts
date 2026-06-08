import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateScript, MODEL } from "@/lib/ai";
import { getCreatorProfile } from "@/lib/creator-profile";

const schema = z.object({
  topic: z.string().min(3, "Describe un tema válido"),
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
    const profile = await getCreatorProfile(session.user.id);

    const topVideos = await prisma.video.findMany({
      where: { userId: session.user.id },
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
        content: content as unknown as object,
        modelUsed: MODEL,
      },
    });

    return NextResponse.json({ ok: true, id: saved.id, content });
  } catch (err: any) {
    console.error("generate error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error generando el guion" },
      { status: 500 }
    );
  }
}
