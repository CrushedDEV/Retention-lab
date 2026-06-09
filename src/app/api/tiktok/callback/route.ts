import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeCode } from "@/lib/tiktok";

// GET /api/tiktok/callback → recibe el code, intercambia tokens y los guarda.
export async function GET(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(`${base}/login`);

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("tiktok_oauth_state")?.value;
  const codeVerifier = req.cookies.get("tiktok_oauth_verifier")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${base}/settings?tiktok=error`);
  }

  try {
    const tok = await exchangeCode(
      code,
      `${base}/api/tiktok/callback`,
      codeVerifier
    );

    // Datos de perfil (opcional, para mostrar el nombre)
    let displayName: string | null = null;
    let avatarUrl: string | null = null;
    try {
      const u = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${tok.access_token}` } }
      );
      if (u.ok) {
        const data = await u.json();
        displayName = data.data?.user?.display_name ?? null;
        avatarUrl = data.data?.user?.avatar_url ?? null;
      }
    } catch {
      // ignora
    }

    const now = Math.floor(Date.now() / 1000);
    await prisma.tikTokAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        openId: tok.open_id,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: now + tok.expires_in,
        scope: tok.scope,
        displayName,
        avatarUrl,
      },
      update: {
        openId: tok.open_id,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: now + tok.expires_in,
        scope: tok.scope,
        ...(displayName ? { displayName } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });

    const res = NextResponse.redirect(`${base}/settings?tiktok=ok`);
    res.cookies.delete("tiktok_oauth_state");
    res.cookies.delete("tiktok_oauth_verifier");
    return res;
  } catch (e) {
    console.error("tiktok callback error", e);
    return NextResponse.redirect(`${base}/settings?tiktok=error`);
  }
}
