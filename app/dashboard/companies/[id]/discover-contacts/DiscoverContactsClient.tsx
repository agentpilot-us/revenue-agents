'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  findContactsForDepartment,
  addContactsToDepartment,
  type FoundContact,
  type ContactTypeOption,
  type SearchScopeOption,
} from '@/app/actions/find-contacts';
import { Button } from '@/components/ui/button';

type Department = { id: string; type: string; customName: string | null };

type Props = {
  companyId: string;
  companyName: string;
  departments: Department[];
  initialDepartmentId?: string;
};

export function DiscoverContactsClient({
  companyId,
  companyName,
  departments,
  initialDepartmentId,
}: Props) {
  const [departmentId, setDepartmentId] = useState(initialDepartmentId ?? '');
  const [scope, setScope] = useState<SearchScopeOption[]>(['linkedin', 'clay']);
  const [step, setStep] = useState<'config' | 'running' | 'results' | 'error'>('config');
  const [steps, setSteps] = useState<Array<{ step: string; detail: string }>>([]);
  const [results, setResults] = useState<FoundContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const toggleScope = (id: SearchScopeOption) => {
    setScope((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runDiscovery = async () => {
    if (!departmentId) {
      setErrorMessage('Select a department first.');
      return;
    }
    setStep('running');
    setErrorMessage(null);
    setResults([]);
    const scopeObj = {
      linkedin: scope.includes('linkedin'),
      clay: scope.includes('clay'),
      zoominfo: scope.includes('zoominfo'),
    };
    try {
      const res = await findContactsForDepartment(
        companyId,
        departmentId,
        ['technical', 'program'],
        scopeObj
      );
      if (!res.ok) {
        setErrorMessage(res.error);
        setStep('error');
        return;
      }
      setSteps(res.steps);
      setResults(res.results);
      setSelectedIds(new Set(res.results.map((r) => r.id)));
      setStep('results');
      if (res.results.length > 0) setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Discovery failed');
      setStep('error');
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    const toAdd = results.filter((r) => selectedIds.has(r.id));
    if (toAdd.length === 0) return;
    setAdding(true);
    setErrorMessage(null);
    try {
      const res = await addContactsToDepartment(
        companyId,
        departmentId,
        toAdd.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          title: r.title,
          email: r.email,
          phone: r.phone,
          linkedinUrl: r.linkedinUrl,
          personaId: r.personaId,
        }))
      );
      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setResults((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const departmentName =
    departments.find((d) => d.id === departmentId)?.customName ||
    departments.find((d) => d.id === departmentId)?.type ||
    'Department';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/companies/${companyId}/contacts`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
          ← Back to contact list
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discover contacts with AI</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Find contacts for {companyName} by department using LinkedIn and optional enrichment.
        </p>
      </div>

      {step === 'config' && (
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 space-y-4 bg-white dark:bg-zinc-800/50">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full max-w-md rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.customName || d.type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data sources
            </label>
            <div className="flex flex-wrap gap-4">
              {(['linkedin', 'clay', 'zoominfo'] as const).map((id) => (
                <label key={id} className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={scope.includes(id)}
                    onChange={() => toggleScope(id)}
                    className="rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                  />
                  <span className="text-sm">
                    {id === 'linkedin' && 'LinkedIn'}
                    {id === 'clay' && 'Clay (enrich email/phone)'}
                    {id === 'zoominfo' && 'ZoomInfo'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
          <Button onClick={runDiscovery} disabled={!departmentId}>
            Run contact discovery
          </Button>
        </div>
      )}

      {step === 'running' && (
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/50 p-6 text-center">
          <p className="text-gray-700 dark:text-gray-200">
            Searching for contacts in {departmentName}… This may take a minute.
          </p>
          <div className="mt-4 h-2 w-48 mx-auto bg-gray-200 dark:bg-zinc-600 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-blue-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
          <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setStep('config')}>
              Dismiss
            </Button>
            <Button size="sm" onClick={runDiscovery}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {step === 'results' && results.length === 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4">
          <p className="text-amber-800 dark:text-amber-200">
            No contacts found for this group. Try a different buying group or add contacts manually.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" onClick={runDiscovery}>
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStep('config')}>
              Back to setup
            </Button>
            <Link href={`/dashboard/companies/${companyId}/add-contacts`}>
              <Button variant="outline" size="sm">Add contacts manually</Button>
            </Link>
          </div>
        </div>
      )}

      {step === 'results' && results.length > 0 && (
        <div className="space-y-4">
          {steps.length > 0 && (
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {steps.map((s, i) => (
                <li key={i}>
                  {s.step}: {s.detail}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {results.length} contact(s) found. Select which to add to {departmentName}.
            </p>
            <Button
              onClick={addSelected}
              disabled={adding || selectedIds.size === 0}
            >
              {adding ? 'Adding…' : `Add selected (${selectedIds.size})`}
            </Button>
          </div>
          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
          <ul className="border border-gray-200 dark:border-zinc-600 rounded-lg divide-y divide-gray-200 dark:divide-zinc-600 bg-white dark:bg-zinc-800/50">
            {results.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {[r.firstName, r.lastName].filter(Boolean).join(' ').trim() || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{r.title}</div>
                  {r.email && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">{r.email}</div>
                  )}
                  {r.personaName && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Persona: {r.personaName}
                      {r.confidence != null && ` (${r.confidence}%)`}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep('config'); setResults([]); }}>
              Discover another department
            </Button>
            <Link href={`/dashboard/companies/${companyId}/contacts`}>
              <Button variant="outline">View all contacts</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
