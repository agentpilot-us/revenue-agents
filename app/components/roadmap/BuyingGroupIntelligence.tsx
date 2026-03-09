'use client';

import { useState } from 'react';
import { DivisionIntelligenceCard } from '@/app/dashboard/companies/[id]/buying-groups/DivisionIntelligenceCard';

type TargetRoles = {
  economicBuyer?: string[];
  technicalEvaluator?: string[];
  champion?: string[];
  influencer?: string[];
} | null;

type Department = {
  id: string;
  type: string;
  customName: string | null;
  valueProp: string | null;
  useCase: string | null;
  objectionHandlers: Array<{ objection: string; response: string }> | null;
  targetRoles: TargetRoles;
  searchKeywords: string[] | null;
  estimatedOpportunity: string | null;
  _count?: { contacts: number };
};

type ProductFit = {
  productName: string;
  relevance: number;
  talkingPoint: string | null;
};

type CaseStudy = {
  title: string;
  oneLiner: string;
  industry: string | null;
  department: string | null;
};

type DivisionEntry = {
  department: Department;
  products: ProductFit[];
};

type Props = {
  companyId: string;
  businessOverview: string | null;
  keyInitiatives: string[] | null;
  divisionTargets: DivisionEntry[];
  caseStudies: CaseStudy[];
};

export default function BuyingGroupIntelligence({
  companyId,
  businessOverview,
  keyInitiatives,
  divisionTargets,
  caseStudies,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!businessOverview && divisionTargets.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Account Intelligence
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          {/* Business Overview */}
          {businessOverview && (
            <div className="rounded-lg border border-border bg-card/80 p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-2">
                Business Overview &amp; Key Initiatives
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {businessOverview}
              </p>
              {keyInitiatives && keyInitiatives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-card-foreground mb-1.5">
                    Key Initiatives
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {keyInitiatives.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Division Intelligence Cards */}
          {divisionTargets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {divisionTargets.length} buying group{divisionTargets.length !== 1 ? 's' : ''} mapped
                </p>
              </div>
              {divisionTargets.map((entry) => (
                <DivisionIntelligenceCard
                  key={entry.department.id}
                  department={entry.department}
                  products={entry.products}
                  caseStudies={caseStudies}
                  companyId={companyId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
