'use client';

import { useMemo } from 'react';
import NextStepCard, { type NextStepItem } from './NextStepCard';
import ActionCard, { type ActionCardWorkflow } from './ActionCard';
import RecommendedPlayCard, { type RecommendedPlayItem } from './RecommendedPlayCard';
import CampaignCard, { type CampaignCardData, type CampaignThread } from './CampaignCard';

const t = {
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  border: 'rgba(255,255,255,0.06)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.06)',
  amberBorder: 'rgba(245,158,11,0.2)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.06)',
  purpleBorder: 'rgba(167,139,250,0.2)',
};

function isInProgress(wf: ActionCardWorkflow): boolean {
  if (wf.status === 'in_progress') return true;
  return wf.steps.some(
    (s) => s.status === 'sent' || s.status === 'skipped' || s.status === 'generating' || s.status === 'ready',
  );
}

export type FollowUpStepItem = {
  id: string;
  stepOrder: number;
  stepType: string;
  contentType: string | null;
  channel: string | null;
  promptHint: string | null;
  dueAt: string | null;
  status: string;
  contact: { id: string; firstName: string | null; lastName: string | null; title: string | null } | null;
  division: { id: string; customName: string | null; type: string } | null;
  workflowId: string;
  workflowTitle: string;
  companyId: string;
  companyName: string;
  templateName: string | null;
  signalTitle: string | null;
};

type Props = {
  workflows: ActionCardWorkflow[];
  followUpSteps?: FollowUpStepItem[];
  recommendedPlays?: RecommendedPlayItem[];
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onWorkThis: (companyId: string, workflowId: string) => void;
  onSkipStep?: (stepId: string, workflowId: string) => void;
  onStartRecommendedPlay?: (play: RecommendedPlayItem) => void;
  onDismissRecommendedPlay?: (play: RecommendedPlayItem) => void;
  onCreateAction: () => void;
};

function deriveNextStep(wf: ActionCardWorkflow): NextStepItem | null {
  const nextStep = wf.steps.find(
    (s) => s.status !== 'sent' && s.status !== 'skipped',
  );
  if (!nextStep) return null;

  const completedSteps = wf.steps.filter(
    (s) => s.status === 'sent' || s.status === 'skipped',
  ).length;

  const step = nextStep as ActionCardWorkflow['steps'][number] & {
    channel?: string | null;
    dueAt?: string | null;
    contact?: { id: string; firstName: string | null; lastName: string | null; title: string | null } | null;
  };

  return {
    stepId: step.id,
    stepOrder: wf.steps.indexOf(nextStep) + 1,
    stepType: step.stepType,
    contentType: step.contentType ?? null,
    channel: step.channel ?? null,
    promptHint: step.promptHint ?? null,
    dueAt: step.dueAt ?? null,
    status: step.status,
    contact: step.contact ?? wf.targetContact ?? null,
    division: wf.targetDivision,
    workflowId: wf.id,
    workflowTitle: wf.title,
    companyId: wf.company.id,
    companyName: wf.company.name,
    templateName: wf.template?.name ?? null,
    signalTitle: wf.accountSignal?.title ?? null,
    totalSteps: wf.steps.length,
    completedSteps,
  };
}

