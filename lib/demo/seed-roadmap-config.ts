/**
 * Default seed for Adaptive Roadmap: conditions and (new play system) SignalPlayMappings
 * and AccountPlayActivations. No longer creates RoadmapSignalRule or RoadmapActionMapping.
 */

import { prisma } from '@/lib/db';

export async function seedDefaultRoadmapConfig(roadmapId: string): Promise<void> {
  const roadmap = await prisma.adaptiveRoadmap.findUnique({
    where: { id: roadmapId },
    select: { userId: true },
  });
  if (!roadmap) return;

  const existingConditions = await prisma.roadmapCondition.count({
    where: { roadmapId },
  });

  // —— New play system: SignalPlayMapping + AccountPlayActivation (idempotent) ——
  const templates = await prisma.playTemplate.findMany({
    where: { userId: roadmap.userId, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 6,
  });
  const firstTemplateId = templates[0]?.id;
  if (firstTemplateId) {
    const signalTypes = ['earnings_call', 'job_posting_signal', 'product_announcement'];
    const mappingData = signalTypes.map((signalType) => ({
      userId: roadmap.userId,
      signalType,
      playTemplateId: firstTemplateId,
      autoActivate: false,
    }));
    await prisma.signalPlayMapping.createMany({
      data: mappingData,
      skipDuplicates: true,
    });
    await prisma.accountPlayActivation.createMany({
      data: templates.slice(0, 3).map((t) => ({
        roadmapId,
        playTemplateId: t.id,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  // —— Conditions & modifiers (only if none exist) ——
  if (existingConditions > 0) return;

  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'event_window',
      config: {
        description: 'Prioritize accounts in a defined event or campaign window',
        defaultDays: 30,
      },
      isActive: true,
    },
  });

  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'product_launch',
      config: {
        description: 'Boost actions when our product has a relevant launch or update',
        appliesTo: ['generate_email', 'generate_page'],
      },
      isActive: true,
    },
  });

  await prisma.roadmapCondition.create({
    data: {
      roadmapId,
      type: 'engagement_threshold',
      config: {
        description: 'Only suggest high-autonomy actions when contact engagement is above threshold',
        minTouchpoints: 2,
      },
      isActive: true,
    },
  });
}
