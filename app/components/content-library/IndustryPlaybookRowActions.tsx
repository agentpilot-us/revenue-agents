'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = { playbookId: string; playbookName: string };

export function IndustryPlaybookRowActions({ playbookId, playbookName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (deleting) return;
    if (!confirm(`Remove "${playbookName}" from your company data?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/industry-playbooks/${playbookId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href={`/dashboard/content-library/industry-playbooks/${playbookId}/edit`}
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded disabled:opacity-50"
        title="Remove"
        aria-label={`Remove ${playbookName}`}
      >
        {deleting ? (
          <span className="text-xs">…</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </button>
    </div>
  );
}
