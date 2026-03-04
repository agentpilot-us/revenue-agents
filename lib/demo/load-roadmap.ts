import { prisma } from '@/lib/db';
import { getDemoRoadmapConfigForEmail } from './roadmap-templates';
import { seedDefaultRoadmapConfig } from './seed-roadmap-config';

/**
 * Ensure that a demo user has an AdaptiveRoadmap row seeded from the
 * persona-specific template. No-op for non-demo users.
 * When a roadmap is created (or already exists with no signal rules), seeds
 * default signal rules, action mappings, and conditions so the org shows config.
 */
export async function ensureDemoRoadmap(userId: string, email: string | null | undefined, companyId?: string) {
  const config = getDemoRoadmapConfigForEmail(email);
  if (!config) return;
  if (!companyId) return;

  const existing = await prisma.adaptiveRoadmap.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { id: true, _count: { select: { signalRules: true } } },
  });

  if (existing) {
    if (existing._count.signalRules === 0) {
      await seedDefaultRoadmapConfig(existing.id);
    }
    return;
  }

  const roadmap = await prisma.adaptiveRoadmap.create({
    data: {
      userId,
      companyId,
      roadmapType: config.roadmapType,
      objective: config.objective ?? undefined,
      contentStrategy: config.contentStrategy ?? undefined,
    },
  });
  await seedDefaultRoadmapConfig(roadmap.id);
}
