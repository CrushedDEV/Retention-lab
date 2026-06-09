import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasGoogleConnected } from "@/lib/google-token";
import { ConnectYouTubeButton } from "@/components/ConnectYouTubeButton";
import { CheckIcon, YoutubeIcon, SparkIcon } from "@/components/icons";
import { TOKEN_COSTS } from "@/lib/token-costs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const [connected, me] = await Promise.all([
    hasGoogleConnected(session!.user.id),
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { tokens: true },
    }),
  ]);
  const tokens = me?.tokens ?? 0;
  const initial = (session!.user.name ?? session!.user.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-2">Workspace · Ajustes</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">Ajustes</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        Gestiona tu cuenta y conexiones.
      </p>

      <div className="card p-6">
        <p className="eyebrow mb-4">Cuenta</p>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-mono text-lg font-semibold text-accent">
            {initial}
          </div>
          <div>
            <p className="font-medium text-ink">{session!.user.name ?? "—"}</p>
            <p className="font-mono text-sm text-muted">{session!.user.email}</p>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <SparkIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-ink">Tokens de uso</p>
              <p className="mt-1 text-sm text-muted">
                Analizar un vídeo cuesta {TOKEN_COSTS.analyze} · Generar un
                guion cuesta {TOKEN_COSTS.generate}.
              </p>
            </div>
          </div>
          <span
            className={`font-mono text-2xl font-bold ${
              tokens <= 10 ? "text-danger" : "text-accent"
            }`}
          >
            {tokens}
          </span>
        </div>
      </div>

      <div className="card mt-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface2 text-danger">
              <YoutubeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-ink">Conexión con YouTube</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {connected
                  ? "Tu cuenta está conectada. Puedes importar tus vídeos."
                  : "Conecta tu cuenta de Google para importar los vídeos de tu canal."}
              </p>
              {connected && (
                <span className="badge mt-3 border-success/30 bg-success/10 text-success">
                  <CheckIcon className="h-3 w-3" />
                  Conectada
                </span>
              )}
            </div>
          </div>
          <ConnectYouTubeButton connected={connected} />
        </div>
      </div>
    </div>
  );
}
