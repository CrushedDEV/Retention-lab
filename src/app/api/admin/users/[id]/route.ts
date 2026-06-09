import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    // Fija el saldo a un valor absoluto…
    setTokens: z.number().int().min(0).max(1_000_000).optional(),
    // …o suma/resta (puede ser negativo).
    delta: z.number().int().optional(),
  })
  .refine((d) => d.setTokens != null || d.delta != null, {
    message: "Indica setTokens o delta",
  });

// PATCH /api/admin/users/[id] — ajusta los tokens de una cuenta (solo admin).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, tokens: true },
  });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const next =
    parsed.data.setTokens != null
      ? parsed.data.setTokens
      : Math.max(0, user.tokens + (parsed.data.delta ?? 0));

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { tokens: next },
    select: { id: true, tokens: true },
  });

  return NextResponse.json({ ok: true, tokens: updated.tokens });
}
