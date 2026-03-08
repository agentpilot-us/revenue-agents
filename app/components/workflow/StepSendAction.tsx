'use client';

import { useState } from 'react';
import type { WorkflowStep } from './WorkflowStepper';
import {
  buildGmailComposeUrl,
  buildOutlookComposeUrl,
  buildLinkedInProfileUrl,
  buildLinkedInMessageUrl,
} from '@/lib/integrations/compose-urls';

const t = {
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.25)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.08)',
};

type Props = {
  workflowId: string;
  step: WorkflowStep;
  onSent: () => void;
};

export default function StepSendAction({ workflowId, step, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (step.status === 'sent') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 8,
          background: t.greenBg,
          border: `1px solid ${t.greenBorder}`,
        }}
      >
        <span style={{ fontSize: 14 }}>✓</span>
        <span style={{ fontSize: 12, color: t.green, fontWeight: 600 }}>
          {step.channel === 'email' || step.contentType === 'email' ? 'Email sent' : 'Completed'}
          {step.completedAt &&
            ` at ${new Date(step.completedAt).toLocaleString()}`}
        </span>
      </div>
    );
  }

  const channel = step.channel || step.contentType || 'email';
  const content = (step.editedContent || step.generatedContent) as Record<string, string> | null;

  const handleSendEmail = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/action-workflows/${workflowId}/steps/${step.id}/send`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Send failed');
      } else {
        onSent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLinkedIn = async () => {
    const text = content?.body || content?.raw || '';
    await navigator.clipboard.writeText(text);
    setCopied(true);

    await fetch(
      `/api/action-workflows/${workflowId}/steps/${step.id}/send`,
      { method: 'POST' },
    );
    setTimeout(() => {
      setCopied(false);
      onSent();
    }, 1500);
  };

  const handleSkip = async () => {
    await fetch(`/api/action-workflows/${workflowId}/steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' }),
    });
    onSent();
  };

  const isEmailChannel = channel === 'email' || channel === 'sms';
  const isLinkedInChannel = channel === 'linkedin' || channel === 'linkedin_inmail' || channel === 'linkedin_post';
  const isAdBrief = channel === 'ad_brief' || step.contentType === 'ad_brief';
  const isOtherCopyable = !isEmailChannel && !isLinkedInChannel && !isAdBrief && channel !== 'presentation';

  const handleCopyGeneric = async () => {
    const text = content?.body || content?.raw || '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    await fetch(
      `/api/action-workflows/${workflowId}/steps/${step.id}/send`,
      { method: 'POST' },
    );
    setTimeout(() => { setCopied(false); onSent(); }, 1500);
  };

  const linkedInProfile = buildLinkedInProfileUrl(step.contact?.linkedinUrl ?? null);
  const linkedInMessage = buildLinkedInMessageUrl(step.contact?.linkedinUrl ?? null);

  return (
    <div>
      {/* Primary action row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isEmailChannel && (
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={sending || !step.contact?.email}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: sending
                ? 'rgba(34,197,94,0.15)'
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: sending || !step.contact?.email ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending
              ? 'Sending...'
              : `Send via AgentPilot${step.contact?.email ? ` to ${step.contact.email}` : ''}`}
          </button>
        )}

        {isLinkedInChannel && (
          <button
            type="button"
            onClick={handleCopyLinkedIn}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: copied ? t.greenBg : t.blueBg,
              border: `1px solid ${copied ? t.greenBorder : t.blueBorder}`,
              color: copied ? t.green : t.blue,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied & Marked Sent' : 'Copy to Clipboard'}
          </button>
        )}

        {isOtherCopyable && (
          <button
            type="button"
            onClick={handleCopyGeneric}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: copied ? t.greenBg : t.blueBg,
              border: `1px solid ${copied ? t.greenBorder : t.blueBorder}`,
              color: copied ? t.green : t.blue,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        )}

        {isAdBrief && (
          <>
            <button
              type="button"
              onClick={async () => {
                const text = content?.body || content?.raw || '';
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: copied ? t.greenBg : 'rgba(167,139,250,0.08)',
                border: `1px solid ${copied ? t.greenBorder : 'rgba(167,139,250,0.25)'}`,
                color: copied ? t.green : '#a78bfa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy Ad Brief'}
            </button>
            <button
              type="button"
              onClick={() => {
                const text = content?.body || content?.raw || '';
                const subject = content?.subject || 'Ad Brief';
                const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
                window.open(mailtoUrl, '_blank');
                fetch(`/api/action-workflows/${workflowId}/steps/${step.id}/send`, { method: 'POST' });
                onSent();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: t.blueBg,
                border: `1px solid ${t.blueBorder}`,
                color: t.blue,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Email to Ad Ops
            </button>
          </>
        )}

        {channel === 'presentation' && (
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/export/presentation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    content: content?.body || content?.raw || '',
                    title: `Presentation`,
                  }),
                });
                if (res.ok) {
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'presentation.pptx';
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (err) {
                console.error('Download failed:', err);
              }
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: t.blueBg,
              border: `1px solid ${t.blueBorder}`,
              color: t.blue,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download PPTX
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid rgba(255,255,255,0.06)`,
            color: t.text3,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>

      {/* Integration buttons — secondary row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {isEmailChannel && step.contact?.email && (
          <>
            <IntegrationLink
              label="Open in Gmail"
              href={buildGmailComposeUrl({
                to: step.contact.email,
                subject: content?.subject ?? '',
                body: content?.body ?? content?.raw ?? '',
              })}
            />
            <IntegrationLink
              label="Open in Outlook"
              href={buildOutlookComposeUrl({
                to: step.contact.email,
                subject: content?.subject ?? '',
                body: content?.body ?? content?.raw ?? '',
              })}
            />
          </>
        )}

        {isLinkedInChannel && linkedInProfile && (
          <>
            <IntegrationLink label="Open Profile" href={linkedInProfile} />
            {linkedInMessage && (
              <IntegrationLink label="Open Messaging" href={linkedInMessage} />
            )}
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: t.redBg,
            color: t.red,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {isEmailChannel && !step.contact?.email && (
        <p style={{ fontSize: 11, color: t.text3, marginTop: 6 }}>
          No email address on this contact. Assign a contact with an email to send.
        </p>
      )}
    </div>
  );
}

function IntegrationLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '5px 10px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#94a3b8',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#e2e8f0';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#94a3b8';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {label} ↗
    </a>
  );
}
