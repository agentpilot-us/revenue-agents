import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fetchAccountSignals } from '@/lib/signals/fetch-account-signals';
import { TYPE_DEDUP_DAYS } from '@/lib/signals/constants';

export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const company = await prisma.company.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'No primary company found for this user' },
        { status: 404 }
      );
    }

    const result = await fetchAccountSignals(
      company.name,
      company.domain ?? '',
      company.industry,
      48
    );

    let created = 0;

    for (const signal of result.signals) {
      const existingByUrl = await prisma.accountSignal.findFirst({
        where: { companyId: company.id, url: signal.url },
      });
      if (existingByUrl) continue;

      const dedupDays = TYPE_DEDUP_DAYS[signal.type];
      if (dedupDays != null) {
        const since = new Date();
        since.setDate(since.getDate() - dedupDays);
        const existingByType = await prisma.accountSignal.findFirst({
          where: {
            companyId: company.id,
            type: signal.type,
            publishedAt: { gte: since },
          },
        });
        if (existingByType) continue;
      }

      const publishedAt = new Date(signal.publishedAt);
      if (isNaN(publishedAt.getTime())) {
        publishedAt.setTime(Date.now());
      }

      await prisma.accountSignal.create({
        data: {
          companyId: company.id,
          userId,
          type: signal.type,
          title: signal.title,
          summary: signal.summary,
          url: signal.url,
          publishedAt,
          relevanceScore: signal.relevanceScore,
          suggestedPlay: signal.suggestedPlay ?? null,
          status: 'new',
        },
      });
      created++;
    }

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      created,
    });
  } catch (error) {
    console.error('POST /api/my-company/signals/refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh company signals' },
      { status: 500 }
    );
  }
}

