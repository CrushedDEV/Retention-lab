import { YoutubeTranscript } from "youtube-transcript";

const API = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideoData {
  youtubeId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
  durationSec: number;
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
}

async function ytFetch(path: string, accessToken: string) {
  const res = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body}`);
  }
  return res.json();
}

// Convierte duración ISO 8601 (PT1M30S) a segundos
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (
    (parseInt(h ?? "0") || 0) * 3600 +
    (parseInt(m ?? "0") || 0) * 60 +
    (parseInt(s ?? "0") || 0)
  );
}

/**
 * Importa los últimos vídeos del canal del usuario (subidas) con métricas.
 */
export async function fetchChannelVideos(
  accessToken: string,
  maxResults = 25
): Promise<YouTubeVideoData[]> {
  // 1. Canal del usuario -> playlist de subidas
  const channelData = await ytFetch(
    "channels?part=contentDetails&mine=true",
    accessToken
  );
  const uploadsPlaylist =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) return [];

  // 2. Items de la playlist de subidas
  const playlistData = await ytFetch(
    `playlistItems?part=contentDetails&maxResults=${maxResults}&playlistId=${uploadsPlaylist}`,
    accessToken
  );
  const videoIds: string[] = (playlistData.items ?? [])
    .map((it: any) => it.contentDetails?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // 3. Detalles + estadísticas de cada vídeo
  const videosData = await ytFetch(
    `videos?part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`,
    accessToken
  );

  return (videosData.items ?? []).map((v: any): YouTubeVideoData => {
    const thumbs = v.snippet?.thumbnails ?? {};
    const thumb =
      thumbs.maxres?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      null;
    return {
      youtubeId: v.id,
      title: v.snippet?.title ?? "(sin título)",
      url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail: thumb,
      publishedAt: v.snippet?.publishedAt ?? null,
      views: parseInt(v.statistics?.viewCount ?? "0") || 0,
      likes: parseInt(v.statistics?.likeCount ?? "0") || 0,
      comments: parseInt(v.statistics?.commentCount ?? "0") || 0,
      durationSec: parseDuration(v.contentDetails?.duration ?? ""),
    };
  });
}

/**
 * Extrae las captions (automáticas o subidas) de un vídeo público mediante
 * el endpoint timedtext. Devuelve segmentos con start/end/text.
 * Lanza si no hay captions disponibles.
 */
export async function fetchCaptions(
  youtubeId: string,
  lang?: string
): Promise<CaptionSegment[]> {
  const raw = await YoutubeTranscript.fetchTranscript(youtubeId, {
    lang: lang || undefined,
  });

  return raw.map((item) => {
    const start = item.offset / 1000; // ms -> s
    const dur = item.duration / 1000;
    return {
      startTime: Number(start.toFixed(2)),
      endTime: Number((start + dur).toFixed(2)),
      text: decodeHtmlEntities(item.text).trim(),
    };
  });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n/g, " ");
}
