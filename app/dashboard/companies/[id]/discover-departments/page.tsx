import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { DiscoverDepartmentsClient } from './DiscoverDepartmentsClient';

export default async function DiscoverDepartmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!company) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <DiscoverDepartmentsClient companyId={company.id} companyName={company.name} />
    </div>
  );
}
