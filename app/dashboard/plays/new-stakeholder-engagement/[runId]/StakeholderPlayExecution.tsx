'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { PlayExecutionChat } from './PlayExecutionChat';

const STEP_NAMES: Record<number, string> = {
  1: 'Research',
  2: 'Draft Email',
  3: 'LinkedIn Connection',
  4: 'Warm Intro Request',
  5: 'Follow-up if no response',
};

const STEP_SHORT: Record<number, string> = {
  1: 'Research',
  2: 'Draft',
  3: 'Link',
  4: 'Warm Intro',
  5: 'Follow-up',
};

type Props = {
  playId: string;
  companyId: string;
  companyName: string;
  contactName: string;
  contactTitle: string | null;
  contactEmail: string | null;
  contactLinkedInUrl: string | null;
  currentStep: number;
  status: string;
  playState: string;
  stepState: Record<string, string> | null;
  researchData: Record<string, unknown> | null;
  draftEmail: { subject?: string; body?: string } | null;
  draftEmailApproved: boolean | null;
  draftAttachment: string | null;
  stepCompletedAt: Record<string, string> | null;
  championHint: string;
  createdAt: string;
  initialMessages: Array<{ role: string; content: string; createdAt?: string }>;
};

function formatStartedAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function StakeholderPlayExecution({
  playId,
  companyId,
  companyName,
  contactName,
  contactTitle,
  contactEmail,
  contactLinkedInUrl,
  currentStep,
  playState,
  stepState,
  researchData,
  draftEmail,
  draftEmailApproved,
  draftAttachment,
  stepCompletedAt,
  championHint,
  createdAt,
  initialMessages,
}: Props) {
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [draftLoading, setDraftLoading] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [localDraft, setLocalDraft] = useState(draftEmail);

  const patchPlay = useCallback(async (updates: Record<string, unknown>) => {
    await fetch(`/api/plays/stakeholder/${playId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }, [playId]);

  const runResearch = async () => {
    setResearchLoading(true);
    setResearchProgress(0);
    const interval = setInterval(() => {
      setResearchProgress((p) => (p >= 90 ? p : p + Math.random() * 15 + 5));
    }, 800);
    try {
      await patchPlay({ playState: 'running' });
      const res = await fetch('/api/stakeholder-play/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId }),
      });
      const data = await res.json();
      clearInterval(interval);
      setResearchProgress(100);
      if (data.researchData) window.location.reload();
    } finally {
      clearInterval(interval);
      setResearchLoading(false);
    }
  };

  const runDraftEmail = async () => {
    setDraftLoading(true);
    try {
      const res = await fetch('/api/stakeholder-play/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId }),
      });
      const data = await res.json();
      if (data.draftEmail) {
        setLocalDraft(data.draftEmail);
        window.location.reload();
      }
    } finally {
      setDraftLoading(false);
    }
  };

  const approveDraft = async () => {
    const stepCompletedAtNew = { ...(stepCompletedAt ?? {}), '2': new Date().toISOString() };
    const stepStateNew = { ...(stepState ?? {}), '2': 'completed' };
    await patchPlay({
      draftEmailApproved: true,
      stepCompletedAt: stepCompletedAtNew,
      stepState: stepStateNew,
      currentStep: 3,
      playState: 'waiting_for_user',
    });
    window.location.reload();
  };

  const markStepComplete = async (stepIndex: number) => {
    await fetch(`/api/plays/stakeholder/${playId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markStepComplete: stepIndex }),
    });
    window.location.reload();
  };

  const skipStep = async (stepIndex: number) => {
    await fetch(`/api/plays/stakeholder/${playId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipStep: stepIndex }),
    });
    window.location.reload();
  };

  const pausePlay = async () => {
    await patchPlay({ playState: 'paused' });
    window.location.reload();
  };

  const applyDraft = async (subject: string, body: string) => {
    await patchPlay({ draftEmail: { subject, body } });
    setLocalDraft({ subject, body });
  };

  const step1Done = !!(researchData && (stepCompletedAt?.['1'] || (researchData as { summary?: string }).summary));
  const step2Done = draftEmailApproved === true;
  const draftReady = (localDraft ?? draftEmail)?.subject != null;
  const showState1 = researchLoading || (playState === 'running' && !step1Done);
  const showState2 = step1Done && !draftReady && !researchLoading;
  const showState3 = step1Done && draftReady && !step2Done;
  const showState5 = step2Done || currentStep >= 3;

  const progressStatus = showState1
    ? `Started ${formatStartedAgo(createdAt)}`
    : stepState?.[String(currentStep)] === 'needs_review'
      ? 'Needs Review'
      : stepState?.[String(currentStep)] === 'completed' || (currentStep === 1 && step1Done)
        ? 'Complete'
        : currentStep >= 3 && !step2Done
          ? ''
          : 'Your Task';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-amber-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/plays" className="text-sm text-amber-700 hover:underline font-medium">
            ← Play Library
          </Link>
          <h1 className="text-xl font-bold text-gray-900">New Stakeholder Engagement</h1>
          <button
            type="button"
            onClick={pausePlay}
            className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
          >
            ⏸ Pause
          </button>
        </div>
      </div>
      <div className="px-6 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          <Link href={`/dashboard/companies/${companyId}`} className="text-amber-700 font-medium hover:underline">{companyName}</Link>
          {' → '}
          <span className="font-medium text-gray-900">{contactName}</span>
          {contactTitle && <span className="text-gray-500"> ({contactTitle})</span>}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Step {currentStep} of 5 · {STEP_NAMES[currentStep] ?? 'Unknown'}
          {progressStatus && ` · ${progressStatus}`}
        </p>
      </div>

      {/* Main content */}
      <div className="p-6 flex-1">
        {/* State 1: Research running */}
        {showState1 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 RESEARCHING {contactName.toUpperCase()}...</h2>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>{researchProgress > 10 ? '✅' : '○'} LinkedIn profile found</li>
                <li>{researchProgress > 25 ? '✅' : '○'} Work history extracted</li>
                <li>{researchProgress > 50 ? '✅' : '⏳'} Analyzing recent posts and articles...</li>
                <li>{researchProgress > 75 ? '✅' : '○'} Finding mutual connections</li>
                <li>{researchProgress > 90 ? '✅' : '○'} Checking company context</li>
              </ul>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, researchProgress)}%` }} />
              </div>
              <p className="text-right text-xs text-gray-500 mt-2">{Math.min(100, Math.round(researchProgress))}%</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Upcoming steps</p>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((n) => (
                  <div key={n} className="rounded border border-gray-200 p-2 text-center text-xs">
                    <div className="font-medium">{STEP_SHORT[n]}</div>
                    <div className="text-gray-400">○</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* State 2: Research complete */}
        {showState2 && !showState1 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">👤 {contactName.toUpperCase()}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {contactTitle ?? ''}, {companyName} · Research complete
              </p>
              {((researchData?.background ?? []) as string[]).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">BACKGROUND</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {((researchData?.background ?? []) as string[]).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((researchData?.recentActivity ?? []) as string[]).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">RECENT ACTIVITY</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {((researchData?.recentActivity ?? []) as string[]).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((researchData?.warmIntroPaths ?? []) as string[]).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🔗 WARM INTRO PATHS</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {((researchData?.warmIntroPaths ?? []) as string[]).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((researchData?.talkingPoints ?? []) as string[]).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎯 TALKING POINTS</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {((researchData?.talkingPoints ?? []) as string[]).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!researchData?.background && !researchData?.recentActivity && researchData?.summary != null && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{String(researchData.summary)}</div>
              )}
              <div className="flex flex-wrap gap-2 mt-6">
                <button type="button" onClick={runResearch} disabled={researchLoading} className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">
                  Edit Research
                </button>
                <button type="button" onClick={runDraftEmail} disabled={draftLoading} className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50">
                  Continue to Draft →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Email draft ready */}
        {showState3 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">✉️ INTRO EMAIL</h2>
              <p className="text-sm text-gray-500 mb-1">To: {contactEmail ?? '—'}</p>
              <p className="text-sm font-medium mb-2">Subject: {(localDraft ?? draftEmail)?.subject ?? '—'}</p>
              <div className="border-t border-b border-gray-200 py-3 my-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{(localDraft ?? draftEmail)?.body ?? ''}</p>
              </div>
              {draftAttachment && (
                <p className="text-sm text-gray-500">📎 Attachment: {draftAttachment} (auto-matched)</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={runDraftEmail} disabled={draftLoading} className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">
                  Regenerate
                </button>
                <button type="button" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">
                  Remove Attachment
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const d = localDraft ?? draftEmail;
                    if (d) navigator.clipboard.writeText(`Subject: ${d.subject}\n\n${d.body}`);
                  }}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Copy to Clipboard
                </button>
                <button type="button" onClick={approveDraft} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                  ✅ Approve & Queue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 5: Task step + completed */}
        {showState5 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Completed</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCompletedCollapsed(!completedCollapsed)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span>✅ Step 1: Research · {contactName} researched</span>
                  <span>{completedCollapsed ? '▼' : '▲'} Collapse</span>
                </button>
                {!completedCollapsed && (
                  <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
                    ✅ Step 2: Email Draft · Approved & queued
                  </div>
                )}
              </div>
            </div>

            {currentStep === 3 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🔗 LINKEDIN CONNECTION</h2>
                <p className="text-sm text-gray-600 mb-3">Send a connection request to {contactName} on LinkedIn.</p>
                <p className="text-sm font-medium mb-1">Suggested message:</p>
                <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 mb-4">
                  Hi {contactName} — congrats on the GM CDO role. I work with your AV team and would love to connect. Just sent you a note about design collaboration tools.
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`Hi ${contactName} — congrats on the GM CDO role. I work with your AV team and would love to connect. Just sent you a note about design collaboration tools.`)}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Copy Message
                  </button>
                  {contactLinkedInUrl && (
                    <a href={contactLinkedInUrl} target="_blank" rel="noopener noreferrer" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">
                      Open LinkedIn Profile ↗
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">When you&apos;ve sent the request:</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => markStepComplete(3)} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                    ✅ Mark Complete
                  </button>
                  <button type="button" onClick={() => skipStep(3)} className="text-sm text-gray-500 hover:underline">
                    Skip This Step
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Warm Intro Request</h2>
                <p className="text-sm text-gray-600">Ask {championHint} (existing champion) for warm intro. Day 5.</p>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">Send to {championHint}</button>
                  <button type="button" onClick={() => skipStep(4)} className="text-sm text-gray-500 hover:underline">Skip — go direct</button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 5: Follow-up if no response</h2>
                <p className="text-sm text-gray-600">If no reply to intro email: send case study relevant to their background. Day 10.</p>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">Auto-queue</button>
                  <button type="button" onClick={pausePlay} className="text-sm text-gray-500 hover:underline">Pause play</button>
                </div>
              </div>
            )}

            {(currentStep < 4 || currentStep === 3) && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Upcoming</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {currentStep < 4 && <li>○ Step 4: Warm Intro Request (Day 3)</li>}
                  {currentStep < 5 && <li>○ Step 5: Follow-up if no response (Day 7)</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {!step1Done && !showState1 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-sm text-gray-600 mb-4">Run research to get a profile and talking points for {contactName}.</p>
            <button type="button" onClick={runResearch} disabled={researchLoading} className="px-4 py-2 bg-amber-500 text-gray-900 font-medium rounded hover:bg-amber-600 disabled:opacity-50">
              {researchLoading ? 'Running…' : 'Run research'}
            </button>
          </div>
        )}
      </div>

      {/* Agent Pilot Chat */}
      <div className="border-t border-gray-200 bg-gray-50/50 p-4">
        <PlayExecutionChat
          playId={playId}
          initialMessages={initialMessages}
          contactName={contactName}
          step1Done={step1Done}
          draftReady={draftReady}
          step2Done={step2Done}
          onApplyDraft={applyDraft}
        />
      </div>
    </div>
  );
}
