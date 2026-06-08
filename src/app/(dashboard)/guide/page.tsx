import Link from "next/link";
import {
  YoutubeIcon,
  VideoIcon,
  DownloadIcon,
  SparkIcon,
  ChartIcon,
  UsersIcon,
  ArrowRightIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const steps = [
  {
    n: "01",
    Icon: YoutubeIcon,
    title: "Conecta tu canal de YouTube",
    body: "En Ajustes, vincula tu cuenta de Google. Esto permite importar tus vídeos y leer tus métricas de retención reales.",
    href: "/settings",
    cta: "Ir a Ajustes",
  },
  {
    n: "02",
    Icon: VideoIcon,
    title: "Importa tus vídeos",
    body: "Desde Vídeos pulsa «Importar de YouTube». Traeremos título, vistas, likes, duración y miniatura de tus últimos vídeos.",
    href: "/dashboard",
    cta: "Ir a Vídeos",
  },
  {
    n: "03",
    Icon: DownloadIcon,
    title: "Extrae y revisa la transcripción",
    body: "Abre un vídeo y extrae sus subtítulos (o pégalos a mano). Revisa el texto segmentado con timestamps y apruébalo.",
  },
  {
    n: "04",
    Icon: ChartIcon,
    title: "Analiza el rendimiento",
    body: "Pulsa «Analizar». Cruzamos tu guion con la retención real para explicar qué funcionó, dónde se cae la audiencia y cómo mejorarlo.",
  },
  {
    n: "05",
    Icon: UsersIcon,
    title: "Estudia a otros creadores",
    body: "En Explorar, busca vídeos de cualquier creador y analízalos. Aprenderás su estilo y crearás un perfil de su forma de escribir.",
    href: "/explore",
    cta: "Ir a Explorar",
  },
  {
    n: "06",
    Icon: SparkIcon,
    title: "Genera guiones optimizados",
    body: "En el Generador, elige un estilo (el tuyo o el de otro creador), escribe un tema y obtén un guion editable y guardable, listo para grabar.",
    href: "/generator",
    cta: "Ir al Generador",
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow mb-2">Bienvenido</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Cómo usar Script Intelligence
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Script Intelligence analiza tus guiones junto con el rendimiento real de
        tus vídeos para decirte por qué funcionan (o no) y ayudarte a escribir
        mejores guiones. Sigue estos pasos:
      </p>

      <div className="mt-8 space-y-3">
        {steps.map((s) => (
          <div key={s.n} className="card flex gap-4 p-5">
            <div className="flex flex-col items-center">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <s.Icon className="h-5 w-5" />
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted">{s.n}</span>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {s.title}
                </h2>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              {s.href && (
                <Link
                  href={s.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  {s.cta} <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 p-5">
        <div>
          <p className="font-display text-lg font-semibold">¿Listo para empezar?</p>
          <p className="text-sm text-muted">Conecta tu canal e importa tus vídeos.</p>
        </div>
        <Link href="/dashboard" className="btn-primary">
          Empezar <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
