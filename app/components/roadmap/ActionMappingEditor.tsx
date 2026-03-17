'use client';

import { useState, useEffect, useCallback } from 'react';

type TemplateOption = {
  id: string;
  name: string;
  triggerType: string | null;
};

type ActionMapping = {
  id: string;
  signalCategory: string | null;
  actionType: string;
  autonomyLevel: string;
  promptHint: string | null;
  signalRuleId: string | null;
  signalRule: { id: string; name: string; category: string } | null;
  templateId: string | null;
  template: { id: string; name: string; triggerType: string | null } | null;
  createdAt: string;
};

type Props = {
  roadmapId: string;
};

const SIGNAL_CATEGORIES = [
  // Leadership & Organization
  { value: 'new_csuite_executive', label: 'New C-Suite Executive', group: 'Leadership & Organization' },
  { value: 'new_vp_hire', label: 'New VP-Level Hire', group: 'Leadership & Organization' },
  { value: 'multiple_dept_heads_hired', label: 'Multiple Department Heads Hired', group: 'Leadership & Organization' },
  { value: 'executive_departure', label: 'Executive Departure', group: 'Leadership & Organization' },
  { value: 'founder_stepping_down', label: 'Founder Stepping Down', group: 'Leadership & Organization' },
  { value: 'layoffs_headcount_reduction', label: 'Layoffs/Headcount Reduction', group: 'Leadership & Organization' },
  { value: 'rapid_hiring_surge', label: 'Rapid Hiring Surge', group: 'Leadership & Organization' },
  { value: 'engineering_team_expansion', label: 'Engineering Team Expansion', group: 'Leadership & Organization' },
  { value: 'sales_team_expansion', label: 'Sales Team Expansion', group: 'Leadership & Organization' },
  { value: 'geographic_expansion', label: 'Geographic Expansion', group: 'Leadership & Organization' },
  { value: 'job_posting_your_category', label: 'Job Posting for Your Category', group: 'Leadership & Organization' },
  // Financial & Funding
  { value: 'series_a_seed', label: 'Series A/Seed Funding', group: 'Financial & Funding' },
  { value: 'series_b', label: 'Series B Funding', group: 'Financial & Funding' },
  { value: 'series_c_late_stage', label: 'Series C+ / Late-Stage Funding', group: 'Financial & Funding' },
  { value: 'earnings_beat', label: 'Quarterly Earnings Beat', group: 'Financial & Funding' },
  { value: 'earnings_miss', label: 'Quarterly Earnings Miss', group: 'Financial & Funding' },
  { value: 'raised_guidance', label: 'Raised Guidance/Forecast', group: 'Financial & Funding' },
  { value: 'ipo_announcement', label: 'IPO Announcement/S-1 Filing', group: 'Financial & Funding' },
  { value: 'post_ipo_first_quarter', label: 'Post-IPO (First Quarter)', group: 'Financial & Funding' },
  // M&A & Partnerships
  { value: 'acquisition_they_acquired', label: 'Acquisition (They Acquired)', group: 'M&A & Partnerships' },
  { value: 'acquisition_they_were_acquired', label: 'Acquisition (They Were Acquired)', group: 'M&A & Partnerships' },
  { value: 'merger_announcement', label: 'Merger Announcement', group: 'M&A & Partnerships' },
  { value: 'divestiture_spinoff', label: 'Divestiture/Spin-off', group: 'M&A & Partnerships' },
  { value: 'strategic_partnership', label: 'Strategic Partnership Announcement', group: 'M&A & Partnerships' },
  { value: 'technology_partnership', label: 'Technology Partnership/Integration', group: 'M&A & Partnerships' },
  // Technology & Product
  { value: 'new_technology_adoption', label: 'New Technology Adoption', group: 'Technology & Product' },
  { value: 'platform_migration', label: 'Platform Migration', group: 'Technology & Product' },
  { value: 'legacy_system_sunset', label: 'Legacy System Sunset', group: 'Technology & Product' },
  { value: 'product_launch_announcement', label: 'Product Launch Announcement', group: 'Technology & Product' },
  { value: 'security_breach', label: 'Security Breach/Incident', group: 'Technology & Product' },
  { value: 'compliance_certification', label: 'Compliance Certification Pursued', group: 'Technology & Product' },
  { value: 'tech_stack_changes', label: 'Tech Stack Changes Detected', group: 'Technology & Product' },
  // Market & Competitive
  { value: 'analyst_recognition', label: 'Analyst Recognition', group: 'Market & Competitive' },
  { value: 'regulatory_change', label: 'Regulatory Changes', group: 'Market & Competitive' },
  { value: 'competitor_displacement', label: 'Competitor Displacement', group: 'Market & Competitive' },
  { value: 'contract_renewal_window', label: 'Contract Renewal Window', group: 'Market & Competitive' },
  { value: 'public_vendor_complaints', label: 'Public Vendor Complaints', group: 'Market & Competitive' },
  { value: 'competitor_acquisition', label: 'Competitor Acquisition', group: 'Market & Competitive' },
  // Digital & Intent Signals
  { value: 'pricing_page_visits', label: 'Pricing Page Visits', group: 'Digital & Intent Signals' },
  { value: 'demo_request_trial', label: 'Demo Request/Trial Signup', group: 'Digital & Intent Signals' },
  { value: 'case_study_downloads', label: 'Case Study Downloads', group: 'Digital & Intent Signals' },
  { value: 'content_consumption_spike', label: 'Content Consumption Spike', group: 'Digital & Intent Signals' },
  { value: 'competitor_comparison_views', label: 'Competitor Comparison Views', group: 'Digital & Intent Signals' },
  { value: 'review_site_research', label: 'Review Site Research', group: 'Digital & Intent Signals' },
  { value: 'event_webinar_registration', label: 'Event/Webinar Registration', group: 'Digital & Intent Signals' },
  { value: 'social_media_complaint', label: 'Social Media Complaint', group: 'Digital & Intent Signals' },
  // Customer Expansion Signals
  { value: 'usage_spike_seat_growth', label: 'Usage Spike/Seat Growth', group: 'Customer Expansion' },
  { value: 'premium_feature_request', label: 'Premium Feature Request', group: 'Customer Expansion' },
  { value: 'new_department_interest', label: 'New Department Interest', group: 'Customer Expansion' },
  { value: 'customer_raised_funding', label: 'Customer Raised Funding', group: 'Customer Expansion' },
  { value: 'customer_ma_activity', label: 'Customer M&A Activity', group: 'Customer Expansion' },
  { value: 'contract_renewal_approaching', label: 'Contract Renewal Approaching', group: 'Customer Expansion' },
  { value: 'champion_promoted', label: 'Champion Promoted', group: 'Customer Expansion' },
  { value: 'low_nps_negative_feedback', label: 'Low NPS/Negative Feedback', group: 'Customer Expansion' },
  { value: 'customer_case_study_participation', label: 'Customer Case Study Participation', group: 'Customer Expansion' },
  // Legacy types for backward compatibility
  { value: 'executive_hire', label: 'Executive Hire (Legacy)', group: 'Legacy' },
  { value: 'earnings_call', label: 'Earnings Call (Legacy)', group: 'Legacy' },
  { value: 'product_announcement', label: 'Product Announcement (Legacy)', group: 'Legacy' },
  { value: 'funding_round', label: 'Funding Round (Legacy)', group: 'Legacy' },
  { value: 'acquisition', label: 'Acquisition (Legacy)', group: 'Legacy' },
  { value: 'industry_news', label: 'Industry News (Legacy)', group: 'Legacy' },
  { value: 'job_posting_signal', label: 'Job Posting Signal (Legacy)', group: 'Legacy' },
  { value: 'renewal_approaching', label: 'Renewal Approaching (Legacy)', group: 'Legacy' },
] as const;

