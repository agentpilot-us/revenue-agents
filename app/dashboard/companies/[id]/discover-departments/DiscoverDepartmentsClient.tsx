'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { DepartmentType, DepartmentStatus } from '@prisma/client';
import { discoverDepartments, type DiscoveredDepartment } from '@/app/actions/discover-departments';
import { Button } from '@/components/ui/button';

const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  [DepartmentType.MANUFACTURING_OPERATIONS]: 'Manufacturing Operations',
  [DepartmentType.INDUSTRIAL_DESIGN]: 'Industrial Design',
  [DepartmentType.AUTONOMOUS_VEHICLES]: 'Autonomous Vehicles',
  [DepartmentType.IT_DATA_CENTER]: 'IT / Data Center',
  [DepartmentType.SALES]: 'Sales',
  [DepartmentType.MARKETING]: 'Marketing',
  [DepartmentType.CUSTOMER_SUCCESS]: 'Customer Success',
  [DepartmentType.REVENUE_OPERATIONS]: 'Revenue Operations',
  [DepartmentType.PRODUCT]: 'Product',
  [DepartmentType.ENGINEERING]: 'Engineering',
  [DepartmentType.SUPPLY_CHAIN]: 'Supply Chain',
  [DepartmentType.CONNECTED_SERVICES]: 'Connected Services',
  [DepartmentType.EXECUTIVE_LEADERSHIP]: 'Executive Leadership',
  [DepartmentType.FINANCE]: 'Finance',
  [DepartmentType.LEGAL]: 'Legal',
  [DepartmentType.HR]: 'HR',
  [DepartmentType.OTHER]: 'Other',
};

function getDepartmentLabel(d: DiscoveredDepartment): string {
  return d.customName?.trim() || DEPARTMENT_TYPE_LABELS[d.type as DepartmentType] || d.type;
}

type Props = {
  companyId: string;
  companyName: string;
};

export function DiscoverDepartmentsClient({ companyId, companyName }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<DiscoveredDepartment[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runDiscovery = useCallback(async () => {
    setStatus('running');
    setErrorMessage(null);
    setResults([]);
    setSelected(new Set());
    try {
      const list = await discoverDepartments(companyId);
      setResults(list);
      setStatus(list.length > 0 ? 'done' : 'done');
      setSelected(new Set(list.map((_, i) => i)));
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Discovery failed');
      setStatus('error');
    }
  }, [companyId]);

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addSelected = async () => {
    const toAdd = results.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) return;
    setAdding(true);
    setErrorMessage(null);
    const added: number[] = [];
    const failed: string[] = [];
    for (const dept of toAdd) {
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
        if (res.ok) {
          added.push(results.indexOf(dept));
        } else {
          const data = await res.json().catch(() => ({}));
          failed.push(getDepartmentLabel(dept) + ': ' + (data.error || 'Failed'));
        }
      } catch {
        failed.push(getDepartmentLabel(dept) + ': Request failed');
      }
    }
    setAdding(false);
    if (failed.length > 0) {
      setErrorMessage(failed.join('; '));
    }
    setSelected((prev) => {
      const next = new Set(prev);
      added.forEach((i) => next.delete(i));
      return next;
    });
    setResults((prev) => prev.filter((_, i) => !added.includes(i)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/companies/${companyId}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">← Back to company</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discover Departments</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          AI will research {companyName}&apos;s org structure and suggest departments to add.
        </p>
      </div>

      {status === 'idle' && (
        <div>
          <Button onClick={runDiscovery}>Run department discovery</Button>
        </div>
      )}

      {status === 'running' && (
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/50 p-6 text-center">
          <p className="text-gray-700 dark:text-gray-200">Researching {companyName}… This may take a minute.</p>
          <div className="mt-4 h-2 w-48 mx-auto bg-gray-200 dark:bg-zinc-600 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-blue-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 text-red-800 dark:text-red-200">
          <p>{errorMessage}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={runDiscovery}>
            Try again
          </Button>
        </div>
      )}

      {status === 'done' && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {results.length} department(s) found. Select which to add.
            </p>
            <Button onClick={addSelected} disabled={adding || selected.size === 0}>
              {adding ? 'Adding…' : `Add Selected (${selected.size})`}
            </Button>
          </div>
          {errorMessage && (
            <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3 text-amber-800 dark:text-amber-200 text-sm">
              {errorMessage}
            </div>
          )}
          <ul className="border border-gray-200 dark:border-zinc-600 rounded-lg divide-y divide-gray-200 dark:divide-zinc-600 bg-white dark:bg-zinc-800/50">
            {results.map((d, i) => (
              <li key={`${d.type}-${d.customName ?? ''}-${i}`} className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{getDepartmentLabel(d)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Confidence: {d.confidence}% · {d.reasoning}
                  </div>
                  {d.estimatedSize != null && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Est. size: {d.estimatedSize} employees
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'done' && results.length === 0 && !errorMessage && (
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 text-center text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-800/50">
          <p>No departments were identified. You can try again or add departments manually from the company page.</p>
          <Link href={`/dashboard/companies/${companyId}`}>
            <Button variant="outline" className="mt-4">Back to company</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
