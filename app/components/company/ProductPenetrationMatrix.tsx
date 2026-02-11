'use client';

import { useState } from 'react';
import { ProductOwnershipStatus } from '@prisma/client';
import { calculateProductFit, type FitOpportunity } from '@/app/actions/calculate-product-fit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type CompanyDepartmentRow = {
  id: string;
  type: string;
  customName: string | null;
  status: string;
  companyProducts: Array<{
    id: string;
    productId: string;
    status: ProductOwnershipStatus;
    arr: unknown;
    opportunitySize: unknown;
    fitScore: unknown;
    fitReasoning: string | null;
    contractEnd: Date | null;
    product: {
      id: string;
      name: string;
      priceMin: unknown;
      priceMax: unknown;
    };
  }>;
};

type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  priceMin: unknown;
  priceMax: unknown;
};

type CompanyProductCell = CompanyDepartmentRow['companyProducts'][number] | null;

type MatrixData = {
  departments: CompanyDepartmentRow[];
  products: CatalogProductRow[];
  companyId: string;
};

export function ProductPenetrationMatrix({ data }: { data: MatrixData }) {
  const { departments, products, companyId } = data;
  const [calculating, setCalculating] = useState(false);
  const [opportunities, setOpportunities] = useState<FitOpportunity[]>([]);

  const handleCalculateFit = async () => {
    setCalculating(true);
    try {
      const results = await calculateProductFit(companyId);
      setOpportunities(results);
    } catch (error) {
      console.error('Fit calculation failed:', error);
    } finally {
      setCalculating(false);
    }
  };

  const matrix: Record<string, Record<string, CompanyProductCell>> = {};
  departments.forEach((dept) => {
    matrix[dept.id] = {};
    products.forEach((product) => {
      const companyProduct = dept.companyProducts.find((cp) => cp.productId === product.id) ?? null;
      matrix[dept.id][product.id] = companyProduct;
    });
  });

  const getCellStyle = (status: ProductOwnershipStatus | null) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'TRIAL':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'OPPORTUNITY':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'CHURNED':
        return 'bg-red-100 border-red-300 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-400';
    }
  };

  const getCellIcon = (status: ProductOwnershipStatus | null) => {
    switch (status) {
      case 'ACTIVE':
        return '✅';
      case 'TRIAL':
        return '🧪';
      case 'OPPORTUNITY':
        return '🎯';
      case 'CHURNED':
        return '❌';
      default:
        return '—';
    }
  };

  const totalARR = departments.reduce((sum, dept) => {
    return (
      sum +
      dept.companyProducts
        .filter((cp) => cp.status === 'ACTIVE')
        .reduce((deptSum, cp) => deptSum + Number(cp.arr ?? 0), 0)
    );
  }, 0);

  const totalOpportunity = departments.reduce((sum, dept) => {
    return (
      sum +
      dept.companyProducts
        .filter((cp) => cp.status === 'OPPORTUNITY')
        .reduce((deptSum, cp) => deptSum + Number(cp.opportunitySize ?? 0), 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">Product Penetration Matrix</h2>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Current ARR:</span>
              <span className="ml-2 font-semibold text-green-600">
                ${totalARR.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Expansion Opportunity:</span>
              <span className="ml-2 font-semibold text-yellow-600">
                ${totalOpportunity.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Target ARR:</span>
              <span className="ml-2 font-semibold text-blue-600">
                ${(totalARR + totalOpportunity).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleCalculateFit} disabled={calculating}>
          {calculating ? 'Calculating fit…' : 'AI Calculate Opportunities'}
        </Button>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
          <span>✅ Active Customer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
          <span>🎯 Opportunity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
          <span>🧪 Trial/POC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded" />
          <span>— Not Relevant</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-3 bg-gray-50 text-left font-semibold sticky left-0 z-10">
                Department \ Product
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  className="border p-3 bg-gray-50 text-left font-semibold min-w-[140px]"
                >
                  <div className="text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500 font-normal">
                    ${(Number(product.priceMin ?? 0) / 1000).toFixed(0)}K - $
                    {(Number(product.priceMax ?? 0) / 1000).toFixed(0)}K
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td className="border p-3 font-semibold bg-gray-50 sticky left-0 z-10">
                  <div>{dept.customName ?? dept.type.replace(/_/g, ' ')}</div>
                  <Badge className="mt-1 text-xs">{dept.status.replace(/_/g, ' ')}</Badge>
                </td>
                {products.map((product) => {
                  const companyProduct = matrix[dept.id][product.id];
                  return (
                    <Tooltip key={product.id}>
                      <TooltipTrigger asChild>
                        <td
                          className={`
                            border p-3 text-center cursor-pointer
                            hover:ring-2 hover:ring-blue-400 transition-all
                            ${getCellStyle(companyProduct?.status ?? null)}
                          `}
                        >
                          <div className="text-2xl mb-1">
                            {getCellIcon(companyProduct?.status ?? null)}
                          </div>

                          {companyProduct && (
                            <div className="text-sm font-semibold">
                              {companyProduct.status === 'ACTIVE' && (
                                <div className="text-green-700">
                                  ${Number(companyProduct.arr ?? 0).toLocaleString()}
                                </div>
                              )}
                              {companyProduct.status === 'OPPORTUNITY' && (
                                <div className="text-yellow-700">
                                  $
                                  {Number(companyProduct.opportunitySize ?? 0).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}

                          {companyProduct?.fitScore != null && (
                            <div className="text-xs text-gray-600 mt-1">
                              {Number(companyProduct.fitScore)}% fit
                            </div>
                          )}
                        </td>
                      </TooltipTrigger>

                      <TooltipContent className="max-w-sm">
                        {companyProduct ? (
                          <div className="space-y-2">
                            <div className="font-semibold">
                              {product.name} → {dept.type.replace(/_/g, ' ')}
                            </div>

                            {companyProduct.status === 'ACTIVE' && (
                              <div className="text-green-600">
                                ✅ Active Customer
                                <div className="text-sm">
                                  ARR: $
                                  {Number(companyProduct.arr ?? 0).toLocaleString()}/year
                                </div>
                                {companyProduct.contractEnd && (
                                  <div className="text-xs text-gray-600">
                                    Renews:{' '}
                                    {new Date(companyProduct.contractEnd).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )}

                            {companyProduct.status === 'OPPORTUNITY' && (
                              <div>
                                <div className="text-yellow-600 font-semibold">
                                  🎯 Expansion Opportunity
                                </div>
                                <div className="text-sm mt-1">
                                  Est. ARR: $
                                  {Number(companyProduct.opportunitySize ?? 0).toLocaleString()}
                                </div>
                                {companyProduct.fitScore != null && (
                                  <div className="text-sm">
                                    Fit Score: {Number(companyProduct.fitScore)}/100
                                  </div>
                                )}
                                {companyProduct.fitReasoning && (
                                  <div className="text-xs text-gray-600 mt-2 border-t pt-2">
                                    {companyProduct.fitReasoning}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            No current relationship or identified opportunity
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {opportunities.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Prioritized Expansion Opportunities</h3>
          <div className="space-y-3">
            {opportunities
              .filter((opp) => opp.priority === 'HIGH')
              .sort((a, b) => b.fitScore - a.fitScore)
              .map((opp, index) => (
                <div
                  key={`${opp.productId}-${opp.departmentId}`}
                  className="border rounded-lg p-4 bg-yellow-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">
                        #{index + 1}: {opp.productName} → {opp.departmentType.replace(/_/g, ' ')}
                      </div>
                      <div className="flex gap-3 text-sm text-gray-600 mt-1">
                        <span>
                          Fit Score: <strong>{opp.fitScore}%</strong>
                        </span>
                        <span>
                          Est. ARR: <strong>${opp.estimatedARR.toLocaleString()}</strong>
                        </span>
                        <Badge>{opp.priority}</Badge>
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <a href={`/chat?play=expansion&accountId=${companyId}`}>Start Play</a>
                    </Button>
                  </div>

                  <div className="text-sm text-gray-700 mb-3">{opp.reasoning}</div>

                  <div className="text-sm">
                    <div className="font-semibold mb-1">Next Steps:</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {opp.nextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
