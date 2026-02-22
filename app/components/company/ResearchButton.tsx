'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResearchReviewModal } from './ResearchReviewModal';

type ResearchStatus = null | 'perplexity' | 'structure';

type Props = {
  companyId: string;
  companyName: string;
  /** When set, research result is passed here instead of opening the modal (e.g. for inline review on Intelligence page). */
  onComplete?: (data: unknown) => void;
  /** Optional button label when not researching (default: "Research with AI"). Use e.g. "Re-run research" for step 2. */
  label?: string;
  /** Optional targeting goal — shapes Perplexity query and structuring so output matches rep intent. */
  userGoal?: string;
};

export function ResearchButton({ companyId, companyName, onComplete, label = 'Research with AI', userGoal }: Props) {
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>(null);
  const [researchData, setResearchData] = useState<unknown>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const researching = researchStatus !== null;

  const handleResearch = async () => {
    setResearchStatus('perplexity');
    setError(null);
    try {
      const goalPayload = userGoal?.trim() ? { userGoal: userGoal.trim() } : {};
      const res = await fetch(`/api/companies/${companyId}/research/perplexity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Research failed');
      }
      if (!data.summary) {
        throw new Error('No research summary returned');
      }

      setResearchStatus('structure');
      const structureRes = await fetch(`/api/companies/${companyId}/research/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: data.summary,
          ...(userGoal?.trim() ? { userGoal: userGoal.trim() } : {}),
        }),
      });
      const structureData = await structureRes.json();
      if (!structureRes.ok) {
        throw new Error(structureData.error || 'Structuring failed');
      }
      setResearchData(structureData.data);
      if (onComplete) {
        onComplete(structureData.data);
      } else {
        setShowModal(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setResearchStatus(null);
    }
  };

  const statusLabel =
    researchStatus === 'perplexity'
      ? `Researching ${companyName}...`
      : researchStatus === 'structure'
        ? 'Analyzing buying groups...'
        : null;

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
            {statusLabel}
          </>
        ) : (
          <>
            <span className="mr-2">🔍</span>
            {label}
          </>
        )}
      </Button>
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-200 p-2 rounded flex items-center gap-2">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleResearch}
            className="text-xs font-medium underline"
          >
            Retry
          </button>
        </div>
      )}
      {showModal && researchData && (
        <ResearchReviewModal
          open={showModal}
          onOpenChange={(open) => {
            setShowModal(open);
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
