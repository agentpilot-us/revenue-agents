'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const VERTICALS = ['saas', 'pharma', 'semiconductor', 'fintech'] as const;

export type DemoStepStatus = 'pending' | 'running' | 'done' | 'error';

export async function getAllowDemoSetup(): Promise<boolean> {
  return process.env.ALLOW_DEMO_SETUP === 'true';
}

export async function lockAsDemo(
  companyId: string,
  demoVertical: string,
  demoNote: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      isDemoAccount: true,
      demoVertical: demoVertical || null,
      demoLockedAt: new Date(),
      demoNote: demoNote?.trim() || null,
    },
  });
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

export async function getCompaniesForDemo(userId: string) {
  return prisma.company.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      domain: true,
      isDemoAccount: true,
      demoLockedAt: true,
      demoVertical: true,
      researchData: true,
      _count: { select: { contacts: true, departments: true } },
      accountMessaging: { select: { id: true } },
      segmentCampaigns: { select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export function getVerticals(): readonly string[] {
  return VERTICALS;
}

export async function createDemoCampaign(companyId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const existing = await prisma.segmentCampaign.findFirst({
    where: { companyId },
    select: { id: true, url: true },
  });
  if (existing) return { ok: true, url: existing.url };

  const slugBase = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'demo';
  let slug = slugBase;
  let counter = 1;
  while (await prisma.segmentCampaign.findFirst({ where: { userId: session.user.id, slug } })) {
    slug = `${slugBase}-${counter}`;
    counter++;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const url = `${baseUrl}/go/${slug}`;

  await prisma.segmentCampaign.create({
    data: {
      userId: session.user.id,
      companyId,
      departmentId: null,
      slug,
      title: `${company.name} — Demo`,
      description: null,
      type: 'landing_page',
      url,
      headline: null,
      body: null,
      ctaLabel: null,
      ctaUrl: null,
      isMultiDepartment: false,
    },
  });
  revalidatePath('/dashboard/admin/demo-setup');
  return { ok: true, url };
}

/** Seed a few Activity rows so demo account analytics look live. Use exact type strings that get_account_changes and analytics expect. */
export async function seedDemoActivities(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const data = [
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo email sent', createdAt: threeDaysAgo },
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo follow-up sent', createdAt: threeDaysAgo },
    { companyId, userId: session.user.id, type: 'MEETING_SCHEDULED', summary: 'Demo discovery call scheduled', createdAt: oneWeekAgo },
    { companyId, userId: session.user.id, type: 'Research', summary: 'Account research completed', createdAt: oneWeekAgo },
  ];
  for (const d of data) {
    await prisma.activity.create({ data: d });
  }
  revalidatePath('/dashboard/admin/demo-setup');
  return { ok: true };
}
