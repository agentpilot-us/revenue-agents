import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AccountIntelligenceClient } from './AccountIntelligenceClient';

export default async function AccountIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      researchData: true,
      accountMessaging: { select: { id: true } },
      _count: { select: { departments: true } },
    },
  });

  if (!company) notFound();

  const hasResearch = !!company.researchData;
  const hasDepartments = (company._count?.departments ?? 0) > 0;
  const hasMessaging = !!company.accountMessaging;

  return (
    <div className="min-h-screen bg-zinc-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountIntelligenceClient
          companyId={company.id}
          companyName={company.name}
          hasResearch={hasResearch}
          hasDepartments={hasDepartments}
          hasMessaging={hasMessaging}
        />
      </div>
    </div>
  );
}
