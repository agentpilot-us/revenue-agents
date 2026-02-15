'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  playId: string;
  companyId: string;
  companyName: string;
  currentStep: number;
  healthCheckData: Record<string, unknown> | null;
  roiReport: Record<string, unknown> | null;
};

export function RenewalAuditExecution({
  companyId,
  companyName,
  currentStep,
  healthCheckData,
  roiReport,
}: Props) {
  const [healthLoading, setHealthLoading] = useState(false);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      // Placeholder: in full implementation call API to compute health score
      await new Promise((r) => setTimeout(r, 800));
      window.location.reload();
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Step 1: Health Check */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Step 1: Health Check (AI Analysis)</h3>
          {healthCheckData ? <span className="text-xs font-medium text-green-600">✓ Complete</span> : <span className="text-xs text-gray-500">⏱️ Auto</span>}
        </div>
        {healthCheckData ? (
          <div className="text-sm text-gray-700 space-y-2 rounded bg-white p-3 border">
            <p><strong>Account Health Score:</strong> {(healthCheckData as { score?: number }).score ?? 72}/100</p>
            <p>✅ Product usage: Active</p>
            <p>⚠️ Engagement: Last exec touch (check activity)</p>
            <p>✅ NPS: 7 (neutral)</p>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={healthLoading}
              className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-gray-900 rounded hover:bg-amber-600 disabled:opacity-50"
            >
              {healthLoading ? 'Running…' : 'Run health check'}
            </button>
            <p className="text-xs text-gray-500 mt-2">AI will analyze usage, engagement, support tickets, NPS, competitor signals.</p>
          </div>
        )}
      </section>

      {/* Step 2: ROI Report */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Step 2: Generate ROI Report (AI)</h3>
          {roiReport ? <span className="text-xs font-medium text-green-600">✓ Complete</span> : <span className="text-xs text-amber-600">Review</span>}
        </div>
        {roiReport ? (
          <div className="text-sm rounded bg-white p-3 border">
            <p className="font-medium">📊 {companyName} Partnership Value Report</p>
            <p className="text-gray-600 mt-1">Investment, value delivered, ROI. [Edit Report] [Generate PDF] [Send to Champion]</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Generate ROI report after health check. [Edit Report] [Generate PDF] [Send to Champion]</p>
        )}
      </section>

      {/* Step 3: Champion Check-in */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Step 3: Champion Check-in</h3>
        <p className="text-sm text-gray-600">Send ROI report to champion with renewal framing. Goal: validate value story, identify concerns early.</p>
        <div className="flex gap-2 mt-2">
          <Link href={`/chat?play=expansion&accountId=${companyId}`} className="text-sm px-3 py-1.5 bg-amber-500 text-gray-900 rounded hover:bg-amber-600">Draft email</Link>
          <button type="button" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">Schedule call</button>
        </div>
      </section>

      {/* Step 4: Address Competitor Signal */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Step 4: Address Competitor Signal</h3>
        <p className="text-sm text-gray-600">If competitor mention detected: send battlecard (e.g. your company vs competitor). Talking points from Content Library.</p>
        <div className="flex gap-2 mt-2">
          <Link href="/dashboard/content-library" className="text-sm text-blue-600 hover:underline">View battlecard</Link>
          <Link href={`/chat?play=expansion&accountId=${companyId}`} className="text-sm text-blue-600 hover:underline">Draft competitive response</Link>
        </div>
      </section>

      {/* Step 5: Exec Alignment */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Step 5: Exec Alignment (if needed)</h3>
        <p className="text-sm text-gray-600">Condition: health score &lt; 70 OR competitor signal. Action: escalate to exec-to-exec meeting.</p>
        <div className="flex gap-2 mt-2">
          <button type="button" className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100">Request exec support</button>
          <button type="button" className="text-sm text-gray-500 hover:underline">Continue standard path</button>
        </div>
      </section>
    </div>
  );
}
