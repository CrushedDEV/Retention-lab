import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { TIKTOK_SCOPES } from "@/lib/tiktok";

// GET /api/tiktok/connect → inicia el OAuth de TikTok.
export async function GET() {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/login`);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${base}/api/tiktok/callback`;

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY ?? "");
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
