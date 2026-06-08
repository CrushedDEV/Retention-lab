import { prisma } from "@/lib/prisma";
import {
  buildCreatorProfile,
  type CreatorProfileData,
  type VideoAnalysisResult,
} from "@/lib/ai";

export const OWN_SOURCE = "own";

export interface ProfileEntry {
  sourceKey: string;
  label: string;
  data: CreatorProfileData;
  analysesCount: number;
}

/** Clave de fuente para un vídeo: "own" (propio) o el channelId del externo. */
export function sourceKeyForVideo(v: {
  isExternal: boolean;
  channelId: string | null;
}): string {
  if (!v.isExternal) return OWN_SOURCE;
  return v.channelId ?? "external";
}

/**
 * Recalcula y persiste el perfil de una fuente concreta (propio o un creador
 * externo) a partir de TODOS los análisis de vídeos de esa fuente.
 */
export async function refreshCreatorProfile(
  userId: string,
  sourceKey: string,
  label: string
): Promise<CreatorProfileData | null> {
  // Filtro de vídeos según la fuente
  const videoWhere =
    sourceKey === OWN_SOURCE
      ? { userId, isExternal: false }
      : { userId, channelId: sourceKey };

  const analyses = await prisma.analysis.findMany({
    where: { userId, video: videoWhere },
    include: { video: true },
    orderBy: { video: { views: "desc" } },
    take: 30,
  });

  if (analyses.length === 0) return null;

  const existing = await prisma.creatorProfile.findUnique({
    where: { userId_sourceKey: { userId, sourceKey } },
  });

  const mapped = analyses.map((a) => ({
    title: a.video.title,
    views: a.video.views,
    durationSec: a.video.durationSec,
    avgViewPercentage: a.video.avgViewPercentage,
    score: (a.result as unknown as VideoAnalysisResult).scoreOutOf10 ?? 0,
    analysis: a.result as unknown as VideoAnalysisResult,
  }));

  const viewsSorted = [...mapped.map((m) => m.views)].sort((a, b) => a - b);
  const medianViews = viewsSorted[Math.floor(viewsSorted.length / 2)] ?? 0;

  const isSuccess = (m: (typeof mapped)[number]) =>
    m.score >= 7 ||
    m.avgViewPercentage >= 45 ||
    (m.views >= medianViews && m.score >= 6);

  let successful = mapped.filter(isSuccess);
  let underperforming = mapped.filter((m) => !isSuccess(m));

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
    where: { userId_sourceKey: { userId, sourceKey } },
    create: {
      userId,
      sourceKey,
      label,
      data: profile as unknown as object,
      analysesCount: analyses.length,
    },
    update: {
      label,
      data: profile as unknown as object,
      analysesCount: analyses.length,
    },
  });

  return profile;
}

export async function getCreatorProfile(
  userId: string,
  sourceKey: string = OWN_SOURCE
): Promise<CreatorProfileData | null> {
  const p = await prisma.creatorProfile.findUnique({
    where: { userId_sourceKey: { userId, sourceKey } },
  });
  if (!p) return null;
  const data = p.data as unknown as CreatorProfileData;
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

/** Todos los perfiles del usuario (propio primero). */
export async function getCreatorProfiles(
  userId: string
): Promise<ProfileEntry[]> {
  const profiles = await prisma.creatorProfile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return profiles
    .map((p) => ({
      sourceKey: p.sourceKey,
      label: p.label,
      data: p.data as unknown as CreatorProfileData,
      analysesCount: p.analysesCount,
    }))
    .filter((p) => p.data && Object.keys(p.data).length > 0)
    .sort((a, b) => (a.sourceKey === OWN_SOURCE ? -1 : b.sourceKey === OWN_SOURCE ? 1 : 0));
}
