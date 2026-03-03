'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ExistingProduct = {
  id: string;
  productId: string;
  productName: string;
  status: 'ACTIVE' | 'TRIAL' | 'CHURNED';
  deployedSince: string | null;
  contractRenewalDate: string | null;
  usageNotes: string | null;
  companyDepartmentId: string | null;
  departmentName: string | null;
};

type CatalogOption = { id: string; name: string };

type DepartmentOption = { id: string; name: string };

type Props = {
  companyId: string;
  catalogProducts: CatalogOption[];
  departments?: DepartmentOption[];
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  TRIAL: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  CHURNED: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function getDepartmentName(
  department: { customName: string | null; type: string } | null
): string | null {
  if (!department) return null;
  return department.customName ?? department.type.replace(/_/g, ' ');
}

export function ExistingStackEditor({ companyId, catalogProducts, departments = [] }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<ExistingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newProductId, setNewProductId] = useState('');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'TRIAL' | 'CHURNED'>('ACTIVE');
  const [newDeployedSince, setNewDeployedSince] = useState('');
  const [newRenewalDate, setNewRenewalDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState<string>('');

  useEffect(() => {
    fetch(`/api/companies/${companyId}/existing-products`)
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts(
            data.products.map(
              (p: {
                id: string;
                status: string;
                deployedSince: string | null;
                contractRenewalDate: string | null;
                usageNotes: string | null;
                companyDepartmentId: string | null;
                department: { customName: string | null; type: string } | null;
                product: { id: string; name: string };
              }) => ({
                id: p.id,
                productId: p.product.id,
                productName: p.product.name,
                status: p.status as ExistingProduct['status'],
                deployedSince: p.deployedSince,
                contractRenewalDate: p.contractRenewalDate,
                usageNotes: p.usageNotes,
                companyDepartmentId: p.companyDepartmentId ?? null,
                departmentName: getDepartmentName(p.department),
              })
            )
          );
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const hasDepartments = departments.length > 0;

  const availableForDepartment = (deptId: string | null) =>
    catalogProducts.filter(
      (cp) =>
        !products.some(
          (p) => p.productId === cp.id && (p.companyDepartmentId ?? null) === deptId
        )
    );

  const availableProducts = availableForDepartment(hasDepartments ? newDepartmentId || null : null);

  const saveAll = async (updated: ExistingProduct[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/existing-products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: updated.map((p) => ({
            productId: p.productId,
            status: p.status,
            deployedSince: p.deployedSince || null,
            contractRenewalDate: p.contractRenewalDate || null,
            usageNotes: p.usageNotes || null,
            companyDepartmentId: p.companyDepartmentId || null,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(
          data.products.map(
            (p: {
              id: string;
              status: string;
              deployedSince: string | null;
              contractRenewalDate: string | null;
              usageNotes: string | null;
              companyDepartmentId: string | null;
              department: { customName: string | null; type: string } | null;
              product: { id: string; name: string };
            }) => ({
              id: p.id,
              productId: p.product.id,
              productName: p.product.name,
              status: p.status as ExistingProduct['status'],
              deployedSince: p.deployedSince,
              contractRenewalDate: p.contractRenewalDate,
              usageNotes: p.usageNotes,
              companyDepartmentId: p.companyDepartmentId ?? null,
              departmentName: getDepartmentName(p.department),
            })
          )
        );
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (!newProductId) return;
    const cp = catalogProducts.find((p) => p.id === newProductId);
    if (!cp) return;

    const deptId = newDepartmentId || null;
    const dept = deptId ? departments.find((d) => d.id === deptId) : null;

    const updated = [
      ...products,
      {
        id: '',
        productId: newProductId,
        productName: cp.name,
        status: newStatus,
        deployedSince: newDeployedSince ? new Date(newDeployedSince).toISOString() : null,
        contractRenewalDate: newRenewalDate ? new Date(newRenewalDate).toISOString() : null,
        usageNotes: newNotes || null,
        companyDepartmentId: deptId,
        departmentName: dept?.name ?? null,
      },
    ];
    saveAll(updated);
    setNewProductId('');
    setNewStatus('ACTIVE');
    setNewDeployedSince('');
    setNewRenewalDate('');
    setNewNotes('');
    setNewDepartmentId('');
    setIsAdding(false);
  };

  const handleRemove = (productId: string, companyDepartmentId: string | null) => {
    saveAll(
      products.filter(
        (p) => !(p.productId === productId && (p.companyDepartmentId ?? null) === companyDepartmentId)
      )
    );
  };

  const handleDivisionChange = (
    productId: string,
    currentDeptId: string | null,
    newDeptId: string | null
  ) => {
    const product = products.find(
      (p) => p.productId === productId && (p.companyDepartmentId ?? null) === currentDeptId
    );
    if (!product) return;
    const dept = newDeptId ? departments.find((d) => d.id === newDeptId) : null;
    const updated = products.map((p) =>
      p.productId === productId && (p.companyDepartmentId ?? null) === currentDeptId
        ? { ...p, companyDepartmentId: newDeptId, departmentName: dept?.name ?? null }
        : p
    );
    saveAll(updated);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Existing Stack</h2>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Existing Stack</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Products this account already owns from your catalog
          </p>
        </div>
      </div>

      {products.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          No existing products recorded. Add products the customer already owns to improve content
          positioning.
        </p>
      )}

      {products.length > 0 && (
        <div className="space-y-4 mb-3">
          {(() => {
            const companyLevel = products.filter((p) => !p.companyDepartmentId);
            const byDivision = products
              .filter((p) => p.companyDepartmentId)
              .reduce<Array<{ deptId: string; deptName: string; items: ExistingProduct[] }>>(
                (acc, p) => {
                  const deptId = p.companyDepartmentId!;
                  const deptName = p.departmentName ?? 'Division';
                  const group = acc.find((g) => g.deptId === deptId);
                  if (group) group.items.push(p);
                  else acc.push({ deptId, deptName, items: [p] });
                  return acc;
                },
                []
              );

            const renderProduct = (p: ExistingProduct) => (
              <div
                key={`${p.productId}:${p.companyDepartmentId ?? 'null'}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-zinc-600 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {p.productName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        STATUS_COLORS[p.status] ?? ''
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.departmentName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-gray-100 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-500">
                        {p.departmentName}
                      </span>
                    )}
                    {hasDepartments && (
                      <select
                        value={p.companyDepartmentId ?? ''}
                        onChange={(e) =>
                          handleDivisionChange(
                            p.productId,
                            p.companyDepartmentId,
                            e.target.value || null
                          )
                        }
                        disabled={saving}
                        className="text-xs rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Company</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {p.deployedSince && (
                      <span>Since {new Date(p.deployedSince).toLocaleDateString()}</span>
                    )}
                    {p.contractRenewalDate && (
                      <span>
                        Renewal {new Date(p.contractRenewalDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {p.usageNotes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {p.usageNotes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(p.productId, p.companyDepartmentId)}
                  disabled={saving}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0"
                >
                  Remove
                </button>
              </div>
            );

            return (
              <>
                {companyLevel.length > 0 && (
                  <div className="space-y-2">
                    {companyLevel.length > 0 && hasDepartments && (
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Company-level
                      </p>
                    )}
                    {companyLevel.map(renderProduct)}
                  </div>
                )}
                {byDivision.map(({ deptId, deptName, items }) => (
                  <div key={deptId} className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {deptName}
                    </p>
                    {items.map(renderProduct)}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}

      {isAdding ? (
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {hasDepartments && (
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 dark:text-gray-400">Division</label>
                <select
                  value={newDepartmentId}
                  onChange={(e) => {
                    setNewDepartmentId(e.target.value);
                    setNewProductId('');
                  }}
                  className="w-full text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Company-level</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select product...</option>
              {availableProducts.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}
                </option>
              ))}
            </select>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
              className="text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-gray-900 dark:text-gray-100"
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="CHURNED">Churned</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400">Deployed since</label>
              <input
                type="date"
                value={newDeployedSince}
                onChange={(e) => setNewDeployedSince(e.target.value)}
                className="w-full text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400">
                Contract renewal
              </label>
              <input
                type="date"
                value={newRenewalDate}
                onChange={(e) => setNewRenewalDate(e.target.value)}
                className="w-full text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Usage notes (e.g. 'Heavy journey builder usage, 500K sends/month')"
            className="w-full text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1.5 text-gray-900 dark:text-gray-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newProductId || saving}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80"
        >
          + Add Existing Product
        </button>
      )}
    </div>
  );
}
