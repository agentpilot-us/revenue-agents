'use client';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.06)',
};

export type RecommendedPlayItem = {
  playbookActivationId: string;
  templateId: string;
  templateName: string;
  triggerType: string | null;
  priority: number;
  expectedOutcome: string | null;
  score: number;
  reasons: string[];
  targetDivision: {
    id: string;
    name: string;
    type: string;
    contactCount: number;
    estimatedOpportunity: string | null;
    stage: string | null;
  } | null;
  stepCount: number;
  stepPreview: string[];
  companyId: string;
  companyName: string;
};

type Props = {
  play: RecommendedPlayItem;
  onStartPlay: (play: RecommendedPlayItem) => void;
  onDismiss: (play: RecommendedPlayItem) => void;
  working?: boolean;
};

function stageLabel(stage: string | null): { text: string; color: string; bg: string } | null {
  if (!stage) return null;
  const map: Record<string, { text: string; color: string; bg: string }> = {
    awareness: { text: 'Awareness', color: t.blue, bg: t.blueBg },
    discovery: { text: 'Discovery', color: t.blue, bg: t.blueBg },
    evaluation: { text: 'Evaluation', color: t.amber, bg: t.amberBg },
    engaged: { text: 'Engaged', color: t.green, bg: t.greenBg },
    negotiation: { text: 'Negotiation', color: t.purple, bg: t.purpleBg },
  };
  return map[stage.toLowerCase()] ?? { text: stage, color: t.text3, bg: 'rgba(255,255,255,0.04)' };
}

export default function RecommendedPlayCard({ play, onStartPlay, onDismiss, working }: Props) {
  const div = play.targetDivision;
  const stage = stageLabel(div?.stage ?? null);

  return (
    <div
      style={{
        background: t.surface,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: working ? 0.5 : 1,
        pointerEvents: working ? 'none' : 'auto',
        transition: 'opacity 0.2s',
      }}
    >
      {/* Top row: account + play name + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 4,
            background: t.blueBg,
            color: t.blue,
            textTransform: 'uppercase',
          }}
        >
          {play.companyName}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            background: t.purpleBg,
            color: t.purple,
          }}
        >
          {play.templateName}
        </span>
        {stage && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 3,
              background: stage.bg,
              color: stage.color,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {stage.text}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: t.greenBg,
            color: t.green,
          }}
        >
          {play.score}
        </span>
      </div>

      {/* Division targeting line */}
      {div && (
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text1, lineHeight: 1.4 }}>
          {div.name}
          {div.contactCount > 0 && (
            <span style={{ fontWeight: 400, color: t.text3, marginLeft: 6, fontSize: 11 }}>
              {div.contactCount} contact{div.contactCount !== 1 ? 's' : ''}
            </span>
          )}
          {div.estimatedOpportunity && (
            <span style={{ fontWeight: 400, color: t.green, marginLeft: 6, fontSize: 11 }}>
              {div.estimatedOpportunity}
            </span>
          )}
        </div>
      )}

      {/* Reasons */}
      {play.reasons.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: t.text2,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(59,130,246,0.04)',
            borderLeft: `2px solid ${t.blue}`,
            lineHeight: 1.5,
          }}
        >
          {play.reasons.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <span style={{ color: t.blue, flexShrink: 0 }}>•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expected outcome */}
      {play.expectedOutcome && (
        <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600, color: t.text2, marginRight: 4 }}>Goal:</span>
          {play.expectedOutcome}
        </div>
      )}

      {/* Step preview pills */}
      {play.stepPreview.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {play.stepPreview.map((label, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: t.text3,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${t.border}`,
              }}
            >
              {i + 1}. {label}
            </span>
          ))}
          {play.stepCount > play.stepPreview.length && (
            <span style={{ fontSize: 10, color: t.text4, padding: '2px 4px' }}>
              +{play.stepCount - play.stepPreview.length} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => onStartPlay(play)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Start This Play
        </button>
        <button
          type="button"
          onClick={() => onDismiss(play)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            color: t.text4,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
