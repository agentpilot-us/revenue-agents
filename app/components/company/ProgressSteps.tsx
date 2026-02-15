'use client';

import Link from 'next/link';
import { CheckCircle2, Building2 } from 'lucide-react';

type Props = {
  companyId: string;
  companyName: string;
  currentStep: 1 | 2;
};

const steps = [
  {
    id: 1 as const,
    label: 'Account Intelligence',
    path: (id: string) => `/dashboard/companies/${id}/intelligence`,
    description: 'Research account and identify departments',
  },
  {
    id: 2 as const,
    label: 'AI Powered Custom Sales Pages + Chat',
    path: (id: string) => `/dashboard/companies/${id}?tab=campaigns`,
    description: 'Create landing page with chat, launch to get URL',
  },
];

export function ProgressSteps({ companyId, companyName, currentStep }: Props) {
  return (
    <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-6 mb-8 shadow-sm">
      <div className="flex items-center gap-2 mb-6 text-slate-400 text-sm">
        <Building2 className="h-4 w-4 shrink-0" />
        <span>{companyName}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = currentStep >= step.id;
          const href = step.path(companyId);

          const content = (
            <>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-slate-300'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white">{step.label}</div>
                <div className="text-xs text-slate-400 truncate">{step.description}</div>
              </div>
            </>
          );

          return (
            <div key={step.id} className="flex items-center gap-3 sm:flex-1">
              {isClickable ? (
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-colors w-full sm:w-auto ${
                    isActive
                      ? 'ring-2 ring-blue-500 bg-blue-500/10'
                      : 'hover:bg-slate-700/50'
                  } ${isCompleted ? 'opacity-90' : ''}`}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={`flex items-center gap-3 rounded-lg p-3 w-full sm:w-auto opacity-70 ${
                    isActive ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
                  }`}
                >
                  {content}
                </div>
              )}
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-8 h-0.5 shrink-0 mx-1 ${
                    isCompleted ? 'bg-green-600' : 'bg-slate-600'
                  }`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