function SectionHeader({
  title,
  count,
  countColor,
  countBg,
  countBorder,
  subtitle,
  action,
}: {
  title: string;
  count: number;
  countColor: string;
  countBg: string;
  countBorder: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: subtitle ? 6 : 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text1, margin: 0 }}>
            {title}
          </h2>
          {count > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 10,
                background: countBg,
                border: `1px solid ${countBorder}`,
                color: countColor,
              }}
            >
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: t.text3, margin: '0 0 8px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function ActionQueueList({
  workflows,
  followUpSteps = [],
  recommendedPlays = [],
  onDismiss,
  onSnooze,
  onWorkThis,
  onSkipStep,
  onStartRecommendedPlay,
  onDismissRecommendedPlay,
  onCreateAction,
}: Props) {
  const { continueItems, yourPlays, queued, campaigns } = useMemo(() => {
    const cont: NextStepItem[] = [];
    const plays: ActionCardWorkflow[] = [];
    const q: ActionCardWorkflow[] = [];
    const campMap = new Map<string, CampaignCardData>();

    for (const wf of workflows) {
      const wfAny = wf as ActionCardWorkflow & {
        campaign?: { id: string; name: string; motion: string; status: string; phase: string } | null;
      };
      if (wfAny.campaign) {
        const cid = wfAny.campaign.id;
        if (!campMap.has(cid)) {
          campMap.set(cid, {
            id: cid,
            name: wfAny.campaign.name,
            motion: wfAny.campaign.motion,
            status: wfAny.campaign.status,
            phase: wfAny.campaign.phase,
            companyId: wf.company.id,
            companyName: wf.company.name,
            threads: [],
          });
        }
        const thread: CampaignThread = {
          id: wf.id,
          title: wf.title,
          status: wf.status,
          outcome: (wf as ActionCardWorkflow & { outcome?: string | null }).outcome ?? null,
          targetDivision: wf.targetDivision ?? null,
          targetContact: wf.targetContact ?? null,
          template: wf.template
            ? { id: wf.template.id, name: wf.template.name, triggerType: wf.template.triggerType ?? null }
            : null,
          steps: wf.steps.map((s) => ({
            id: s.id,
            status: s.status,
            channel: (s as typeof s & { channel?: string | null }).channel ?? null,
            dueAt: (s as typeof s & { dueAt?: string | null }).dueAt ?? null,
          })),
        };
        campMap.get(cid)!.threads.push(thread);
        continue;
      }

      if (isInProgress(wf)) {
        const next = deriveNextStep(wf);
        if (next) cont.push(next);
      } else if (!wf.accountSignal) {
        plays.push(wf);
      } else {
        q.push(wf);
      }
    }
    return { continueItems: cont, yourPlays: plays, queued: q, campaigns: Array.from(campMap.values()) };
  }, [workflows]);

  const followUpItems: NextStepItem[] = useMemo(
    () =>
      followUpSteps.map((step) => ({
        stepId: step.id,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        contentType: step.contentType,
        channel: step.channel,
        promptHint: step.promptHint,
        dueAt: step.dueAt,
        status: step.status,
        contact: step.contact,
        division: step.division,
        workflowId: step.workflowId,
        workflowTitle: step.workflowTitle,
        companyId: step.companyId,
        companyName: step.companyName,
        templateName: step.templateName,
        signalTitle: step.signalTitle,
        totalSteps: 0,
        completedSteps: 0,
      })),
    [followUpSteps],
  );

  const hasContent =
    campaigns.length > 0 ||
    continueItems.length > 0 ||
    followUpItems.length > 0 ||
    recommendedPlays.length > 0 ||
    yourPlays.length > 0 ||
    queued.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Campaigns — coordinated multi-persona threads */}
      {campaigns.length > 0 && (
        <div>
          <SectionHeader
            title="Campaigns"
            count={campaigns.length}
            countColor={t.purple}
            countBg={t.purpleBg}
            countBorder={t.purpleBorder}
            subtitle="Coordinated multi-persona plays against an account."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((camp) => (
              <CampaignCard
                key={camp.id}
                campaign={camp}
                onWorkThread={onWorkThis}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Continue — next step in active workflows */}
      <div>
        <SectionHeader
          title="Continue"
          count={continueItems.length}
          countColor={t.blue}
          countBg={t.blueBg}
          countBorder={t.blueBorder}
          subtitle={continueItems.length > 0 ? 'Your next action for each active play.' : undefined}
          action={
            <button
              type="button"
              onClick={onCreateAction}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: t.blueBg,
                border: `1px solid ${t.blueBorder}`,
                color: t.blue,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create Action
            </button>
          }
        />

        {continueItems.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: t.text3,
              fontSize: 13,
              border: `1px dashed ${t.border}`,
              borderRadius: 10,
            }}
          >
            Nothing in progress. Start a play below or respond to a signal above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {continueItems.map((item) => (
              <NextStepCard
                key={item.stepId}
                item={item}
                variant="continue"
                onDoThis={onWorkThis}
                onSkip={onSkipStep}
              />
            ))}
          </div>
        )}
      </div>

      {/* Your Plays — user-created plays, not yet started */}
      {yourPlays.length > 0 && (
        <div>
          <SectionHeader
            title="Your Plays"
            count={yourPlays.length}
            countColor={t.blue}
            countBg={t.blueBg}
            countBorder={t.blueBorder}
            subtitle="Plays you created. Pick one to start working."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {yourPlays.map((wf) => (
              <ActionCard
                key={wf.id}
                workflow={wf}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
                onWorkThis={onWorkThis}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Follow Up — timed steps that are now due */}
      {followUpItems.length > 0 && (
        <div>
          <SectionHeader
            title="Follow Up"
            count={followUpItems.length}
            countColor={t.amber}
            countBg={t.amberBg}
            countBorder={t.amberBorder}
            subtitle="Scheduled follow-ups that are now due. Don't let these go cold."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {followUpItems.map((item) => (
              <NextStepCard
                key={item.stepId}
                item={item}
                variant="followup"
                onDoThis={onWorkThis}
                onSkip={onSkipStep}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Start New — recommended plays */}
      {recommendedPlays.length > 0 && (
        <div>
          <SectionHeader
            title="Start New"
            count={recommendedPlays.length}
            countColor={t.purple}
            countBg={t.purpleBg}
            countBorder={t.purpleBorder}
            subtitle="Plays recommended based on objectives, coverage gaps, and signals."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendedPlays.map((play) => (
              <RecommendedPlayCard
                key={`${play.templateId}-${play.targetDivision?.id ?? 'x'}`}
                play={play}
                onStartPlay={onStartRecommendedPlay ?? (() => {})}
                onDismiss={onDismissRecommendedPlay ?? (() => {})}
              />
            ))}
          </div>
        </div>
      )}

      {/* Queued Actions — auto-created from signals, not yet started */}
      {queued.length > 0 && (
        <div>
          <SectionHeader
            title="Queued"
            count={queued.length}
            countColor={t.green}
            countBg={t.greenBg}
            countBorder={t.greenBorder}
            subtitle="Auto-created from signals. Review and start the ones that matter."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queued.map((wf) => (
              <ActionCard
                key={wf.id}
                workflow={wf}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
                onWorkThis={onWorkThis}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: t.text3,
            fontSize: 13,
          }}
        >
          No pending actions. Signals will generate actions automatically, or create one manually.
        </div>
      )}
    </div>
  );
}
