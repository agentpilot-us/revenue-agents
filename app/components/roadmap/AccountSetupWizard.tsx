'use client';

import { useState } from 'react';
import { CompanyBasicsStep } from './wizard/CompanyBasicsStep';
import { ExistingProductsStep } from './wizard/ExistingProductsStep';
import { DealShapeStep } from './wizard/DealShapeStep';
import { ObjectionsStep } from './wizard/ObjectionsStep';
import { SignalRulesStep } from './wizard/SignalRulesStep';
import { PlaySelectionStep } from './wizard/PlaySelectionStep';
import { ReviewStep } from './wizard/ReviewStep';

const STEPS = [
  { key: 'basics', label: 'Company Basics' },
  { key: 'products', label: 'Existing Products' },
  { key: 'deal', label: 'Deal Shape' },
  { key: 'objections', label: 'Objections' },
  { key: 'signals', label: 'Signal Rules' },
  { key: 'plays', label: 'Play Selection' },
  { key: 'review', label: 'Review' },
] as const;

type Props = {
  companyId: string;
  roadmapId: string | null;
  onClose: () => void;
};

export function AccountSetupWizard({ companyId, roadmapId, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-border bg-background shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Account Setup</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Step {currentStep + 1} of {STEPS.length}: {step.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                i === currentStep
                  ? 'bg-blue-600 text-white'
                  : i < currentStep
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-card/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {i < currentStep ? '✓ ' : ''}{s.label}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step.key === 'basics' && (
            <CompanyBasicsStep companyId={companyId} onComplete={goNext} />
          )}
          {step.key === 'products' && (
            <ExistingProductsStep companyId={companyId} onComplete={goNext} />
          )}
          {step.key === 'deal' && (
            <DealShapeStep companyId={companyId} roadmapId={roadmapId} onComplete={goNext} />
          )}
          {step.key === 'objections' && (
            <ObjectionsStep companyId={companyId} onComplete={goNext} />
          )}
          {step.key === 'signals' && roadmapId && (
            <SignalRulesStep roadmapId={roadmapId} onComplete={goNext} />
          )}
          {step.key === 'signals' && !roadmapId && (
            <div className="text-xs text-muted-foreground">
              <p>Signal rules require a Strategic Account Plan. Complete the Deal Shape step first to create one.</p>
              <button type="button" onClick={goNext} className="text-xs font-medium text-blue-400 hover:text-blue-300 mt-3">
                Skip
              </button>
            </div>
          )}
          {step.key === 'plays' && roadmapId && (
            <PlaySelectionStep roadmapId={roadmapId} onComplete={goNext} />
          )}
          {step.key === 'plays' && !roadmapId && (
            <div className="text-xs text-muted-foreground">
              <p>Play selection requires a Strategic Account Plan. Complete the Deal Shape step first.</p>
              <button type="button" onClick={goNext} className="text-xs font-medium text-blue-400 hover:text-blue-300 mt-3">
                Skip
              </button>
            </div>
          )}
          {step.key === 'review' && (
            <ReviewStep companyId={companyId} roadmapId={roadmapId} onComplete={onClose} />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 disabled:opacity-30 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
