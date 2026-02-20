'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

type SignalTier = 1 | 2 | 3;

interface Signal {
  tier: SignalTier;
  date: string;
  headline: string;
  description: string;
  cta: { label: string; action: string };
  metadata: { contactId?: string; departmentId?: string; campaignId?: string };
}

interface SignalDigestProps {
  companyId: string;
  companyName: string;
  days?: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function groupSignalsByDay(signals: Signal[]): Record<string, Signal[]> {
  const grouped: Record<string, Signal[]> = {};
  
  signals.forEach(signal => {
    const date = new Date(signal.date);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }
    grouped[dayKey].push(signal);
  });
  
  return grouped;
}

function tierLabel(tier: SignalTier): string {
  if (tier === 1) return 'High-impact';
  if (tier === 2) return 'Strategic';
  return 'FYI';
}

function tierColor(tier: SignalTier): string {
  if (tier === 1) return 'bg-red-50 text-red-700 border-red-200';
  if (tier === 2) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function handleCTAAction(action: string, companyId: string) {
  const [type, id] = action.split(':');
  
  switch (type) {
    case 'contact':
      window.location.href = `/dashboard/companies/${companyId}/contacts/${id}`;
      break;
    case 'campaign':
      window.location.href = `/dashboard/companies/${companyId}?tab=campaigns`;
      break;
    case 'content':
      window.location.href = `/dashboard/content-library/${id}/changes`;
      break;
    case 'research':
      window.location.href = `/dashboard/companies/${companyId}?tab=overview`;
      break;
    case 'activity':
      window.location.href = `/dashboard/companies/${companyId}?tab=activity`;
      break;
    default:
      console.warn('Unknown CTA action:', action);
  }
}

export function SignalDigest({ companyId, companyName, days = 7 }: SignalDigestProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTier3, setShowTier3] = useState(false);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch(`/api/companies/${companyId}/signals?days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setSignals(data.signals || []);
        }
      } catch (error) {
        console.error('Failed to fetch signals:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, [companyId, days]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading signals...</div>;
  }

  const tier1Signals = signals.filter(s => s.tier === 1);
  const tier2Signals = signals.filter(s => s.tier === 2);
  const tier3Signals = signals.filter(s => s.tier === 3);

  const groupedByDay = groupSignalsByDay(signals);
  const dayKeys = Object.keys(groupedByDay).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          This {days === 7 ? 'week' : `${days} days`} at {companyName}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Key signals and activity updates
        </p>
      </div>

      {/* Tier 1: High-impact signals */}
      {tier1Signals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            High-impact buying signals
          </h3>
          {tier1Signals.slice(0, 3).map((signal, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 ${tierColor(signal.tier)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase">
                      {tierLabel(signal.tier)}
                    </span>
                    <span className="text-xs opacity-75">
                      {formatDate(signal.date)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{signal.headline}</h4>
                  <p className="text-sm opacity-90">{signal.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCTAAction(signal.cta.action, companyId)}
                  className="shrink-0"
                >
                  {signal.cta.label}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier 2: Strategic changes */}
      {tier2Signals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Strategic company changes
          </h3>
          {tier2Signals.slice(0, 3).map((signal, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 ${tierColor(signal.tier)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase">
                      {tierLabel(signal.tier)}
                    </span>
                    <span className="text-xs opacity-75">
                      {formatDate(signal.date)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{signal.headline}</h4>
                  <p className="text-sm opacity-90">{signal.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCTAAction(signal.cta.action, companyId)}
                  className="shrink-0"
                >
                  {signal.cta.label}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier 3: FYI (collapsible) */}
      {tier3Signals.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowTier3(!showTier3)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showTier3 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>View all signals ({tier3Signals.length} FYI)</span>
          </button>
          
          {showTier3 && (
            <div className="space-y-2">
              {tier3Signals.map((signal, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${tierColor(signal.tier)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs opacity-75">
                          {formatDate(signal.date)}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mb-0.5">{signal.headline}</h4>
                      <p className="text-xs opacity-75">{signal.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCTAAction(signal.cta.action, companyId)}
                      className="shrink-0 text-xs"
                    >
                      {signal.cta.label}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {signals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No signals detected in the last {days} days.</p>
        </div>
      )}
    </div>
  );
}
