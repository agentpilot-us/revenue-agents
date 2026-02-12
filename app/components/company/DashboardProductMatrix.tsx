'use client';

import Link from 'next/link';

type DepartmentRow = {
  id: string;
  type: string;
  customName: string | null;
  status: string;
  _count?: { contacts: number };
  companyProducts: Array<{
    productId: string;
    status: string;
    arr: number | null;
    opportunitySize: number | null;
    product: { id: string; name: string };
  }>;
};

type ProductRow = {
  id: string;
  name: string;
};

type Props = {
  companyId: string;
  companyName: string;
  departments: DepartmentRow[];
  products: ProductRow[];
};

function getCellStyle(status: string | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300';
    case 'TRIAL':
      return 'bg-sky-900/50 border-sky-600/50 text-sky-300';
    case 'OPPORTUNITY':
      return 'bg-amber-900/50 border-amber-600/50 text-amber-300';
    case 'CHURNED':
      return 'bg-red-900/50 border-red-600/50 text-red-300';
    default:
      return 'bg-zinc-800 border-slate-700 text-slate-500';
  }
}

function getCellLabel(status: string | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'TRIAL':
      return 'Trial';
    case 'OPPORTUNITY':
      return 'Opp';
    case 'CHURNED':
      return 'Churned';
    default:
      return '—';
  }
}

export function DashboardProductMatrix({ companyId, companyName, departments, products }: Props) {
  const matrix: Record<string, Record<string, { status: string; arr: number | null; opportunitySize: number | null } | null>> = {};
  departments.forEach((dept) => {
    matrix[dept.id] = {};
    products.forEach((product) => {
      const cp = dept.companyProducts.find((c) => c.productId === product.id);
      matrix[dept.id][product.id] = cp
        ? { status: cp.status, arr: cp.arr, opportunitySize: cp.opportunitySize }
        : null;
    });
  });

  if (departments.length === 0 || products.length === 0) {
    return (
      <p className="text-slate-500 text-xs py-2">
        No departments or products yet.{' '}
        <Link href={`/dashboard/companies/${companyId}`} className="text-amber-400 hover:underline">
          Set up company
        </Link>
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse text-xs min-w-[200px]">
        <thead>
          <tr>
            <th className="border border-slate-700 bg-zinc-800/80 p-2 text-left font-semibold text-slate-400 sticky left-0 z-10 whitespace-nowrap">
              Dept \ Product
            </th>
            {products.map((product) => (
              <th
                key={product.id}
                className="border border-slate-700 bg-zinc-800/80 p-2 text-left font-semibold text-slate-400 min-w-[80px]"
              >
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td className="border border-slate-700 p-2 font-medium text-slate-300 sticky left-0 z-10 bg-zinc-800/90 whitespace-nowrap">
                <span>{dept.customName || dept.type.replace(/_/g, ' ')}</span>
                {dept._count != null && (
                  <span className="text-slate-500 ml-1">({dept._count.contacts})</span>
                )}
              </td>
              {products.map((product) => {
                const cell = matrix[dept.id][product.id];
                const status = cell?.status ?? null;
                return (
                  <td
                    key={product.id}
                    className={`border border-slate-700 p-2 text-center ${getCellStyle(status)}`}
                  >
                    <div>{getCellLabel(status)}</div>
                    {cell && (cell.status === 'ACTIVE' && cell.arr != null) && (
                      <div className="text-[10px] mt-0.5">
                        ${(cell.arr / 1000).toFixed(0)}K
                      </div>
                    )}
                    {cell && (cell.status === 'OPPORTUNITY' && cell.opportunitySize != null) && (
                      <div className="text-[10px] mt-0.5">
                        ${(cell.opportunitySize / 1000).toFixed(0)}K
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        href={`/dashboard/companies/${companyId}`}
        className="inline-block mt-2 text-xs text-slate-500 hover:text-amber-400 transition-colors"
      >
        View full matrix →
      </Link>
    </div>
  );
}
