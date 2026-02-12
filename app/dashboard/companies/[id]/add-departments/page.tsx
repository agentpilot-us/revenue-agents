import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AddDepartmentsClient } from './AddDepartmentsClient';

export default async function AddDepartmentsPage({
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

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    select: { type: true },
  });

  const existingDepartmentTypes = departments.map((d) => d.type);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <AddDepartmentsClient
        companyId={company.id}
        companyName={company.name}
        existingDepartmentTypes={existingDepartmentTypes}
      />
    </div>
  );
}
