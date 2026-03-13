'use client';

import { useState } from 'react';
import type { WorkflowStep } from './WorkflowStepper';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  amber: '#f59e0b',
};

const CHANNEL_HINT: Record<string, string> = {
  email: 'Subject line + email body will appear here',
  linkedin_inmail: 'LinkedIn message will appear here',
  linkedin_post: 'LinkedIn post will appear here',
  talking_points: 'Structured talking points will appear here',
  presentation: 'Presentation outline will appear here',
  sms: 'Text message will appear here',
  briefing: 'Briefing document will appear here',
  generated_image: 'Generated image preview will appear here',
  generated_video: 'Generated video preview will appear here',
};

type MediaAsset = {
  assetKind: 'image' | 'video';
  base64: string;
  mimeType: string;
  filename: string;
  promptUsed?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toMediaAsset(value: unknown): MediaAsset | null {
  const record = toRecord(value);
  const assetKind =
    record.assetKind === 'image' || record.assetKind === 'video'
      ? record.assetKind
      : null;
  const base64 = typeof record.base64 === 'string' ? record.base64 : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
  const filename = typeof record.filename === 'string' ? record.filename : '';

  if (!assetKind || !base64 || !mimeType || !filename) return null;

  return {
    assetKind,
    base64,
    mimeType,
    filename,
    promptUsed:
      typeof record.promptUsed === 'string' ? record.promptUsed : undefined,
  };
}

function getMediaAsset(content: Record<string, unknown> | null): MediaAsset | null {
  if (!content) return null;
  return toMediaAsset(content.media) ?? toMediaAsset(content);
}

function dataUrlForMedia(media: MediaAsset): string {
  return `data:${media.mimeType};base64,${media.base64}`;
}

type Props = {
  workflowId: string;
  step: WorkflowStep;
  onGenerated: () => void;
};

export default function StepContentGenerator({ workflowId, step, onGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const content = (step.editedContent || step.generatedContent) as Record<string, unknown> | null;
  const media = getMediaAsset(content);
  const isMedia = !!media;
  const hasContent =
    content &&
    (typeof content.body === 'string' ||
      typeof content.raw === 'string' ||
      typeof content.subject === 'string' ||
      isMedia);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/action-workflows/${workflowId}/steps/${step.id}/generate`, {
        method: 'POST',
      });
      onGenerated();
    } catch (err) {
      console.error('Generate failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartEdit = () => {
    if (!content) return;
    setEditSubject(typeof content.subject === 'string' ? content.subject : '');
    setEditBody(
      typeof content.body === 'string'
        ? content.body
        : typeof content.raw === 'string'
          ? content.raw
          : '',
    );
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/action-workflows/${workflowId}/steps/${step.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedContent: {
            subject: editSubject,
            body: editBody,
            raw: editSubject ? `Subject: ${editSubject}\n\n${editBody}` : editBody,
          },
        }),
      });
      setEditMode(false);
      onGenerated();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Ghost placeholder for pending/failed steps
  if (step.status === 'pending' || step.status === 'failed') {
    const ghostText = CHANNEL_HINT[step.contentType ?? ''] || 'Generated content will appear here';
    return (
      <div
        style={{
          padding: '16px 14px',
          borderRadius: 8,
          background: 'rgba(15,23,42,0.3)',
          border: `1px dashed ${step.status === 'failed' ? 'rgba(239,68,68,0.3)' : t.borderMed}`,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, color: t.text4, margin: 0 }}>
          {ghostText}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            marginTop: 10,
            padding: '5px 14px',
            borderRadius: 6,
            background: 'transparent',
            border: `1px solid ${step.status === 'failed' ? 'rgba(239,68,68,0.3)' : t.borderMed}`,
            color: step.status === 'failed' ? '#ef4444' : t.text3,
            fontSize: 11,
            fontWeight: 500,
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Generating...' : step.status === 'failed' ? 'Retry this step' : 'Generate this step'}
        </button>
      </div>
    );
  }

  // Generating spinner
  if (step.status === 'generating') {
    return (
      <div
        style={{
          padding: '20px 14px',
          borderRadius: 8,
          background: 'rgba(15,23,42,0.3)',
          border: `1px solid ${t.borderMed}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            margin: '0 auto 8px',
            border: '2px solid rgba(59,130,246,0.3)',
            borderTopColor: t.blue,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: 12, color: t.text3, margin: 0 }}>Generating content...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!hasContent) return null;

  // Edit mode
  if (editMode && !isMedia) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step.contentType === 'email' && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: t.text3,
                marginBottom: 4,
              }}
            >
              Subject
            </label>
            <input
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${t.borderMed}`,
                background: t.surface,
                color: t.text1,
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        )}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: t.text3,
              marginBottom: 4,
            }}
          >
            Body
          </label>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${t.borderMed}`,
              background: t.surface,
              color: t.text1,
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text2,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Content preview (ready/sent)
  return (
    <div>
      {typeof content!.subject === 'string' && content!.subject && (
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: t.text3,
            }}
          >
            Subject
          </span>
          <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: '4px 0 0' }}>
            {content!.subject}
          </p>
        </div>
      )}
      {isMedia && media ? (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(15,23,42,0.4)',
            border: `1px solid ${t.border}`,
          }}
        >
          {media.assetKind === 'image' ? (
            <img
              src={dataUrlForMedia(media)}
              alt="Generated workflow asset"
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 8,
                background: '#020617',
              }}
            />
          ) : (
            <video
              controls
              src={dataUrlForMedia(media)}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 320,
                borderRadius: 8,
                background: '#020617',
              }}
            />
          )}
          {media.promptUsed && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 11,
                lineHeight: 1.6,
                color: t.text3,
                whiteSpace: 'pre-wrap',
              }}
            >
              {media.promptUsed}
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.7,
            color: t.text2,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(15,23,42,0.4)',
            border: `1px solid ${t.border}`,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {typeof content!.body === 'string'
            ? content!.body
            : typeof content!.raw === 'string'
              ? content!.raw
              : ''}
        </div>
      )}
      {step.status !== 'sent' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {!isMedia && (
            <button
              type="button"
              onClick={handleStartEdit}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: 'transparent',
                border: `1px solid ${t.borderMed}`,
                color: t.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'transparent',
              border: `1px solid ${t.borderMed}`,
              color: t.text2,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      )}
    </div>
  );
}
