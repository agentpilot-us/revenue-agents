'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Department = { id: string; type: string; customName: string | null };

type Props = {
  companyId: string;
  companyName: string;
  departments: Department[];
};

// Parse "FirstName LastName - Title" or "FirstName LastName, Title" or "Name\tTitle"
function parsePastedLinkedIn(text: string): Array<{ firstName: string; lastName: string; title: string }> {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: Array<{ firstName: string; lastName: string; title: string }> = [];
  for (const line of lines) {
    let name = '';
    let title = '';
    if (line.includes(' - ')) {
      const [n, t] = line.split(' - ', 2);
      name = (n ?? '').trim();
      title = (t ?? '').trim();
    } else if (line.includes(',')) {
      const [n, t] = line.split(',', 2);
      name = (n ?? '').trim();
      title = (t ?? '').trim();
    } else {
      name = line;
    }
    const nameParts = name.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') ?? '';
    result.push({ firstName, lastName, title });
  }
  return result;
}

// Parse CSV with optional header: First Name, Last Name, Title, Email, etc.
function parseCSV(csvText: string): Array<{ firstName: string; lastName: string; title: string; email: string }> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const cols = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' && !inQuotes) || ch === '\t') {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = cols(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const getCol = (row: string[], name: string): string => {
    const i = headers.findIndex((h) => h.includes(name));
    return i >= 0 ? (row[i] ?? '').trim() : '';
  };
  const result: Array<{ firstName: string; lastName: string; title: string; email: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const row = cols(lines[i]);
    const first = getCol(row, 'first') || getCol(row, 'given');
    const last = getCol(row, 'last') || getCol(row, 'surname') || getCol(row, 'family');
    const title = getCol(row, 'title') || getCol(row, 'job');
    const email = getCol(row, 'email');
    if (first || last || email) {
      result.push({
        firstName: first,
        lastName: last,
        title,
        email,
      });
    }
  }
  return result;
}

export function AddContactsClient({ companyId, companyName, departments }: Props) {
  const [pastedText, setPastedText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [manualFirst, setManualFirst] = useState('');
  const [manualLast, setManualLast] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [csvStatus, setCsvStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [manualStatus, setManualStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const postContacts = async (
    contacts: Array<{ firstName?: string; lastName?: string; title?: string; email?: string }>
  ): Promise<{ added: number; skipped: number }> => {
    const res = await fetch(`/api/companies/${companyId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: contacts.map((c) => ({
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          title: c.title || '',
          email: c.email || '',
        })),
        departmentId: departmentId || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add contacts');
    }
    const data = await res.json();
    return { added: data.added ?? 0, skipped: data.skipped ?? 0 };
  };

  const handlePasteSubmit = async () => {
    const parsed = parsePastedLinkedIn(pastedText);
    if (parsed.length === 0) {
      setPasteStatus('error');
      setMessage('No valid lines. Use "Name - Title" or "Name, Title" per line.');
      return;
    }
    setPasteStatus('loading');
    setMessage(null);
    try {
      const { added, skipped } = await postContacts(parsed);
      setPasteStatus('done');
      setMessage(`Added ${added} contact(s)${skipped ? `, ${skipped} skipped (already exist).` : '.'}`);
      setPastedText('');
    } catch (e) {
      setPasteStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleCsvSubmit = async () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setCsvStatus('error');
      setMessage('No rows found. Use CSV with headers: First Name, Last Name, Title, Email');
      return;
    }
    setCsvStatus('loading');
    setMessage(null);
    try {
      const { added, skipped } = await postContacts(parsed);
      setCsvStatus('done');
      setMessage(`Added ${added} contact(s)${skipped ? `, ${skipped} skipped.` : '.'}`);
      setCsvText('');
    } catch (e) {
      setCsvStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFirst.trim() && !manualLast.trim() && !manualEmail.trim()) {
      setManualStatus('error');
      setMessage('Enter at least name or email.');
      return;
    }
    setManualStatus('loading');
    setMessage(null);
    try {
      const { added } = await postContacts([
        {
          firstName: manualFirst.trim(),
          lastName: manualLast.trim(),
          title: manualTitle.trim() || undefined,
          email: manualEmail.trim() || undefined,
        },
      ]);
      setManualStatus('done');
      setMessage(added ? 'Contact added.' : 'Contact may already exist.');
      setManualFirst('');
      setManualLast('');
      setManualTitle('');
      setManualEmail('');
    } catch (e) {
      setManualStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/companies/${companyId}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">← Back to company</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add contacts</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Add contacts for {companyName} from LinkedIn, CSV, or manually.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4 bg-white dark:bg-zinc-800/50">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department (optional)</label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.customName || d.type}
            </option>
          ))}
        </select>
      </div>

      {/* AI discovery */}
      <section className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Discover with AI</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Let AI find contacts by department using LinkedIn and enrichment.
        </p>
        <div className="mt-4">
          <Link href={`/dashboard/companies/${companyId}/discover-contacts`}>
            <Button>Discover contacts by department</Button>
          </Link>
        </div>
      </section>

      {/* Paste from LinkedIn */}
      <section id="paste" className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50 scroll-mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Paste from LinkedIn</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Paste a list of names and titles (one per line: &quot;First Last - Title&quot; or &quot;First Last, Title&quot;).
        </p>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Jane Doe - VP Engineering&#10;John Smith, Director of Product"
          rows={5}
          className="mt-3 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={handlePasteSubmit} disabled={pasteStatus === 'loading'}>
            {pasteStatus === 'loading' ? 'Adding…' : 'Add contacts'}
          </Button>
          {pasteStatus === 'done' && message && (
            <span className="text-sm text-green-600 dark:text-green-400">{message}</span>
          )}
          {pasteStatus === 'error' && message && (
            <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
          )}
        </div>
      </section>

      {/* Import CSV */}
      <section id="csv" className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50 scroll-mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import CSV</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Paste or upload CSV with columns: First Name, Last Name, Title, Email.
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="First Name, Last Name, Title, Email&#10;Jane, Doe, VP Engineering, jane@example.com"
          rows={5}
          className="mt-3 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={handleCsvSubmit} disabled={csvStatus === 'loading'}>
            {csvStatus === 'loading' ? 'Importing…' : 'Import CSV'}
          </Button>
          {csvStatus === 'done' && message && (
            <span className="text-sm text-green-600 dark:text-green-400">{message}</span>
          )}
          {csvStatus === 'error' && message && (
            <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
          )}
        </div>
      </section>

      {/* Add manually */}
      <section id="manual" className="rounded-lg border border-gray-200 dark:border-zinc-600 p-6 bg-white dark:bg-zinc-800/50 scroll-mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add manually</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Add one contact at a time.
        </p>
        <form onSubmit={handleManualSubmit} className="mt-4 space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">First name</label>
            <input
              type="text"
              value={manualFirst}
              onChange={(e) => setManualFirst(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Last name</label>
            <input
              type="text"
              value={manualLast}
              onChange={(e) => setManualLast(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
            <input
              type="email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={manualStatus === 'loading'}>
              {manualStatus === 'loading' ? 'Adding…' : 'Add contact'}
            </Button>
            {manualStatus === 'done' && message && (
              <span className="text-sm text-green-600 dark:text-green-400">{message}</span>
            )}
            {manualStatus === 'error' && message && (
              <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
            )}
          </div>
        </form>
      </section>

      {/* Salesforce */}
      <section className="rounded-lg border border-gray-200 dark:border-zinc-600 border-dashed p-6 bg-gray-50 dark:bg-zinc-800/50">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Import from Salesforce</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Coming soon.</p>
      </section>
    </div>
  );
}
