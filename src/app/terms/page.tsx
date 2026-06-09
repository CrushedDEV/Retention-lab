import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de servicio · Script Intelligence",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Términos de servicio
      </h1>
      <p className="mt-2 text-sm text-muted">Última actualización: junio de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/90">
        <section>
          <h2 className="mb-2 font-semibold text-ink">1. Descripción del servicio</h2>
          <p>
            Script Intelligence (&laquo;el Servicio&raquo;) es una herramienta que
            ayuda a creadores de contenido a analizar el rendimiento de sus vídeos
            y a mejorar sus guiones. El Servicio importa datos de plataformas de
            terceros (YouTube, TikTok) con tu autorización expresa mediante OAuth.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">2. Uso aceptable</h2>
          <p>
            Te comprometes a usar el Servicio únicamente con cuentas y contenido
            sobre los que tienes derechos. No debes usar el Servicio para infringir
            los términos de YouTube, TikTok ni de ninguna otra plataforma, ni para
            fines ilícitos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">3. Cuentas de terceros</h2>
          <p>
            Al conectar tu cuenta de Google/YouTube o de TikTok, autorizas al
            Servicio a leer la información necesaria (vídeos, métricas y, en su
            caso, transcripciones) para ofrecer el análisis. Puedes revocar este
            acceso en cualquier momento desde los ajustes de tu cuenta en la
            plataforma correspondiente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">4. Contenido generado por IA</h2>
          <p>
            Los análisis y guiones generados se producen mediante modelos de
            inteligencia artificial y se ofrecen &laquo;tal cual&raquo;, sin
            garantía de exactitud. Eres responsable de revisar y editar cualquier
            contenido antes de publicarlo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">5. Limitación de responsabilidad</h2>
          <p>
            El Servicio se presta sin garantías de ningún tipo. No nos hacemos
            responsables de pérdidas derivadas del uso del Servicio ni de cambios
            en las APIs de terceros que afecten a su funcionamiento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">6. Cambios</h2>
          <p>
            Podemos actualizar estos términos. El uso continuado del Servicio tras
            una actualización implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">7. Contacto</h2>
          <p>
            Para cualquier consulta sobre estos términos, contacta con el
            responsable del Servicio en el correo de soporte indicado en la
            aplicación.
          </p>
        </section>
      </div>
    </div>
  );
}
