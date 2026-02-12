import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ContactsListClient } from './ContactsListClient';

export default async function CompanyContactsPage({
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

  const contacts = await prisma.contact.findMany({
    where: { companyId: id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      companyDepartmentId: true,
      personaId: true,
      isResponsive: true,
      isDormant: true,
      companyDepartment: {
        select: { id: true, type: true, customName: true },
      },
      persona: { select: { name: true } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    select: { id: true, type: true, customName: true },
    orderBy: { createdAt: 'asc' },
  });

  const contactRows = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    title: c.title,
    email: c.email,
    companyDepartmentId: c.companyDepartmentId,
    departmentName: c.companyDepartment
      ? (c.companyDepartment.customName || c.companyDepartment.type)
      : null,
    personaName: c.persona?.name ?? null,
    isResponsive: c.isResponsive,
    isDormant: c.isDormant,
  }));

  const departmentOptions = departments.map((d) => ({
    id: d.id,
    name: d.customName || d.type,
  }));

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/companies/${id}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">← Back to company</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Contacts · {company.name}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {contacts.length} contact(s). Filter, select, and launch outreach.
      </p>
      <ContactsListClient
        companyId={company.id}
        contacts={contactRows}
        departments={departmentOptions}
      />
    </div>
  );
}
