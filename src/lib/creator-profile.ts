import { prisma } from "@/lib/prisma";
import {
  buildCreatorProfile,
  type CreatorProfileData,
  type VideoAnalysisResult,
} from "@/lib/ai";

/**
 * Recalcula y persiste el perfil del creador a partir de TODOS sus
 * análisis actuales. Se llama automáticamente tras cada análisis de vídeo.
 */
export async function refreshCreatorProfile(
  userId: string
): Promise<CreatorProfileData | null> {
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    include: { video: true },
    orderBy: { video: { views: "desc" } },
    take: 30,
  });

  if (analyses.length === 0) return null;

  const existing = await prisma.creatorProfile.findUnique({
    where: { userId },
  });

  const mapped = analyses.map((a) => ({
    title: a.video.title,
    views: a.video.views,
    durationSec: a.video.durationSec,
    avgViewPercentage: a.video.avgViewPercentage,
    score: (a.result as unknown as VideoAnalysisResult).scoreOutOf10 ?? 0,
    analysis: a.result as unknown as VideoAnalysisResult,
  }));

  // Define "éxito" combinando visualizaciones (sobre la mediana del creador),
  // retención y score del análisis. El perfil aprende SOLO de los éxitos;
  // los fracasos solo alimentan los anti-patrones (avoidPatterns).
  const viewsSorted = [...mapped.map((m) => m.views)].sort((a, b) => a - b);
  const medianViews =
    viewsSorted[Math.floor(viewsSorted.length / 2)] ?? 0;

  const isSuccess = (m: (typeof mapped)[number]) =>
    m.score >= 7 ||
    m.avgViewPercentage >= 45 ||
    (m.views >= medianViews && m.score >= 6);

  let successful = mapped.filter(isSuccess);
  let underperforming = mapped.filter((m) => !isSuccess(m));

  // Si aún no hay suficientes datos, usa los mejores como referencia positiva.
  if (successful.length === 0) {
    successful = mapped.slice(0, Math.min(3, mapped.length));
    underperforming = [];
  }

  const profile = await buildCreatorProfile({
    previousProfile: (existing?.data as unknown as CreatorProfileData) ?? null,
    successfulVideos: successful,
    underperformingVideos: underperforming,
  });

  await prisma.creatorProfile.upsert({
    where: { userId },
    create: {
      userId,
      data: profile as unknown as object,
      analysesCount: analyses.length,
    },
    update: {
      data: profile as unknown as object,
      analysesCount: analyses.length,
    },
  });

  return profile;
}

export async function getCreatorProfile(
  userId: string
): Promise<CreatorProfileData | null> {
  const p = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!p) return null;
  const data = p.data as unknown as CreatorProfileData;
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}
