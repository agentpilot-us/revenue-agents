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
    select: { id: true, name: true, salesforceId: true, hubspotId: true, crmSource: true },
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
      enrichmentStatus: true,
      enrichedAt: true,
      companyDepartment: {
        select: { id: true, type: true, customName: true },
      },
      persona: { select: { name: true } },
      contactSequenceEnrollments: {
        where: { status: 'active' },
        select: { id: true, sequence: { select: { id: true, name: true } } },
      },
      crmSource: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    select: {
      id: true,
      type: true,
      customName: true,
      _count: { select: { contacts: true } },
    },
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
    enrichmentStatus: c.enrichmentStatus ?? null,
    enrichedAt: c.enrichedAt?.toISOString() ?? null,
    activeEnrollments: c.contactSequenceEnrollments.map((e) => ({
      id: e.id,
      sequenceId: e.sequence.id,
      sequenceName: e.sequence.name,
    })),
    crmSource: c.crmSource ?? null,
  }));

  const companyCrm = company.salesforceId
    ? { source: 'salesforce' as const, accountId: company.salesforceId }
    : company.hubspotId
      ? { source: 'hubspot' as const, accountId: company.hubspotId }
      : null;

  const departmentOptions = departments.map((d) => ({
    id: d.id,
    name: d.customName || d.type,
    contactCount: d._count?.contacts ?? 0,
  }));

  return (
    <div className="min-h-screen bg-zinc-900 max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/companies/${id}`} className="text-slate-300 hover:text-white transition-colors">← Back to company</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Build Contact List · {company.name}
      </h1>
      <p className="text-slate-300 mb-6">
        Find by department, add manually or import. New contacts are auto-enriched when possible.
      </p>
      <ContactsListClient
        companyId={company.id}
        companyName={company.name}
        contacts={contactRows}
        departments={departmentOptions}
        companyCrm={companyCrm}
      />
    </div>
  );
}
