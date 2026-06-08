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
    take: 20,
  });

  if (analyses.length === 0) return null;

  const existing = await prisma.creatorProfile.findUnique({
    where: { userId },
  });

  const profile = await buildCreatorProfile({
    previousProfile: (existing?.data as unknown as CreatorProfileData) ?? null,
    videos: analyses.map((a) => ({
      title: a.video.title,
      views: a.video.views,
      durationSec: a.video.durationSec,
      analysis: a.result as unknown as VideoAnalysisResult,
    })),
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
