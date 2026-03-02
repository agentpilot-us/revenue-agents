'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { seedDefaultRoadmapConfig } from '@/lib/demo/seed-roadmap-config';
import { revalidatePath } from 'next/cache';

/**
 * Seed the current user's Adaptive Roadmap with example signal rules, action mappings,
 * and conditions. No-op if the roadmap already has signal rules.
 * Use when the org shows "No signal rules defined yet" and you want to load a template.
 */
export async function seedRoadmapConfigForCurrentUser(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Unauthorized' };
  }

  let roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id },
    select: { id: true, _count: { select: { signalRules: true } } },
  });

  if (!roadmap) {
    const created = await prisma.adaptiveRoadmap.create({
      data: {
        userId: session.user.id,
        roadmapType: 'enterprise_expansion',
        objective: {
          goalText: 'Expand into new divisions and use cases at target accounts.',
          metric: { type: 'new_use_cases', targetCount: 3, timeHorizon: 'this_quarter' },
        },
        contentStrategy: {
          tone: 'consultative',
          primaryChannels: ['email', 'sales_page'],
          contentTypes: ['executive_briefing', 'use_case_page'],
        },
      },
      select: { id: true },
    });
    roadmap = { id: created.id, _count: { signalRules: 0 } };
  }

  if (roadmap._count.signalRules > 0) {
    revalidatePath('/dashboard/roadmap');
    return { ok: true };
  }

  await seedDefaultRoadmapConfig(roadmap.id);
  revalidatePath('/dashboard/roadmap');
  return { ok: true };
}
