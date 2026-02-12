'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStakeholderEngagementPlay } from '@/app/actions/stakeholder-play';

type Company = { id: string; name: string };
type Contact = { id: string; firstName: string | null; lastName: string | null; title: string | null };

export function NewStakeholderStartForm({ companies, initialCompanyId = '' }: { companies: Company[]; initialCompanyId?: string }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [contactId, setContactId] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setContactId('');
      return;
    }
    setLoadingContacts(true);
    setContactId('');
    fetch(`/api/companies/${companyId}/contacts`)
      .then((res) => res.json())
      .then((data) => {
        setContacts(Array.isArray(data.contacts) ? data.contacts : data?.data ?? []);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !contactId) {
      setError('Select an account and a contact.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await createStakeholderEngagementPlay(companyId, contactId);
    if (result.ok) {
      router.push(`/dashboard/plays/new-stakeholder-engagement/${result.playId}`);
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          required
        >
          <option value="">Select account</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New stakeholder (contact)</label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          disabled={!companyId || loadingContacts}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
          required
        >
          <option value="">Select contact</option>
          {contacts.map((c) => {
            const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
            return (
              <option key={c.id} value={c.id}>
                {name}{c.title ? ` — ${c.title}` : ''}
              </option>
            );
          })}
        </select>
        {companyId && !loadingContacts && contacts.length === 0 && (
          <p className="text-sm text-gray-500 mt-1">
            No contacts yet. Add contacts from the company page first.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting || !companyId || !contactId}
        className="w-full py-3 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Starting…' : 'Start play'}
      </button>
    </form>
  );
}
