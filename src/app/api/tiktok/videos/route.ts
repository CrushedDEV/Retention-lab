import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidTikTokToken, listTikTokVideos } from "@/lib/tiktok";

// GET /api/tiktok/videos → lista los vídeos de TikTok del usuario (para emparejar).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const token = await getValidTikTokToken(session.user.id);
  if (!token)
    return NextResponse.json(
      { error: "Conecta tu cuenta de TikTok primero (Ajustes)." },
      { status: 400 }
    );

  try {
    const videos = await listTikTokVideos(token, 20);
    return NextResponse.json({ videos });
  } catch (err: any) {
    console.error("tiktok videos error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error obteniendo tus vídeos de TikTok" },
      { status: 500 }
    );
  }
}
