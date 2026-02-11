import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEngagementScore } from '@/lib/engagement/score';

const DORMANT_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cron: daily engagement scoring.
 * Secure with CRON_SECRET (Bearer token in Authorization header).
 * Optional: ?companyId=... to limit to one company.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting engagement score calculation...');

    const companyId = req.nextUrl.searchParams.get('companyId') ?? undefined;
    const contacts = await prisma.contact.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        totalEmailsSent: { gt: 0 },
      },
      select: {
        id: true,
        totalEmailsSent: true,
        totalEmailsOpened: true,
        totalEmailsClicked: true,
        totalEmailsReplied: true,
        lastEmailRepliedAt: true,
        lastContactedAt: true,
      },
    });

    console.log(`Found ${contacts.length} contacts to process`);

    let updated = 0;

    for (const contact of contacts) {
      const score = calculateEngagementScore(contact);
      const isDormant = contact.lastContactedAt
        ? Date.now() - new Date(contact.lastContactedAt).getTime() > DORMANT_DAYS_MS
        : true;
      const isResponsive = (contact.totalEmailsReplied ?? 0) > 0;

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          engagementScore: score,
          isResponsive,
          isDormant,
        },
      });

      updated++;
    }

    console.log(`Updated ${updated} contacts`);

    return NextResponse.json({
      success: true,
      processed: contacts.length,
      updated,
    });
  } catch (e) {
    console.error('Engagement scoring error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
