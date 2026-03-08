import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ensureDemoRoadmap } from '@/lib/demo/load-roadmap';
import MyDayDashboard from '@/app/components/dashboard/MyDayDashboard';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ skip_content_prompt?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // For demo users, make sure a persona-specific AdaptiveRoadmap exists.
  const primaryCompanyForDemo = await prisma.company.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (primaryCompanyForDemo) {
    await ensureDemoRoadmap(
      session.user.id,
      (session.user as { email?: string | null }).email ?? null,
      primaryCompanyForDemo.id
    );
  }

  const params = await searchParams;
  const [contentLibraryCounts, catalogProductCount, industryPlaybookCount] =
    await Promise.all([
      prisma.contentLibrary.groupBy({
        by: ['type'],
        where: { userId: session.user.id, isActive: true },
        _count: { id: true },
      }),
      prisma.catalogProduct.count(),
      prisma.industryPlaybook.count({ where: { userId: session.user.id } }),
    ]);
  const countByType = Object.fromEntries(
    contentLibraryCounts.map((c) => [c.type, c._count.id])
  ) as Partial<Record<string, number>>;
  const contentLibraryTotal =
    catalogProductCount +
    industryPlaybookCount +
    (countByType.UseCase ?? 0) +
    (countByType.SuccessStory ?? 0) +
    (countByType.CompanyEvent ?? 0) +
    (countByType.Framework ?? 0);
  if (contentLibraryTotal === 0 && params?.skip_content_prompt !== '1') {
    redirect('/dashboard/content-library');
  }

  return <MyDayDashboard />;
}
