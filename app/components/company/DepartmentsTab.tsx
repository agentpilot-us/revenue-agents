'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentStatus } from '@prisma/client';
import { discoverDepartments, type DiscoveredDepartment } from '@/app/actions/discover-departments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  valueProp: string | null;
  useCase: string | null;
  estimatedOpportunity: string | null;
  objectionHandlers: Array<{ objection: string; response: string }> | null;
  proofPoints: string[] | null;
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
  segmentationStrategy,
  segmentationRationale,
}: {
  companyId: string;
  departments: CompanyDepartmentWithRelations[];
  segmentationStrategy?: string | null;
  segmentationRationale?: string | null;
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
      {/* Segmentation Strategy */}
      {(segmentationStrategy || segmentationRationale) && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Segmentation Strategy</h2>
          {segmentationStrategy && (
            <div className="mb-3">
              <span className="font-medium text-gray-700 dark:text-gray-300">Strategy:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{segmentationStrategy.replace(/_/g, ' ')}</span>
            </div>
          )}
          {segmentationRationale && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Rationale:</span>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{segmentationRationale}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Departments</h2>
          <p className="text-gray-600">
            Track expansion opportunities by department
          </p>
        </div>
        <div className="flex items-center gap-2">
          {departments.length > 0 && (
            <Button asChild>
              <Link href={`/dashboard/companies/${companyId}/contacts`}>
                Find & enrich all segments
              </Link>
            </Button>
          )}
          <Button
            onClick={handleDiscover}
            disabled={discovering}
            variant="outline"
          >
            {discovering ? 'Discovering…' : 'Discover More'}
          </Button>
        </div>
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
              <BuyingGroupCard
                key={dept.id}
                dept={dept}
                companyId={companyId}
                deptARR={deptARR}
                oppSum={oppSum}
                topFit={topFit}
                whyNow={whyNow}
                statusColors={statusColors}
                statusIcons={statusIcons}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function BuyingGroupCard({
  dept: initialDept,
  companyId,
  deptARR,
  oppSum,
  topFit,
  whyNow,
  statusColors,
  statusIcons,
}: {
  dept: CompanyDepartmentWithRelations;
  companyId: string;
  deptARR: number;
  oppSum: number;
  topFit: { fitScore: number | null; fitReasoning: string | null } | undefined;
  whyNow: string | null;
  statusColors: Record<DepartmentStatus, string>;
  statusIcons: Record<DepartmentStatus, string>;
}) {
  const [dept, setDept] = useState(initialDept);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSaveField = async (field: string, value: string | null | Array<{ objection: string; response: string }> | string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDept({ ...dept, ...updated });
        setEditingField(null);
      } else {
        alert('Failed to save changes');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-semibold">
            {dept.customName || dept.type.replace(/_/g, ' ')}
          </h3>
          {dept.status === DepartmentStatus.RESEARCH_PHASE ? (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600">
              {dept._count.contacts} contact{dept._count.contacts !== 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge className={statusColors[dept.status]}>
              {statusIcons[dept.status]} {dept.status.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Value Proposition */}
      <EditableField
        label="Value Proposition"
        value={dept.valueProp}
        isEditing={editingField === 'valueProp'}
        onEdit={() => setEditingField('valueProp')}
        onCancel={() => setEditingField(null)}
        onSave={(value) => handleSaveField('valueProp', value)}
        saving={saving}
        className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
      />

      {/* Use Case */}
      <EditableField
        label="Use Case"
        value={dept.useCase}
        isEditing={editingField === 'useCase'}
        onEdit={() => setEditingField('useCase')}
        onCancel={() => setEditingField(null)}
        onSave={(value) => handleSaveField('useCase', value)}
        saving={saving}
        className="mb-3"
      />

      {/* Estimated Opportunity */}
      <EditableField
        label="Estimated Opportunity"
        value={dept.estimatedOpportunity}
        isEditing={editingField === 'estimatedOpportunity'}
        onEdit={() => setEditingField('estimatedOpportunity')}
        onCancel={() => setEditingField(null)}
        onSave={(value) => handleSaveField('estimatedOpportunity', value)}
        saving={saving}
        className="mb-3"
        valueClassName="text-sm font-semibold text-green-600"
      />

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

      {/* Expandable Sections */}
      <div className="space-y-2 mb-4 border-t pt-4">
        {/* Objection Handlers */}
        {dept.objectionHandlers && dept.objectionHandlers.length > 0 && (
          <ExpandableSection
            title="Objection Handlers"
            isExpanded={expandedSections.has('objections')}
            onToggle={() => toggleSection('objections')}
          >
            <div className="space-y-3">
              {dept.objectionHandlers.map((oh, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded">
                  <div className="font-medium text-sm mb-1">{oh.objection}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{oh.response}</div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Proof Points */}
        {dept.proofPoints && dept.proofPoints.length > 0 && (
          <ExpandableSection
            title="Proof Points"
            isExpanded={expandedSections.has('proofPoints')}
            onToggle={() => toggleSection('proofPoints')}
          >
            <ul className="list-disc list-inside space-y-1 text-sm">
              {dept.proofPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </ExpandableSection>
        )}

        {/* Product Mapping */}
        {dept.companyProducts && dept.companyProducts.length > 0 && (
          <ExpandableSection
            title="Product Mapping"
            isExpanded={expandedSections.has('products')}
            onToggle={() => toggleSection('products')}
          >
            <div className="text-sm space-y-2">
              {dept.companyProducts.map((cp) => (
                <div key={cp.id} className="p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                  <div className="font-medium">{cp.product.name}</div>
                  {cp.status === 'ACTIVE' && cp.arr != null && (
                    <div className="text-gray-600 dark:text-gray-400">
                      ARR: ${cp.arr.toLocaleString()}
                    </div>
                  )}
                  {cp.status === 'OPPORTUNITY' && cp.opportunitySize != null && (
                    <div className="text-green-600">
                      Opportunity: ${cp.opportunitySize.toLocaleString()}
                    </div>
                  )}
                  {cp.fitScore != null && (
                    <div className="text-gray-500 text-xs">
                      Fit Score: {Math.round(cp.fitScore)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>

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
        {dept._count.contacts > 0 && (
          <Button size="sm" asChild>
            <Link href={`/chat?play=expansion&accountId=${companyId}&departmentId=${dept.id}`}>
              Start Expansion Play
            </Link>
          </Button>
        )}
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
}

function EditableField({
  label,
  value,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  className = '',
  valueClassName = 'text-sm text-gray-700',
}: {
  label: string;
  value: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string | null) => void;
  saving: boolean;
  className?: string;
  valueClassName?: string;
}) {
  const [editValue, setEditValue] = useState(value || '');

  if (!value && !isEditing) {
    return (
      <div className={className}>
        <div className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</div>
        <button
          onClick={onEdit}
          className="text-sm text-gray-400 hover:text-gray-600 italic"
        >
          Click to add {label.toLowerCase()}
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={className}>
        <div className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full p-2 border rounded text-sm"
          rows={3}
          disabled={saving}
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={() => onSave(editValue || null)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditValue(value || '');
              onCancel();
            }}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-start justify-between group">
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</div>
          <p className={valueClassName}>{value}</p>
        </div>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-700 ml-2"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function ExpandableSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isExpanded && <div className="p-3 pt-0 border-t">{children}</div>}
    </div>
  );
}
