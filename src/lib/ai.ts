import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// ----------------------------------------------------------------------------
// Tipos del resultado estructurado
// ----------------------------------------------------------------------------

export interface RetentionDrop {
  approxTimestamp: string; // ej "0:45"
  segmentText: string;
  reason: string;
  severity: "alta" | "media" | "baja";
}

export interface VideoAnalysisResult {
  performanceSummary: string; // por qué funcionó o no
  retentionDrops: RetentionDrop[];
  creatorPatterns: string[];
  recommendations: string[];
  hookAssessment: string;
  scoreOutOf10: number;
}

export interface CreatorProfileData {
  hookStyle: string;
  avgSuccessfulDurationSec: number;
  narrativeStructures: string[];
  retentionPatterns: string[];
  writingTone: string;
  summary: string;
  // Anti-patrones detectados en vídeos que NO funcionaron. No forman parte
  // del "estilo" del creador: son cosas a EVITAR en futuros guiones.
  avoidPatterns: string[];
}

export interface GeneratedScriptContent {
  title: string;
  hook: string;
  sections: { heading: string; content: string; approxDurationSec: number }[];
  callToAction: string;
  estimatedDurationSec: number;
  notesForCreator: string[];
}

// ----------------------------------------------------------------------------
// Persona del sistema
// ----------------------------------------------------------------------------

const ANALYST_PERSONA = `Eres un analista senior de contenido de YouTube especializado en crecimiento orgánico.
Tu trabajo es analizar guiones de vídeo junto con sus métricas reales de rendimiento y
detectar QUÉ hace que un vídeo retenga o pierda audiencia. Eres directo, concreto y
accionable. Razonas sobre hooks, ritmo, estructura narrativa, claridad y promesas cumplidas.
Basas todo en los datos proporcionados (métricas + transcripción), nunca inventas cifras.
Respondes SIEMPRE en español y SIEMPRE en JSON válido según el esquema pedido.`;

function transcriptToText(
  segments: { startTime: number; endTime: number; text: string }[]
): string {
  return segments
    .map((s) => `[${formatTs(s.startTime)}] ${s.text}`)
    .join("\n");
}

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// Análisis de un vídeo
// ----------------------------------------------------------------------------

