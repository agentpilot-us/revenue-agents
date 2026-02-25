import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { executePlay } from '@/lib/plays/execute-play';
const executeBodySchema = z.object({
  playId: z.enum([
    'new_buying_group',
    'event_invite',
    'feature_release',
    're_engagement',
    'champion_enablement',
  ]),
  context: z.object({
    accountName: z.string(),
    accountDomain: z.string(),
    accountIndustry: z.string().nullable(),
    segment: z.object({
      id: z.string(),
      name: z.string(),
      valueProp: z.string().nullable(),
      contactCount: z.number(),
      lastActivityDays: z.number().nullable(),
    }),
    events: z
      .array(
        z.object({
          name: z.string(),
          date: z.string(),
          description: z.string(),
        })
      )
      .optional(),
    featureRelease: z
      .object({
        title: z.string(),
        date: z.string(),
        description: z.string(),
      })
      .optional(),
    caseStudy: z
      .object({
        title: z.string(),
        outcome: z.string(),
      })
      .optional(),
    championName: z.string().optional(),
  }),
  ctaUrl: z.string().url().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await context.params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = executeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await executePlay({
      playId: parsed.data.playId,
      companyId,
      userId: session.user.id,
      context: parsed.data.context,
      ctaUrl: parsed.data.ctaUrl,
    });
    const segmentName = parsed.data.context.segment?.name ?? 'account';
    await prisma.activity.create({
      data: {
        companyId,
        userId: session.user.id,
        companyDepartmentId: parsed.data.context.segment?.id ?? null,
        type: 'Play',
        summary: `Play run for ${segmentName}`,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST plays/execute error:', err);
    const message = err instanceof Error ? err.message : 'Execute play failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
