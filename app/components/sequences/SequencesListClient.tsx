'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type SequenceItem = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stepCount: number;
  enrollmentCount: number;
  updatedAt: string;
};

type Props = {
  initialSequences: SequenceItem[];
};

export function SequencesListClient({ initialSequences }: Props) {
  const router = useRouter();
  const [sequences, setSequences] = useState(initialSequences);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setSequences((prev) => [
          {
            id: data.id,
            name: data.name,
            description: data.description ?? null,
            isDefault: data.isDefault ?? false,
            stepCount: 0,
            enrollmentCount: 0,
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          },
          ...prev,
        ]);
        setNewName('');
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }, [newName, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="New sequence name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="rounded border border-gray-300 dark:border-zinc-500 px-3 py-2 text-sm w-56 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
        />
        <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
          {creating ? 'Creating…' : 'Create sequence'}
        </Button>
      </div>

      <div className="border border-gray-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
        {sequences.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sequences yet. Create one to define steps (day offset, channel, role, CTA) and enroll contacts from company contact lists.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-zinc-600">
            {sequences.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                  {s.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">{s.description}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.stepCount} step{s.stepCount !== 1 ? 's' : ''}, {s.enrollmentCount} enrollment{s.enrollmentCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  href={`/dashboard/settings/sequences/${s.id}`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit steps
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
