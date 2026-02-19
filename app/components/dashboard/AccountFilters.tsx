'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type Props = {
  industries: string[];
  currentFilters: {
    status?: string;
    industry?: string;
    coverage?: string;
  };
};

export function AccountFilters({ industries, currentFilters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard/companies?${params.toString()}`);
    },
    [router, searchParams]
  );

  const coverageOptions = [
    { value: 'research', label: 'Research' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'pageLive', label: 'Page Live' },
    { value: 'engaged', label: 'Engaged' },
  ];

  const selectedCoverage = currentFilters.coverage?.split(',') || [];

  const toggleCoverage = (value: string) => {
    const newCoverage = selectedCoverage.includes(value)
      ? selectedCoverage.filter((c) => c !== value)
      : [...selectedCoverage, value];
    updateFilter('coverage', newCoverage.length > 0 ? newCoverage.join(',') : null);
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Industry:</label>
          <select
            value={currentFilters.industry || ''}
            onChange={(e) => updateFilter('industry', e.target.value || null)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Coverage:</label>
          <div className="flex flex-wrap gap-2">
            {coverageOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCoverage.includes(option.value)}
                  onChange={() => toggleCoverage(option.value)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {(currentFilters.industry || currentFilters.coverage) && (
          <button
            onClick={() => router.push('/dashboard/companies')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
