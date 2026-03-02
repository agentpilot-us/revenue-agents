'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

type Props = {
  companyId: string;
  companyName: string;
  contacts: ContactRow[];
  departments: Array<{ id: string; name: string }>;
  preselectedContactIds: string[];
};

export function LaunchOutreachClient({
  companyId,
  companyName,
  contacts,
  departments,
  preselectedContactIds,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(true);
  const [linkedin, setLinkedin] = useState(true);
  const [events, setEvents] = useState(true);
  const [departmentId, setDepartmentId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    preselectedContactIds.length > 0
      ? new Set(preselectedContactIds)
      : new Set(contacts.map((c) => c.id))
  );
  const [error, setError] = useState<string | null>(null);

  const contactsInDepartment = useMemo(() => {
    if (!departmentId) return contacts;
    return contacts.filter((c) => c.departmentId === departmentId);
  }, [contacts, departmentId]);

  const selectableIds = useMemo(
    () => new Set(contactsInDepartment.map((c) => c.id)),
    [contactsInDepartment]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === selectableIds.size) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleLaunchAgent = () => {
    // Single expansion flow: open company Messaging tab to work with the agent
    router.push(`/dashboard/companies/${companyId}?tab=content`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/companies/${companyId}/contacts`} className="text-muted-foreground hover:text-foreground">
          ← Back to contacts
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Launch outreach</h1>
        <p className="text-muted-foreground mt-1">
          Choose tactics, prioritize contacts, and generate outreach for {companyName}.
        </p>
      </div>

      <section className="rounded-lg border border-border p-6 bg-card/50">
        <h2 className="text-lg font-semibold text-card-foreground mb-3">Tactics</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-card-foreground">
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
              className="rounded border-input bg-input"
            />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-2 text-card-foreground">
            <input
              type="checkbox"
              checked={linkedin}
              onChange={(e) => setLinkedin(e.target.checked)}
              className="rounded border-input bg-input"
            />
            <span>LinkedIn</span>
          </label>
          <label className="flex items-center gap-2 text-card-foreground">
            <input
              type="checkbox"
              checked={events}
              onChange={(e) => setEvents(e.target.checked)}
              className="rounded border-input bg-input"
            />
            <span>Events</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border p-6 bg-card/50">
        <h2 className="text-lg font-semibold text-card-foreground mb-3">Contact prioritization</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select which contacts to include. You can filter by department first.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Department filter
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded border border-input px-3 py-2 text-sm bg-input text-foreground"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="border border-border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
          <table className="min-w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      contactsInDepartment.length > 0 &&
                      selectedIds.size ===
                        contactsInDepartment.filter((c) => selectableIds.has(c.id)).length
                    }
                    onChange={toggleAll}
                    className="rounded border-input bg-input"
                  />
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Title
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Department
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contactsInDepartment.map((c) => (
                <tr key={c.id} className="hover:bg-muted">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="rounded border-input bg-input"
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-card-foreground">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{c.title ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {c.departmentName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={handleLaunchAgent}>
          Work with agent
        </Button>
        <span className="text-sm text-muted-foreground">
          Opens the expansion agent on the Messaging tab to draft emails, calendar invites, and outreach.
        </span>
      </div>
    </div>
  );
}
