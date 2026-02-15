'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentStatus } from '@prisma/client';
import { discoverDepartments, type DiscoveredDepartment } from '@/app/actions/discover-departments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type TargetRoles = {
  economicBuyer?: string[];
  technicalEvaluator?: string[];
  champion?: string[];
  influencer?: string[];
} | null;

type CompanyDepartmentWithRelations = {
  id: string;
  companyId: string;
  type: string;
  customName: string | null;
  status: DepartmentStatus;
  notes: string | null;
  estimatedSize: number | null;
  targetRoles: TargetRoles;
  _count: { contacts: number; activities: number };
  contacts: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    engagementScore: number | null;
    personaName: string | null;
  }>;
  companyProducts: Array<{
    id: string;
    status: string;
    productId: string;
    product: { id: string; name: string; slug: string };
    arr: number | null;
    contractEnd: Date | null;
    fitScore: number | null;
    fitReasoning: string | null;
    opportunitySize: number | null;
  }>;
  lastActivity: { summary: string; type: string; createdAt: Date } | null;
};

export function DepartmentsTab({
  companyId,
  departments: initialDepartments,
}: {
  companyId: string;
  departments: CompanyDepartmentWithRelations[];
}) {
  const [departments, setDepartments] = useState(initialDepartments);
  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredDepartment[]>([]);
  const [addingType, setAddingType] = useState<string | null>(null);

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscovered([]);
    try {
      const results = await discoverDepartments(companyId);
      setDiscovered(results);
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddDiscovered = async (dept: DiscoveredDepartment) => {
    setAddingType(dept.type);
    try {
      const res = await fetch(`/api/companies/${companyId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: dept.type,
          customName: dept.customName,
          status: DepartmentStatus.NOT_ENGAGED,
          estimatedSize: dept.estimatedSize,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add department');
      }
      const listRes = await fetch(`/api/companies/${companyId}/departments`);
      if (listRes.ok) {
        const list = await listRes.json();
        setDepartments(list);
      }
      setDiscovered((prev) => prev.filter((d) => d.type !== dept.type));
    } catch (error) {
      console.error('Add department failed:', error);
    } finally {
      setAddingType(null);
    }
  };

  const statusColors: Record<DepartmentStatus, string> = {
    [DepartmentStatus.ACTIVE_CUSTOMER]: 'bg-green-100 text-green-800 border-green-200',
    [DepartmentStatus.EXPANSION_TARGET]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [DepartmentStatus.RESEARCH_PHASE]: 'bg-blue-100 text-blue-800 border-blue-200',
    [DepartmentStatus.NOT_ENGAGED]: 'bg-gray-100 text-gray-800 border-gray-200',
    [DepartmentStatus.NOT_APPLICABLE]: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const statusIcons: Record<DepartmentStatus, string> = {
    [DepartmentStatus.ACTIVE_CUSTOMER]: '✅',
    [DepartmentStatus.EXPANSION_TARGET]: '🎯',
    [DepartmentStatus.RESEARCH_PHASE]: '🔍',
    [DepartmentStatus.NOT_ENGAGED]: '⚪',
    [DepartmentStatus.NOT_APPLICABLE]: '—',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Departments</h2>
          <p className="text-gray-600">
            Track expansion opportunities by department
          </p>
        </div>
        <Button
          onClick={handleDiscover}
          disabled={discovering}
          variant="outline"
        >
          {discovering ? 'Discovering…' : 'Discover More'}
        </Button>
      </div>

      {discovered.length > 0 && (
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-100">
          <h3 className="font-semibold mb-3">AI Discovered Departments</h3>
          <div className="space-y-2">
            {discovered.map((dept, i) => (
              <div
                key={`${dept.type}-${i}`}
                className="flex justify-between items-center p-3 bg-white rounded border border-blue-100"
              >
                <div>
                  <div className="font-medium">{dept.type.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-gray-600">{dept.reasoning}</div>
                  <div className="text-xs text-gray-500">
                    Confidence: {dept.confidence}%
                    {dept.estimatedSize != null && ` • ~${dept.estimatedSize} people`}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddDiscovered(dept)}
                  disabled={addingType === dept.type}
                >
                  {addingType === dept.type ? 'Adding…' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {departments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-200">
            <p className="text-gray-500 mb-4">No departments added yet</p>
            <Button onClick={handleDiscover}>
              Discover Departments with AI
            </Button>
          </div>
        ) : (
          departments.map((dept) => {
            const deptARR = dept.companyProducts
              .filter((cp) => cp.status === 'ACTIVE')
              .reduce((sum, cp) => sum + (cp.arr ?? 0), 0);
            const oppSum = dept.companyProducts
              .filter((cp) => cp.status === 'OPPORTUNITY')
              .reduce((sum, cp) => sum + (cp.opportunitySize ?? 0), 0);
            const topFit = dept.companyProducts
              .filter((cp) => cp.fitScore != null)
              .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))[0];
            const whyNow = dept.notes || topFit?.fitReasoning || null;

            return (
              <div
                key={dept.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-semibold">
                      {dept.customName || dept.type.replace(/_/g, ' ')}
                    </h3>
                    <Badge className={statusColors[dept.status]}>
                      {statusIcons[dept.status]} {dept.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                  {deptARR > 0 && (
                    <div>
                      <span className="text-gray-500">ARR</span>
                      <div className="font-semibold">${deptARR.toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Opportunity</span>
                    <div className="font-semibold text-green-600">
                      ${oppSum.toLocaleString()}
                      {topFit?.fitScore != null && (
                        <span className="text-gray-500 font-normal ml-1">({Math.round(topFit.fitScore)}% fit)</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Contacts</span>
                    <div className="font-semibold">{dept._count.contacts}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Activities</span>
                    <div className="font-semibold">{dept._count.activities}</div>
                  </div>
                </div>

                {dept.contacts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Contacts</div>
                    <ul className="text-sm space-y-0.5">
                      {dept.contacts.map((c) => (
                        <li key={c.id}>
                          {[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown'}
                          {c.title && ` (${c.title})`}
                          {c.personaName && (
                            <span className="text-gray-500"> — {c.personaName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {dept.targetRoles && (() => {
                  const r = dept.targetRoles;
                  const hasRoles =
                    (r?.economicBuyer?.length ?? 0) > 0 ||
                    (r?.technicalEvaluator?.length ?? 0) > 0 ||
                    (r?.champion?.length ?? 0) > 0 ||
                    (r?.influencer?.length ?? 0) > 0;
                  if (!hasRoles) return null;
                  return (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">Target roles (job titles)</div>
                      <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {r?.economicBuyer && r.economicBuyer.length > 0 && (
                          <div>
                            <span className="text-gray-500">Economic buyer: </span>
                            <span>{r.economicBuyer.join(', ')}</span>
                          </div>
                        )}
                        {r?.technicalEvaluator && r.technicalEvaluator.length > 0 && (
                          <div>
                            <span className="text-gray-500">Technical evaluator: </span>
                            <span>{r.technicalEvaluator.join(', ')}</span>
                          </div>
                        )}
                        {r?.champion && r.champion.length > 0 && (
                          <div>
                            <span className="text-gray-500">Champion: </span>
                            <span>{r.champion.join(', ')}</span>
                          </div>
                        )}
                        {r?.influencer && r.influencer.length > 0 && (
                          <div>
                            <span className="text-gray-500">Influencer: </span>
                            <span>{r.influencer.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {dept.companyProducts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Products</div>
                    <div className="text-sm text-gray-700 space-y-0.5">
                      {dept.companyProducts
                        .filter((cp) => cp.status === 'ACTIVE')
                        .map((cp) => (
                          <div key={cp.id}>
                            {cp.product.name}
                            {cp.arr != null && ` ($${cp.arr.toLocaleString()})`}
                            {cp.contractEnd && ` · renews ${new Date(cp.contractEnd).toLocaleDateString()}`}
                          </div>
                        ))}
                      {dept.companyProducts
                        .filter((cp) => cp.status === 'OPPORTUNITY')
                        .map((cp) => (
                          <div key={cp.id} className="text-green-700">
                            {cp.product.name} — ${(cp.opportunitySize ?? 0).toLocaleString()} opportunity
                            {cp.fitScore != null && ` (${Math.round(cp.fitScore)}% fit)`}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {whyNow && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Why now</div>
                    <p className="text-sm text-gray-700 line-clamp-2">{whyNow}</p>
                  </div>
                )}

                {dept.lastActivity && (
                  <div className="mb-4 text-xs text-gray-500">
                    Last activity: {dept.lastActivity.summary} —{' '}
                    {new Date(dept.lastActivity.createdAt).toLocaleDateString()}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/companies/${companyId}/discover-contacts?department=${dept.id}`}>
                      Find contacts for this department
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/companies/${companyId}/departments/${dept.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/companies/${companyId}/contacts?department=${dept.id}`}>
                      View Contacts
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/chat?play=expansion&accountId=${companyId}&departmentId=${dept.id}`}>
                      Start Expansion Play
                    </Link>
                  </Button>
                  {dept.contacts.length > 0 && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        href={`/chat?play=expansion&accountId=${companyId}&contactId=${dept.contacts[0].id}`}
                      >
                        Draft follow-up
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
