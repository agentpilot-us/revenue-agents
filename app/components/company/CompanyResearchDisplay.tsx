'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CompanyResearchData = {
  employees?: string | null;
  headquarters?: string | null;
  revenue?: string | null;
  businessOverview?: string | null;
  keyInitiatives?: string[] | null;
  techStack?: string[] | null;
  departments?: Array<{
    type: string;
    customName?: string | null;
    useCase?: string | null;
    estimatedOpportunity?: string | null;
    targetRoles?: {
      economicBuyer?: string[];
      technicalEvaluator?: string[];
      champion?: string[];
      influencer?: string[];
    } | null;
    companyProducts?: Array<{
      product: {
        name: string;
      };
    }>;
  }>;
};

type Props = {
  companyId: string;
};

export function CompanyResearchDisplay({ companyId }: Props) {
  const [researchData, setResearchData] = useState<CompanyResearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResearchData() {
      try {
        const res = await fetch(`/api/companies/${companyId}/research-data`);
        if (res.ok) {
          const data = await res.json();
          setResearchData(data);
        } else {
          console.error('Failed to fetch research data:', res.status, res.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch research data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (companyId) {
      fetchResearchData();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="p-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading research data...</p>
      </div>
    );
  }

  if (!researchData) {
    return (
      <div className="p-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No research data yet.{' '}
          <Link href={`/dashboard/companies/${companyId}/intelligence`} className="text-blue-600 dark:text-blue-400 hover:underline">
            Research target company
          </Link>{' '}
          to generate account intelligence.
        </p>
      </div>
    );
  }

  const hasData =
    researchData.employees ||
    researchData.headquarters ||
    researchData.revenue ||
    researchData.businessOverview ||
    (researchData.keyInitiatives && researchData.keyInitiatives.length > 0) ||
    (researchData.techStack && researchData.techStack.length > 0) ||
    (researchData.departments && researchData.departments.length > 0);

  if (!hasData) {
    return (
      <div className="p-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Research data exists but is empty. Use &quot;Research with AI&quot; to populate account intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          📊 Account Research
        </h3>
        <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          ✅ AI Generated
        </span>
      </div>

      <div className="space-y-4 text-sm">
        {/* Company Basics */}
        {(researchData.employees || researchData.headquarters || researchData.revenue) && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Company Basics</h4>
            <div className="text-gray-600 dark:text-gray-300 space-y-0.5">
              {researchData.employees && <div>Employees: {researchData.employees}</div>}
              {researchData.headquarters && <div>HQ: {researchData.headquarters}</div>}
              {researchData.revenue && <div>Revenue: {researchData.revenue}</div>}
            </div>
          </div>
        )}

        {/* Business Overview */}
        {researchData.businessOverview && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Business Overview</h4>
            <p className="text-gray-600 dark:text-gray-300">{researchData.businessOverview}</p>
          </div>
        )}

        {/* Key Initiatives */}
        {researchData.keyInitiatives && researchData.keyInitiatives.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Key Initiatives</h4>
            <ul className="text-gray-600 dark:text-gray-300 space-y-0.5 list-disc list-inside">
              {researchData.keyInitiatives.map((initiative, i) => (
                <li key={i}>{initiative}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tech Stack Hints */}
        {researchData.techStack && researchData.techStack.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Tech Stack Hints</h4>
            <div className="flex flex-wrap gap-2">
              {researchData.techStack.map((tech, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Micro-Segments */}
        {researchData.departments && researchData.departments.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Micro-Segments</h4>
            <div className="space-y-3">
              {researchData.departments.map((dept, i) => {
                const deptName = dept.customName || dept.type.replace(/_/g, ' ');
                const roles = dept.targetRoles;
                const hasRoles =
                  roles &&
                  ((roles.economicBuyer && roles.economicBuyer.length > 0) ||
                    (roles.technicalEvaluator && roles.technicalEvaluator.length > 0) ||
                    (roles.champion && roles.champion.length > 0) ||
                    (roles.influencer && roles.influencer.length > 0));

                return (
                  <div
                    key={i}
                    className="border-l-2 border-blue-500 pl-3 py-1 bg-gray-50 dark:bg-zinc-700/50 rounded"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{deptName}</div>
                    {dept.useCase && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Use Case: {dept.useCase}
                      </div>
                    )}
                    {dept.estimatedOpportunity && (
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        Opportunity: {dept.estimatedOpportunity}
                      </div>
                    )}
                    {hasRoles && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 space-y-0.5">
                        {roles.economicBuyer && roles.economicBuyer.length > 0 && (
                          <div>Economic Buyer: {roles.economicBuyer.join(', ')}</div>
                        )}
                        {roles.technicalEvaluator && roles.technicalEvaluator.length > 0 && (
                          <div>Technical Evaluator: {roles.technicalEvaluator.join(', ')}</div>
                        )}
                        {roles.champion && roles.champion.length > 0 && (
                          <div>Champion: {roles.champion.join(', ')}</div>
                        )}
                        {roles.influencer && roles.influencer.length > 0 && (
                          <div>Influencer: {roles.influencer.join(', ')}</div>
                        )}
                      </div>
                    )}
                    {dept.companyProducts && dept.companyProducts.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Products: {dept.companyProducts.map((cp) => cp.product.name).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
