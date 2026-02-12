'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DepartmentType, DepartmentStatus } from '@prisma/client';
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

const ALL_TYPES = Object.values(DepartmentType);

// Map common pasted names to DepartmentType (lowercase keys)
const NAME_TO_TYPE: Record<string, DepartmentType> = {};
ALL_TYPES.forEach((t) => {
  const label = DEPARTMENT_TYPE_LABELS[t].toLowerCase();
  NAME_TO_TYPE[label] = t;
  NAME_TO_TYPE[label.replace(/\s+/g, ' ')] = t;
});
NAME_TO_TYPE['manufacturing'] = DepartmentType.MANUFACTURING_OPERATIONS;
NAME_TO_TYPE['design'] = DepartmentType.INDUSTRIAL_DESIGN;
NAME_TO_TYPE['autonomous vehicles'] = DepartmentType.AUTONOMOUS_VEHICLES;
NAME_TO_TYPE['av'] = DepartmentType.AUTONOMOUS_VEHICLES;
NAME_TO_TYPE['it'] = DepartmentType.IT_DATA_CENTER;
NAME_TO_TYPE['data center'] = DepartmentType.IT_DATA_CENTER;
NAME_TO_TYPE['supply chain'] = DepartmentType.SUPPLY_CHAIN;
NAME_TO_TYPE['executive'] = DepartmentType.EXECUTIVE_LEADERSHIP;
NAME_TO_TYPE['exec'] = DepartmentType.EXECUTIVE_LEADERSHIP;

function parsePastedList(text: string): Array<{ type: DepartmentType; customName: string | null }> {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: Array<{ type: DepartmentType; customName: string | null }> = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let type: DepartmentType = DepartmentType.OTHER;
    let customName: string | null = line;
    for (const [name, t] of Object.entries(NAME_TO_TYPE)) {
      if (key === name || key.includes(name) || name.includes(key)) {
        type = t;
        if (key !== name) customName = line;
        else customName = null;
        break;
      }
    }
    if (type === DepartmentType.OTHER && line.length < 2) continue;
    result.push({ type, customName });
  }
  return result;
}

type Props = {
  companyId: string;
  companyName: string;
  existingDepartmentTypes: string[];
};

export function AddDepartmentsClient({
  companyId,
  companyName,
  existingDepartmentTypes,
}: Props) {
  const [selectedTypes, setSelectedTypes] = useState<Set<DepartmentType>>(new Set());
  const [pastedText, setPastedText] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const existingSet = new Set(existingDepartmentTypes);

  const toggleType = (t: DepartmentType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const addFromSelection = async () => {
    if (selectedTypes.size === 0) {
      setMessage({ type: 'error', text: 'Select at least one department.' });
      return;
    }
    setAdding(true);
    setMessage(null);
    const toAdd = Array.from(selectedTypes).filter((t) => !existingSet.has(t));
    if (toAdd.length === 0) {
      setMessage({ type: 'error', text: 'Selected departments are already added.' });
      setAdding(false);
      return;
    }
    const failed: string[] = [];
    for (const type of toAdd) {
      try {
        const res = await fetch(`/api/companies/${companyId}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            status: DepartmentStatus.NOT_ENGAGED,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failed.push(DEPARTMENT_TYPE_LABELS[type] + ': ' + (data.error || 'Failed'));
        }
      } catch {
        failed.push(DEPARTMENT_TYPE_LABELS[type] + ': Request failed');
      }
    }
    setAdding(false);
    if (failed.length > 0) {
      setMessage({ type: 'error', text: failed.join('; ') });
    } else {
      setMessage({
        type: 'success',
        text: `Added ${toAdd.length} department(s). Refresh the company page to see them.`,
      });
      setSelectedTypes(new Set());
    }
  };

  const addFromPaste = async () => {
    const parsed = parsePastedList(pastedText);
    if (parsed.length === 0) {
      setMessage({ type: 'error', text: 'Enter at least one department name (one per line).' });
      return;
    }
    setAdding(true);
    setMessage(null);
    const failed: string[] = [];
    let added = 0;
    for (const { type, customName } of parsed) {
      if (type !== DepartmentType.OTHER && existingSet.has(type)) continue;
      try {
        const res = await fetch(`/api/companies/${companyId}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            customName: customName || undefined,
            status: DepartmentStatus.NOT_ENGAGED,
          }),
        });
        if (res.ok) {
          added++;
          existingSet.add(type);
        } else {
          const data = await res.json().catch(() => ({}));
          failed.push((customName || DEPARTMENT_TYPE_LABELS[type]) + ': ' + (data.error || 'Failed'));
        }
      } catch {
        failed.push((customName || DEPARTMENT_TYPE_LABELS[type]) + ': Request failed');
      }
    }
    setAdding(false);
    if (failed.length > 0) {
      setMessage({ type: 'error', text: failed.join('; ') });
    }
    if (added > 0) {
      setMessage({
        type: 'success',
        text: `Added ${added} department(s). Refresh the company page to see them.`,
      });
      setPastedText('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/companies/${companyId}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">← Back to company</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add departments manually</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Add departments for {companyName} by selecting from the list or pasting your own.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Select from standard list</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Choose the departments that exist at this account. Already-added departments are disabled.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-4">
          {ALL_TYPES.map((t) => {
            const isExisting = existingSet.has(t);
            return (
              <label
                key={t}
                className={`flex items-center gap-2 py-1.5 ${isExisting ? 'opacity-60' : 'cursor-pointer'} text-gray-900 dark:text-gray-100`}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(t)}
                  onChange={() => !isExisting && toggleType(t)}
                  disabled={isExisting}
                  className="rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                />
                <span className="text-sm">
                  {DEPARTMENT_TYPE_LABELS[t]}
                  {isExisting && ' (added)'}
                </span>
              </label>
            );
          })}
        </div>
        <Button onClick={addFromSelection} disabled={adding || selectedTypes.size === 0}>
          {adding ? 'Adding…' : `Add selected (${selectedTypes.size})`}
        </Button>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Or paste a list</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enter one department per line. Names are matched to standard types where possible (e.g. &quot;Manufacturing&quot;, &quot;Autonomous Vehicles&quot;); others are added as custom.
        </p>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Manufacturing Operations&#10;Industrial Design&#10;Autonomous Vehicles&#10;IT / Data Center&#10;Custom Department Name"
          rows={6}
          className="w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        <div className="mt-2">
          <Button variant="outline" onClick={addFromPaste} disabled={adding || !pastedText.trim()}>
            {adding ? 'Adding…' : 'Add from list'}
          </Button>
        </div>
      </section>
    </div>
  );
}