const AUTONOMY_LEVELS = [
  { value: 'notify_only', label: 'Notify Only', color: 'text-blue-400' },
  { value: 'draft_review', label: 'Draft & Review', color: 'text-amber-400' },
  { value: 'auto_execute', label: 'Auto Execute', color: 'text-emerald-400' },
] as const;

export function ActionMappingEditor({ roadmapId }: Props) {
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCategory, setFormCategory] = useState('new_csuite_executive');
  const [formActionType, setFormActionType] = useState('');
  const [formAutonomy, setFormAutonomy] = useState('draft_review');
  const [formTemplateId, setFormTemplateId] = useState('');

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/roadmap/action-mappings?roadmapId=${roadmapId}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    fetchMappings();
    fetch('/api/playbooks/templates')
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || data || []);
      })
      .catch(() => {});
  }, [fetchMappings]);

  const resetForm = () => {
    setFormCategory('new_csuite_executive');
    setFormActionType('');
    setFormAutonomy('draft_review');
    setFormTemplateId('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formTemplateId && !formActionType.trim()) return;
    setSaving(true);
    const effectiveActionType = formActionType.trim()
      || templates.find((tt) => tt.id === formTemplateId)?.name
      || 'play_rule';
    try {
      if (editingId) {
        await fetch(`/api/roadmap/action-mappings/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signalCategory: formCategory,
            actionType: effectiveActionType,
            autonomyLevel: formAutonomy,
            templateId: formTemplateId || null,
          }),
        });
      } else {
        await fetch('/api/roadmap/action-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roadmapId,
            signalCategory: formCategory,
            actionType: effectiveActionType,
            autonomyLevel: formAutonomy,
            templateId: formTemplateId || null,
          }),
        });
      }
      resetForm();
      await fetchMappings();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: ActionMapping) => {
    setEditingId(m.id);
    setFormCategory(m.signalCategory ?? 'earnings_call');
    setFormActionType(m.actionType);
    setFormAutonomy(m.autonomyLevel);
    setFormTemplateId(m.templateId ?? '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/roadmap/action-mappings/${id}`, { method: 'DELETE' });
    await fetchMappings();
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= mappings.length) return;
    const a = mappings[index];
    const b = mappings[swapIdx];
    const newMappings = [...mappings];
    newMappings[index] = b;
    newMappings[swapIdx] = a;
    setMappings(newMappings);
    await Promise.all([
      fetch(`/api/roadmap/action-mappings/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityWeight: swapIdx }),
      }),
      fetch(`/api/roadmap/action-mappings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityWeight: index }),
      }),
    ]);
  };

  const autonomyLabel = (level: string) =>
    AUTONOMY_LEVELS.find((a) => a.value === level);

  const categoryLabel = (cat: string) =>
    SIGNAL_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading action mappings...</p>;
  }

  return (
    <div className="space-y-3">
      {mappings.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">No action mappings defined yet.</p>
      )}

      {mappings.map((m, idx) => {
        const al = autonomyLabel(m.autonomyLevel);
        return (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
          >
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleReorder(idx, 'up')}
                  disabled={idx === 0}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(idx, 'down')}
                  disabled={idx === mappings.length - 1}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground w-4 text-center">{idx + 1}</span>
            </div>
            <div className="min-w-0 space-y-0.5 flex-1 ml-2">
              <div className="text-xs font-medium">
                {m.template ? m.template.name : m.actionType}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                {m.signalCategory && (
                  <span>When: {categoryLabel(m.signalCategory)}</span>
                )}
                <span className={al?.color ?? 'text-amber-400'}>
                  {al?.label ?? m.autonomyLevel}
                </span>
              </div>
              {m.template && m.actionType && (
                <div className="text-[10px] text-muted-foreground">
                  {m.actionType}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleEdit(m)}
                className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {showForm && (
        <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Play Template</label>
            <select
              value={formTemplateId}
              onChange={(e) => {
                const tid = e.target.value;
                setFormTemplateId(tid);
                if (tid) {
                  const tmpl = templates.find((tt) => tt.id === tid);
                  if (tmpl && !formActionType.trim()) {
                    setFormActionType(tmpl.name);
                  }
                }
              }}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Auto-resolve (based on signal type)</option>
              {templates.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Select a play to run, or leave as auto-resolve to let the system pick based on signal type.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Signal Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Array.from(new Set(SIGNAL_CATEGORIES.map((c) => c.group))).map((group) => (
                <optgroup key={group} label={group}>
                  {SIGNAL_CATEGORIES.filter((c) => c.group === group).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Action Label {formTemplateId ? '(optional)' : '(required)'}
            </label>
            <input
              type="text"
              value={formActionType}
              onChange={(e) => setFormActionType(e.target.value)}
              placeholder={formTemplateId ? 'Auto-filled from template' : 'e.g. generate_email, research_account'}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Autonomy Level</label>
            <select
              value={formAutonomy}
              onChange={(e) => setFormAutonomy(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {AUTONOMY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!formTemplateId && !formActionType.trim())}
              className="text-xs font-medium bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          + Add Mapping
        </button>
      )}
    </div>
  );
}
