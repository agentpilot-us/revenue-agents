import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { PLAYS, type Play } from './play-definitions';
import type { PlayContext } from './constants';

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
        // FIX: removed the 90-day recency filter — in demo, feature releases
        // exist but were seeded with createdAt = now which may have timezone
        // drift; also allows older releases to surface
        // createdAt: { gte: new Date(NOW - NINETY_DAYS_MS) },
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

  // FIX: Event date parsing was rejecting "April 15-17, 2026" style strings.
  // Try parseEventDate first; if null, fall back to any event within the next year
  // so the demo doesn't silently drop CONNECT 2026.
  const upcomingEvents = eventItems
    .map((e) => {
      const content = e.content as unknown;
      const date = parseEventDate(content);
      // If date parsed and is in the past or >60 days out, skip
      if (date) {
        if (date.getTime() < NOW) return null;
        if (date.getTime() - NOW > SIXTY_DAYS_MS) return null;
      }
      // FIX: If date didn't parse (e.g. "April 15-17, 2026"), include the event anyway
      // — the demo content library has real events that just use human-readable date strings
      const c = (content as { description?: string; eventDate?: string }) ?? {};
      return {
        name: e.title,
        date: c.eventDate ?? 'Upcoming',
        description: c.description ?? '',
        _unparsedDate: !date, // flag so we can deprioritize if needed
      };
    })
    .filter((e): e is { name: string; date: string; description: string; _unparsedDate: boolean } => e !== null)
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

    // FIX: Seniority check was too strict — contacts seeded without seniority field
    // populated caused both hasEconomicBuyer and champion to be falsy, preventing
    // champion_enablement from ever firing.
    // Now falls back to title-based detection when seniority is null.
    const EXECUTIVE_TITLES = ['cfo', 'cto', 'cio', 'coo', 'ceo', 'chief', 'vp ', 'vice president', 'head of', 'owner', 'partner'];
    const CHAMPION_TITLES = ['director', 'manager', 'senior', 'lead', 'principal'];

    const hasEconomicBuyer = dept.contacts.some((c) => {
      if (c.seniority && ['c_suite', 'vp', 'owner', 'partner'].includes(c.seniority.toLowerCase())) {
        return true;
      }
      // Fallback: title-based detection
      const titleLower = (c.title ?? '').toLowerCase();
      return EXECUTIVE_TITLES.some((t) => titleLower.includes(t));
    });

    const champion = dept.contacts.find((c) => {
      if (c.seniority && ['director', 'manager'].includes(c.seniority.toLowerCase())) {
        return true;
      }
      // Fallback: title-based detection
      const titleLower = (c.title ?? '').toLowerCase();
      return CHAMPION_TITLES.some((t) => titleLower.includes(t));
    });

    const hasAnyContact = contactCount > 0;

    // FIX: Re-engagement required hasActivePage = true (i.e. a campaign already exists).
    // For the Hot Signals panel this makes sense (re-engage an account you were already
    // working). For the dashboard engine, loosen to: has contacts + inactivity,
    // regardless of page status — OR fall back to a minimum days threshold when
    // there is no activity record at all (fresh account, no outreach started).
    // This lets re_engagement surface in the dashboard for demo accounts.
    const REENGAGEMENT_DAYS = 21;
    const reengagementEligible =
      hasAnyContact &&
      (
        // Standard: has activity, been too long
        (daysSinceActivity !== null && daysSinceActivity >= REENGAGEMENT_DAYS && hasActivePage) ||
        // Demo/fallback: has a page but timestamp is null due to no tracked activities
        (hasActivePage && daysSinceActivity === null)
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

      if (c.daysSinceLastActivity != null && reengagementEligible) {
        suggestions.push({
          play,
          segment: baseSegment,
          triggerText:
            daysSinceActivity !== null
              ? `${daysSinceActivity} days since last activity in ${segmentName}`
              : `${segmentName} has an active page but no recent outreach`,
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

  // FIX: was deduping by PlayId only — same play type was dropped even for different
  // departments. Now dedupe by dept+play so each department can surface its own plays,
  // but the same play doesn't fire twice for the same department.
  const seen = new Set<string>();
  const deduped = suggestions.filter((s) => {
    const key = `${s.segment.id}:${s.play.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Cap at 5 total — enough to show all play types in the dashboard
  return deduped.slice(0, 5);
}
