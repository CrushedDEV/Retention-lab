export interface ParsedSegment {
  startTime: number;
  endTime: number;
  text: string;
}

/** Convierte "1:23" o "1:02:03" a segundos. Devuelve null si no es timestamp. */
function parseTimestamp(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const c = m[3] != null ? parseInt(m[3], 10) : null;
  if (c != null) return a * 3600 + b * 60 + c; // h:m:s
  return a * 60 + b; // m:s
}

/** Divide un bloque de texto en frases para repartir timestamps. */
function splitIntoSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.match(/[^.!?\n]+[.!?]*/g);
  return (parts ?? [cleaned]).map((s) => s.trim()).filter(Boolean);
}

/**
 * Parsea una transcripción pegada por el usuario.
 * - Si detecta timestamps (formato de "Mostrar transcripción" de YouTube o
 *   inline "0:05 texto"), los usa como inicio de cada segmento.
 * - Si no hay timestamps, divide en frases y las reparte uniformemente a lo
 *   largo de la duración del vídeo.
 */
export function parsePastedTranscript(
  raw: string,
  durationSec = 0
): ParsedSegment[] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Recolecta pares timestamp -> texto
  const collected: { start: number; text: string }[] = [];
  let pendingStart: number | null = null;

  for (const line of lines) {
    // Línea que es SOLO un timestamp (formato YouTube)
    const whole = parseTimestamp(line);
    if (whole != null) {
      pendingStart = whole;
      continue;
    }

    // Timestamp al inicio de la línea: "0:05 texto..."
    const inline = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)$/);
    if (inline) {
      const t = parseTimestamp(inline[1]);
      if (t != null && inline[2]) {
        collected.push({ start: t, text: inline[2] });
        pendingStart = null;
        continue;
      }
    }

    // Línea de texto que sigue a un timestamp suelto
    if (pendingStart != null) {
      collected.push({ start: pendingStart, text: line });
      pendingStart = null;
    } else {
      // texto sin timestamp asociado
      collected.push({ start: -1, text: line });
    }
  }

  const hasTimestamps = collected.some((c) => c.start >= 0);

  if (hasTimestamps) {
    // Normaliza: rellena los -1 con el último start conocido
    let last = 0;
    const withStarts = collected.map((c) => {
      if (c.start >= 0) last = c.start;
      return { start: last, text: c.text };
    });
    return withStarts.map((c, i) => ({
      startTime: c.start,
      endTime:
        i < withStarts.length - 1
          ? withStarts[i + 1].start
          : Math.max(c.start + 4, durationSec || c.start + 4),
      text: c.text,
    }));
  }

  // Sin timestamps: repartir frases por la duración
  const sentences = splitIntoSentences(collected.map((c) => c.text).join(" "));
  if (sentences.length === 0) return [];

  const total = durationSec > 0 ? durationSec : sentences.length * 4;
  const per = total / sentences.length;

  return sentences.map((text, i) => ({
    startTime: Number((i * per).toFixed(2)),
    endTime: Number(((i + 1) * per).toFixed(2)),
    text,
  }));
}
