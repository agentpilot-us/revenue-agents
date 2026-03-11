'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WorkflowStepper, { type Workflow } from '@/app/components/workflow/WorkflowStepper';
import ContactSelector from '@/app/components/workflow/ContactSelector';
import TargetingSuggestion, { type TargetingSuggestionData } from '@/app/components/workflow/TargetingSuggestion';

type Props = {
  companyId: string;
  companyName: string;
  workflowId: string;
};

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.25)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)',
  red: '#ef4444',
};

export default function PlayExecuteClient({ companyId, companyName, workflowId }: Props) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllError, setGenerateAllError] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [contactsAssigned, setContactsAssigned] = useState(false);
  const [suggestion, setSuggestion] = useState<TargetingSuggestionData | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/action-workflows/${workflowId}`);
      if (!res.ok) throw new Error('Failed to load workflow');
      const data = await res.json();
      setWorkflow(data.workflow);
      if (data.suggestedTargeting && !suggestionDismissed) {
        setSuggestion(data.suggestedTargeting);
      }
      const w = data.workflow as Workflow;
      if (w.targetContact) {
        setSelectedContactIds((prev) => prev.length > 0 ? prev : [w.targetContact!.id]);
        setContactsAssigned(true);
      }
      if (w.targetDivision) {
        setSelectedDivisionId((prev) => prev ?? w.targetDivision!.id);
      }
    } catch (err) {
      console.error('Failed to fetch workflow:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, suggestionDismissed]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const handleApplySuggestion = useCallback(
    (contactIds: string[], departmentIds: string[]) => {
      setSelectedContactIds(contactIds);
      setSelectedDivisionId(departmentIds[0] ?? null);
      setSuggestion(null);
      setSuggestionDismissed(true);
    },
    [],
  );

  const handleSkipSuggestion = useCallback(() => {
    setSuggestion(null);
    setSuggestionDismissed(true);
  }, []);

  const handleContactSelectionChange = useCallback(
    (contactIds: string[], divisionId: string | null) => {
      setSelectedContactIds(contactIds);
      setSelectedDivisionId(divisionId);
      if (contactsAssigned) setContactsAssigned(false);
    },
    [contactsAssigned],
  );

  const handleAssignContacts = async () => {
    if (selectedContactIds.length === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(
        `/api/action-workflows/${workflowId}/assign-contacts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactIds: selectedContactIds,
            divisionId: selectedDivisionId,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign');
      }
      const data = await res.json();
      setWorkflow(data.workflow);
      setContactsAssigned(true);
    } catch (err) {
      console.error('Contact assignment failed:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!contactsAssigned && selectedContactIds.length > 0) {
      await handleAssignContacts();
    }
    setGeneratingAll(true);
    setGenerateAllError(null);
    try {
      const res = await fetch(`/api/action-workflows/${workflowId}/generate-all`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }
      await fetchWorkflow();
    } catch (err) {
      setGenerateAllError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              margin: '0 auto 16px',
              border: '3px solid rgba(59,130,246,0.2)',
              borderTopColor: t.blue,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: t.text2, fontSize: 14 }}>Loading workflow...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ color: t.text1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Workflow not found
          </p>
          <Link
            href={`/dashboard/companies/${companyId}`}
            style={{ color: t.blue, fontSize: 13, textDecoration: 'none' }}
          >
            Back to {companyName}
          </Link>
        </div>
      </div>
    );
  }

  const contentSteps = workflow.steps.filter(
    (s) => s.stepType === 'generate_content' && s.contentType !== 'sales_page',
  );
  const salesPageSteps = workflow.steps.filter(
    (s) => s.contentType === 'sales_page',
  );
  const hasPendingContent = contentSteps.some(
    (s) => s.status === 'pending' || s.status === 'failed',
  );
  const allContentReady = contentSteps.length > 0 && contentSteps.every(
    (s) => s.status === 'ready' || s.status === 'sent' || s.status === 'skipped',
  );

  return (
    <div style={{ minHeight: '100vh', background: t.bg }}>
      {/* Nav bar */}
      <div
        style={{
          borderBottom: `1px solid ${t.border}`,
          background: 'rgba(15,23,42,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href={`/dashboard/companies/${companyId}`}
              style={{
                color: t.text3,
                fontSize: 13,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← {companyName}
            </Link>
            <span style={{ color: t.text4, fontSize: 12 }}>|</span>
            <span style={{ color: t.text1, fontSize: 14, fontWeight: 600 }}>
              {workflow.title}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
        {/* AI Targeting Suggestion */}
        {suggestion && suggestion.departments && suggestion.departments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <TargetingSuggestion
              suggestion={suggestion}
              onApply={handleApplySuggestion}
              onSkip={handleSkipSuggestion}
            />
          </div>
        )}

        {/* Contact selection — shown after suggestion is resolved, or when no suggestion */}
        <div style={{ marginBottom: 20, ...(suggestion && suggestion.departments?.length > 0 ? { display: 'none' } : {}) }}>
          <ContactSelector
            companyId={companyId}
            selectedContactIds={selectedContactIds}
            selectedDivisionId={selectedDivisionId}
            onSelectionChange={handleContactSelectionChange}
            disabled={assigning || generatingAll}
          />
          {selectedContactIds.length > 0 && !contactsAssigned && (
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleAssignContacts}
                disabled={assigning}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: assigning
                    ? 'rgba(59,130,246,0.15)'
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: assigning ? 'not-allowed' : 'pointer',
                }}
              >
                {assigning
                  ? 'Assigning...'
                  : `Assign ${selectedContactIds.length} contact${selectedContactIds.length !== 1 ? 's' : ''} to steps`}
              </button>
              <span style={{ fontSize: 11, color: t.text3 }}>
                Contacts will be assigned to all pending outreach steps
              </span>
            </div>
          )}
          {contactsAssigned && selectedContactIds.length > 0 && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 14px',
                borderRadius: 8,
                background: t.greenBg,
                border: `1px solid ${t.greenBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 12, color: t.green, fontWeight: 600 }}>
                {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} assigned
                {selectedDivisionId && workflow?.targetDivision
                  ? ` · ${workflow.targetDivision.customName ?? workflow.targetDivision.type}`
                  : ''}
              </span>
            </div>
          )}
        </div>

        {/* All content ready banner */}
        {allContentReady && (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 20px',
              borderRadius: 12,
              background: t.greenBg,
              border: `1px solid ${t.greenBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>✓</span>
            <p style={{ fontSize: 13, color: t.green, fontWeight: 600, margin: 0 }}>
              All content generated. Review, edit, and send each step below.
            </p>
          </div>
        )}

        {/* Workflow steps — always-visible timeline */}
        <WorkflowStepper
          workflow={workflow}
          onRefresh={fetchWorkflow}
          onStartNextPlay={async (templateId, divisionId) => {
            try {
              const res = await fetch('/api/action-workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, templateId, targetDivisionId: divisionId }),
              });
              if (res.ok) {
                const { workflow: newWf } = await res.json();
                router.push(`/dashboard/companies/${companyId}/plays/execute/${newWf.id}`);
              }
            } catch (err) {
              console.error('Failed to start next play:', err);
            }
          }}
        />

        {/* Bottom CTA: Generate All Content */}
        {hasPendingContent && (
          <div
            style={{
              marginTop: 24,
              padding: 24,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))',
              border: `1px solid ${t.blueBorder}`,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: t.text1, margin: 0 }}>
              Ready to generate?
            </p>
            <p style={{ fontSize: 13, color: t.text3, margin: '6px 0 20px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              Creates personalized, coherent content for all {contentSteps.filter((s) => s.status === 'pending' || s.status === 'failed').length} outreach
              step{contentSteps.filter((s) => s.status === 'pending' || s.status === 'failed').length !== 1 ? 's' : ''} above
              in a single pass. Each step will be tailored to the selected contact{selectedContactIds.length !== 1 ? 's' : ''} and division.
            </p>

            {generateAllError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: t.red,
                  fontSize: 12,
                  display: 'inline-block',
                }}
              >
                {generateAllError}
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={handleGenerateAll}
                disabled={generatingAll}
                style={{
                  padding: '14px 40px',
                  borderRadius: 10,
                  background: generatingAll
                    ? 'rgba(59,130,246,0.15)'
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: generatingAll ? 'not-allowed' : 'pointer',
                  opacity: generatingAll ? 0.7 : 1,
                  boxShadow: generatingAll ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {generatingAll
                  ? 'Generating all content...'
                  : !contactsAssigned && selectedContactIds.length > 0
                    ? 'Assign Contacts & Generate All'
                    : 'Generate All Content'}
              </button>
            </div>
          </div>
        )}

        {/* Separate sales page section */}
        {salesPageSteps.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 12,
                background: t.amberBg,
                border: `1px solid rgba(245,158,11,0.25)`,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: 0 }}>
                Sales Pages
              </p>
              <p style={{ fontSize: 12, color: t.text3, margin: '4px 0 0' }}>
                Sales pages are generated separately. Use the Content tab or click below to create one.
              </p>
            </div>
            {salesPageSteps.map((step) => (
              <div
                key={step.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.text1, margin: 0 }}>
                    Step {step.stepOrder}: {step.promptHint?.split(':')[0] || 'Sales Page'}
                  </p>
                  <p style={{ fontSize: 11, color: t.text3, margin: '2px 0 0' }}>
                    {step.promptHint?.split(':').slice(1).join(':').trim() || 'Create a sales page for this step'}
                  </p>
                </div>
                <Link
                  href={`/dashboard/companies/${companyId}?tab=content&type=sales_page&action=create`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: t.amberBg,
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: t.amber,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  Create Sales Page
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Save as reusable template — shown when all content steps are done */}
        {allContentReady && (
          <div
            style={{
              marginTop: 32,
              padding: '20px 24px',
              borderRadius: 12,
              background: t.greenBg,
              border: `1px solid ${t.greenBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: 0 }}>
                This play worked well?
              </p>
              <p style={{ fontSize: 12, color: t.text3, margin: '4px 0 0' }}>
                Save it as a reusable template in your Play Library so you can run it again for other accounts.
              </p>
            </div>
            {templateSaved ? (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.green,
                  flexShrink: 0,
                  padding: '8px 20px',
                }}
              >
                Saved to Library
              </span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setSavingTemplate(true);
                  try {
                    const res = await fetch('/api/playbooks/templates/from-workflow', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowId }),
                    });
                    if (res.ok) setTemplateSaved(true);
                  } catch { /* retry manually */ }
                  setSavingTemplate(false);
                }}
                disabled={savingTemplate}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  background: savingTemplate
                    ? 'rgba(34,197,94,0.15)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: savingTemplate ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  boxShadow: savingTemplate ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
                }}
              >
                {savingTemplate ? 'Saving...' : 'Save as Play Template'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
