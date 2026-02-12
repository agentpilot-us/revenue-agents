'use client';

import Link from 'next/link';

type Props = {
  expansionPlayId: string;
  companyId: string;
  departmentId: string;
  companyName: string;
  departmentName: string;
  productName: string;
  currentStep: number;
  status: string;
  nextActionSummary: string | null;
  lastActionSummary: string | null;
};

const STEPS = [
  { n: 1, title: 'Department Research (AI)', tag: 'Complete', desc: 'Key stakeholders, team size, tools, pain signals, fit score.' },
  { n: 2, title: 'Internal Champion Leverage', tag: 'Next', desc: 'Ask existing champion for intro to department stakeholder.' },
  { n: 3, title: 'Stakeholder Outreach', tag: 'Pending', desc: 'Warm intro or cold outreach; AI-drafted email.' },
  { n: 4, title: 'Case Study + Demo Offer', tag: 'Day 7', desc: 'If opened but no reply: send case study, offer 15-min demo.' },
  { n: 5, title: 'Joint Meeting (CSM + AE)', tag: 'Day 14', desc: 'If interest confirmed: schedule joint call.' },
];

export function CrossSellPlayExecution({
  companyId,
  departmentId,
  companyName,
  departmentName,
  productName,
  currentStep,
  status,
  nextActionSummary,
  lastActionSummary,
}: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
        <div className="font-medium mb-1">Current stage: {status.replace(/_/g, ' ')}</div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(currentStep / 5) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">Research → Outreach → Engaged → Opportunity → Active</p>
      </div>

      {lastActionSummary && (
        <p className="text-sm text-gray-600">Last: {lastActionSummary}</p>
      )}
      {nextActionSummary && (
        <p className="text-sm text-gray-700 font-medium">Next: {nextActionSummary}</p>
      )}

      {STEPS.map((step) => {
        const done = currentStep > step.n;
        const active = currentStep === step.n;
        return (
          <section
            key={step.n}
            className={`rounded-lg border p-4 ${active ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Step {step.n}: {step.title}</h3>
              {done && <span className="text-xs font-medium text-green-600">✓ Complete</span>}
              {active && <span className="text-xs text-amber-600">⏱️ {step.tag}</span>}
              {!done && !active && <span className="text-xs text-gray-500">Pending</span>}
            </div>
            <p className="text-sm text-gray-600 mb-3">{step.desc}</p>
            {step.n === 1 && (
              <p className="text-sm text-gray-500">Fit and research are available from the department and product fit.</p>
            )}
            {step.n === 2 && active && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  href={`/chat?play=expansion&accountId=${companyId}`}
                  className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Draft intro request in chat
                </Link>
                <span className="text-sm text-gray-500">Ask champion for intro to {departmentName} stakeholder</span>
              </div>
            )}
            {step.n === 3 && active && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  href={`/chat?play=expansion&accountId=${companyId}`}
                  className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Draft follow-up / outreach
                </Link>
                <Link
                  href={`/dashboard/companies/${companyId}/departments/${departmentId}`}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
                >
                  View department contacts
                </Link>
              </div>
            )}
            {step.n === 4 && (active || done) && (
              <p className="text-sm text-gray-500">Send case study (from Content Library) and offer demo when appropriate.</p>
            )}
            {step.n === 5 && (active || done) && (
              <Link
                href={`/chat?play=expansion&accountId=${companyId}`}
                className="text-sm text-green-600 hover:underline"
              >
                Create calendar invite / prep meeting brief via chat
              </Link>
            )}
          </section>
        );
      })}

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Link
          href={`/dashboard/companies/${companyId}/departments/${departmentId}`}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
        >
          View department
        </Link>
        <Link
          href={`/chat?play=expansion&accountId=${companyId}`}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100"
        >
          Draft follow-up
        </Link>
      </div>
    </div>
  );
}
