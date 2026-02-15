import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { DiscoverContactsClient } from './DiscoverContactsClient';

export default async function DiscoverContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ department?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const { department: departmentParam } = await searchParams;
  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!company) notFound();

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    select: { id: true, type: true, customName: true },
    orderBy: { createdAt: 'asc' },
  });

  const initialDepartmentId =
    departmentParam && departments.some((d) => d.id === departmentParam)
      ? departmentParam
      : undefined;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <DiscoverContactsClient
        companyId={company.id}
        companyName={company.name}
        departments={departments}
        initialDepartmentId={initialDepartmentId}
      />
    </div>
  );
}
