import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorProfile } from "@/lib/creator-profile";
import { GeneratorWorkspace } from "@/components/GeneratorWorkspace";
import type { GeneratedScriptContent } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [profile, saved] = await Promise.all([
    getCreatorProfile(userId),
    prisma.generatedScript.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const initialScripts = saved.map((s) => ({
    id: s.id,
    title: s.title || s.topic,
    topic: s.topic,
    content: s.content as unknown as GeneratedScriptContent,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Workspace · Generador</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Genera tu próximo guion
      </h1>
      <p className="mt-2 mb-8 max-w-lg text-sm text-muted">
        La IA escribe un guion optimizado con tu perfil de creador y tus vídeos
        con mejor rendimiento. Puedes editarlo y guardarlo.
      </p>
      <GeneratorWorkspace
        hasProfile={!!profile}
        initialScripts={initialScripts}
      />
    </div>
  );
}
