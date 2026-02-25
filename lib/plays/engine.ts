import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { PLAYS, type Play, type PlayContext, type PlayId } from './plays-config';

export type SuggestedPlay = {
  play: Play;
  segment: {
    id: string;
    name: string;
    valueProp: string | null;
    contactCount: number;
    lastActivityDays: number | null;
  };
  triggerText: string;
  context: PlayContext;
};

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const NOW = Date.now();

function parseEventDate(content: unknown): Date | null {
  if (!content || typeof content !== 'object') return null;
  const c = content as { eventDate?: string };
  if (!c.eventDate || typeof c.eventDate !== 'string') return null;
  const d = new Date(c.eventDate);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns suggested plays for an account. Phase 1 (demo): at most one suggestion —
 * prefer "New Buying Group" if any department has no campaign and has contacts,
 * else "Event Invite" if there are upcoming events and a department with contacts.
 */
export async function getSuggestedPlays(
  companyId: string,
  userId: string
): Promise<SuggestedPlay[]> {
  const [company, departments, eventItems, featureReleases, caseStudies] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true, name: true, domain: true, industry: true },
    }),
    prisma.companyDepartment.findMany({
      where: { companyId },
      include: {
        contacts: { select: { id: true, seniority: true, title: true } },
        segmentCampaigns: { select: { id: true } },
        activities: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.contentLibrary.findMany({
      where: {
        userId,
        type: ContentType.CompanyEvent,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.contentLibrary.findMany({
      where: {
        userId,
        type: ContentType.FeatureRelease,
        isActive: true,
        archivedAt: null,
        createdAt: { gte: new Date(NOW - NINETY_DAYS_MS) },
      },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.contentLibrary.findMany({
      where: {
        userId,
        type: ContentType.SuccessStory,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
  ]);

  if (!company) return [];

  const upcomingEvents = eventItems
    .map((e) => {
      const content = e.content as unknown;
      const date = parseEventDate(content);
      if (!date || date.getTime() < NOW) return null;
      if (date.getTime() - NOW > SIXTY_DAYS_MS) return null;
      const c = (content as { description?: string }) ?? {};
      return {
        name: e.title,
        date: date.toLocaleDateString(),
        description: c.description ?? '',
      };
    })
    .filter((e): e is { name: string; date: string; description: string } => e !== null)
    .slice(0, 3);

  const latestFeature =
    featureReleases[0] ?
      {
        title: featureReleases[0].title,
        date: featureReleases[0].createdAt.toLocaleDateString(),
        description: (featureReleases[0].content as { description?: string })?.description ?? '',
      }
    : undefined;

  const latestCaseStudy =
    caseStudies[0] ?
      {
        title: caseStudies[0].title,
        outcome: (caseStudies[0].content as { outcome?: string })?.outcome ?? '',
      }
    : undefined;

  const suggestions: SuggestedPlay[] = [];

  for (const dept of departments) {
    const segmentName = dept.customName ?? dept.type.replace(/_/g, ' ');
    const contactCount = dept.contacts.length;
    const hasActivePage = dept.segmentCampaigns.length > 0;
    const lastActivity = dept.activities[0]?.createdAt;
    const daysSinceActivity = lastActivity
      ? Math.floor((NOW - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const hasEconomicBuyer = dept.contacts.some(
      (c) =>
        c.seniority &&
        ['c_suite', 'vp', 'owner', 'partner'].includes(c.seniority.toLowerCase())
    );
    const hasAnyContact = contactCount > 0;
    const champion = dept.contacts.find(
      (c) =>
        c.seniority &&
        ['director', 'manager'].includes(c.seniority.toLowerCase())
    );

    const baseSegment = {
      id: dept.id,
      name: segmentName,
      valueProp: dept.valueProp,
      contactCount,
      lastActivityDays: daysSinceActivity,
    };

    const baseContext: PlayContext = {
      accountName: company.name,
      accountDomain: company.domain ?? '',
      accountIndustry: company.industry,
      segment: baseSegment,
      events: upcomingEvents.length > 0 ? upcomingEvents : undefined,
      featureRelease: latestFeature,
      caseStudy: latestCaseStudy,
    };

    for (const play of PLAYS) {
      const c = play.condition;

      if (
        c.hasUnenrichedBuyingGroups &&
        !hasActivePage &&
        contactCount > 0
      ) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText: `${segmentName} has no sales page yet`,
          context: baseContext,
        });
      }

      if (c.hasUpcomingEvents && upcomingEvents.length > 0 && contactCount > 0) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText: `${upcomingEvents[0].name} is coming up — ${contactCount} contacts to invite`,
          context: baseContext,
        });
      }

      if (c.hasRecentFeatureRelease && latestFeature && contactCount > 0) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText: `"${latestFeature.title}" released — relevant for ${segmentName}`,
          context: { ...baseContext, featureRelease: latestFeature },
        });
      }

      if (
        c.daysSinceLastActivity != null &&
        daysSinceActivity !== null &&
        daysSinceActivity >= c.daysSinceLastActivity &&
        hasActivePage
      ) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText: `${daysSinceActivity} days since last activity in ${segmentName}`,
          context: baseContext,
        });
      }

      if (
        c.hasChampionNoEconomicBuyer &&
        hasAnyContact &&
        !hasEconomicBuyer &&
        champion
      ) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText: `Champion identified in ${segmentName} — no executive contact yet`,
          context: {
            ...baseContext,
            championName: champion.title ?? 'your champion',
          },
        });
      }
    }
  }

  const seen = new Set<PlayId>();
  const deduped = suggestions.filter((s) => {
    if (seen.has(s.play.id)) return false;
    seen.add(s.play.id);
    return true;
  });

  return deduped.slice(0, 3);
}
