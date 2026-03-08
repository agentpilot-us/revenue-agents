'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ActionQueueList from './ActionQueueList';
import WeeklyStatsBar from './WeeklyStatsBar';
import HotSignalsFeed from './HotSignalsFeed';
import CreateActionModal from './CreateActionModal';
import CreateCampaignModal from './CreateCampaignModal';
import NeedsAttentionCard from './NeedsAttentionCard';
import type { ActionCardWorkflow } from './ActionCard';
import type { RecommendedPlayItem } from './RecommendedPlayCard';
import type { FollowUpStepItem } from './ActionQueueList';
import type { HotSignalItem, CompanyTriggerItem } from './HotSignalCard';
import type { MomentumWeekComparison } from '@/lib/dashboard/momentum';

const t = {
  text1: '#e2e8f0',
  text3: '#64748b',
};

type AccountForCampaign = {
  id: string;
  name: string;
  departments: Array<{ id: string; name: string; type: string; contactCount: number }>;
};

type MyDayData = {
  workflows: ActionCardWorkflow[];
  momentum: MomentumWeekComparison;
  hotSignals: HotSignalItem[];
  companyTriggers: CompanyTriggerItem[];
  accountHealth?: Array<{
    id: string;
    name: string;
    departments?: Array<{ id: string; type: string; customName: string | null; contactCount: number }>;
  }>;
  recommendedPlays?: RecommendedPlayItem[];
  followUpSteps?: FollowUpStepItem[];
};

export default function MyDayDashboard() {
  const router = useRouter();
  const [data, setData] = useState<MyDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [dismissedTriggerIds, setDismissedTriggerIds] = useState<Set<string>>(new Set());
  const [dismissedRecIds, setDismissedRecIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/my-day');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch My Day data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch('/api/dashboard/trigger-dismiss')
      .then((r) => (r.ok ? r.json() : { dismissed: [] }))
      .then((d) => {
        if (d.dismissed?.length) {
          setDismissedTriggerIds(new Set(d.dismissed));
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = async (id: string) => {
    await fetch(`/api/action-workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    fetchData();
  };

  const handleSnooze = async (id: string) => {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + 1);
    await fetch(`/api/action-workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'snoozed', snoozeUntil: snoozeUntil.toISOString() }),
    });
    fetchData();
  };

  const handleWorkThis = (companyId: string, workflowId: string) => {
    router.push(`/dashboard/companies/${companyId}/plays/execute/${workflowId}`);
  };

  const handleSkipStep = useCallback(
    async (stepId: string, workflowId: string) => {
      try {
        await fetch(`/api/action-workflows/${workflowId}/steps/${stepId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'skipped' }),
        });
        fetchData();
      } catch (err) {
        console.error('Failed to skip step:', err);
      }
    },
    [fetchData],
  );

  const handleDismissTrigger = async (triggerId: string) => {
    setDismissedTriggerIds((prev) => new Set(prev).add(triggerId));
    try {
      await fetch('/api/dashboard/trigger-dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerId }),
      });
    } catch (err) {
      console.error('Failed to persist trigger dismissal:', err);
    }
  };

  const handleStartRecommendedPlay = useCallback(
    async (play: RecommendedPlayItem) => {
      try {
        const res = await fetch('/api/action-workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: play.companyId,
            templateId: play.templateId,
            targetDivisionId: play.targetDivision?.id,
          }),
        });
        if (res.ok) {
          const { workflow } = await res.json();
          router.push(
            `/dashboard/companies/${play.companyId}/plays/execute/${workflow.id}`,
          );
        }
      } catch (err) {
        console.error('Failed to start recommended play:', err);
      }
    },
    [router],
  );

  const handleDismissRecommendedPlay = useCallback((play: RecommendedPlayItem) => {
    const key = `${play.templateId}-${play.targetDivision?.id ?? ''}`;
    setDismissedRecIds((prev) => new Set(prev).add(key));
  }, []);

  const campaignCompanies: AccountForCampaign[] = (data?.accountHealth ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    departments: (a.departments ?? []).map((d) => ({
      id: d.id,
      name: d.customName ?? d.type.replace(/_/g, ' '),
      type: d.type,
      contactCount: d.contactCount,
    })),
  }));

  const visibleRecommended = (data?.recommendedPlays ?? []).filter((p) => {
    const key = `${p.templateId}-${p.targetDivision?.id ?? ''}`;
    return !dismissedRecIds.has(key);
  });

  if (loading) {
    return (
      <div style={{ padding: 40, color: t.text3, fontSize: 14 }}>
        Loading your day...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, color: t.text3, fontSize: 14 }}>
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text1, margin: 0 }}>
          My Day
        </h1>
        <button
          type="button"
          onClick={() => setCampaignModalOpen(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.25)',
            color: '#a78bfa',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Start Campaign
        </button>
      </div>

      {/* Section 1: Weekly Stats */}
      <div style={{ marginBottom: 20 }}>
        <WeeklyStatsBar momentum={data.momentum} />
      </div>

      {/* Section 2: Hot Signals + Company Triggers */}
      <div style={{ marginBottom: 24 }}>
        <HotSignalsFeed
          hotSignals={data.hotSignals}
          companyTriggers={data.companyTriggers}
          dismissedTriggerIds={dismissedTriggerIds}
          onRefresh={fetchData}
          onDismissTrigger={handleDismissTrigger}
        />
      </div>

      {/* Section 3: Needs Attention */}
      <div style={{ marginBottom: 24 }}>
        <NeedsAttentionCard />
      </div>

      {/* Section 4: Action Queue + Recommended Plays */}
      <ActionQueueList
        workflows={data.workflows}
        followUpSteps={data.followUpSteps ?? []}
        recommendedPlays={visibleRecommended}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
        onWorkThis={handleWorkThis}
        onSkipStep={handleSkipStep}
        onStartRecommendedPlay={handleStartRecommendedPlay}
        onDismissRecommendedPlay={handleDismissRecommendedPlay}
        onCreateAction={() => setModalOpen(true)}
      />

      <CreateActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchData}
      />

      {campaignModalOpen && (
        <CreateCampaignModal
          companies={campaignCompanies}
          onClose={() => setCampaignModalOpen(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
