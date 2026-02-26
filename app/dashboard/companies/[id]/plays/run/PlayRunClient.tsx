'use client';

// app/dashboard/companies/[id]/plays/run/PlayRunClient.tsx
// The "OMG moment" — signal → 3 assets generated → review + contacts + outreach

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type RunParams = {
  playId?: string;
  signalId?: string;
  signalTitle?: string;
  signalSummary?: string;
  segmentId?: string;
  segmentName?: string;
};

type GeneratedContent = {
  email?: string;
  linkedin?: string;
  talking_points?: string;
  segmentId?: string;
  segmentName?: string;
  errors?: { email?: string; linkedin?: string; talking_points?: string };
};

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  engagementStatus: string;
  emailsSentThisWeek?: number;
};

type PlayRunClientProps = {
  companyId: string;
  companyName: string;
  runParams: RunParams;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function playLabel(playId?: string) {
  const map: Record<string, string> = {
    re_engagement: 'Re-Engagement',
    feature_release: 'Feature Release',
    event_invite: 'Event Invite',
    new_buying_group: 'Open New Buying Group',
    champion_enablement: 'Champion Enablement',
  };
  return playId ? (map[playId] ?? playId.replace(/_/g, ' ')) : 'Play';
}

function playIcon(playId?: string) {
  const map: Record<string, string> = {
    re_engagement: '🔄',
    feature_release: '🚀',
    event_invite: '📅',
    new_buying_group: '🎯',
    champion_enablement: '🏆',
  };
  return playId ? (map[playId] ?? '▶') : '▶';
}

function fullName(c: Contact) {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

// ── Copy button with feedback ─────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: no-op
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-600 text-slate-300 hover:bg-zinc-700 hover:text-white transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Email send button ─────────────────────────────────────────────────────────

function SendEmailButton({
  companyId,
  contactId,
  contactName,
  emailContent,
}: {
  companyId: string;
  contactId: string;
  contactName: string;
  emailContent: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Parse subject and body from generated email
  const lines = emailContent.split('\n');
  const subjectLine = lines.find((l) => l.toLowerCase().startsWith('subject:'));
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '').trim() : `Following up — ${contactName}`;
  const body = lines
    .filter((l) => !l.toLowerCase().startsWith('subject:'))
    .join('\n')
    .trim();

  const handleSend = async () => {
    setState('sending');
    try {
      const res = await fetch(`/api/companies/${companyId}/plays/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, subject, body }),
      });
      if (!res.ok) throw new Error('Send failed');
      setState('sent');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (state === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Sent
      </span>
    );
  }

  return (
    <button
      onClick={handleSend}
      disabled={state === 'sending'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
    >
      {state === 'sending' ? (
        <>
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Sending…
        </>
      ) : state === 'error' ? (
        <span className="text-red-400">Failed — retry</span>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Send
        </>
      )}
    </button>
  );
}

// ── Content block ─────────────────────────────────────────────────────────────

function ContentBlock({
  icon,
  label,
  content,
  editHref,
}: {
  icon: string;
  label: string;
  content: string;
  editHref: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-slate-700 bg-zinc-900 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-700 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className="text-xs text-green-400 bg-green-900/30 border border-green-800 px-2 py-0.5 rounded-full">
            Ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={content} />
          <Link
            href={editHref}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-600 text-slate-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <pre className="px-4 py-4 text-slate-200 text-sm whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
  );
}

// ── Contacts sidebar ──────────────────────────────────────────────────────────

function ContactRow({
  contact,
  companyId,
  emailContent,
  linkedinContent,
}: {
  contact: Contact;
  companyId: string;
  emailContent?: string;
  linkedinContent?: string;
}) {
  const name = fullName(contact);
  const initials = [contact.firstName?.[0], contact.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const emailsSentThisWeek = contact.emailsSentThisWeek ?? 0;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">{contact.title ?? 'Unknown title'}</p>
        {emailsSentThisWeek > 0 && (
          <p className="text-xs text-amber-400/90 mt-0.5">
            {emailsSentThisWeek === 1 ? '1 email this week' : `${emailsSentThisWeek} emails this week`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {contact.email && (
            <SendEmailButton
              companyId={companyId}
              contactId={contact.id}
              contactName={name}
              emailContent={emailContent?.trim() || `Subject: Following up — ${name}\n\nHi,\n\nI wanted to reach out. Would love to connect when you have a moment.\n\nBest`}
            />
          )}
          {contact.linkedinUrl && (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-600 text-slate-300 hover:bg-zinc-700 hover:text-white transition-colors"
              onClick={async () => {
                if (linkedinContent) {
                  try { await navigator.clipboard.writeText(linkedinContent); } catch { /* no-op */ }
                }
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              {linkedinContent ? 'Copy + Open' : 'Open'}
            </a>
          )}
          {!contact.email && (
            <span className="text-xs text-slate-500 italic">No email</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingState({ segmentName }: { segmentName?: string }) {
  const steps = ['Analyzing account context…', 'Writing email…', 'Drafting LinkedIn message…', 'Building talking points…'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🚀</div>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg mb-1">
          Building outreach for {segmentName ?? 'buying group'}
        </p>
        <p className="text-slate-400 text-sm transition-all duration-500 min-h-[20px]">
          {steps[step]}
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${i <= step ? 'bg-blue-500' : 'bg-slate-600'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlayRunClient({ companyId, companyName, runParams }: PlayRunClientProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accountEmailsSentThisWeek, setAccountEmailsSentThisWeek] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runPlay = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const body = runParams.signalId && !runParams.signalTitle
        ? { signalId: runParams.signalId }
        : {
            playId: runParams.playId,
            signalTitle: runParams.signalTitle,
            signalSummary: runParams.signalSummary,
            segmentId: runParams.segmentId,
            segmentName: runParams.segmentName,
          };

      const res = await fetch(`/api/companies/${companyId}/plays/run-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: GeneratedContent = await res.json();

      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Generation failed');
      }

      setGenerated(data);
      setStatus('ready');

      // Load contacts for the segment (or first group with contacts if no segment), with email activity for this week
      const segId = data.segmentId ?? runParams.segmentId;
      const contactsRes = await fetch(
        `/api/companies/${companyId}/contacts/by-department?includeEmailActivity=week`
      );
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const groups = (contactsData.groups ?? []) as Array<{
          department: { id: string | null };
          contacts: Contact[];
        }>;
        if (typeof contactsData.accountEmailsSentThisWeek === 'number') {
          setAccountEmailsSentThisWeek(contactsData.accountEmailsSentThisWeek);
        }
        if (segId) {
          const group = groups.find((g) => g.department.id === segId);
          if (group) setContacts(group.contacts ?? []);
        } else {
          // No segment (e.g. feature release): show first department that has contacts, or first group
          const withContacts = groups.filter((g) => (g.contacts?.length ?? 0) > 0);
          const group = withContacts[0] ?? groups[0];
          if (group) setContacts(group.contacts ?? []);
        }
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    }
  }, [companyId, runParams]);

  useEffect(() => {
    runPlay();
  }, [runPlay]);

  // Build edit links for each content type
  const editBaseParams = new URLSearchParams();
  if (runParams.playId) editBaseParams.set('playId', runParams.playId);
  if (runParams.signalTitle) editBaseParams.set('signalTitle', runParams.signalTitle);
  if (runParams.signalSummary) editBaseParams.set('signalSummary', runParams.signalSummary);
  if (runParams.segmentName ?? generated?.segmentName) {
    editBaseParams.set('segmentName', (runParams.segmentName ?? generated?.segmentName)!);
  }
  if (runParams.segmentId ?? generated?.segmentId) {
    editBaseParams.set('segmentId', (runParams.segmentId ?? generated?.segmentId)!);
  }
  const editBase = `/dashboard/companies/${companyId}/create-content`;

  const segmentName = generated?.segmentName ?? runParams.segmentName;
  const playId = runParams.playId;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{playIcon(playId)}</span>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-white">{playLabel(playId)}</span>
              {segmentName && (
                <span className="text-sm text-slate-400 ml-2">→ {segmentName}</span>
              )}
              {runParams.signalTitle && (
                <span className="hidden sm:inline text-xs text-slate-500 ml-2 truncate">
                  · {runParams.signalTitle}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/companies/${companyId}`}
            className="flex-shrink-0 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← {companyName}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {status === 'loading' && <LoadingState segmentName={segmentName} />}

        {status === 'error' && (
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white font-semibold mb-2">Generation failed</p>
            <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>
            <button
              onClick={runPlay}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && generated && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Content blocks — left 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              {/* Signal context banner */}
              {runParams.signalTitle && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-800/50">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">⚡</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-blue-300">Signal used as hook</p>
                    <p className="text-xs text-blue-400 mt-0.5 truncate">{runParams.signalTitle}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  {contacts.length > 0
                    ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} · ${segmentName ?? 'Buying group'}`
                    : segmentName ?? 'Generated outreach'}
                </h2>
                <span className="text-xs text-slate-500">All assets generated · ready to send</span>
              </div>

              {generated.email && (
                <ContentBlock
                  icon="📧"
                  label="Email"
                  content={generated.email}
                  editHref={`${editBase}?${editBaseParams.toString()}&contentType=email`}
                />
              )}

              {generated.linkedin && (
                <ContentBlock
                  icon="💼"
                  label="LinkedIn"
                  content={generated.linkedin}
                  editHref={`${editBase}?${editBaseParams.toString()}&contentType=linkedin`}
                />
              )}

              {generated.talking_points && (
                <ContentBlock
                  icon="📋"
                  label="Talking Points"
                  content={generated.talking_points}
                  editHref={`${editBase}?${editBaseParams.toString()}&contentType=talking_points`}
                />
              )}

              {/* Partial failure notice */}
              {generated.errors && Object.keys(generated.errors).length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/50 text-yellow-300 text-xs">
                  Some assets failed to generate:{' '}
                  {Object.keys(generated.errors).join(', ')}. Use Edit to regenerate individually.
                </div>
              )}
            </div>

            {/* Contacts sidebar — right 1/3 */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-700 bg-zinc-900 sticky top-20">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="text-sm font-semibold text-white">
                    {segmentName ?? 'Contacts'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {contacts.length > 0
                      ? `${contacts.length} contacts — send or open LinkedIn`
                      : 'No contacts found for this segment'}
                  </p>
                  {accountEmailsSentThisWeek != null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Account: {accountEmailsSentThisWeek} email{accountEmailsSentThisWeek !== 1 ? 's' : ''} sent this week
                    </p>
                  )}
                </div>
                <div className="px-4 divide-y divide-slate-700/0">
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        companyId={companyId}
                        emailContent={generated.email}
                        linkedinContent={generated.linkedin}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-slate-500 text-sm mb-2">No contacts yet</p>
                      <Link
                        href={`/dashboard/companies/${companyId}/contacts`}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Find contacts →
                      </Link>
                    </div>
                  )}
                </div>

                {contacts.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-700">
                    <Link
                      href={`/dashboard/companies/${companyId}/contacts`}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      View all contacts →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
