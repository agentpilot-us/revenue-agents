'use client';

import Link from 'next/link';

type AccountCardProps = {
  companyId: string;
  companyName: string;
  industry: string | null;
  hasResearch: boolean;
  contactCount: number;
  hasCampaigns: boolean;
  hasEngagement: boolean;
  lastActivity?: Date | string | null;
};

export function AccountCard({
  companyId,
  companyName,
  industry,
  hasResearch,
  contactCount,
  hasCampaigns,
  hasEngagement,
  lastActivity,
}: AccountCardProps) {
  const formatLastActivity = (date: Date | string | null | undefined): string => {
    if (!date) return 'No activity';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

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
          {industry && (
            <p className="text-slate-400 text-xs mt-1">{industry}</p>
          )}
          
          {/* Coverage status */}
          <div className="flex flex-wrap gap-2 mt-3">
            {hasResearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <span>✓</span>
                <span>Research</span>
              </span>
            )}
            {contactCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span>✓</span>
                <span>{contactCount} contact{contactCount !== 1 ? 's' : ''}</span>
              </span>
            )}
            {hasCampaigns && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <span>✓</span>
                <span>Page live</span>
              </span>
            )}
            {hasEngagement && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <span>✓</span>
                <span>Engaged</span>
              </span>
            )}
          </div>
          
          {lastActivity && (
            <p className="text-slate-500 text-xs mt-2">
              Last activity: {formatLastActivity(lastActivity)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
