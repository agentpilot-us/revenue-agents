'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  catalogProductId: string;
  catalogProductName: string;
  initialData: {
    oneLiner: string;
    elevatorPitch: string;
    valueProps: string[];
    painPoints: string[];
    bestForDepartments: string[];
    bestForIndustries: string[];
    technicalRequirements: string[];
    objectionHandlers: { objection: string; response: string }[];
    competitivePositioning: string[];
    linkedCaseStudyIds: string[];
    priceRangeText: string;
    dealSizeSweetSpot: string;
    salesCycle: string;
    deployment: string;
  } | null;
  successStories: { id: string; title: string }[];
};

export function ProductProfileForm({
  catalogProductId,
  initialData,
  successStories,
}: Props) {
  const [oneLiner, setOneLiner] = useState(initialData?.oneLiner ?? '');
  const [elevatorPitch, setElevatorPitch] = useState(initialData?.elevatorPitch ?? '');
  const [valueProps, setValueProps] = useState<string[]>(
    initialData?.valueProps?.length ? [...initialData.valueProps] : ['']
  );
  const [painPoints, setPainPoints] = useState<string[]>(
    initialData?.painPoints?.length ? [...initialData.painPoints] : ['']
  );
  const [bestForDepartments, setBestForDepartments] = useState<string>(
    (initialData?.bestForDepartments ?? []).join(', ')
  );
  const [bestForIndustries, setBestForIndustries] = useState<string>(
    (initialData?.bestForIndustries ?? []).join(', ')
  );
  const [technicalRequirements, setTechnicalReqs] = useState<string[]>(
    initialData?.technicalRequirements?.length ? [...initialData.technicalRequirements] : ['']
  );
  const [objectionHandlers, setObjectionHandlers] = useState(
    initialData?.objectionHandlers?.length ? [...initialData.objectionHandlers] : [{ objection: '', response: '' }]
  );
  const [competitivePositioning, setCompetitivePositioning] = useState<string[]>(
    initialData?.competitivePositioning?.length ? [...initialData.competitivePositioning] : ['']
  );
  const [linkedCaseStudyIds, setLinkedCaseStudyIds] = useState<string[]>(
    initialData?.linkedCaseStudyIds ?? []
  );
  const [priceRangeText, setPriceRangeText] = useState(initialData?.priceRangeText ?? '');
  const [dealSizeSweetSpot, setDealSizeSweetSpot] = useState(initialData?.dealSizeSweetSpot ?? '');
  const [salesCycle, setSalesCycle] = useState(initialData?.salesCycle ?? '');
  const [deployment, setDeployment] = useState(initialData?.deployment ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/catalog-products/${catalogProductId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneLiner: oneLiner || null,
          elevatorPitch: elevatorPitch || null,
          valueProps: valueProps.filter(Boolean),
          painPoints: painPoints.filter(Boolean),
          bestForDepartments: bestForDepartments.split(',').map((s) => s.trim()).filter(Boolean),
          bestForIndustries: bestForIndustries.split(',').map((s) => s.trim()).filter(Boolean),
          technicalRequirements: technicalRequirements.filter(Boolean),
          objectionHandlers: objectionHandlers.filter((o) => o.objection.trim() && o.response.trim()),
          competitivePositioning: competitivePositioning.filter(Boolean),
          linkedCaseStudyIds,
          priceRangeText: priceRangeText || null,
          dealSizeSweetSpot: dealSizeSweetSpot || null,
          salesCycle: salesCycle || null,
          deployment: deployment || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setMessage({ type: 'success', text: 'Saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [
    catalogProductId,
    oneLiner,
    elevatorPitch,
    valueProps,
    painPoints,
    bestForDepartments,
    bestForIndustries,
    technicalRequirements,
    objectionHandlers,
    competitivePositioning,
    linkedCaseStudyIds,
    priceRangeText,
    dealSizeSweetSpot,
    salesCycle,
    deployment,
  ]);

  const addToList = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };
  const setListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    i: number,
    v: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };
  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number) => {
    setter((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)));
  };

  const toggleCaseStudy = (id: string) => {
    setLinkedCaseStudyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Basics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Price range</label>
            <input
              type="text"
              value={priceRangeText}
              onChange={(e) => setPriceRangeText(e.target.value)}
              placeholder="e.g. $100K - $800K annually"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Deal size sweet spot</label>
            <input
              type="text"
              value={dealSizeSweetSpot}
              onChange={(e) => setDealSizeSweetSpot(e.target.value)}
              placeholder="e.g. $200K - $400K"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Sales cycle</label>
            <input
              type="text"
              value={salesCycle}
              onChange={(e) => setSalesCycle(e.target.value)}
              placeholder="e.g. 3-6 months"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Deployment</label>
            <input
              type="text"
              value={deployment}
              onChange={(e) => setDeployment(e.target.value)}
              placeholder="e.g. Cloud or on-prem"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">One-liner</h2>
        <input
          type="text"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          placeholder="Short sentence that describes the product"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Elevator pitch (30 seconds)</h2>
        <textarea
          value={elevatorPitch}
          onChange={(e) => setElevatorPitch(e.target.value)}
          placeholder="2-3 sentences for executive conversations"
          rows={3}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Value propositions</h2>
        {valueProps.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={v}
              onChange={(e) => setListItem(setValueProps, i, e.target.value)}
              placeholder="e.g. Reduce concept-to-prototype time by 40-60%"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeListItem(setValueProps, i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addToList(setValueProps)}>
          + Add value prop
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Pain points it solves</h2>
        {painPoints.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={p}
              onChange={(e) => setListItem(setPainPoints, i, e.target.value)}
              placeholder="e.g. Our design teams in different countries can't collaborate"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeListItem(setPainPoints, i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addToList(setPainPoints)}>
          + Add pain point
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Best for departments (comma-separated)</h2>
        <input
          type="text"
          value={bestForDepartments}
          onChange={(e) => setBestForDepartments(e.target.value)}
          placeholder="e.g. Industrial Design, Engineering, Marketing"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Best for industries (comma-separated)</h2>
        <input
          type="text"
          value={bestForIndustries}
          onChange={(e) => setBestForIndustries(e.target.value)}
          placeholder="e.g. Automotive, Architecture, Media & Entertainment"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Technical requirements</h2>
        {technicalRequirements.map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={t}
              onChange={(e) => setListItem(setTechnicalReqs, i, e.target.value)}
              placeholder="e.g. RTX GPU or cloud instance"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeListItem(setTechnicalReqs, i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addToList(setTechnicalReqs)}>
          + Add requirement
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Objection handlers</h2>
        {objectionHandlers.map((o, i) => (
          <div key={i} className="flex flex-col gap-2 mb-3">
            <input
              type="text"
              value={o.objection}
              onChange={(e) =>
                setObjectionHandlers((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], objection: e.target.value };
                  return next;
                })
              }
              placeholder="Objection"
              className="rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={o.response}
              onChange={(e) =>
                setObjectionHandlers((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], response: e.target.value };
                  return next;
                })
              }
              placeholder="Response"
              className="rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setObjectionHandlers((prev) =>
                  prev.length <= 1 ? [{ objection: '', response: '' }] : prev.filter((_, j) => j !== i)
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setObjectionHandlers((prev) => [...prev, { objection: '', response: '' }])}
        >
          + Add objection handler
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Competitive positioning</h2>
        {competitivePositioning.map((c, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={c}
              onChange={(e) => setListItem(setCompetitivePositioning, i, e.target.value)}
              placeholder="e.g. vs. PTC Creo: Omniverse is tool-agnostic"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeListItem(setCompetitivePositioning, i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addToList(setCompetitivePositioning)}>
          + Add positioning
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Linked case studies</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select success stories from your Content Library to link.</p>
        <div className="space-y-2">
          {successStories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No success stories in content library yet.</p>
          ) : (
            successStories.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkedCaseStudyIds.includes(s.id)}
                  onChange={() => toggleCaseStudy(s.id)}
                  className="rounded"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{s.title}</span>
              </label>
            ))
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </div>
  );
}
