'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRenewalPlay } from '@/app/actions/renewal-play';

type CompanyWithRenewal = { id: string; name: string; renewalDate: Date | null; productName?: string };
type Company = { id: string; name: string };

export function RenewalAuditStart({
  companiesWithRenewal,
  allCompanies,
}: {
  companiesWithRenewal: CompanyWithRenewal[];
  allCompanies: Company[];
}) {
  const router = useRouter();
  const [useManual, setUseManual] = useState(companiesWithRenewal.length === 0);
  const [companyId, setCompanyId] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStartFromList = async (c: CompanyWithRenewal) => {
    if (!c.renewalDate) return;
    setSubmitting(true);
    setError('');
    const result = await createRenewalPlay(c.id, new Date(c.renewalDate));
    if (result.ok) router.push(`/dashboard/plays/renewal/audit/${result.playId}`);
    else setError(result.error);
    setSubmitting(false);
  };

  const handleStartManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !renewalDate) {
      setError('Select account and enter renewal date.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await createRenewalPlay(companyId, new Date(renewalDate));
    if (result.ok) router.push(`/dashboard/plays/renewal/audit/${result.playId}`);
    else setError(result.error);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{error}</div>
      )}

      {companiesWithRenewal.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Renewals in 90–120 days</h2>
          <ul className="space-y-2">
            {companiesWithRenewal.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.renewalDate && (
                    <span className="text-gray-500 ml-2">
                      {new Date(c.renewalDate).toLocaleDateString()}
                      {c.productName && ` · ${c.productName}`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleStartFromList(c)}
                  disabled={submitting || !c.renewalDate}
                  className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
                >
                  Start play
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <button
          type="button"
          onClick={() => setUseManual(!useManual)}
          className="text-sm font-medium text-gray-700 hover:underline mb-2"
        >
          {useManual ? 'Hide manual start' : 'Start for another account (manual date)'}
        </button>
        {useManual && (
          <form onSubmit={handleStartManual} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select account</option>
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal date</label>
              <input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-amber-500 text-gray-900 font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {submitting ? 'Starting…' : 'Start play'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
