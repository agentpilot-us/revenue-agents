import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { LaunchOutreachClient } from './LaunchOutreachClient';

export default async function LaunchOutreachPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contacts?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const { contacts: contactsParam } = await searchParams;

  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!company) notFound();

  const contacts = await prisma.contact.findMany({
    where: { companyId: id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      companyDepartmentId: true,
      companyDepartment: {
        select: { id: true, type: true, customName: true },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    select: { id: true, type: true, customName: true },
    orderBy: { createdAt: 'asc' },
  });

  const preselectedContactIds =
    typeof contactsParam === 'string'
      ? contactsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const contactRows = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    title: c.title,
    departmentId: c.companyDepartmentId,
    departmentName: c.companyDepartment
      ? (c.companyDepartment.customName || c.companyDepartment.type)
      : null,
  }));

  const departmentOptions = departments.map((d) => ({
    id: d.id,
    name: d.customName || d.type,
  }));

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 min-h-screen bg-zinc-900">
      <LaunchOutreachClient
        companyId={company.id}
        companyName={company.name}
        contacts={contactRows}
        departments={departmentOptions}
        preselectedContactIds={preselectedContactIds}
      />
    </div>
  );
}
