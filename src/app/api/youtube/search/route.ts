import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { searchVideos, extractVideoId, fetchVideoById } from "@/lib/youtube";

// GET /api/youtube/search?q=...  → busca vídeos de cualquier creador.
// Si q es una URL/ID de YouTube, devuelve ese vídeo concreto.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2)
    return NextResponse.json({ error: "Escribe una búsqueda" }, { status: 400 });

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken)
    return NextResponse.json(
      { error: "Conecta tu cuenta de YouTube primero." },
      { status: 400 }
    );

  try {
    // ¿Es una URL/ID directa?
    const id = extractVideoId(q);
    if (id) {
      const v = await fetchVideoById(accessToken, id);
      if (!v)
        return NextResponse.json({ results: [] });
      return NextResponse.json({
        results: [
          {
            youtubeId: v.youtubeId,
            title: v.title,
            channelTitle: v.channelTitle,
            thumbnail: v.thumbnail,
            publishedAt: v.publishedAt,
          },
        ],
      });
    }

    const results = await searchVideos(accessToken, q);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("search error", err);
    return NextResponse.json(
      { error: err?.message ?? "Error en la búsqueda" },
      { status: 500 }
    );
  }
}
