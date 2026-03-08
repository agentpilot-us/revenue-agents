import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getPlayActivitySummary,
  getContactEngagementRows,
} from '@/lib/contacts/contact-pulse';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get('companyId') || undefined;
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86_400_000);
  const end = endDate ? new Date(endDate) : new Date();

  const [playSummary, contactEngagement] = await Promise.all([
    getPlayActivitySummary({
      userId: session.user.id,
      companyId,
      startDate: start,
      endDate: end,
    }),
    getContactEngagementRows({
      userId: session.user.id,
      companyId,
      startDate: start,
      endDate: end,
    }),
  ]);

  return NextResponse.json({ playSummary, contactEngagement });
}
