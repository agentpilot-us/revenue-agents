import { prisma } from '@/lib/db';
import { getDemoRoadmapConfigForEmail } from './roadmap-templates';

/**
 * Ensure that a demo user has an AdaptiveRoadmap row seeded from the
 * persona-specific template. No-op for non-demo users.
 */
export async function ensureDemoRoadmap(userId: string, email: string | null | undefined) {
  const config = getDemoRoadmapConfigForEmail(email);
  if (!config) return;

  const existing = await prisma.adaptiveRoadmap.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.adaptiveRoadmap.create({
    data: {
      userId,
      roadmapType: config.roadmapType,
      objective: config.objective,
      contentStrategy: config.contentStrategy,
    },
  });
}

