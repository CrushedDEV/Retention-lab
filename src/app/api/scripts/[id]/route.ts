import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sectionSchema = z.object({
  heading: z.string(),
  content: z.string(),
  approxDurationSec: z.number(),
});

const contentSchema = z.object({
  title: z.string(),
  hook: z.string(),
  sections: z.array(sectionSchema),
  callToAction: z.string(),
  estimatedDurationSec: z.number(),
  notesForCreator: z.array(z.string()),
});

const putSchema = z.object({
  title: z.string().min(1).optional(),
  content: contentSchema,
});

async function getOwned(id: string, userId: string) {
  return prisma.generatedScript.findFirst({ where: { id, userId } });
}

// PUT: guarda los cambios del guion editado.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const script = await getOwned(params.id, session.user.id);
  if (!script)
    return NextResponse.json({ error: "Guion no encontrado" }, { status: 404 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const updated = await prisma.generatedScript.update({
    where: { id: script.id },
    data: {
      title: parsed.data.title ?? parsed.data.content.title,
      content: parsed.data.content as unknown as object,
    },
  });

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
}

// DELETE: elimina un guion guardado.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const script = await getOwned(params.id, session.user.id);
  if (!script)
    return NextResponse.json({ error: "Guion no encontrado" }, { status: 404 });

  await prisma.generatedScript.delete({ where: { id: script.id } });
  return NextResponse.json({ ok: true });
}
