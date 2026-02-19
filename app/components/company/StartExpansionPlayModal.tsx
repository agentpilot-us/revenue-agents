'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PlayType = 'use-case-exploration';

type Props = {
  companyId: string;
  companyName?: string;
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
  const [selected, setSelected] = useState<PlayType>('use-case-exploration');
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    setLoading(true);
    onClose();
    // Single expansion flow: open company Messaging tab to work with the agent
    router.push(`/dashboard/companies/${companyId}?tab=messaging`);
    setLoading(false);
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
