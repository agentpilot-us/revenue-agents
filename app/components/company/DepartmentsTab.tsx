'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentStatus } from '@prisma/client';
import { discoverDepartments, type DiscoveredDepartment } from '@/app/actions/discover-departments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DivisionIntelligenceCard } from '@/app/dashboard/companies/[id]/buying-groups/DivisionIntelligenceCard';

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

type CaseStudyForUI = {
  title: string;
  oneLiner: string;
  industry: string | null;
  department: string | null;
};

type PrepMePanelParams = {
  companyId: string;
  companyName: string;
  divisionName?: string;
  contactId?: string;
  contactName?: string;
  contactTitle?: string;
  signalTitle?: string;
  signalSummary?: string;
};

export function DepartmentsTab({
  companyId,
  companyName,
  departments: initialDepartments,
  segmentationStrategy,
  segmentationRationale,
  caseStudies = [],
  onPrepMeOpen,
}: {
  companyId: string;
  companyName?: string;
  departments: CompanyDepartmentWithRelations[];
  segmentationStrategy?: string | null;
  segmentationRationale?: string | null;
  caseStudies?: CaseStudyForUI[];
  onPrepMeOpen?: (params: PrepMePanelParams) => void;
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
        throw new Error(data.error || 'Failed to add division');
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
    [DepartmentStatus.ACTIVE_CUSTOMER]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [DepartmentStatus.EXPANSION_TARGET]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    [DepartmentStatus.RESEARCH_PHASE]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [DepartmentStatus.NOT_ENGAGED]: 'bg-muted text-muted-foreground border-border',
    [DepartmentStatus.NOT_APPLICABLE]: 'bg-muted text-muted-foreground border-border',
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
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <h2 className="text-xl font-semibold text-card-foreground mb-3">Segmentation Strategy</h2>
          {segmentationStrategy && (
            <div className="mb-3">
              <span className="font-medium text-foreground">Strategy:</span>{' '}
              <span className="text-muted-foreground">{segmentationStrategy.replace(/_/g, ' ')}</span>
            </div>
          )}
          {segmentationRationale && (
            <div>
              <span className="font-medium text-foreground">Rationale:</span>
              <p className="text-muted-foreground mt-1">{segmentationRationale}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Divisions</h2>
          <p className="text-muted-foreground">
            Buying group coverage by division
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
        <div className="border rounded-lg p-4 bg-accent/30 border-border">
          <h3 className="font-semibold mb-3 text-card-foreground">AI Discovered Divisions</h3>
          <div className="space-y-2">
            {discovered.map((dept, i) => (
              <div
                key={`${dept.type}-${i}`}
                className="flex justify-between items-center p-3 bg-card rounded border border-border"
              >
                <div>
                  <div className="font-medium text-card-foreground">{dept.type.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-muted-foreground">{dept.reasoning}</div>
                  <div className="text-xs text-muted-foreground">
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
          <div className="text-center py-12 border-2 border-dashed rounded-lg border-border">
            <p className="text-muted-foreground mb-4">No departments added yet</p>
            <Button onClick={handleDiscover}>
              Discover Divisions with AI
            </Button>
          </div>
        ) : (
          departments.map((dept) => {
            const hasValueProp = !!dept.valueProp?.trim();
            if (hasValueProp) {
              const products = dept.companyProducts.map((cp) => ({
                productName: cp.product.name,
                relevance: cp.fitScore != null ? Number(cp.fitScore) : 0,
                talkingPoint: cp.fitReasoning ?? null,
              }));
              const divisionName = dept.customName || dept.type.replace(/_/g, ' ');
              return (
                <DivisionIntelligenceCard
                  key={dept.id}
                  department={{
                    id: dept.id,
                    type: dept.type,
                    customName: dept.customName,
                    valueProp: dept.valueProp,
                    useCase: dept.useCase,
                    objectionHandlers: dept.objectionHandlers,
                    targetRoles: dept.targetRoles,
                    estimatedOpportunity: dept.estimatedOpportunity,
                    _count: dept._count,
                  }}
                  products={products}
                  caseStudies={caseStudies}
                  companyId={companyId}
                  onPrepMe={
                    onPrepMeOpen && companyName
                      ? () =>
                          onPrepMeOpen({
                            companyId,
                            companyName,
                            divisionName,
                          })
                      : undefined
                  }
                />
              );
            }
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
                companyName={companyName}
                deptARR={deptARR}
                oppSum={oppSum}
                topFit={topFit}
                whyNow={whyNow}
                statusColors={statusColors}
                statusIcons={statusIcons}
                showRunAccountIntelligence
                onPrepMeOpen={onPrepMeOpen}
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
  companyName,
  deptARR,
  oppSum,
  topFit,
  whyNow,
  statusColors,
  statusIcons,
  showRunAccountIntelligence = false,
  onPrepMeOpen,
}: {
  dept: CompanyDepartmentWithRelations;
  companyId: string;
  companyName?: string;
  deptARR: number;
  oppSum: number;
  topFit: { fitScore: number | null; fitReasoning: string | null } | undefined;
  whyNow: string | null;
  statusColors: Record<DepartmentStatus, string>;
  statusIcons: Record<DepartmentStatus, string>;
  showRunAccountIntelligence?: boolean;
  onPrepMeOpen?: (params: PrepMePanelParams) => void;
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
    <div className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-semibold text-card-foreground">
            {dept.customName || dept.type.replace(/_/g, ' ')}
          </h3>
          {dept.status === DepartmentStatus.RESEARCH_PHASE ? (
            <Badge className="bg-muted text-muted-foreground border-border">
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
        className="mb-3 p-3 bg-accent/30 rounded-lg border border-border"
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
        valueClassName="text-sm font-semibold text-green-400"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
        {deptARR > 0 && (
          <div>
            <span className="text-muted-foreground">ARR</span>
            <div className="font-semibold text-card-foreground">${deptARR.toLocaleString()}</div>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Opportunity</span>
          <div className="font-semibold text-green-400">
            ${oppSum.toLocaleString()}
            {topFit?.fitScore != null && (
              <span className="text-muted-foreground font-normal ml-1">({Math.round(topFit.fitScore)}% fit)</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Contacts</span>
          <div className="font-semibold text-card-foreground">{dept._count.contacts}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Activities</span>
          <div className="font-semibold text-card-foreground">{dept._count.activities}</div>
        </div>
      </div>

      {dept.contacts.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Contacts</div>
          <ul className="text-sm space-y-1.5 text-card-foreground">
            {dept.contacts.map((c) => {
              const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
              const divisionName = dept.customName || dept.type.replace(/_/g, ' ');
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 py-1">
                  <span>
                    {fullName}
                    {c.title && ` (${c.title})`}
                    {c.personaName && (
                      <span className="text-muted-foreground"> — {c.personaName}</span>
                    )}
                  </span>
                  {onPrepMeOpen && companyName && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-7 px-2 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() =>
                        onPrepMeOpen({
                          companyId,
                          companyName,
                          divisionName,
                          contactId: c.id,
                          contactName: fullName,
                          contactTitle: c.title ?? undefined,
                        })
                      }
                      title="Prep Me — talking points"
                    >
                      Prep
                    </Button>
                  )}
                </li>
              );
            })}
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
            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Target roles (job titles)</div>
            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2 text-card-foreground">
              {r?.economicBuyer && r.economicBuyer.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Economic buyer: </span>
                  <span>{r.economicBuyer.join(', ')}</span>
                </div>
              )}
              {r?.technicalEvaluator && r.technicalEvaluator.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Technical evaluator: </span>
                  <span>{r.technicalEvaluator.join(', ')}</span>
                </div>
              )}
              {r?.champion && r.champion.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Champion: </span>
                  <span>{r.champion.join(', ')}</span>
                </div>
              )}
              {r?.influencer && r.influencer.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Influencer: </span>
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
                <div key={i} className="p-3 bg-muted rounded border border-border">
                  <div className="font-medium text-sm mb-1 text-card-foreground">{oh.objection}</div>
                  <div className="text-sm text-muted-foreground">{oh.response}</div>
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
                <div key={cp.id} className="p-2 bg-muted rounded border border-border">
                  <div className="font-medium text-card-foreground">{cp.product.name}</div>
                  {cp.status === 'ACTIVE' && cp.arr != null && (
                    <div className="text-muted-foreground">
                      ARR: ${cp.arr.toLocaleString()}
                    </div>
                  )}
                  {cp.status === 'OPPORTUNITY' && cp.opportunitySize != null && (
                    <div className="text-green-400">
                      Opportunity: ${cp.opportunitySize.toLocaleString()}
                    </div>
                  )}
                  {cp.fitScore != null && (
                    <div className="text-muted-foreground text-xs">
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
          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Why now</div>
          <p className="text-sm text-muted-foreground line-clamp-2">{whyNow}</p>
        </div>
      )}

      {dept.lastActivity && (
        <div className="mb-4 text-xs text-muted-foreground">
          Last activity: {dept.lastActivity.summary} —{' '}
          {new Date(dept.lastActivity.createdAt).toLocaleDateString()}
        </div>
      )}

      {showRunAccountIntelligence && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            Run Account Intelligence to get value prop, product fit, and objection handlers for this division.
          </p>
          <Button size="sm" asChild>
            <Link href={`/dashboard/companies/${companyId}/intelligence`}>
              Run Account Intelligence
            </Link>
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-3 border-t">
        <Button size="sm" asChild>
          <Link href={`/dashboard/companies/${companyId}/discover-contacts?department=${dept.id}`}>
            Find contacts for this division
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/companies/${companyId}?tab=overview&division=${dept.id}`}>
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
              Start expansion plan
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
  valueClassName = 'text-sm text-card-foreground',
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
        <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{label}</div>
        <button
          onClick={onEdit}
          className="text-sm text-muted-foreground hover:text-foreground italic"
        >
          Click to add {label.toLowerCase()}
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={className}>
        <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{label}</div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full p-2 border border-input bg-input rounded text-sm text-foreground"
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
<div className="text-xs font-medium text-muted-foreground uppercase mb-1">{label}</div>
        <p className={valueClassName}>{value}</p>
        </div>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary hover:underline ml-2"
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
    <div className="border border-border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted transition-colors text-card-foreground"
      >
        <span className="font-medium text-sm">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && <div className="p-3 pt-0 border-t border-border">{children}</div>}
    </div>
  );
}
