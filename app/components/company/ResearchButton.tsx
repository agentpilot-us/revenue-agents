'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResearchReviewModal } from './ResearchReviewModal';

type Props = {
  companyId: string;
  companyName: string;
};

export function ResearchButton({ companyId, companyName }: Props) {
  const [researching, setResearching] = useState(false);
  const [researchData, setResearchData] = useState<unknown>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    setResearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/research`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Research failed');
      }
      setResearchData(data.data);
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setResearching(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleResearch}
        disabled={researching}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {researching ? (
          <>
            <span className="mr-2">🔍</span>
            Researching...
          </>
        ) : (
          <>
            <span className="mr-2">🔍</span>
            Research with AI
          </>
        )}
      </Button>
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-200 p-2 rounded">
          {error}
        </div>
      )}
      {showModal && researchData && (
        <ResearchReviewModal
          open={showModal}
          onOpenChange={(open) => {
            setShowModal(open);
            // Clear research data when modal closes
            if (!open) {
              setResearchData(null);
            }
          }}
          companyId={companyId}
          companyName={companyName}
          researchData={researchData}
        />
      )}
    </>
  );
}
