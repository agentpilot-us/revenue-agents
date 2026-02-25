import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseDealContext } from '@/lib/types/deal-context';
import { AccountIntelligenceClient } from './AccountIntelligenceClient';

export default async function AccountIntelligencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ researchDone?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId } = await params;
  const { researchDone: researchDoneParam } = await searchParams;
  const [company, catalogProducts, contentLibraryProducts] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        researchData: true,
        researchGoal: true,
        dealContext: true,
        accountMessaging: { select: { id: true } },
        _count: { select: { departments: true } },
      },
    }),
    prisma.catalogProduct.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!company) notFound();

  const hasResearch = !!company.researchData;
  const departmentCount = company._count.departments ?? 0;
  const hasDepartments = departmentCount > 0;
  const hasMessaging = !!company.accountMessaging;
  const dealContext = company.dealContext ? parseDealContext(company.dealContext) : undefined;

  const catalogProductsList = catalogProducts.map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  const fallbackProducts =
    catalogProductsList.length === 0
      ? contentLibraryProducts.map((p) => ({ id: p.id, name: p.name, slug: p.name.toLowerCase().replace(/\s+/g, '-') }))
      : [];

  return (
    <div className="min-h-screen bg-zinc-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountIntelligenceClient
          companyId={company.id}
          companyName={company.name}
          hasResearch={hasResearch}
          hasDepartments={hasDepartments}
          hasMessaging={hasMessaging}
          departmentCount={departmentCount}
          researchDone={researchDoneParam === '1'}
          researchGoal={company.researchGoal ?? undefined}
          dealContext={dealContext}
          catalogProducts={catalogProductsList}
          fallbackProducts={fallbackProducts}
        />
      </div>
    </div>
  );
}
