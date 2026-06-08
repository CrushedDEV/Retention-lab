# Script Intelligence

SaaS para creadores de contenido que mejora sus guiones de YouTube mediante
análisis basado en el rendimiento real de sus vídeos.

Importa vídeos de tu canal de YouTube, extrae sus captions, revísalas/corrígelas,
y analízalas junto con sus métricas para obtener insights accionables y generar
nuevos guiones optimizados con un perfil de creador que aprende de cada análisis.

## Stack

- **Next.js 14** (App Router) — frontend + backend
- **Tailwind CSS** — estilos
- **PostgreSQL + Prisma** — base de datos / ORM
- **NextAuth** — autenticación (credenciales + Google OAuth para YouTube)
- **OpenAI** — análisis y generación de guiones

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

- **DATABASE_URL**: una base PostgreSQL. Para local puedes usar Docker:
  ```bash
  docker run --name si-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
  ```
  O un proveedor gestionado (Neon, Supabase, Railway).
- **NEXTAUTH_SECRET**: `openssl rand -base64 32`
- **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET**: en [Google Cloud Console](https://console.cloud.google.com/):
  1. Crea un proyecto y habilita **YouTube Data API v3**.
  2. Configura la pantalla de consentimiento OAuth.
  3. Crea credenciales **OAuth 2.0 (aplicación web)**.
  4. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- **OPENAI_API_KEY**: tu clave de OpenAI. `OPENAI_MODEL` por defecto `gpt-4o`.

### 3. Base de datos

```bash
npm run db:push      # crea las tablas según prisma/schema.prisma
```

### 4. Arrancar

```bash
npm run dev
```

Abre http://localhost:3000

## Flujo de uso

1. **Regístrate** en `/register` (email + contraseña).
2. En **Ajustes**, conecta tu cuenta de YouTube (Google OAuth).
3. En **Vídeos**, pulsa **Importar de YouTube** para traer tus vídeos.
4. Abre un vídeo → **Extraer captions** → revisa/edita los segmentos → **Guardar y aprobar**.
5. Pulsa **Analizar vídeo** para generar el análisis con IA.
6. Tu **perfil de creador** se actualiza automáticamente con cada análisis (pestaña Análisis).
7. En **Generador de guiones**, escribe un tema y obtén un guion optimizado.

## Notas técnicas

- Las captions se extraen del endpoint público `timedtext` de YouTube
  (vía `youtube-transcript`), lo que funciona para captions automáticas y manuales
  sin requerir permisos de propietario adicionales.
- El "aprendizaje" del sistema se basa en reglas + síntesis de IA sobre los
  análisis existentes (sin ML propio), tal y como define el MVP.
- Las respuestas de IA usan JSON estructurado para poder renderizarlas de forma fiable.

## Estructura

```
src/
  app/
    (dashboard)/        # área autenticada con sidebar
      dashboard/        # listado de vídeos (página principal)
      videos/[id]/      # vídeo individual: métricas + transcripción + análisis
      analysis/         # listado de análisis + perfil del creador
      generator/        # generador de guiones
      settings/         # cuenta + conexión YouTube
    login/ register/    # autenticación
    api/                # rutas backend (auth, import, transcript, analyze, generate)
  components/           # componentes de UI (cliente y servidor)
  lib/                  # prisma, auth, ai (OpenAI), youtube, perfil del creador
prisma/schema.prisma    # modelo de datos
```
