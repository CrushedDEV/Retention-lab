import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { TIKTOK_SCOPES } from "@/lib/tiktok";

// Base64URL sin padding (lo que pide PKCE)
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// GET /api/tiktok/connect → inicia el OAuth de TikTok (con PKCE S256).
export async function GET() {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/login`);
  }

  const state = crypto.randomUUID();
  // PKCE: verifier aleatorio + su SHA-256 (challenge)
  const codeVerifier = base64url(crypto.randomBytes(64));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );

  const redirectUri = `${base}/api/tiktok/callback`;

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY ?? "");
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(url.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("tiktok_oauth_state", state, cookieOpts);
  res.cookies.set("tiktok_oauth_verifier", codeVerifier, cookieOpts);
  return res;
}
