/**
 * GET  /api/play-governance — return PlayGovernance for the current user (or 404 if none).
 * PUT  /api/play-governance — upsert PlayGovernance for the current user.
 * Body: optional fields matching PlayGovernance (maxDiscountPct, multiYearDiscountPct, etc.).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const putBodySchema = z.object({
  maxDiscountPct: z.number().min(0).max(100).optional(),
  multiYearDiscountPct: z.number().min(0).max(100).optional(),
  earlyRenewalDiscountPct: z.number().min(0).max(100).optional(),
  earlyRenewalWindowDays: z.number().int().min(0).optional(),
  defaultCooldownDays: z.number().int().min(0).optional(),
  maxWeeklyTouchesPerContact: z.number().int().min(0).optional(),
  maxWeeklyTouchesPerAccount: z.number().int().min(0).optional(),
  competitiveRules: z.unknown().optional().nullable(),
  valueNarrative: z.string().optional().nullable(),
  renewalMessaging: z.string().optional().nullable(),
  expansionMessaging: z.string().optional().nullable(),
  companyBoilerplate: z.string().optional().nullable(),
  expansionSkus: z.unknown().optional().nullable(),
  brandVoice: z.string().optional().nullable(),
  emailSignatureTemplate: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gov = await prisma.playGovernance.findUnique({
    where: { userId: session.user.id },
  });

  if (!gov) {
    return NextResponse.json({ error: 'PlayGovernance not configured for this user' }, { status: 404 });
  }

  return NextResponse.json({
    id: gov.id,
    maxDiscountPct: gov.maxDiscountPct,
    multiYearDiscountPct: gov.multiYearDiscountPct,
    earlyRenewalDiscountPct: gov.earlyRenewalDiscountPct,
    earlyRenewalWindowDays: gov.earlyRenewalWindowDays,
    defaultCooldownDays: gov.defaultCooldownDays,
    maxWeeklyTouchesPerContact: gov.maxWeeklyTouchesPerContact,
    maxWeeklyTouchesPerAccount: gov.maxWeeklyTouchesPerAccount,
    competitiveRules: gov.competitiveRules,
    valueNarrative: gov.valueNarrative,
    renewalMessaging: gov.renewalMessaging,
    expansionMessaging: gov.expansionMessaging,
    companyBoilerplate: gov.companyBoilerplate,
    expansionSkus: gov.expansionSkus,
    brandVoice: gov.brandVoice,
    emailSignatureTemplate: gov.emailSignatureTemplate,
    createdAt: gov.createdAt.toISOString(),
    updatedAt: gov.updatedAt.toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof putBodySchema>;
  try {
    const json = await req.json();
    body = putBodySchema.parse(json);
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid body', details: e instanceof z.ZodError ? e.flatten() : null },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.maxDiscountPct !== undefined) data.maxDiscountPct = body.maxDiscountPct;
  if (body.multiYearDiscountPct !== undefined) data.multiYearDiscountPct = body.multiYearDiscountPct;
  if (body.earlyRenewalDiscountPct !== undefined) data.earlyRenewalDiscountPct = body.earlyRenewalDiscountPct;
  if (body.earlyRenewalWindowDays !== undefined) data.earlyRenewalWindowDays = body.earlyRenewalWindowDays;
  if (body.defaultCooldownDays !== undefined) data.defaultCooldownDays = body.defaultCooldownDays;
  if (body.maxWeeklyTouchesPerContact !== undefined) data.maxWeeklyTouchesPerContact = body.maxWeeklyTouchesPerContact;
  if (body.maxWeeklyTouchesPerAccount !== undefined) data.maxWeeklyTouchesPerAccount = body.maxWeeklyTouchesPerAccount;
  if (body.competitiveRules !== undefined) data.competitiveRules = body.competitiveRules;
  if (body.valueNarrative !== undefined) data.valueNarrative = body.valueNarrative;
  if (body.renewalMessaging !== undefined) data.renewalMessaging = body.renewalMessaging;
  if (body.expansionMessaging !== undefined) data.expansionMessaging = body.expansionMessaging;
  if (body.companyBoilerplate !== undefined) data.companyBoilerplate = body.companyBoilerplate;
  if (body.expansionSkus !== undefined) data.expansionSkus = body.expansionSkus;
  if (body.brandVoice !== undefined) data.brandVoice = body.brandVoice;
  if (body.emailSignatureTemplate !== undefined) data.emailSignatureTemplate = body.emailSignatureTemplate;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const existing = await prisma.playGovernance.findUnique({
    where: { userId: session.user.id },
  });

  const gov = existing
    ? await prisma.playGovernance.update({
        where: { userId: session.user.id },
        data,
      })
    : await prisma.playGovernance.create({
        data: {
          userId: session.user.id,
          ...data,
        },
      });

  return NextResponse.json({
    id: gov.id,
    maxDiscountPct: gov.maxDiscountPct,
    multiYearDiscountPct: gov.multiYearDiscountPct,
    earlyRenewalDiscountPct: gov.earlyRenewalDiscountPct,
    earlyRenewalWindowDays: gov.earlyRenewalWindowDays,
    defaultCooldownDays: gov.defaultCooldownDays,
    maxWeeklyTouchesPerContact: gov.maxWeeklyTouchesPerContact,
    maxWeeklyTouchesPerAccount: gov.maxWeeklyTouchesPerAccount,
    competitiveRules: gov.competitiveRules,
    valueNarrative: gov.valueNarrative,
    renewalMessaging: gov.renewalMessaging,
    expansionMessaging: gov.expansionMessaging,
    companyBoilerplate: gov.companyBoilerplate,
    expansionSkus: gov.expansionSkus,
    brandVoice: gov.brandVoice,
    emailSignatureTemplate: gov.emailSignatureTemplate,
    updatedAt: gov.updatedAt.toISOString(),
  });
}
