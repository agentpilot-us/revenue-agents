import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { MyCompanyClient } from '@/app/dashboard/my-company/MyCompanyClient';
import type { TabId } from '@/app/dashboard/my-company/MyCompanyTabs';

const VALID_TABS: TabId[] = [
  'Profile',
  'Products',
  'Content Library',
  'Playbooks',
  'Messaging',
  'Governance',
  'Intelligence',
];

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MyCompanyPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const initialTab =
    tab && VALID_TABS.includes(tab as TabId) ? (tab as TabId) : undefined;
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      companyName: true,
      companyWebsite: true,
      companyLogoUrl: true,
      companyIndustry: true,
      primaryIndustrySellTo: true,
      updatedAt: true,
    },
  });

  if (!user?.companyWebsite?.trim()) {
    redirect('/dashboard/company-setup');
  }

  const primaryCompany = await prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { name: true, industry: true, website: true, keyInitiatives: true },
  });

  const [
    companyCount,
    contactCount,
    roadmapCount,
    productCount,
    signalCount,
    products,
    events,
    recentSignals,
    catalogProducts,
    contentLibraryCount,
  ] = await Promise.all([
    prisma.company.count({ where: { userId } }),
    prisma.contact.count({ where: { company: { userId } } }),
    prisma.adaptiveRoadmap.count({ where: { userId } }),
    prisma.companyProduct.count({ where: { company: { userId } } }),
    prisma.accountSignal.count({ where: { company: { userId } } }),
    prisma.companyProduct.findMany({
      where: { company: { userId } },
      select: {
        id: true,
        status: true,
        arr: true,
        opportunitySize: true,
        company: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.eventAttendance.findMany({
      where: { contact: { company: { userId } } },
      select: { eventName: true, eventDate: true, source: true },
      orderBy: { eventDate: 'desc' },
      take: 10,
    }),
    prisma.accountSignal.findMany({
      where: { company: { userId } },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        publishedAt: true,
        relevanceScore: true,
      },
    }),
    prisma.catalogProduct.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true, description: true, relatedProducts: true },
      orderBy: { name: 'asc' },
    }),
    prisma.contentLibrary.count({ where: { userId, isActive: true } }),
  ]);

  const keyInitiatives =
    ((primaryCompany?.keyInitiatives as string[] | null) ?? []).slice(0, 5);

  const eventSummaries = events.map((e: (typeof events)[number]) => ({
    name: e.eventName,
    date: e.eventDate.toISOString().split('T')[0],
    source: e.source,
  }));

  const profileData = {
    companyName:
      user.companyName?.trim() ? user.companyName.trim() : primaryCompany?.name ?? null,
    companyWebsite:
      user.companyWebsite?.trim() ? user.companyWebsite.trim() : primaryCompany?.website ?? null,
    companyIndustry:
      user.companyIndustry?.trim()
        ? user.companyIndustry.trim()
        : primaryCompany?.industry ?? null,
    primaryIndustrySellTo: user.primaryIndustrySellTo?.trim() || null,
    keyInitiatives,
  };

  type Signal = { id: string; type: string; title: string; summary: string | null; publishedAt: Date; relevanceScore: number | null };
  const serializedSignals = (recentSignals as Signal[]).map((s) => ({
    ...s,
    publishedAt: s.publishedAt.toISOString(),
  }));

  type Product = { id: string; status: string; arr: unknown; opportunitySize: unknown; company: { name: string }; product: { name: string } };
  const serializedProducts = (products as Product[]).map((p) => ({
    id: p.id,
    status: p.status,
    companyName: p.company.name,
    productName: p.product.name,
  }));

  type CatProd = { id: string; name: string; slug: string; description: string | null; relatedProducts: unknown };
  type Rel = { productId: string; productName: string; relationship: 'upgrade_path' | 'complementary' | 'prerequisite' | 'replacement' };
  const serializedCatalog = (catalogProducts as CatProd[]).map((cp) => ({
    id: cp.id,
    name: cp.name,
    slug: cp.slug,
    description: cp.description,
    relationships: (Array.isArray(cp.relatedProducts) ? cp.relatedProducts : []) as Rel[],
  }));

  return (
    <MyCompanyClient
      initialTab={initialTab}
      profile={profileData}
      health={{ companyCount, contactCount, roadmapCount, productCount, signalCount }}
      companyProducts={serializedProducts}
      eventSummaries={eventSummaries}
      signals={serializedSignals}
      catalogProducts={serializedCatalog}
      hasContentLibrary={contentLibraryCount > 0}
    />
  );
}
