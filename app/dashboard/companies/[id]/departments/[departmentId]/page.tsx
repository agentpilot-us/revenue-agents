import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DepartmentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FindContactsButton } from '@/app/components/company/FindContactsButton';
import { StartExpansionPlayButton } from '@/app/components/company/StartExpansionPlayButton';
import { DraftFollowUpButton } from '@/app/components/company/DraftFollowUpButton';

const STATUS_LABELS: Record<DepartmentStatus, string> = {
  [DepartmentStatus.ACTIVE_CUSTOMER]: 'Active Customer',
  [DepartmentStatus.EXPANSION_TARGET]: 'Expansion Target',
  [DepartmentStatus.RESEARCH_PHASE]: 'Research Phase',
  [DepartmentStatus.NOT_ENGAGED]: 'Not Engaged',
  [DepartmentStatus.NOT_APPLICABLE]: 'Not Applicable',
};

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; departmentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId, departmentId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const department = await prisma.companyDepartment.findFirst({
    where: { id: departmentId, companyId },
    include: {
      contacts: {
        orderBy: { lastContactedAt: 'desc' },
        include: {
          persona: { select: { name: true } },
        },
      },
      companyProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, description: true },
          },
        },
      },
    },
  });
  if (!department) notFound();

  const activities = await prisma.activity.findMany({
    where: { companyDepartmentId: departmentId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const deptName = department.customName || department.type.replace(/_/g, ' ');
  const opportunities = department.companyProducts.filter((cp) => cp.status === 'OPPORTUNITY');
  const activeProducts = department.companyProducts.filter((cp) => cp.status === 'ACTIVE');
  const topOpportunity = opportunities.sort(
    (a, b) => Number(b.fitScore ?? 0) - Number(a.fitScore ?? 0)
  )[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/dashboard/companies/${companyId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to {company.name}
        </Link>

        {/* Department Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{deptName}</h1>
            <Badge
              className={
                department.status === DepartmentStatus.ACTIVE_CUSTOMER
                  ? 'bg-green-100 text-green-800'
                  : department.status === DepartmentStatus.EXPANSION_TARGET
                    ? 'bg-yellow-100 text-yellow-800'
                    : department.status === DepartmentStatus.RESEARCH_PHASE
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
              }
            >
              {STATUS_LABELS[department.status]}
            </Badge>
          </div>
          {department.estimatedSize != null && (
            <p className="text-gray-600">Estimated size: ~{department.estimatedSize.toLocaleString()} employees</p>
          )}
        </div>

        {/* Department Overview / Notes */}
        {department.notes && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Department overview</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{department.notes}</p>
            <div className="mt-4 flex gap-2">
              <Link href={`/chat?play=expansion&accountId=${companyId}`}>
                <Button variant="outline" size="sm">
                  Research latest news
                </Button>
              </Link>
              <Link href={`/chat?play=expansion&accountId=${companyId}`}>
                <Button variant="outline" size="sm">
                  Import research
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Contacts */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Contacts ({department.contacts.length})
            </h2>
            <FindContactsButton
              companyId={companyId}
              companyName={company.name}
              departmentId={department.id}
              departmentName={deptName}
              existingContactNames={department.contacts.map((c) =>
                [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown'
              )}
            />
          </div>
          {department.contacts.length === 0 ? (
            <p className="text-gray-500 text-sm">No contacts in this department yet.</p>
          ) : (
            <ul className="space-y-4">
              {department.contacts.map((c) => (
                <li key={c.id} className="border rounded-lg p-4">
                  <div className="font-medium">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">{c.title ?? '—'}</div>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline">
                      {c.email}
                    </a>
                  )}
                  {c.persona && (
                    <div className="text-xs text-gray-500 mt-1">Persona: {c.persona.name}</div>
                  )}
                  {c.engagementScore != null && (
                    <div className="text-xs text-gray-500 mt-1">
                      Engagement score: {c.engagementScore}/100
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Link href={`/chat?play=expansion&accountId=${companyId}&contactId=${c.id}`}>
                      <Button size="sm" variant="outline">
                        Draft follow-up
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expansion opportunity */}
        {(opportunities.length > 0 || activeProducts.length > 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expansion opportunity</h2>
            {topOpportunity && (
              <div className="border rounded-lg p-4 mb-4 bg-green-50/50 border-green-100">
                <div className="font-semibold">{topOpportunity.product.name}</div>
                {topOpportunity.product.description && (
                  <p className="text-sm text-gray-600 mt-1">{topOpportunity.product.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  {topOpportunity.fitScore != null && (
                    <span>
                      Fit score: <strong>{Math.round(Number(topOpportunity.fitScore))}%</strong>
                    </span>
                  )}
                  {topOpportunity.opportunitySize != null && (
                    <span>
                      Est. ARR: <strong>${Number(topOpportunity.opportunitySize).toLocaleString()}</strong>
                    </span>
                  )}
                </div>
                {topOpportunity.fitReasoning && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 uppercase">Why this fits</div>
                    <p className="text-sm text-gray-700 mt-1">{topOpportunity.fitReasoning}</p>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <StartExpansionPlayButton
                    companyId={companyId}
                    companyName={company.name}
                    departmentId={department.id}
                    departmentName={deptName}
                    productId={topOpportunity.product.id}
                    productName={topOpportunity.product.name}
                    opportunitySize={topOpportunity.opportunitySize != null ? Number(topOpportunity.opportunitySize) : undefined}
                    fitScore={topOpportunity.fitScore != null ? Math.round(Number(topOpportunity.fitScore)) : undefined}
                    size="sm"
                  />
                  {department.contacts.length > 0 ? (
                    <DraftFollowUpButton
                      accountId={companyId}
                      accountName={company.name}
                      contactId={department.contacts[0].id}
                      contactName={[department.contacts[0].firstName, department.contacts[0].lastName].filter(Boolean).join(' ') || undefined}
                      departmentId={department.id}
                      departmentName={deptName}
                    />
                  ) : (
                    <Link href={`/chat?play=expansion&accountId=${companyId}`}>
                      <Button size="sm" variant="outline">
                        Chat: draft follow-up
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
            {opportunities.length > 1 && (
              <div className="text-sm text-gray-600">
                Other opportunities: {opportunities.slice(1).map((cp) => cp.product.name).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Activity timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity timeline</h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity for this department yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-2xl">
                    {a.type === 'EMAIL_SENT' ? '📧' : a.type === 'EMAIL_OPENED' ? '👁' : a.type === 'EMAIL_REPLIED' ? '↩' : '📝'}
                  </span>
                  <div>
                    <p className="font-medium">{a.summary}</p>
                    {a.contact && (
                      <p className="text-gray-500 text-xs">
                        {[a.contact.firstName, a.contact.lastName].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