export async function analyzeVideo(input: {
  title: string;
  views: number;
  likes: number;
  comments: number;
  durationSec: number;
  avgViewPercentage?: number;
  avgViewDurationSec?: number;
  retentionDropsData?: { t: number; dropPct: number }[];
  channelSubscribers?: number;
  subscribersGained?: number;
  subscribersLost?: number;
  shares?: number;
  estimatedMinutesWatched?: number;
  trafficSources?: { source: string; views: number; pct: number }[];
  tiktok?: { views: number; likes: number; comments: number; shares: number } | null;
  segments: { startTime: number; endTime: number; text: string }[];
  creatorProfile?: CreatorProfileData | null;
  profileVideoCount?: number;
  isExternal?: boolean;
  format?: "SHORT" | "LONG";
}): Promise<VideoAnalysisResult> {
  const count = input.profileVideoCount ?? 0;
  const lowData = count < 4;

  const formatBlock =
    input.format === "SHORT"
      ? `FORMATO: SHORT (vídeo vertical corto). Analízalo con criterios de Shorts:
- El gancho son los PRIMEROS 1-3 SEGUNDOS; no debe haber intros, saludos ni contexto largo.
- La retención depende de enganchar al instante, ritmo altísimo, UNA sola idea clara, y de invitar al re-visionado (loop). Las caídas más críticas están en los primeros segundos.
- Penaliza intros, relleno, ritmo lento o desarrollar varias ideas.
- El "hookAssessment" debe centrarse en esos primeros segundos y en si el primer frame/frase detiene el scroll.`
      : `FORMATO: VÍDEO LARGO (horizontal). Analízalo con criterios de formato largo:
- El gancho son los primeros 15-30s, pero también importa la PROMESA (por qué quedarse) y la estructura por bloques.
- La retención se juega a lo largo de los minutos: transiciones, ritmo sostenido, evitar valles a mitad, cumplir la promesa.
- Valora estructura/capítulos, desarrollo y cierre, no solo el arranque.`;
  const profileBlock = input.creatorProfile
    ? `Perfil conocido del creador (basado en ${count} vídeo(s) analizado(s); úsalo SOLO como contexto de fondo):
${JSON.stringify(input.creatorProfile)}
${
  lowData
    ? "AVISO: el perfil se basa en MUY POCOS vídeos, así que es preliminar y poco fiable. NO lo trates como 'el estilo habitual' del creador ni saques conclusiones fuertes de él."
    : ""
}`
    : "Aún no hay perfil del creador; este puede ser uno de sus primeros análisis.";

  const hasRetention =
    input.retentionDropsData && input.retentionDropsData.length > 0;
  const retentionBlock = hasRetention
    ? `DATOS REALES DE RETENCIÓN (YouTube Analytics). Retención media: ${
        input.avgViewPercentage ?? "?"
      }% (duración media vista: ${formatTs(
        input.avgViewDurationSec ?? 0
      )}). Los momentos con MAYOR caída de audiencia (segundo → % de audiencia perdida) son:
${input.retentionDropsData!
  .map((d) => `  · ${formatTs(d.t)} → -${d.dropPct}%`)
  .join("\n")}
IMPORTANTE: cruza estos timestamps reales con la transcripción para explicar QUÉ se dijo justo ahí que provocó la caída. Basa "retentionDrops" en estos datos reales, no en suposiciones.`
    : input.isExternal
      ? "Este es un vídeo de OTRO creador: NO tienes acceso a sus métricas privadas (retención, duración media de visualización, etc.). Básate SOLO en el guion y en las métricas públicas (vistas, likes, comentarios). NO inventes datos de retención ni cifras privadas; infiere posibles caídas únicamente a partir del contenido del guion y márcalas como hipótesis."
      : "No hay datos de retención de Analytics; infiere las posibles caídas a partir del contenido del guion.";

  const subs = input.channelSubscribers ?? 0;
  const viewsPerSub =
    subs > 0 ? (input.views / subs).toFixed(2) : null;
  const contextBlock = `CONTEXTO DEL CANAL Y MÉTRICAS:
- Suscriptores del canal: ${subs > 0 ? subs.toLocaleString("es-ES") : "desconocido"}
- Visualizaciones: ${input.views.toLocaleString("es-ES")}${
    viewsPerSub
      ? ` (≈ ${viewsPerSub} vistas por suscriptor — INTERPRETA el rendimiento RELATIVO al tamaño del canal: muchas vistas por suscriptor indican que YouTube empujó el vídeo más allá de la base de fans)`
      : ""
  }
- Likes: ${input.likes.toLocaleString("es-ES")} · Comentarios: ${input.comments.toLocaleString("es-ES")}${
    input.shares ? ` · Compartidos: ${input.shares.toLocaleString("es-ES")}` : ""
  }
${
  input.estimatedMinutesWatched
    ? `- Tiempo total visto: ${input.estimatedMinutesWatched.toLocaleString("es-ES")} min`
    : ""
}
${
  input.subscribersGained != null
    ? `- Suscriptores: +${input.subscribersGained} / -${input.subscribersLost ?? 0} (neto ${
        (input.subscribersGained ?? 0) - (input.subscribersLost ?? 0)
      }) atribuidos a este vídeo`
    : ""
}
${
  input.trafficSources && input.trafficSources.length > 0
    ? `- Fuentes de tráfico (de dónde vienen las vistas): ${input.trafficSources
        .map((t) => `${t.source} ${t.pct}%`)
        .join(", ")}. Interpreta esto: "Pantalla de inicio/Sugeridos" altos = YouTube lo recomienda (buen señal de retención); "Búsqueda" alto = funciona por SEO/título; muchos por "Feed de Shorts" = distribución típica de Short.`
    : ""
}
${
  input.tiktok
    ? `\n- MISMO VÍDEO EN TIKTOK: ${input.tiktok.views.toLocaleString("es-ES")} views, ${input.tiktok.likes.toLocaleString("es-ES")} likes, ${input.tiktok.comments.toLocaleString("es-ES")} comentarios, ${input.tiktok.shares.toLocaleString("es-ES")} compartidos. Compara el rendimiento ENTRE PLATAFORMAS: si arrasa en una y no en la otra, razona por qué (hook, formato vertical vs horizontal, audiencia, duración) y tenlo en cuenta en las recomendaciones.`
    : ""
}`;

  const userPrompt = `Analiza este vídeo de YouTube.

TÍTULO: ${input.title}
DURACIÓN: ${formatTs(input.durationSec)}

${contextBlock}

${formatBlock}

${retentionBlock}

${profileBlock}

TRANSCRIPCIÓN SEGMENTADA (con timestamps):
${transcriptToText(input.segments)}

REGLAS DEL ANÁLISIS:
- Juzga el rendimiento SIEMPRE en RELACIÓN al tamaño del canal (suscriptores), no en cifras absolutas: 10.000 vistas son excelentes con 1.000 subs y flojas con 1.000.000.
- Usa las fuentes de tráfico y el tiempo de visualización para explicar POR QUÉ rindió así (distribución de YouTube vs. base de fans vs. búsqueda).
- Juzga este vídeo POR SUS PROPIOS MÉRITOS y por los datos reales (métricas + retención), no por compararlo con vídeos anteriores del creador.
- NO consideres un punto negativo que el vídeo se aparte del tema o estilo "habitual" del creador. Explorar temas distintos es legítimo y a menudo necesario para crecer; no lo penalices ni lo menciones como debilidad salvo que los DATOS de retención lo respalden.
- No asumas que un único tema (p. ej. "polémica") es la fórmula del creador. Evita afirmaciones tajantes sobre su identidad si hay pocos datos.
- Sé concreto: ata cada conclusión a algo del guion o a las métricas/retención.

RÚBRICA DE PUNTUACIÓN (scoreOutOf10) — USA TODO EL RANGO 1-10 y sé crítico. NO uses 7 por defecto:
${
  hasRetention
    ? `- El factor PRINCIPAL es la retención media real (${input.avgViewPercentage ?? "?"}%):
  · <25% → 1-3   · 25-35% → 3-5   · 35-45% → 5-6   · 45-55% → 6-7   · 55-65% → 7-8   · 65-75% → 8-9   · >75% → 9-10
- Ajusta ±1 por la fuerza del hook, la estructura y el engagement (likes/comentarios respecto a las vistas).`
    : `- Sin datos de retención, puntúa la CALIDAD del guion y el engagement:
  · hook flojo + estructura confusa → 1-4
  · correcto pero mejorable → 5-6
  · sólido, buen hook y ritmo → 7-8
  · excelente, difícil de mejorar → 9-10
- Distingue de verdad: la mayoría de vídeos NO son un 7. Reparte notas altas y bajas según el caso.`
}
- Devuelve un entero. Calcula la nota a partir de la rúbrica, no una cifra "segura".

Devuelve un JSON con EXACTAMENTE esta forma (rellena scoreOutOf10 con el número que salga de la rúbrica):
{
  "performanceSummary": "explicación clara de por qué este vídeo funcionó o no, cruzando métricas y guion",
  "retentionDrops": [
    { "approxTimestamp": "0:45", "segmentText": "fragmento aproximado", "reason": "por qué aquí se pierde audiencia", "severity": "alta|media|baja" }
  ],
  "creatorPatterns": ["patrón observable del creador 1", "patrón 2"],
  "recommendations": ["recomendación concreta y accionable 1", "recomendación 2"],
  "hookAssessment": "evaluación de los primeros 5-15 segundos",
  "scoreOutOf10": <entero 1-10 según la rúbrica>
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      { role: "system", content: ANALYST_PERSONA },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as VideoAnalysisResult;
}

// ----------------------------------------------------------------------------
// Actualización del perfil del creador a partir de análisis acumulados
// ----------------------------------------------------------------------------

export async function buildCreatorProfile(input: {
  previousProfile?: CreatorProfileData | null;
  successfulVideos: {
    title: string;
    views: number;
    durationSec: number;
    analysis: VideoAnalysisResult;
  }[];
  underperformingVideos: {
    title: string;
    views: number;
    durationSec: number;
    analysis: VideoAnalysisResult;
  }[];
}): Promise<CreatorProfileData> {
  const summarize = (v: {
    title: string;
    views: number;
    durationSec: number;
    analysis: VideoAnalysisResult;
  }) => ({
    title: v.title,
    views: v.views,
    durationSec: v.durationSec,
    score: v.analysis.scoreOutOf10,
    patterns: v.analysis.creatorPatterns,
    hook: v.analysis.hookAssessment,
    summary: v.analysis.performanceSummary,
  });

  const totalVideos =
    input.successfulVideos.length + input.underperformingVideos.length;
  const lowData = totalVideos < 4;

  const userPrompt = `Construye/actualiza el PERFIL DE CREADOR de un mismo autor de YouTube.

REGLA CLAVE: el "estilo" del creador (hookStyle, narrativeStructures, retentionPatterns,
writingTone, summary, avgSuccessfulDurationSec) debe basarse SOLO en sus vídeos que
FUNCIONARON BIEN. NO incorpores como "estilo" las cosas de los vídeos que fracasaron;
esos errores van EXCLUSIVAMENTE en "avoidPatterns" (cosas a evitar en el futuro).
Sintetiza patrones reales y específicos, nunca consejos genéricos.

${
  lowData
    ? `MUY IMPORTANTE: solo hay ${totalVideos} vídeo(s) analizado(s). Es una muestra mínima.
- NO generalices un único tema/formato como "el estilo del creador".
- Redacta en tono TENTATIVO ("en los pocos datos disponibles…", "parece…"), evita "siempre/suele/habitual".
- No inventes patrones que no se sostengan con tan pocos datos; deja listas cortas o vacías si no hay evidencia.`
    : ""
}

${
  input.previousProfile && !lowData
    ? `Perfil previo (refínalo, no lo borres):\n${JSON.stringify(
        input.previousProfile
      )}\n`
    : ""
}

VÍDEOS QUE FUNCIONARON BIEN (de aquí sale el estilo ganador):
${JSON.stringify(input.successfulVideos.map(summarize))}

VÍDEOS QUE NO FUNCIONARON (de aquí salen SOLO los avoidPatterns):
${
  input.underperformingVideos.length
    ? JSON.stringify(input.underperformingVideos.map(summarize))
    : "(ninguno todavía)"
}

Devuelve un JSON con EXACTAMENTE esta forma:
{
  "hookStyle": "estilo de hooks que mejor le funciona (solo de los éxitos)",
  "avgSuccessfulDurationSec": 480,
  "narrativeStructures": ["estructura narrativa efectiva 1", "..."],
  "retentionPatterns": ["patrón que mantiene a la audiencia 1", "..."],
  "writingTone": "tono y estilo de escritura en sus vídeos exitosos",
  "summary": "resumen de 2-3 frases de su identidad como creador (en positivo)",
  "avoidPatterns": ["error/anti-patrón a evitar 1", "..."]
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.5,
    messages: [
      { role: "system", content: ANALYST_PERSONA },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as CreatorProfileData;
}

// ----------------------------------------------------------------------------
// Generación de un nuevo guion optimizado
// ----------------------------------------------------------------------------

export async function generateScript(input: {
  topic: string;
  creatorProfile?: CreatorProfileData | null;
  topVideos: { title: string; views: number; durationSec: number }[];
  // Fragmentos REALES de guiones del creador (de sus transcripciones) para
  // imitar su voz. Es la señal más importante para que "suene" como él.
  styleExamples?: { title: string; excerpt: string }[];
  format?: "SHORT" | "LONG";
}): Promise<GeneratedScriptContent> {
  const formatBlock =
    input.format === "SHORT"
      ? `FORMATO OBJETIVO: SHORT (vertical, 20-60 segundos).
- UNA sola idea, sin intro ni saludos. La PRIMERA frase es el hook y debe detener el scroll.
- Ritmo rapidísimo, frases muy cortas, lenguaje directo. Remate final potente que invite a repetir/comentar.
- Pocas secciones y muy breves. "estimatedDurationSec" entre 20 y 60.`
      : `FORMATO OBJETIVO: VÍDEO LARGO (horizontal).
- Hook en los primeros segundos + PROMESA clara de lo que verán.
- Estructura por secciones/bloques con desarrollo, ejemplos y transiciones que mantengan el ritmo.
- Cierre con CTA. "estimatedDurationSec" acorde a los vídeos largos exitosos del creador.`;
  const profileBlock = input.creatorProfile
    ? `PERFIL DEL CREADOR (respétalo: tono, hooks, estructura, duración).
Aplica sus patrones ganadores y EVITA explícitamente todo lo listado en "avoidPatterns":
${JSON.stringify(input.creatorProfile)}`
    : "No hay perfil del creador todavía; usa buenas prácticas generales de retención.";

  const topBlock =
    input.topVideos.length > 0
      ? `Vídeos con mejor rendimiento del creador (referencia de lo que le funciona):\n${JSON.stringify(
          input.topVideos
        )}`
      : "";

  const examplesBlock =
    input.styleExamples && input.styleExamples.length > 0
      ? `FRAGMENTOS REALES DE SUS GUIONES (esta es la VOZ que debes imitar: vocabulario,
muletillas, longitud de frase, ritmo, forma de dirigirse a la audiencia, cómo abre y
encadena ideas). Imita ESTA forma de hablar, no un español neutro genérico:
${input.styleExamples
  .map((e, i) => `--- Ejemplo ${i + 1} (${e.title}) ---\n${e.excerpt}`)
  .join("\n\n")}`
      : "No hay transcripciones de ejemplo; imita el tono descrito en el perfil.";

  const userPrompt = `Genera un guion de vídeo de YouTube optimizado para retención y crecimiento orgánico.

TEMA: ${input.topic}

${formatBlock}

${profileBlock}

${topBlock}

${examplesBlock}

INSTRUCCIONES DE ESTILO (críticas):
- El guion debe SONAR como este creador: reutiliza su vocabulario, sus muletillas, su
  longitud de frase y su forma de abrir y de dirigirse a la audiencia que ves en los
  fragmentos reales. No escribas en un tono corporativo/neutro.
- Abre con un hook potente al estilo del creador.
- Mantén una de sus estructuras narrativas que funcionan y una duración acorde a sus éxitos.
- Escribe el contenido como SE HABLA (listo para leer en cámara), no como un artículo.
- No copies frases literales de los ejemplos: imita el ESTILO, con contenido nuevo del tema.

Devuelve un JSON con EXACTAMENTE esta forma:
{
  "title": "título sugerido y atractivo en su estilo",
  "hook": "primeras frases / hook listo para grabar, en su voz",
  "sections": [
    { "heading": "nombre de la sección", "content": "texto del guion hablado, en su voz", "approxDurationSec": 60 }
  ],
  "callToAction": "cierre y llamada a la acción en su estilo",
  "estimatedDurationSec": 480,
  "notesForCreator": ["nota de dirección 1", "nota 2"]
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      { role: "system", content: ANALYST_PERSONA },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as GeneratedScriptContent;
}

export { MODEL };
