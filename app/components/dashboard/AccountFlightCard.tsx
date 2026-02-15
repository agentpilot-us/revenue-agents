'use client';

import Link from 'next/link';
import type { FlightStage } from '@/lib/gamification/flight-stage';

type AccountFlightCardProps = {
  companyId: string;
  companyName: string;
  stage: FlightStage;
  progress: number;
  summary: string;
};

const STAGE_COLORS: Record<FlightStage, string> = {
  Runway: 'bg-slate-500',
  Taxiing: 'bg-sky-500',
  Takeoff: 'bg-sky-400',
  Cruising: 'bg-emerald-500',
  Approach: 'bg-amber-500',
  Landing: 'bg-purple-500',
};

export function AccountFlightCard({
  companyId,
  companyName,
  stage,
  progress,
  summary,
}: AccountFlightCardProps) {
  const barColor = STAGE_COLORS[stage];

  return (
    <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/companies/${companyId}`}
            className="font-semibold text-slate-100 hover:text-amber-400 transition-colors"
          >
            {companyName}
          </Link>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">
            {stage}
          </p>
          <p className="text-slate-500 text-sm mt-1">{summary}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
