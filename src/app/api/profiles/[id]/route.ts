import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dataSchema = z.object({
  hookStyle: z.string(),
  avgSuccessfulDurationSec: z.number(),
  narrativeStructures: z.array(z.string()),
  retentionPatterns: z.array(z.string()),
  writingTone: z.string(),
  summary: z.string(),
  avoidPatterns: z.array(z.string()),
});

const putSchema = z.object({
  label: z.string().min(1).optional(),
  data: dataSchema,
});

async function getOwned(id: string, userId: string) {
  return prisma.creatorProfile.findFirst({ where: { id, userId } });
}

// PUT: edita la "memoria" (perfil) de un creador.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const profile = await getOwned(params.id, session.user.id);
  if (!profile)
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      ...(parsed.data.label ? { label: parsed.data.label } : {}),
      data: parsed.data.data as unknown as object,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: borra la memoria del creador (se reconstruirá al analizar más vídeos).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const profile = await getOwned(params.id, session.user.id);
  if (!profile)
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  await prisma.creatorProfile.delete({ where: { id: profile.id } });
  return NextResponse.json({ ok: true });
}
