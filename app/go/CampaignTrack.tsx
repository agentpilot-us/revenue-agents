'use client';

import { useEffect, useCallback } from 'react';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('campaign_session_id');
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem('campaign_session_id', sid);
    }
    return sid;
  } catch {
    return '';
  }
}

type Props = { campaignId: string };

export function CampaignTrack({ campaignId }: Props) {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    fetch(`/api/go/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'visit', sessionId: sessionId || undefined }),
    }).catch(() => {});
  }, [campaignId]);

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    fetch(`/api/go/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share', channel: 'copy_link' }),
    }).catch(() => {});
    if (url && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
  }, [campaignId]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
    >
      Copy link
    </button>
  );
}
