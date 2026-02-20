'use client';

import { useState } from 'react';
import Link from 'next/link';

const STEP_NAMES: Record<number, string> = {
  1: 'Department focus',
  2: 'Find contacts',
  3: 'Send emails',
  4: 'Invite to events',
};

type ContactInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
};

type DraftEntry = { contactId: string; subject?: string; body?: string };

type Props = {
  playId: string;
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  currentStep: number;
  playState: string;
  stepState: Record<string, string> | null;
  stepCompletedAt: Record<string, string> | null;
  contentLibraryTitles: string[];
  productNames: string[];
  departmentContacts: ContactInfo[];
  targetContactIds: string[];
  drafts: DraftEntry[];
};

export function UseCaseExplorationExecution({
  playId,
  companyId,
  companyName,
  departmentId,
  departmentName,
  currentStep,
  playState,
  stepState,
  stepCompletedAt,
  contentLibraryTitles,
  productNames,
  departmentContacts,
  targetContactIds: initialTargetIds,
  drafts: initialDrafts,
}: Props) {
  const [targetContactIds, setTargetContactIds] = useState<string[]>(initialTargetIds);
  const [drafts, setDrafts] = useState<DraftEntry[]>(initialDrafts);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plays/use-case-exploration/${playId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Update failed');
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  const stepStateObj = stepState ?? {};
  const stepCompletedAtObj = stepCompletedAt ?? {};

  const completeStep1 = async () => {
    const updated = await patch({
      stepState: { ...stepStateObj, '1': 'completed' },
      stepCompletedAt: { ...stepCompletedAtObj, '1': new Date().toISOString() },
      currentStep: 2,
    });
    if (updated) window.location.reload();
  };

  const toggleContact = (contactId: string) => {
    const next = targetContactIds.includes(contactId)
      ? targetContactIds.filter((id) => id !== contactId)
      : [...targetContactIds, contactId];
    setTargetContactIds(next);
  };

  const saveContactsAndContinue = async () => {
    const payload = targetContactIds.map((contactId) => ({ contactId, addedAt: new Date().toISOString() }));
    const updated = await patch({
      targetContactIds: payload,
      stepState: { ...stepStateObj, '2': 'completed' },
      stepCompletedAt: { ...stepCompletedAtObj, '2': new Date().toISOString() },
      currentStep: 3,
    });
    if (updated) window.location.reload();
  };

  const generateDraft = async (contactId: string) => {
    setDraftLoading(contactId);
    try {
      const res = await fetch('/api/draft-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: companyId,
          contactId,
          departmentId,
        }),
      });
      if (!res.ok) throw new Error('Draft failed');
      const data = await res.json();
      const draft = data.draft ?? {};
      const next = drafts.filter((d) => d.contactId !== contactId);
      next.push({
        contactId,
        subject: draft.subject,
        body: draft.body,
      });
      setDrafts(next);
      await patch({ drafts: next });
    } finally {
      setDraftLoading(null);
    }
  };

  const copyDraft = (contactId: string) => {
    const d = drafts.find((x) => x.contactId === contactId);
    if (!d?.subject || !d?.body) return;
    const text = `Subject: ${d.subject}\n\n${d.body}`;
    void navigator.clipboard.writeText(text);
  };

  const completeStep3 = async () => {
    const updated = await patch({
      stepState: { ...stepStateObj, '3': 'completed' },
      stepCompletedAt: { ...stepCompletedAtObj, '3': new Date().toISOString() },
      currentStep: 4,
    });
    if (updated) window.location.reload();
  };

  const completeStep4 = async () => {
    await patch({
      playState: 'completed',
      stepState: { ...stepStateObj, '4': 'completed' },
      stepCompletedAt: { ...stepCompletedAtObj, '4': new Date().toISOString() },
    });
    window.location.reload();
  };

  const pausePlay = async () => {
    await patch({ playState: 'paused' });
    window.location.reload();
  };

  const targetContacts = departmentContacts.filter((c) => targetContactIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/plays"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Play Library
        </Link>
        <button
          type="button"
          onClick={pausePlay}
          disabled={loading || playState === 'paused'}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          Pause
        </button>
      </div>

      <h1 className="text-xl font-bold text-gray-900">Use Case Exploration</h1>
      <p className="text-sm text-gray-600">
        {companyName} → {departmentName}
      </p>
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Step {currentStep} of 4 · {STEP_NAMES[currentStep]}
        {stepStateObj[String(currentStep)] && ` · ${stepStateObj[String(currentStep)]}`}
      </p>

      {/* Step 1: Department focus */}
      {currentStep === 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Department focus</h2>
          <p className="text-sm text-gray-600 mb-4">
            Messaging and products that will be used for outreach in this department.
          </p>
          {contentLibraryTitles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Content Library</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {contentLibraryTitles.map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
              </ul>
            </div>
          )}
          {productNames.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Products</h3>
              <p className="text-sm text-gray-600">{productNames.join(', ')}</p>
            </div>
          )}
          {contentLibraryTitles.length === 0 && productNames.length === 0 && (
            <p className="text-sm text-gray-500 mb-4">No content or products linked yet. Add in Content Library or department.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/content-library"
              className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            >
              Edit in Content Library
            </Link>
            <button
              type="button"
              onClick={completeStep1}
              disabled={loading}
              className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
            >
              Continue to Find Contacts →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Find contacts */}
      {currentStep === 2 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Find contacts</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select contacts in this department to include in outreach.
          </p>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {departmentContacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts in this department yet.</p>
            ) : (
              departmentContacts.map((c) => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
                const selected = targetContactIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleContact(c.id)}
                      className="rounded"
                    />
                    <span className="font-medium text-gray-900">{name}</span>
                    {c.title && <span className="text-sm text-gray-500">{c.title}</span>}
                  </label>
                );
              })
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/companies/${companyId}/departments/${departmentId}`}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            >
              View department / add contacts
            </Link>
            <button
              type="button"
              onClick={saveContactsAndContinue}
              disabled={loading || targetContactIds.length === 0}
              className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
            >
              Continue to Draft Emails →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Send emails (Review outreach) */}
      {currentStep === 3 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Review outreach</h2>
            <Link
              href={`/chat?play=expansion&accountId=${companyId}`}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
            >
              AgentPilot chat
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            AI-drafted outreach per contact. Approve or skip, then copy to clipboard or send from your email client.
          </p>
          {targetContacts.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts selected. Go back to step 2 to add contacts.</p>
          ) : (
            targetContacts.map((c) => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
              const d = drafts.find((x) => x.contactId === c.id);
              const hasDraft = d?.subject && d?.body;
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-gray-200 p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{name}</span>
                    {c.title && <span className="text-sm text-gray-500">{c.title}</span>}
                  </div>
                  {hasDraft ? (
                    <>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Subject:</strong> {d!.subject}
                      </p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{d!.body}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => copyDraft(c.id)}
                          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                        >
                          Copy to Clipboard
                        </button>
                        <button
                          type="button"
                          onClick={() => generateDraft(c.id)}
                          disabled={draftLoading === c.id}
                          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                          {draftLoading === c.id ? 'Generating…' : 'Regenerate'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => generateDraft(c.id)}
                      disabled={draftLoading === c.id}
                      className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
                    >
                      {draftLoading === c.id ? 'Generating…' : 'Generate draft'}
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div className="pt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={completeStep3}
              disabled={loading}
              className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
            >
              Launch Play → Continue to Invite to Events
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Invite to events */}
      {currentStep === 4 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Invite to events</h2>
          <p className="text-sm text-gray-600 mb-4">
            Invite these contacts to a VIP Roundtable or event.
          </p>
          {targetContacts.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
              {targetContacts.map((c) => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
                return <li key={c.id}>{name}</li>;
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/plays/event/vip-roundtable?companyId=${companyId}&contactIds=${targetContactIds.join(',')}`}
              className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600"
            >
              Add to VIP Roundtable
            </Link>
            <button
              type="button"
              onClick={completeStep4}
              disabled={loading}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Mark Complete
            </button>
          </div>
        </div>
      )}

      {/* Upcoming steps summary */}
      {currentStep < 4 && (
        <div className="text-xs text-gray-500">
          Upcoming: {[2, 3, 4].filter((s) => s > currentStep).map((s) => STEP_NAMES[s]).join(' → ')}
        </div>
      )}
    </div>
  );
}
