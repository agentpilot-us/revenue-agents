import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PlayContext } from '@/lib/plays/plays-config';
import type { AccountSignal } from '@prisma/client';

/**
 * Builds a PlayContext from an AccountSignal.
 * The signal becomes the triggerSignal in context — the LLM uses it
 * as the specific reason for outreach rather than generating generic copy.
 */
export async function buildContextFromSignal(
  signal: AccountSignal,
  segmentId: string
): Promise<PlayContext> {
  const [company, segment] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: signal.companyId },
      select: { name: true, domain: true, industry: true },
    }),
    prisma.companyDepartment.findUniqueOrThrow({
      where: { id: segmentId },
      select: {
        id: true,
        customName: true,
        type: true,
        valueProp: true,
        _count: { select: { contacts: true } },
      },
    }),
  ]);

  // Pull supporting content from user's library — same pattern as engine.ts
  const [recentEvent, recentFeature, recentCaseStudy] = await Promise.all([
    prisma.contentLibrary.findFirst({
      where: {
        userId: signal.userId,
        type: ContentType.CompanyEvent,
        isActive: true,
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true, createdAt: true },
    }),
    prisma.contentLibrary.findFirst({
      where: {
        userId: signal.userId,
        type: ContentType.FeatureRelease,
        isActive: true,
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true, createdAt: true },
    }),
    prisma.contentLibrary.findFirst({
      where: {
        userId: signal.userId,
        type: ContentType.SuccessStory,
        isActive: true,
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true },
    }),
  ]);

  const eventContent = recentEvent?.content as { eventDate?: string; description?: string } | null;
  const featureContent = recentFeature?.content as { description?: string } | null;
  const caseStudyContent = recentCaseStudy?.content as { outcome?: string } | null;

  const segmentName = segment.customName ?? segment.type.replace(/_/g, ' ');

  return {
    accountName: company.name,
    accountDomain: company.domain ?? '',
    accountIndustry: company.industry,
    segment: {
      id: segment.id,
      name: segmentName,
      valueProp: segment.valueProp ?? null,
      contactCount: segment._count.contacts,
      lastActivityDays: null,
    },
    events: recentEvent
      ? [
          {
            name: recentEvent.title,
            date: eventContent?.eventDate ?? recentEvent.createdAt.toISOString(),
            description: eventContent?.description ?? '',
          },
        ]
      : undefined,
    featureRelease: recentFeature
      ? {
          title: recentFeature.title,
          date: recentFeature.createdAt.toISOString(),
          description: featureContent?.description ?? '',
        }
      : undefined,
    caseStudy: recentCaseStudy
      ? {
          title: recentCaseStudy.title,
          outcome: caseStudyContent?.outcome ?? '',
        }
      : undefined,
    triggerSignal: {
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      publishedAt: signal.publishedAt.toISOString(),
    },
  };
}
