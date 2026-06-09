import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users — lista de cuentas (solo admin).
export async function GET() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      tokens: true,
      createdAt: true,
      _count: {
        select: { videos: true, analyses: true, generatedScripts: true },
      },
    },
  });

  return NextResponse.json({ users });
}
