import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { generateSalesPageSections } from '@/lib/campaigns/generate-sales-page';
import { isDemoAccount } from '@/lib/demo/is-demo-account';

const bodySchema = z.object({
  pageType: z.enum(['feature_announcement', 'event_invite', 'account_intro', 'case_study']),
  departmentId: z.string().optional().nullable(),
  userGoal: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    if (await isDemoAccount(companyId)) {
      return NextResponse.json(
        { error: 'Demo account cannot generate new sales pages.' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await generateSalesPageSections({
      companyId,
      userId: session.user.id,
      pageType: parsed.data.pageType,
      departmentId: parsed.data.departmentId ?? undefined,
      userGoal: parsed.data.userGoal ?? undefined,
    });

    if (!result.ok) {
      const status = result.error.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch (e) {
    console.error('POST /api/companies/[companyId]/campaigns/generate error:', e);
    const message = e instanceof Error ? e.message : 'Generate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
