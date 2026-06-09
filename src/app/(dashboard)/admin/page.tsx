import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminUsers, type AdminUser } from "@/components/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  // Si no es admin, la página no existe (no se filtra su existencia).
  if (!session) notFound();

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

  const data: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    tokens: u.tokens,
    createdAt: u.createdAt.toISOString(),
    counts: {
      videos: u._count.videos,
      analyses: u._count.analyses,
      scripts: u._count.generatedScripts,
    },
  }));

  const totalTokens = data.reduce((s, u) => s + u.tokens, 0);

  return (
    <div>
      <p className="eyebrow mb-2">Admin</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Cuentas y tokens
      </h1>
      <p className="mt-2 mb-8 max-w-lg text-sm text-muted">
        Gestiona el saldo de tokens de cada cuenta. {data.length} cuentas ·{" "}
        {totalTokens} tokens en total.
      </p>

      <AdminUsers initialUsers={data} />
    </div>
  );
}
