'use client';

import { useState, useEffect } from 'react';

type Props = {
  companyId: string;
  onComplete: () => void;
};

type CompanyData = {
  name: string;
  domain: string;
  industry: string;
  size: string;
  accountType: string;
};

export function CompanyBasicsStep({ companyId, onComplete }: Props) {
  const [data, setData] = useState<CompanyData>({ name: '', domain: '', industry: '', size: '', accountType: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.company ?? d;
        setData({
          name: c.name || '',
          domain: c.domain || '',
          industry: c.industry || '',
          size: c.size || '',
          accountType: c.accountType || '',
        });
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Company Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Domain</label>
        <input
          type="text"
          value={data.domain}
          onChange={(e) => setData({ ...data, domain: e.target.value })}
          placeholder="e.g. acme.com"
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Industry</label>
          <input
            type="text"
            value={data.industry}
            onChange={(e) => setData({ ...data, industry: e.target.value })}
            placeholder="e.g. Retail, Technology"
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Company Size</label>
          <select
            value={data.size}
            onChange={(e) => setData({ ...data, size: e.target.value })}
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="1-50">1-50</option>
            <option value="51-200">51-200</option>
            <option value="201-1000">201-1,000</option>
            <option value="1001-5000">1,001-5,000</option>
            <option value="5001-10000">5,001-10,000</option>
            <option value="10001+">10,001+</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Account Type</label>
        <select
          value={data.accountType}
          onChange={(e) => setData({ ...data, accountType: e.target.value })}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          <option value="new_logo">New Logo</option>
          <option value="customer">Customer</option>
          <option value="prospect">Prospect</option>
          <option value="partner">Partner</option>
        </select>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}
