import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type SignalTier = 1 | 2 | 3;

interface Signal {
  tier: SignalTier;
  date: string; // ISO date
  headline: string;
  description: string;
  cta: { label: string; action: string };
  metadata: { contactId?: string; departmentId?: string; campaignId?: string };
}

const execPattern = /CFO|CIO|CTO|CISO|CEO|VP|Vice President|Head|President|Director/i;
const strategicKeywords = /partnership|funding|acquisition|strategy|initiative|launch|expansion|merger/i;

function classifyTier1(
  visit: { visitorJobTitle?: string | null; ctaClicked?: boolean; formSubmitted?: boolean },
  activity: { type: string; contact?: { title?: string | null } | null } | null,
  visitCount: number
): boolean {
  // Exec-level page view with CTA click
  if (visit.visitorJobTitle && execPattern.test(visit.visitorJobTitle) && visit.ctaClicked) {
    return true;
  }
  
  // Form submission
  if (visit.formSubmitted) {
    return true;
  }
  
  // Email reply from exec
  if (activity && (activity.type === 'EmailReply' || activity.type === 'EMAIL_REPLY')) {
    if (activity.contact?.title && execPattern.test(activity.contact.title)) {
      return true;
    }
  }
  
  // Multiple visits from same org (handled separately)
  if (visitCount >= 3) {
    return true;
  }
  
  return false;
}

