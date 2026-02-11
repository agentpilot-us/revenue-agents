'use client';

import { useState, useEffect } from 'react';
import { DepartmentStatus } from '@prisma/client';
import { discoverDepartments, type DiscoveredDepartment } from '@/app/actions/discover-departments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CompanyDepartmentWithRelations = {
  id: string;
  companyId: string;
  type: string;
  customName: string | null;
  status: DepartmentStatus;
  notes: string | null;
  estimatedSize: number | null;
  _count: { contacts: number; activities: number };
  companyProducts: Array<{
    id: string;
    status: string;
    opportunitySize: unknown;
  }>;
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
          {discovering ? 'Discovering…' : 'Auto-Discover Departments'}
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
          departments.map((dept) => (
            <div
              key={dept.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">
                      {dept.customName || dept.type.replace(/_/g, ' ')}
                    </h3>
                    <Badge className={statusColors[dept.status]}>
                      {statusIcons[dept.status]} {dept.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {dept.notes && (
                    <p className="text-gray-600 text-sm">{dept.notes}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" aria-label="More options">
                  ⋮
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Contacts</div>
                  <div className="text-2xl font-bold">{dept._count.contacts}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Activities</div>
                  <div className="text-2xl font-bold">{dept._count.activities}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Products</div>
                  <div className="text-2xl font-bold">
                    {dept.companyProducts.filter((cp) => cp.status === 'ACTIVE').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Expansion Opp</div>
                  <div className="text-2xl font-bold text-green-600">
                    $
                    {dept.companyProducts
                      .filter((cp) => cp.status === 'OPPORTUNITY')
                      .reduce(
                        (sum, cp) => sum + Number(cp.opportunitySize ?? 0),
                        0
                      )
                      .toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`/dashboard/companies/${companyId}/contacts?department=${dept.id}`}>
                    View Contacts
                  </a>
                </Button>
                <Button size="sm" variant="outline">
                  Add Product
                </Button>
                <Button size="sm" asChild>
                  <a href={`/chat?play=expansion&accountId=${companyId}`}>
                    Start Expansion Play
                  </a>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
