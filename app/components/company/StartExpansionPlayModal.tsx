'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExpansionPlay } from '@/app/actions/expansion-play';
import { createUseCaseExplorationPlay } from '@/app/actions/use-case-exploration-play';

type PlayType = 'cross-sell' | 'new-stakeholder' | 'use-case-exploration';

type Props = {
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  productId: string;
  productName: string;
  opportunitySize?: number;
  fitScore?: number;
  open: boolean;
  onClose: () => void;
  triggerButton: React.ReactNode;
};

export function StartExpansionPlayModal({
  companyId,
  companyName,
  departmentId,
  departmentName,
  productId,
  productName,
  opportunitySize,
  fitScore,
  open,
  onClose,
  triggerButton,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<PlayType>('cross-sell');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      if (selected === 'cross-sell') {
        const res = await createExpansionPlay(companyId, departmentId, productId, opportunitySize);
        onClose();
        if (res.ok) {
          router.push(`/dashboard/plays/cross-sell/${res.playId}`);
        } else {
          router.push(`/dashboard/companies/${companyId}/departments/${departmentId}`);
        }
      } else if (selected === 'use-case-exploration') {
        const res = await createUseCaseExplorationPlay(companyId, departmentId, productId);
        onClose();
        if (res.ok) {
          router.push(`/dashboard/plays/use-case-exploration/${res.playId}`);
        } else {
          router.push(`/dashboard/companies/${companyId}/departments/${departmentId}`);
        }
      } else {
        onClose();
        router.push(`/dashboard/plays/new-stakeholder-engagement?companyId=${companyId}&departmentId=${departmentId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return <>{triggerButton}</>;

  return (
    <>
      {triggerButton}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Start Expansion Play</h2>
          <p className="text-sm text-gray-600 mb-4">
            Department: <span className="font-medium">{departmentName}</span>
          </p>
          {opportunitySize != null && (
            <p className="text-sm text-gray-600 mb-1">
              Opportunity: <span className="font-medium">${opportunitySize.toLocaleString()}</span>
              {fitScore != null && (
                <span className="ml-2">({fitScore}% fit)</span>
              )}
            </p>
          )}
          {productName && (
            <p className="text-sm text-gray-500 mb-4">Product: {productName}</p>
          )}

          <fieldset className="mb-6">
            <legend className="text-sm font-medium text-gray-700 mb-2">Select play type</legend>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mb-2">
              <input
                type="radio"
                name="playType"
                value="cross-sell"
                checked={selected === 'cross-sell'}
                onChange={() => setSelected('cross-sell')}
                className="mt-1"
              />
              <div>
                <span className="font-medium text-gray-900">Department Cross-Sell</span>
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Recommended</span>
                <p className="text-xs text-gray-500 mt-0.5">Research → Champion intro → Outreach → Case study → Joint meeting</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mb-2">
              <input
                type="radio"
                name="playType"
                value="new-stakeholder"
                checked={selected === 'new-stakeholder'}
                onChange={() => setSelected('new-stakeholder')}
                className="mt-1"
              />
              <div>
                <span className="font-medium text-gray-900">New Stakeholder Engagement</span>
                <p className="text-xs text-gray-500 mt-0.5">New exec joined — research, intro email, LinkedIn, internal intro</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="playType"
                value="use-case-exploration"
                checked={selected === 'use-case-exploration'}
                onChange={() => setSelected('use-case-exploration')}
                className="mt-1"
              />
              <div>
                <span className="font-medium text-gray-900">Use Case Exploration</span>
                <p className="text-xs text-gray-500 mt-0.5">Find contacts, send emails, invite to events for this department</p>
              </div>
            </label>
          </fieldset>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'Starting…' : 'Start Play →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
