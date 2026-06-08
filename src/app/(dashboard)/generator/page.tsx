import { auth } from "@/lib/auth";
import { getCreatorProfile } from "@/lib/creator-profile";
import { GeneratorForm } from "@/components/GeneratorForm";

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  const session = await auth();
  const profile = await getCreatorProfile(session!.user.id);

  return (
    <div>
      <p className="eyebrow mb-2">Workspace · Generador</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Genera tu próximo guion
      </h1>
      <p className="mt-2 mb-8 max-w-lg text-sm text-muted">
        La IA escribe un guion optimizado con tu perfil de creador y tus vídeos
        con mejor rendimiento.
      </p>
      <GeneratorForm hasProfile={!!profile} />
    </div>
  );
}
