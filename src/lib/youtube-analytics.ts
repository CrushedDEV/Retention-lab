const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";

export interface RetentionPoint {
  t: number; // segundos transcurridos del vídeo
  watchRatio: number; // 1.0 = 100% de la audiencia inicial
}

export interface TrafficSource {
  source: string; // etiqueta legible
  views: number;
  pct: number; // % del total
}

export interface VideoAnalytics {
  avgViewDurationSec: number;
  avgViewPercentage: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedMinutesWatched: number;
  shares: number;
  retentionCurve: RetentionPoint[];
  trafficSources: TrafficSource[];
  errors: string[];
}

// Etiquetas legibles para los tipos de fuente de tráfico de YouTube.
const TRAFFIC_LABELS: Record<string, string> = {
  YT_SEARCH: "Búsqueda de YouTube",
  RELATED_VIDEO: "Vídeos sugeridos",
  BROWSE: "Pantalla de inicio / Explorar",
  SHORTS: "Feed de Shorts",
  YT_CHANNEL: "Página del canal",
  PLAYLIST: "Playlists",
  EXT_URL: "Fuentes externas",
  NOTIFICATION: "Notificaciones",
  SUBSCRIBER: "Suscripciones (feed)",
  END_SCREEN: "Pantallas finales",
  ANNOTATION: "Tarjetas / anotaciones",
  NO_LINK_OTHER: "Otros",
  ADVERTISING: "Publicidad",
  HASHTAGS: "Hashtags",
};

async function query(params: Record<string, string>, accessToken: string) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS}?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Analytics ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Obtiene métricas avanzadas y la curva de retención de un vídeo del canal.
 * Requiere el scope yt-analytics.readonly. Degrada con gracia si algo falla.
 */
export async function fetchVideoAnalytics(
  accessToken: string,
  youtubeId: string,
  publishedAt: Date | null,
  durationSec: number
): Promise<VideoAnalytics> {
  const startDate = publishedAt ? ymd(publishedAt) : "2010-01-01";
  const endDate = ymd(new Date());

  const result: VideoAnalytics = {
    avgViewDurationSec: 0,
    avgViewPercentage: 0,
    subscribersGained: 0,
    subscribersLost: 0,
    estimatedMinutesWatched: 0,
    shares: 0,
    retentionCurve: [],
    trafficSources: [],
    errors: [],
  };

  // 1) Métricas resumen
  try {
    const summary = await query(
      {
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics:
          "averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,estimatedMinutesWatched,shares",
        filters: `video==${youtubeId}`,
      },
      accessToken
    );
    const row = summary.rows?.[0];
    if (row) {
      result.avgViewDurationSec = Math.round(row[0] ?? 0);
      result.avgViewPercentage = Number((row[1] ?? 0).toFixed(1));
      result.subscribersGained = Math.round(row[2] ?? 0);
      result.subscribersLost = Math.round(row[3] ?? 0);
      result.estimatedMinutesWatched = Math.round(row[4] ?? 0);
      result.shares = Math.round(row[5] ?? 0);
    }
  } catch (e: any) {
    console.error("analytics summary error", e);
    result.errors.push(String(e?.message ?? e));
  }

  // 1b) Fuentes de tráfico (de dónde vienen las vistas)
  try {
    const traffic = await query(
      {
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics: "views",
        dimensions: "insightTrafficSourceType",
        filters: `video==${youtubeId}`,
        sort: "-views",
      },
      accessToken
    );
    const rows: [string, number][] = traffic.rows ?? [];
    const total = rows.reduce((s, r) => s + (r[1] ?? 0), 0) || 1;
    result.trafficSources = rows
      .map(([source, views]) => ({
        source: TRAFFIC_LABELS[source] ?? source,
        views: Math.round(views ?? 0),
        pct: Number((((views ?? 0) / total) * 100).toFixed(1)),
      }))
      .filter((t) => t.views > 0)
      .slice(0, 6);
  } catch (e: any) {
    console.error("analytics traffic error", e);
    result.errors.push(String(e?.message ?? e));
  }

  // 2) Curva de retención (audienceWatchRatio por elapsedVideoTimeRatio)
  try {
    const retention = await query(
      {
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics: "audienceWatchRatio",
        dimensions: "elapsedVideoTimeRatio",
        filters: `video==${youtubeId}`,
      },
      accessToken
    );
    const rows: number[][] = retention.rows ?? [];
    result.retentionCurve = rows.map(([ratio, watchRatio]) => ({
      t: Number((ratio * durationSec).toFixed(1)),
      watchRatio: Number((watchRatio ?? 0).toFixed(3)),
    }));
  } catch (e: any) {
    console.error("analytics retention error", e);
    result.errors.push(String(e?.message ?? e));
  }

  return result;
}

/**
 * Detecta las mayores caídas de retención en la curva (descensos bruscos).
 * Devuelve hasta `max` puntos donde más audiencia se pierde.
 */
export function detectRetentionDrops(
  curve: RetentionPoint[],
  max = 4
): { t: number; dropPct: number }[] {
  if (curve.length < 3) return [];
  const drops: { t: number; dropPct: number }[] = [];
  for (let i = 1; i < curve.length; i++) {
    const delta = curve[i - 1].watchRatio - curve[i].watchRatio;
    if (delta > 0) {
      drops.push({
        t: curve[i].t,
        dropPct: Number((delta * 100).toFixed(1)),
      });
    }
  }
  return drops.sort((a, b) => b.dropPct - a.dropPct).slice(0, max);
}
