import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";

export const TIKTOK_SCOPES = "user.info.basic,video.list";

const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
  "share_url",
  "cover_image_url",
  "create_time",
].join(",");

export interface TikTokVideo {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  shareUrl: string | null;
  cover: string | null;
  createTime: number | null;
}

function mapVideo(v: any): TikTokVideo {
  return {
    id: String(v.id),
    title: v.title || v.video_description || "(sin título)",
    views: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    shareUrl: v.share_url ?? null,
    cover: v.cover_image_url ?? null,
    createTime: v.create_time ?? null,
  };
}

// ---- OAuth: intercambio y refresco de tokens ----

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    open_id: string;
    scope: string;
  }>;
}

/** Devuelve un access_token válido del usuario, refrescándolo si caducó. */
export async function getValidTikTokToken(
  userId: string
): Promise<string | null> {
  const account = await prisma.tikTokAccount.findUnique({ where: { userId } });
  if (!account?.accessToken) return null;

  const now = Math.floor(Date.now() / 1000);
  if (account.expiresAt && account.expiresAt - 60 > now) {
    return account.accessToken;
  }
  if (!account.refreshToken) return account.accessToken;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
      }),
    });
    if (!res.ok) return account.accessToken;
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    await prisma.tikTokAccount.update({
      where: { userId },
      data: {
        accessToken: data.access_token,
        expiresAt: now + data.expires_in,
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      },
    });
    return data.access_token;
  } catch {
    return account.accessToken;
  }
}

// ---- Display API ----

export async function listTikTokVideos(
  accessToken: string,
  maxCount = 20
): Promise<TikTokVideo[]> {
  const res = await fetch(`${API}/video/list/?fields=${VIDEO_FIELDS}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: maxCount }),
  });
  if (!res.ok) throw new Error(`TikTok list ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.data?.videos ?? []).map(mapVideo);
}

export async function queryTikTokVideos(
  accessToken: string,
  videoIds: string[]
): Promise<TikTokVideo[]> {
  const res = await fetch(`${API}/video/query/?fields=${VIDEO_FIELDS}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters: { video_ids: videoIds } }),
  });
  if (!res.ok) throw new Error(`TikTok query ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.data?.videos ?? []).map(mapVideo);
}

/** Extrae el ID numérico de una URL de TikTok; resuelve enlaces cortos. */
export async function resolveTikTokVideoId(
  input: string
): Promise<string | null> {
  const s = input.trim();
  if (/^\d{8,25}$/.test(s)) return s;

  const direct = s.match(/\/video\/(\d{8,25})/);
  if (direct) return direct[1];

  // Enlaces cortos vm./vt.tiktok.com → resolver redirección
  if (/(?:vm|vt)\.tiktok\.com/.test(s)) {
    try {
      const res = await fetch(s, { method: "HEAD", redirect: "follow" });
      const final = res.url;
      const m = final.match(/\/video\/(\d{8,25})/);
      if (m) return m[1];
    } catch {
      // ignora
    }
  }
  return null;
}
