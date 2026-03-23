import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import CustomPlayBuilder from '@/app/components/plays/CustomPlayBuilder';

type Search = Promise<{ companyId?: string }>;

export default async function CustomPlayPage({ searchParams }: { searchParams: Search }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const { companyId } = await searchParams;
  if (!companyId?.trim()) {
    redirect('/dashboard/plays');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId.trim(), userId: session.user.id },
    select: { name: true },
  });
  if (!company) {
    notFound();
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
      <CustomPlayBuilder companyId={companyId.trim()} companyName={company.name} />
    </div>
  );
}
