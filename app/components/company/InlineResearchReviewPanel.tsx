'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CompanyResearchData } from '@/lib/research/company-research-schema';
import { ResearchReviewModal } from './ResearchReviewModal';

type SegmentEdit = {
  name: string;
  valueProp: string;
  useCasesAtThisCompany: string[];
};

type Props = {
  companyId: string;
  companyName: string;
  researchData: CompanyResearchData;
  onSaved: () => void;
  /** Goal used for this research run; persisted to company when user saves. */
  researchGoal?: string | null;
};

export function InlineResearchReviewPanel({
  companyId,
  companyName,
  researchData,
  onSaved,
  researchGoal,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const initialSegments: SegmentEdit[] = (researchData.microSegments ?? []).map((seg) => ({
    name: seg.name ?? seg.customName ?? '',
    valueProp: seg.valueProp ?? '',
    useCasesAtThisCompany: Array.isArray(seg.useCasesAtThisCompany)
      ? [...seg.useCasesAtThisCompany]
      : [],
  }));

  const [segments, setSegments] = useState<SegmentEdit[]>(initialSegments);

  const updateSegment = (index: number, field: keyof SegmentEdit, value: string | string[]) => {
    const next = [...segments];
    (next[index] as Record<string, unknown>)[field] = value;
    setSegments(next);
  };

  const handleLooksGood = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const microSegments = researchData.microSegments.map((seg, i) => {
        const edit = segments[i];
        if (!edit) return seg;
        return {
          ...seg,
          name: edit.name || seg.name,
          customName: edit.name || seg.customName,
          valueProp: edit.valueProp || seg.valueProp,
          useCasesAtThisCompany:
            edit.useCasesAtThisCompany?.length > 0
              ? edit.useCasesAtThisCompany.filter(Boolean)
              : seg.useCasesAtThisCompany,
        };
      });

      const payload: CompanyResearchData & { researchGoal?: string | null } = {
        ...researchData,
        microSegments,
        ...(researchGoal != null && researchGoal !== '' ? { researchGoal: researchGoal.trim() } : {}),
      };

      const res = await fetch(`/api/companies/${companyId}/apply-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      const msgRes = await fetch(`/api/companies/${companyId}/account-messaging/generate`, {
        method: 'POST',
      });
      if (!msgRes.ok) {
        const msgResult = await msgRes.json();
        throw new Error(msgResult.error ?? 'Failed to generate messaging');
      }

      onSaved();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [companyId, researchData, segments, onSaved, router]);

  return (
    <div className="rounded-lg border border-slate-600 bg-zinc-800/80 p-6 mt-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Review buying groups</h3>
      <p className="text-sm text-slate-400">
        Edit names and value props below, then click &quot;Looks good&quot; to save and generate messaging.
      </p>

      <div className="space-y-4">
        {segments.map((seg, index) => (
          <div
            key={index}
            className="border border-slate-600 rounded-lg p-4 bg-zinc-900/50 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Segment name</label>
              <Input
                value={seg.name}
                onChange={(e) => updateSegment(index, 'name', e.target.value)}
                placeholder="e.g. Revenue Operations"
                className="bg-zinc-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Value proposition</label>
              <Textarea
                value={seg.valueProp}
                onChange={(e) => updateSegment(index, 'valueProp', e.target.value)}
                placeholder="Why this segment cares..."
                rows={3}
                className="bg-zinc-800 border-slate-600 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Use cases (one per line)</label>
              <Textarea
                value={seg.useCasesAtThisCompany.join('\n')}
                onChange={(e) =>
                  updateSegment(
                    index,
                    'useCasesAtThisCompany',
                    e.target.value.split('\n').filter(Boolean)
                  )
                }
                placeholder="Use case 1&#10;Use case 2"
                rows={3}
                className="bg-zinc-800 border-slate-600 text-white resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          onClick={handleLooksGood}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
        >
          {saving ? 'Saving…' : 'Looks good → Generate messaging'}
        </Button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-sm text-slate-400 hover:text-white underline"
        >
          Review in full modal
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          {error}
          <button type="button" onClick={() => setError(null)} className="text-xs underline">
            Dismiss
          </button>
          <button type="button" onClick={handleLooksGood} className="text-xs font-medium underline">
            Retry
          </button>
        </p>
      )}

      {showModal && (
        <ResearchReviewModal
          open={showModal}
          onOpenChange={setShowModal}
          companyId={companyId}
          companyName={companyName}
          researchData={{
            ...researchData,
            microSegments: researchData.microSegments.map((seg, i) => {
              const edit = segments[i];
              if (!edit) return seg;
              return {
                ...seg,
                name: edit.name || seg.name,
                customName: edit.name || seg.customName,
                valueProp: edit.valueProp || seg.valueProp,
                useCasesAtThisCompany:
                  edit.useCasesAtThisCompany?.length > 0
                    ? edit.useCasesAtThisCompany.filter(Boolean)
                    : seg.useCasesAtThisCompany,
              };
            }),
          }}
        />
      )}
    </div>
  );
}
