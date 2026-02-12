'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  companyDepartmentId: string | null;
  departmentName: string | null;
  personaName: string | null;
  isResponsive: boolean;
  isDormant: boolean;
};

type Props = {
  companyId: string;
  contacts: ContactRow[];
  departments: Array<{ id: string; name: string }>;
};

export function ContactsListClient({
  companyId,
  contacts: initialContacts,
  departments,
}: Props) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'responsive' | 'dormant'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = initialContacts;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.firstName?.toLowerCase().includes(q) ||
            c.lastName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.title?.toLowerCase().includes(q) ||
            c.personaName?.toLowerCase().includes(q))
      );
    }
    if (departmentFilter) {
      list = list.filter((c) => c.companyDepartmentId === departmentFilter);
    }
    if (statusFilter === 'responsive') {
      list = list.filter((c) => c.isResponsive);
    } else if (statusFilter === 'dormant') {
      list = list.filter((c) => c.isDormant);
    }
    return list;
  }, [initialContacts, search, departmentFilter, statusFilter, departments]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const launchOutreachUrl = selectedIds.size > 0
    ? `/dashboard/companies/${companyId}/launch-outreach?contacts=${Array.from(selectedIds).join(',')}`
    : `/dashboard/companies/${companyId}/launch-outreach`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/companies/${companyId}/add-contacts`}>
            <Button>+ Add Contacts</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="search"
          placeholder="Search by name, email, title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm w-64 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'responsive' | 'dormant')}
          className="rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All statuses</option>
          <option value="responsive">Responsive</option>
          <option value="dormant">Dormant</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
            {selectedIds.size} selected
          </span>
          <Link href={launchOutreachUrl}>
            <Button size="sm">Draft Emails</Button>
          </Link>
          <Link href={launchOutreachUrl}>
            <Button size="sm" variant="outline">
              Add to Sequence
            </Button>
          </Link>
          <Link href={launchOutreachUrl}>
            <Button size="sm" variant="outline">
              Invite to Event
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="border border-gray-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-800/50">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-600">
          <thead className="bg-gray-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                />
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Department
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-800/30 divide-y divide-gray-200 dark:divide-zinc-600">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="rounded border-gray-300 dark:border-zinc-500 dark:bg-zinc-700"
                  />
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—'}
                  </span>
                  {c.email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{c.title ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{c.departmentName ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{c.personaName ?? '—'}</td>
                <td className="px-4 py-2 text-sm">
                  {c.isResponsive && (
                    <span className="text-green-600 dark:text-green-400">Responsive</span>
                  )}
                  {c.isDormant && !c.isResponsive && (
                    <span className="text-amber-600 dark:text-amber-400">Dormant</span>
                  )}
                  {!c.isResponsive && !c.isDormant && (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {initialContacts.length === 0
            ? 'No contacts yet. Add contacts to get started.'
            : 'No contacts match your filters.'}
        </div>
      )}
    </div>
  );
}
