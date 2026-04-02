import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCompanySetupState } from '@/app/actions/content-library-setup';
import { ContentLibraryDashboardClient } from '@/app/components/content-library/ContentLibraryDashboardClient';
import { prisma } from '@/lib/db';
import { isServiceConfigured } from '@/lib/service-config';

export default async function ContentLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const setup = await getCompanySetupState();
  if (!setup.ok) {
    redirect('/login');
  }

  const { state, user } = setup;

  if (state === 'needs_company_info') {
    redirect('/dashboard/company-setup');
  }

  const userId = session.user.id;
  const [products, playbooks] = await Promise.all([
    prisma.product.findMany({
      where: { userId },
      select: { id: true, name: true, description: true, category: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.industryPlaybook.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true, overview: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <ContentLibraryDashboardClient
      showFirecrawlSetup={!isServiceConfigured('firecrawl')}
      company={{
        companyName: user.companyName,
        companyWebsite: user.companyWebsite,
      }}
      products={products}
      playbooks={playbooks}
    />
  );
}
