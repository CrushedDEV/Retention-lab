import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad · Script Intelligence",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Política de privacidad
      </h1>
      <p className="mt-2 text-sm text-muted">Última actualización: junio de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/90">
        <section>
          <h2 className="mb-2 font-semibold text-ink">1. Qué datos recogemos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Cuenta:</strong> nombre, email y contraseña cifrada cuando te
              registras. Si inicias sesión con Google, recibimos tu nombre, email
              y foto de perfil.
            </li>
            <li>
              <strong>Conexión con YouTube:</strong> con tu permiso (OAuth) leemos
              tus vídeos, métricas básicas y métricas de YouTube Analytics
              (retención, fuentes de tráfico, suscriptores ganados/perdidos).
            </li>
            <li>
              <strong>Conexión con TikTok:</strong> con tu permiso (OAuth) leemos
              la lista de tus vídeos y sus estadísticas públicas
              (visualizaciones, likes, comentarios, compartidos) para enlazarlas
              con tus vídeos de YouTube.
            </li>
            <li>
              <strong>Contenido generado:</strong> transcripciones que extraes o
              editas, análisis generados por IA y guiones que creas o guardas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">2. Para qué los usamos</h2>
          <p>
            Únicamente para prestarte el servicio: importar y mostrar tus vídeos,
            generar análisis y guiones con IA, y construir un perfil de tu estilo
            de creador. No vendemos tus datos ni los compartimos para fines
            publicitarios.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">3. Procesadores que utilizamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>OpenAI:</strong> los textos enviados para análisis y
              generación de guiones se procesan en su API.
            </li>
            <li>
              <strong>Supabase / Vercel:</strong> alojamiento de base de datos y
              de la aplicación.
            </li>
            <li>
              <strong>Google y TikTok:</strong> proveedores de las API desde las
              que importamos tus datos, con tu autorización.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">4. Conservación</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar
            su eliminación en cualquier momento contactando con el soporte; al
            eliminar tu cuenta se borran tus vídeos, transcripciones, análisis,
            guiones y tokens de conexión asociados.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">5. Tus derechos</h2>
          <p>
            Tienes derecho de acceso, rectificación, supresión, portabilidad y
            oposición sobre tus datos. Para ejercerlos, contacta con el responsable
            del servicio mediante el correo de soporte indicado en la aplicación.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">6. Revocar accesos</h2>
          <p>
            Puedes revocar el acceso de la aplicación a tu cuenta de Google en{" "}
            <a
              className="text-accent hover:underline"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>{" "}
            y a tu cuenta de TikTok desde la configuración de aplicaciones
            conectadas en TikTok.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">7. Seguridad</h2>
          <p>
            Las contraseñas se guardan cifradas. Los tokens de acceso a Google y
            TikTok se almacenan cifrados en tránsito y solo se usan en el
            servidor. Aun así, ningún sistema es 100% seguro: utiliza el Servicio
            siendo consciente de ello.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-ink">8. Cambios</h2>
          <p>
            Podemos actualizar esta política. La versión vigente se publica
            siempre en esta misma URL.
          </p>
        </section>
      </div>
    </div>
  );
}
