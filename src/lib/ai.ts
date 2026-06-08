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
  segments: { startTime: number; endTime: number; text: string }[];
  creatorProfile?: CreatorProfileData | null;
}): Promise<VideoAnalysisResult> {
  const profileBlock = input.creatorProfile
    ? `Perfil conocido del creador (úsalo como contexto):\n${JSON.stringify(
        input.creatorProfile
      )}`
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
    : "No hay datos de retención de Analytics; infiere las posibles caídas a partir del contenido del guion.";

  const userPrompt = `Analiza este vídeo de YouTube.

TÍTULO: ${input.title}
DURACIÓN: ${formatTs(input.durationSec)}
MÉTRICAS: ${input.views} visualizaciones, ${input.likes} likes, ${input.comments} comentarios.

${retentionBlock}

${profileBlock}

TRANSCRIPCIÓN SEGMENTADA (con timestamps):
${transcriptToText(input.segments)}

Devuelve un JSON con EXACTAMENTE esta forma:
{
  "performanceSummary": "explicación clara de por qué este vídeo funcionó o no, cruzando métricas y guion",
  "retentionDrops": [
    { "approxTimestamp": "0:45", "segmentText": "fragmento aproximado", "reason": "por qué aquí se pierde audiencia", "severity": "alta|media|baja" }
  ],
  "creatorPatterns": ["patrón observable del creador 1", "patrón 2"],
  "recommendations": ["recomendación concreta y accionable 1", "recomendación 2"],
  "hookAssessment": "evaluación de los primeros 5-15 segundos",
  "scoreOutOf10": 7
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

  const userPrompt = `Construye/actualiza el PERFIL DE CREADOR de un mismo autor de YouTube.

REGLA CLAVE: el "estilo" del creador (hookStyle, narrativeStructures, retentionPatterns,
writingTone, summary, avgSuccessfulDurationSec) debe basarse SOLO en sus vídeos que
FUNCIONARON BIEN. NO incorpores como "estilo" las cosas de los vídeos que fracasaron;
esos errores van EXCLUSIVAMENTE en "avoidPatterns" (cosas a evitar en el futuro).
Sintetiza patrones reales y específicos, nunca consejos genéricos.

${
  input.previousProfile
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
}): Promise<GeneratedScriptContent> {
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

  const userPrompt = `Genera un guion de vídeo de YouTube optimizado para retención y crecimiento orgánico.

TEMA: ${input.topic}

${profileBlock}

${topBlock}

El guion debe sonar como este creador (mismo tono y estilo), abrir con un hook fuerte
en su estilo, mantener una estructura narrativa de las que le funcionan y tener una
duración acorde a sus vídeos exitosos.

Devuelve un JSON con EXACTAMENTE esta forma:
{
  "title": "título sugerido y atractivo",
  "hook": "primeras frases / hook listo para grabar",
  "sections": [
    { "heading": "nombre de la sección", "content": "texto del guion listo para grabar", "approxDurationSec": 60 }
  ],
  "callToAction": "cierre y llamada a la acción",
  "estimatedDurationSec": 480,
  "notesForCreator": ["nota de dirección 1", "nota 2"]
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: ANALYST_PERSONA },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as GeneratedScriptContent;
}

export { MODEL };
