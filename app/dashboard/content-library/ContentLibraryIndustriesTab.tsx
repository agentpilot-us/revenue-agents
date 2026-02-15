'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Playbook = {
  id: string;
  name: string;
  slug: string;
  overview: string | null;
  departmentProductMapping: unknown[] | null;
  valuePropsByDepartment: Record<string, unknown> | null;
  buyingCommittee: string | null;
  landmines: string[] | null;
  relevantCaseStudyIds: string[] | null;
  updatedAt: string;
};

type CatalogProduct = { id: string; name: string };

type Props = {
  playbooks: Playbook[];
  catalogProducts: CatalogProduct[];
};

export function ContentLibraryIndustriesTab({ playbooks, catalogProducts: _catalogProducts }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Industry playbooks define department–product mapping, value props by department, and landmines. The AI uses the playbook matching the account&apos;s industry.
      </p>
      <div className="flex justify-end">
        <Link href="/dashboard/content-library/industries/new">
          <Button onClick={() => setCreating(true)}>+ Add industry playbook</Button>
        </Link>
      </div>
      <div className="space-y-4">
        {playbooks.map((p) => (
          <div
            key={p.id}
            className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.slug}</p>
                {p.overview && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{p.overview}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link href={`/dashboard/content-library/industries/${p.id}`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
      {playbooks.length === 0 && !creating && (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-800">
          No industry playbooks yet. Add one to map departments to products and set industry-specific messaging.
        </div>
      )}
    </div>
  );
}
