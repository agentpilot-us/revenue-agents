'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildContentUrl } from '@/lib/urls/content';

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

type DivisionIntelligenceCardProps = {
  department: Department;
  products: ProductFit[];
  caseStudies: CaseStudy[];
  companyId: string;
  /** Called when Prep Me is clicked (Ticket 2 will wire this). */
  onPrepMe?: () => void;
};

function CollapsibleSection({
  title,
  defaultExpanded,
  children,
  emptyMessage,
  emptyAction,
}: {
  title: string;
  defaultExpanded: boolean;
  children: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasContent = children != null && (typeof children !== 'boolean' || children);
  const showEmpty = !hasContent && emptyMessage;

  return (
    <div className="border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors text-card-foreground"
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="p-3 pt-0 border-t border-border">
          {hasContent && children}
          {showEmpty && (
            <>
              <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
              {emptyAction}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DivisionIntelligenceCard({
  department,
  products,
  caseStudies,
  companyId,
  onPrepMe,
}: DivisionIntelligenceCardProps) {
  const divisionName = department.customName || department.type.replace(/_/g, ' ');
  const contactCount = department._count?.contacts ?? 0;

  const productsWithRelevance = products
    .filter((p) => p.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);

  const hasObjections =
    department.objectionHandlers && department.objectionHandlers.length > 0;
  const hasTargetRoles = department.targetRoles && (
    (department.targetRoles.economicBuyer?.length ?? 0) > 0 ||
    (department.targetRoles.technicalEvaluator?.length ?? 0) > 0 ||
    (department.targetRoles.champion?.length ?? 0) > 0 ||
    (department.targetRoles.influencer?.length ?? 0) > 0
  );

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header: always visible */}
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-card-foreground">
            {divisionName}
          </h3>
          {department.estimatedOpportunity && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
              {department.estimatedOpportunity}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {contactCount} contact{contactCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onPrepMe && (
            <Button size="sm" variant="outline" onClick={onPrepMe}>
              Prep Me
            </Button>
          )}
          <Button size="sm" asChild>
            <Link
              href={buildContentUrl({
                companyId,
                divisionId: department.id,
                channel: 'email',
              })}
            >
              Create Content
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Why This Division Buys — expanded by default */}
        <CollapsibleSection
          title="Why This Division Buys"
          defaultExpanded={true}
          emptyMessage={
            !department.valueProp && !department.useCase
              ? 'Run Account Intelligence to add value prop and use cases.'
              : undefined
          }
        >
          {department.valueProp && (
            <p className="text-sm text-card-foreground leading-relaxed mb-2">
              {department.valueProp}
            </p>
          )}
          {department.useCase && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Use cases: </span>
              <span className="text-card-foreground">{department.useCase}</span>
            </div>
          )}
        </CollapsibleSection>

        {/* Product Fit */}
        <CollapsibleSection
          title="Product Fit"
          defaultExpanded={true}
          emptyMessage={
            productsWithRelevance.length === 0
              ? 'Run Account Intelligence to score product fit.'
              : undefined
          }
        >
          {productsWithRelevance.length > 0 && (
            <div className="space-y-2">
              {productsWithRelevance.map((p, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-card-foreground">
                      {p.productName}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {Math.round(p.relevance)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.min(100, p.relevance)}%` }}
                    />
                  </div>
                  {p.talkingPoint && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {p.talkingPoint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Objection Handlers */}
        <CollapsibleSection
          title="Objection Handlers"
          defaultExpanded={false}
          emptyMessage={
            !hasObjections ? 'No objections mapped yet.' : undefined
          }
          emptyAction={
            !hasObjections ? (
              <Link
                href={`/dashboard/companies/${companyId}/intelligence`}
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Re-run research to map objections →
              </Link>
            ) : undefined
          }
        >
          {hasObjections && (
            <div className="space-y-2">
              {department.objectionHandlers!.map((oh, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="font-medium text-sm text-card-foreground mb-1">
                    {oh.objection}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {oh.response}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Proof Points (case studies) */}
        <CollapsibleSection
          title="Proof Points"
          defaultExpanded={false}
          emptyMessage={
            caseStudies.length === 0
              ? 'Add case studies in My Company to show proof points here.'
              : undefined
          }
          emptyAction={
            caseStudies.length === 0 ? (
              <Link
                href="/dashboard/my-company"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Add case studies in My Company →
              </Link>
            ) : undefined
          }
        >
          {caseStudies.length > 0 && (
            <ul className="space-y-2">
              {caseStudies.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-card-foreground">
                      {c.title}
                    </span>
                    {c.oneLiner && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {c.oneLiner}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        {/* Who to Engage */}
        <CollapsibleSection
          title="Who to Engage"
          defaultExpanded={false}
          emptyMessage={
            !hasTargetRoles ? 'No target roles mapped yet.' : undefined
          }
        >
          {hasTargetRoles && department.targetRoles && (
            <div className="space-y-2 text-sm">
              {department.targetRoles.economicBuyer &&
                department.targetRoles.economicBuyer.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Economic Buyer:{' '}
                    </span>
                    <span className="text-card-foreground">
                      {department.targetRoles.economicBuyer.join(', ')}
                    </span>
                  </div>
                )}
              {department.targetRoles.technicalEvaluator &&
                department.targetRoles.technicalEvaluator.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Technical Evaluator:{' '}
                    </span>
                    <span className="text-card-foreground">
                      {department.targetRoles.technicalEvaluator.join(', ')}
                    </span>
                  </div>
                )}
              {department.targetRoles.champion &&
                department.targetRoles.champion.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Champion:{' '}
                    </span>
                    <span className="text-card-foreground">
                      {department.targetRoles.champion.join(', ')}
                    </span>
                  </div>
                )}
              {department.targetRoles.influencer &&
                department.targetRoles.influencer.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Influencer:{' '}
                    </span>
                    <span className="text-card-foreground">
                      {department.targetRoles.influencer.join(', ')}
                    </span>
                  </div>
                )}
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <Link
                  href={`/dashboard/companies/${companyId}?tab=contacts&division=${department.id}`}
                >
                  View contacts in this division →
                </Link>
              </Button>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
