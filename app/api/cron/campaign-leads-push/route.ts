import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isSalesforceConfigured, salesforceCreateLead } from '@/lib/crm/salesforce';

/**
 * Cron: nightly push of campaign leads to CRM (Salesforce).
 * Call from Vercel Cron or external scheduler; require CRON_SECRET in Authorization header.
 * Pushes CampaignLead records where pushedToCrmAt is null to Salesforce as Leads.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSalesforceConfigured()) {
      return NextResponse.json({
        ok: true,
        pushed: 0,
        message: 'Salesforce not configured; skip campaign leads push.',
      });
    }

    const unpushed = await prisma.campaignLead.findMany({
      where: { pushedToCrmAt: null },
      include: {
        campaign: {
          include: {
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    let pushed = 0;
    const errors: string[] = [];

    for (const lead of unpushed) {
      const companyName = lead.campaign.company?.name ?? null;
      const nameParts = (lead.name ?? '').trim().split(/\s+/);
      const firstName = nameParts.length > 1 ? nameParts[0]! : null;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] ?? null);

      const result = await salesforceCreateLead({
        email: lead.email,
        firstName: firstName ?? null,
        lastName: lastName ?? (lead.name ?? lead.email),
        company: companyName,
        description: lead.message ?? undefined,
      });

      if (result.ok) {
        await prisma.campaignLead.update({
          where: { id: lead.id },
          data: { pushedToCrmAt: new Date() },
        });
        pushed++;
      } else {
        errors.push(`Lead ${lead.id}: ${result.error ?? 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      ok: true,
      pushed,
      total: unpushed.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('Campaign leads push cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Campaign leads push failed' },
      { status: 500 }
    );
  }
}
