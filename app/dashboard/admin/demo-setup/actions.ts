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
  if (!company) return { ok: false, error: 'Company not found' };

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

export async function getVerticals(): Promise<readonly string[]> {
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

  const depts = await prisma.companyDepartment.findMany({
    where: { companyId },
    select: { id: true },
    take: 2,
  });
  const firstDeptId = depts[0]?.id ?? null;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const data = [
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo email sent', createdAt: threeDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'EMAIL_SENT', summary: 'Demo follow-up sent', createdAt: threeDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'MEETING_SCHEDULED', summary: 'Demo discovery call scheduled', createdAt: oneWeekAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Research', summary: 'Account research completed', createdAt: oneWeekAgo },
    { companyId, userId: session.user.id, type: 'Research', summary: 'Buying groups identified', createdAt: oneWeekAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Contact Added', summary: 'Contacts added to buying group', createdAt: twoDaysAgo, companyDepartmentId: firstDeptId },
    { companyId, userId: session.user.id, type: 'Landing Page Visit', summary: 'Visited sales page', createdAt: twoDaysAgo, companyDepartmentId: firstDeptId },
  ];
  for (const d of data) {
    await prisma.activity.create({ data: d });
  }
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

/** Seed campaign visits so Engagement tab and Sales Page engagement preview show non-zero metrics. */
export async function seedDemoCampaignVisits(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Demo setup not enabled' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const campaigns = await prisma.segmentCampaign.findMany({
    where: { companyId },
    select: { id: true, departmentId: true },
    take: 2,
  });
  if (campaigns.length === 0) return { ok: false, error: 'No campaign found. Create a sales page first.' };

  const campaign = campaigns[0];
  const contactEmails = await prisma.contact.findMany({
    where: { companyId },
    select: { email: true },
    take: 5,
  });
  const emails = contactEmails.map((c) => c.email).filter(Boolean) as string[];

  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const visits: Array<{
    campaignId: string;
    departmentId: string | null;
    visitorEmail: string | null;
    timeOnPage: number;
    chatMessages: number;
    ctaClicked: boolean;
    ctaClickedAt: Date | null;
    visitedAt: Date;
  }> = [
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[0] ?? null, timeOnPage: 45, chatMessages: 0, ctaClicked: true, ctaClickedAt: oneDayAgo, visitedAt: oneDayAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[1] ?? emails[0] ?? null, timeOnPage: 120, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: twoDaysAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: emails[2] ?? null, timeOnPage: 30, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: twoDaysAgo },
    { campaignId: campaign.id, departmentId: campaign.departmentId, visitorEmail: null, timeOnPage: 15, chatMessages: 0, ctaClicked: false, ctaClickedAt: null, visitedAt: oneDayAgo },
  ];
  for (const v of visits) {
    await prisma.campaignVisit.create({
      data: {
        campaignId: v.campaignId,
        departmentId: v.departmentId,
        visitorEmail: v.visitorEmail,
        timeOnPage: v.timeOnPage,
        chatMessages: v.chatMessages,
        ctaClicked: v.ctaClicked,
        ctaClickedAt: v.ctaClickedAt,
        visitedAt: v.visitedAt,
      },
    });
  }
  revalidatePath('/dashboard/admin/demo-setup');
  revalidatePath(`/dashboard/companies/${companyId}`);
  return { ok: true };
}

/** Seed all demo data for a company: campaign visits + activities. Run after campaign exists. */
export async function seedDemoData(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const act = await seedDemoActivities(companyId);
  if (!act.ok) return act;
  const vis = await seedDemoCampaignVisits(companyId);
  if (!vis.ok) return vis;
  return { ok: true };
}
