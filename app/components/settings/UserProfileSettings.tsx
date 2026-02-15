'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialCompanyName: string;
};

export function UserProfileSettings({
  userId,
  initialName,
  initialEmail,
  initialCompanyName,
}: Props) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Company name saved successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400 mb-1">Name</dt>
          <dd className="text-gray-900 dark:text-gray-100">{initialName || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400 mb-1">Email</dt>
          <dd className="text-gray-900 dark:text-gray-100">{initialEmail || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400 mb-2">Company Name</dt>
          <dd className="space-y-2">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corp"
              className="max-w-md bg-white dark:bg-zinc-700 dark:text-gray-100 dark:border-zinc-600"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Used in Content Library labels (e.g., &quot;{companyName || 'Your company'} Product Marketing Content&quot;)
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || companyName === initialCompanyName}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {saving ? 'Saving...' : 'Save Company Name'}
              </Button>
              {message && (
                <span
                  className={`text-sm ${
                    message.type === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </dd>
        </div>
      </dl>
    </div>
  );
}