function classifyTier2(
  contentChange: { content?: string | null; previousContent?: any } | null,
  company: { keyInitiatives?: string[] | null; updatedAt?: Date; researchData?: any }
): boolean {
  // Content library changes with strategic keywords
  if (contentChange) {
    const content = contentChange.content || '';
    const previous = contentChange.previousContent;
    if (previous && strategicKeywords.test(content)) {
      return true;
    }
  }
  
  // Company initiatives updated (check if updated recently)
  if (company.keyInitiatives && company.keyInitiatives.length > 0) {
    // This would need to track when initiatives were last updated
    // For now, we'll check if researchData exists and was updated recently
    if (company.researchData) {
      return true;
    }
  }
  
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        keyInitiatives: true,
        updatedAt: true,
        researchData: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signals: Signal[] = [];

    // Fetch campaign visits
    const visits = await prisma.campaignVisit.findMany({
      where: {
        campaign: { companyId },
        visitedAt: { gte: startDate },
      },
      select: {
        id: true,
        visitorJobTitle: true,
        visitorEmail: true,
        visitorCompany: true,
        ctaClicked: true,
        formSubmitted: true,
        visitedAt: true,
        departmentId: true,
        campaignId: true,
      },
      orderBy: { visitedAt: 'desc' },
    });

    // Group visits by company for Tier 1 detection
    const visitsByCompany: Record<string, number> = {};
    visits.forEach(v => {
      if (v.visitorCompany) {
        visitsByCompany[v.visitorCompany] = (visitsByCompany[v.visitorCompany] || 0) + 1;
      }
    });

    // Process visits for Tier 1 signals
    visits.forEach(visit => {
      const visitCount = visit.visitorCompany ? (visitsByCompany[visit.visitorCompany] || 0) : 0;
      
      if (classifyTier1(visit, null, visitCount)) {
        let headline = '';
        let description = '';
        
        if (visit.formSubmitted) {
          headline = 'Form submitted on landing page';
          description = visit.visitorEmail 
            ? `Contact ${visit.visitorEmail} submitted a form`
            : 'A visitor submitted a form';
        } else if (visit.ctaClicked && visit.visitorJobTitle && execPattern.test(visit.visitorJobTitle)) {
          headline = `${visit.visitorJobTitle} viewed page and clicked CTA`;
          description = visit.visitorEmail 
            ? `High-value engagement from ${visit.visitorEmail}`
            : 'Executive-level engagement detected';
        } else if (visitCount >= 3) {
          headline = `Multiple visits from ${visit.visitorCompany}`;
          description = `${visitCount} visits detected from this organization`;
        }
        
        if (headline) {
          signals.push({
            tier: 1,
            date: visit.visitedAt.toISOString(),
            headline,
            description,
            cta: {
              label: 'Follow up',
              action: visit.visitorEmail ? `contact:${visit.visitorEmail}` : `campaign:${visit.campaignId}`,
            },
            metadata: {
              departmentId: visit.departmentId || undefined,
              campaignId: visit.campaignId || undefined,
            },
          });
        }
      }
    });

    // Fetch activities for Tier 1 (email replies from execs)
    const activities = await prisma.activity.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
        type: { in: ['EmailReply', 'EMAIL_REPLY'] },
      },
      select: {
        id: true,
        type: true,
        summary: true,
        createdAt: true,
        contactId: true,
        companyDepartmentId: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    activities.forEach(activity => {
      if (activity.contact?.title && execPattern.test(activity.contact.title)) {
        const contactName = [activity.contact.firstName, activity.contact.lastName]
          .filter(Boolean)
          .join(' ') || activity.contact.email || 'Contact';
        
        signals.push({
          tier: 1,
          date: activity.createdAt.toISOString(),
          headline: `${activity.contact.title} replied to email`,
          description: `${contactName} responded to your outreach`,
          cta: {
            label: 'View contact',
            action: `contact:${activity.contactId}`,
          },
          metadata: {
            contactId: activity.contactId || undefined,
            departmentId: activity.companyDepartmentId || undefined,
          },
        });
      }
    });

    // Fetch content library changes for Tier 2
    const contentChanges = await prisma.contentLibrary.findMany({
      where: {
        company: { some: { id: companyId } },
        previousContent: { not: null },
        scrapedAt: { gte: startDate },
      },
      select: {
        id: true,
        title: true,
        markdown: true,
        fullText: true,
        previousContent: true,
        scrapedAt: true,
      },
      orderBy: { scrapedAt: 'desc' },
    });

    contentChanges.forEach(content => {
      const contentText = content.markdown || content.fullText || '';
      if (strategicKeywords.test(contentText)) {
        signals.push({
          tier: 2,
          date: content.scrapedAt.toISOString(),
          headline: `Strategic content change detected: ${content.title}`,
          description: 'Content update suggests new initiatives or strategic direction',
          cta: {
            label: 'Review changes',
            action: `content:${content.id}`,
          },
          metadata: {},
        });
      }
    });

    // Check for company research updates (Tier 2)
    if (company.researchData && company.updatedAt >= startDate) {
      signals.push({
        tier: 2,
        date: company.updatedAt.toISOString(),
        headline: 'Account research updated',
        description: 'New research data available for this account',
        cta: {
          label: 'View research',
          action: `research:${companyId}`,
        },
        metadata: {},
      });
    }

    // Tier 3: All other activities and visits
    const otherVisits = visits.filter(v => {
      const visitCount = v.visitorCompany ? (visitsByCompany[v.visitorCompany] || 0) : 0;
      return !classifyTier1(v, null, visitCount);
    });

    otherVisits.forEach(visit => {
      signals.push({
        tier: 3,
        date: visit.visitedAt.toISOString(),
        headline: 'Page view',
        description: visit.visitorEmail 
          ? `Visit from ${visit.visitorEmail}`
          : 'Anonymous page view',
        cta: {
          label: 'View details',
          action: `campaign:${visit.campaignId}`,
        },
        metadata: {
          departmentId: visit.departmentId || undefined,
          campaignId: visit.campaignId || undefined,
        },
      });
    });

    const otherActivities = activities.filter(a => {
      if (!a.contact?.title) return true;
      return !execPattern.test(a.contact.title);
    });

    otherActivities.forEach(activity => {
      signals.push({
        tier: 3,
        date: activity.createdAt.toISOString(),
        headline: activity.summary || 'Activity',
        description: 'General account activity',
        cta: {
          label: 'View activity',
          action: `activity:${activity.id}`,
        },
        metadata: {
          contactId: activity.contactId || undefined,
          departmentId: activity.companyDepartmentId || undefined,
        },
      });
    });

    // Sort by date (most recent first) and tier (Tier 1 first)
    signals.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({ signals });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/signals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
