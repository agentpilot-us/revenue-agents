'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UseCaseEntry = {
  contentLibraryId: string;
  customNote?: string;
  departmentFit?: string[];
};
type SuccessStoryEntry = {
  contentLibraryId: string;
  whyRelevant: string;
  bestForDepartments?: string[];
};
type ObjectionHandler = { objection: string; response: string };
type DoNotMention = { topic: string; reason: string };

type AccountMessagingData = {
  id: string;
  whyThisCompany: string[] | null;
  useCases: UseCaseEntry[] | null;
  successStories: SuccessStoryEntry[] | null;
  objectionHandlers: ObjectionHandler[] | null;
  doNotMention: DoNotMention[] | null;
  aiGenerated: boolean;
  updatedAt: string;
} | null;

type ContentItem = { id: string; title: string; type: string };

type Props = {
  companyId: string;
  companyName: string;
  initialData: AccountMessagingData;
  contentLibrary: ContentItem[];
};

export function AccountMessagingTab({
  companyId,
  companyName,
  initialData,
  contentLibrary,
}: Props) {
  const useCases = contentLibrary.filter((c) => c.type === 'UseCase');
  const successStories = contentLibrary.filter((c) => c.type === 'SuccessStory');

  const [whyThisCompany, setWhyThisCompany] = useState<string[]>(
    initialData?.whyThisCompany?.length ? [...initialData.whyThisCompany] : ['']
  );
  const [useCasesSelected, setUseCasesSelected] = useState<UseCaseEntry[]>(
    initialData?.useCases?.length ? [...initialData.useCases] : []
  );
  const [successStoriesSelected, setSuccessStoriesSelected] = useState<SuccessStoryEntry[]>(
    initialData?.successStories?.length ? [...initialData.successStories] : []
  );
  const [objectionHandlers, setObjectionHandlers] = useState<ObjectionHandler[]>(
    initialData?.objectionHandlers?.length ? [...initialData.objectionHandlers] : [{ objection: '', response: '' }]
  );
  const [doNotMention, setDoNotMention] = useState<DoNotMention[]>(
    initialData?.doNotMention?.length ? [...initialData.doNotMention] : [{ topic: '', reason: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/account-messaging`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whyThisCompany: whyThisCompany.filter(Boolean),
          useCases: useCasesSelected.filter((u) => u.contentLibraryId),
          successStories: successStoriesSelected.filter((s) => s.contentLibraryId && s.whyRelevant),
          objectionHandlers: objectionHandlers.filter((o) => o.objection.trim() && o.response.trim()),
          doNotMention: doNotMention.filter((d) => d.topic.trim() && d.reason.trim()),
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
    companyId,
    whyThisCompany,
    useCasesSelected,
    successStoriesSelected,
    objectionHandlers,
    doNotMention,
  ]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/account-messaging/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      setWhyThisCompany(
        Array.isArray(data.whyThisCompany) && data.whyThisCompany.length > 0
          ? data.whyThisCompany
          : ['']
      );
      setUseCasesSelected(Array.isArray(data.useCases) ? data.useCases : []);
      setSuccessStoriesSelected(Array.isArray(data.successStories) ? data.successStories : []);
      setObjectionHandlers(
        Array.isArray(data.objectionHandlers) && data.objectionHandlers.length > 0
          ? data.objectionHandlers
          : [{ objection: '', response: '' }]
      );
      setDoNotMention(
        Array.isArray(data.doNotMention) && data.doNotMention.length > 0
          ? data.doNotMention
          : [{ topic: '', reason: '' }]
      );
      setMessage({ type: 'success', text: 'Generated. Review and edit, then Save.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Generate failed' });
    } finally {
      setGenerating(false);
    }
  }, [companyId]);

  const addWhyBullet = () => setWhyThisCompany((prev) => [...prev, '']);
  const setWhyBullet = (i: number, v: string) =>
    setWhyThisCompany((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  const removeWhyBullet = (i: number) =>
    setWhyThisCompany((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)));

  const toggleUseCase = (contentLibraryId: string, title: string) => {
    const exists = useCasesSelected.find((u) => u.contentLibraryId === contentLibraryId);
    if (exists) {
      setUseCasesSelected((prev) => prev.filter((u) => u.contentLibraryId !== contentLibraryId));
    } else {
      setUseCasesSelected((prev) => [...prev, { contentLibraryId, departmentFit: [] }]);
    }
  };
  const setUseCaseNote = (contentLibraryId: string, customNote: string) => {
    setUseCasesSelected((prev) =>
      prev.map((u) => (u.contentLibraryId === contentLibraryId ? { ...u, customNote } : u))
    );
  };

  const toggleSuccessStory = (contentLibraryId: string) => {
    const exists = successStoriesSelected.find((s) => s.contentLibraryId === contentLibraryId);
    if (exists) {
      setSuccessStoriesSelected((prev) => prev.filter((s) => s.contentLibraryId !== contentLibraryId));
    } else {
      const newEntry: SuccessStoryEntry = {
        contentLibraryId,
        whyRelevant: '',
        bestForDepartments: [],
      };
      setSuccessStoriesSelected((prev) => [...prev, newEntry]);
    }
  };
  const setStoryWhyRelevant = (contentLibraryId: string, whyRelevant: string) => {
    setSuccessStoriesSelected((prev) =>
      prev.map((s) => (s.contentLibraryId === contentLibraryId ? { ...s, whyRelevant } : s))
    );
  };

  const setObjection = (i: number, objection: string) =>
    setObjectionHandlers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], objection };
      return next;
    });
  const setResponse = (i: number, response: string) =>
    setObjectionHandlers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], response };
      return next;
    });
  const addObjection = () =>
    setObjectionHandlers((prev) => [...prev, { objection: '', response: '' }]);
  const removeObjection = (i: number) =>
    setObjectionHandlers((prev) => (prev.length <= 1 ? [{ objection: '', response: '' }] : prev.filter((_, j) => j !== i)));

  const setDnMTopic = (i: number, topic: string) =>
    setDoNotMention((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], topic };
      return next;
    });
  const setDnMReason = (i: number, reason: string) =>
    setDoNotMention((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], reason };
      return next;
    });
  const addDoNotMention = () => setDoNotMention((prev) => [...prev, { topic: '', reason: '' }]);
  const removeDoNotMention = (i: number) =>
    setDoNotMention((prev) => (prev.length <= 1 ? [{ topic: '', reason: '' }] : prev.filter((_, j) => j !== i)));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Account Messaging</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Content AI will use when drafting outreach to {companyName}.
        </p>
        {message && (
          <div
            className={cn(
              'mb-4 p-3 rounded text-sm',
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            )}
          >
            {message.text}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'AI Assist'}
          </Button>
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Why {companyName}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Bullet points on why this account should care.</p>
            {whyThisCompany.map((bullet, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => setWhyBullet(i, e.target.value)}
                  placeholder="e.g. Industry shift toward EV requires new quality tooling"
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeWhyBullet(i)}
                  disabled={whyThisCompany.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addWhyBullet}>
              + Add bullet
            </Button>
          </section>

          <section>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Relevant use cases</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">From your company data (Use Cases).</p>
            <div className="space-y-2">
              {useCases.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No use cases in your company data. Add some in Your company data first.</p>
              ) : (
                useCases.map((uc) => {
                  const selected = useCasesSelected.find((u) => u.contentLibraryId === uc.id);
                  return (
                    <div
                      key={uc.id}
                      className={cn(
                        'p-3 rounded border',
                        selected
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-zinc-600'
                      )}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleUseCase(uc.id, uc.title)}
                          className="rounded"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{uc.title}</span>
                      </label>
                      {selected && (
                        <input
                          type="text"
                          value={selected.customNote ?? ''}
                          onChange={(e) => setUseCaseNote(uc.id, e.target.value)}
                          placeholder="Optional note or department fit"
                          className="mt-2 w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Relevant success stories</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">From your Content Library (Success Stories).</p>
            <div className="space-y-2">
              {successStories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No success stories in content library.</p>
              ) : (
                successStories.map((ss) => {
                  const selected = successStoriesSelected.find((s) => s.contentLibraryId === ss.id);
                  return (
                    <div
                      key={ss.id}
                      className={cn(
                        'p-3 rounded border',
                        selected
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-zinc-600'
                      )}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleSuccessStory(ss.id)}
                          className="rounded"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{ss.title}</span>
                      </label>
                      {selected && (
                        <input
                          type="text"
                          value={selected.whyRelevant}
                          onChange={(e) => setStoryWhyRelevant(ss.id, e.target.value)}
                          placeholder="Why relevant for this account"
                          className="mt-2 w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Objection handlers</h3>
            {objectionHandlers.map((o, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  type="text"
                  value={o.objection}
                  onChange={(e) => setObjection(i, e.target.value)}
                  placeholder="Objection"
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={o.response}
                  onChange={(e) => setResponse(i, e.target.value)}
                  placeholder="Response"
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeObjection(i)}
                  disabled={objectionHandlers.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addObjection}>
              + Add objection handler
            </Button>
          </section>

          <section>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Do not mention</h3>
            {doNotMention.map((d, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  type="text"
                  value={d.topic}
                  onChange={(e) => setDnMTopic(i, e.target.value)}
                  placeholder="Topic"
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={d.reason}
                  onChange={(e) => setDnMReason(i, e.target.value)}
                  placeholder="Reason"
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeDoNotMention(i)}
                  disabled={doNotMention.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDoNotMention}>
              + Add do not mention
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
