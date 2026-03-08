'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PlaybookEditor from '@/app/components/playbooks/PlaybookEditor';

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  isBuiltIn: boolean;
  stepCount: number;
  targetDepartmentTypes: string[] | null;
  targetIndustries: string[] | null;
  targetPersonas: string[] | null;
  priority: number;
};

const TRIGGER_TYPE_TO_CATEGORY: Record<string, string> = {
  // Signal-Response
  new_csuite_executive: 'Leadership & Organization',
  new_vp_hire: 'Leadership & Organization',
  multiple_dept_heads_hired: 'Leadership & Organization',
  executive_departure: 'Leadership & Organization',
  founder_stepping_down: 'Leadership & Organization',
  layoffs_headcount_reduction: 'Leadership & Organization',
  rapid_hiring_surge: 'Leadership & Organization',
  engineering_team_expansion: 'Leadership & Organization',
  sales_team_expansion: 'Leadership & Organization',
  geographic_expansion: 'Leadership & Organization',
  job_posting_your_category: 'Leadership & Organization',
  series_a_seed: 'Financial & Funding',
  series_b: 'Financial & Funding',
  series_c_late_stage: 'Financial & Funding',
  earnings_beat: 'Financial & Funding',
  earnings_miss: 'Financial & Funding',
  raised_guidance: 'Financial & Funding',
  ipo_announcement: 'Financial & Funding',
  post_ipo_first_quarter: 'Financial & Funding',
  acquisition_they_acquired: 'M&A & Partnerships',
  acquisition_they_were_acquired: 'M&A & Partnerships',
  merger_announcement: 'M&A & Partnerships',
  divestiture_spinoff: 'M&A & Partnerships',
  strategic_partnership: 'M&A & Partnerships',
  technology_partnership: 'M&A & Partnerships',
  new_technology_adoption: 'Technology & Product',
  platform_migration: 'Technology & Product',
  legacy_system_sunset: 'Technology & Product',
  product_launch_announcement: 'Technology & Product',
  security_breach: 'Technology & Product',
  compliance_certification: 'Technology & Product',
  tech_stack_changes: 'Technology & Product',
  analyst_recognition: 'Market & Competitive',
  regulatory_change: 'Market & Competitive',
  competitor_displacement: 'Market & Competitive',
  contract_renewal_window: 'Market & Competitive',
  public_vendor_complaints: 'Market & Competitive',
  competitor_acquisition: 'Market & Competitive',
  pricing_page_visits: 'Digital & Intent Signals',
  demo_request_trial: 'Digital & Intent Signals',
  case_study_downloads: 'Digital & Intent Signals',
  content_consumption_spike: 'Digital & Intent Signals',
  competitor_comparison_views: 'Digital & Intent Signals',
  review_site_research: 'Digital & Intent Signals',
  event_webinar_registration: 'Digital & Intent Signals',
  social_media_complaint: 'Digital & Intent Signals',
  usage_spike_seat_growth: 'Customer Expansion',
  premium_feature_request: 'Customer Expansion',
  new_department_interest: 'Customer Expansion',
  customer_raised_funding: 'Customer Expansion',
  customer_ma_activity: 'Customer Expansion',
  contract_renewal_approaching: 'Customer Expansion',
  champion_promoted: 'Customer Expansion',
  low_nps_negative_feedback: 'Customer Expansion',
  customer_case_study_participation: 'Customer Expansion',
  // Proactive
  product_release: 'Product & Company',
  feature_release_proactive: 'Product & Company',
  beta_invitation: 'Product & Company',
  roadmap_session: 'Product & Company',
  integration_announcement: 'Product & Company',
  compliance_achievement: 'Product & Company',
  pricing_change: 'Product & Company',
  exec_dinner_intimate: 'Events & Experiences',
  exec_dinner_large: 'Events & Experiences',
  conference_booth: 'Events & Experiences',
  conference_suite: 'Events & Experiences',
  industry_roundtable: 'Events & Experiences',
  webinar_educational: 'Events & Experiences',
  workshop_training: 'Events & Experiences',
  ebc_visit: 'Events & Experiences',
  user_conference: 'Events & Experiences',
  custom_research: 'Content & Thought Leadership',
  roi_business_case: 'Content & Thought Leadership',
  case_study_share: 'Content & Thought Leadership',
  analyst_report_share: 'Content & Thought Leadership',
  interactive_demo: 'Content & Thought Leadership',
  exec_video_message: 'Content & Thought Leadership',
  competitive_battlecard: 'Content & Thought Leadership',
  personalized_demo: 'Content & Thought Leadership',
  gift_high_value: 'Gifting & Personal Touch',
  gift_lower_value: 'Gifting & Personal Touch',
  charitable_donation: 'Gifting & Personal Touch',
  personalized_insight: 'Gifting & Personal Touch',
  event_tickets: 'Gifting & Personal Touch',
  lunch_learn: 'Gifting & Personal Touch',
  ae_video_message: 'Gifting & Personal Touch',
  swag_merch: 'Gifting & Personal Touch',
  reference_program: 'Customer Success',
  case_study_creation: 'Customer Success',
  advisory_board: 'Customer Success',
  awards_program: 'Customer Success',
  co_marketing: 'Customer Success',
  qbr: 'Customer Success',
  expansion_workshop: 'Customer Success',
  testimonial_video: 'Customer Success',
  social_advocacy: 'Customer Success',
  free_trial: 'Sales Motions',
  poc: 'Sales Motions',
  pilot_program: 'Sales Motions',
  competitive_displacement: 'Sales Motions',
  renewal_expansion: 'Sales Motions',
  exec_sponsorship: 'Sales Motions',
  champion_development: 'Sales Motions',
  multi_year_deal: 'Sales Motions',
  bundle_deal: 'Sales Motions',
};

const CATEGORY_ORDER = [
  'Leadership & Organization',
  'Financial & Funding',
  'M&A & Partnerships',
  'Technology & Product',
  'Market & Competitive',
  'Digital & Intent Signals',
  'Customer Expansion',
  'Product & Company',
  'Events & Experiences',
  'Content & Thought Leadership',
  'Gifting & Personal Touch',
  'Customer Success',
  'Sales Motions',
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Leadership & Organization': '👥',
  'Financial & Funding': '💰',
  'M&A & Partnerships': '🤝',
  'Technology & Product': '⚙️',
  'Market & Competitive': '📊',
  'Digital & Intent Signals': '🎯',
  'Customer Expansion': '📈',
  'Product & Company': '🚀',
  'Events & Experiences': '🎪',
  'Content & Thought Leadership': '📝',
  'Gifting & Personal Touch': '🎁',
  'Customer Success': '⭐',
  'Sales Motions': '💼',
  'Other': '📋',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Leadership & Organization': 'border-violet-500/30 bg-violet-500/5',
  'Financial & Funding': 'border-amber-500/30 bg-amber-500/5',
  'M&A & Partnerships': 'border-blue-500/30 bg-blue-500/5',
  'Technology & Product': 'border-cyan-500/30 bg-cyan-500/5',
  'Market & Competitive': 'border-red-500/30 bg-red-500/5',
  'Digital & Intent Signals': 'border-orange-500/30 bg-orange-500/5',
  'Customer Expansion': 'border-emerald-500/30 bg-emerald-500/5',
  'Product & Company': 'border-emerald-500/30 bg-emerald-500/5',
  'Events & Experiences': 'border-blue-500/30 bg-blue-500/5',
  'Content & Thought Leadership': 'border-indigo-500/30 bg-indigo-500/5',
  'Gifting & Personal Touch': 'border-pink-500/30 bg-pink-500/5',
  'Customer Success': 'border-yellow-500/30 bg-yellow-500/5',
  'Sales Motions': 'border-sky-500/30 bg-sky-500/5',
  'Other': 'border-border bg-card/60',
};

function priorityBadge(priority: number) {
  if (priority >= 10) return { label: 'Critical', cls: 'bg-red-500/10 text-red-400 border-red-500/25' };
  if (priority >= 8) return { label: 'High', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25' };
  if (priority >= 5) return { label: 'Medium', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/25' };
  return { label: 'Low', cls: 'bg-muted text-muted-foreground border-border' };
}

export function PlaybooksTab() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/playbooks/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this playbook?')) return;
    await fetch(`/api/playbooks/templates/${id}`, { method: 'DELETE' });
    await fetchTemplates();
  };

  const grouped = useMemo(() => {
    const lowerFilter = filterText.toLowerCase();
    const filtered = filterText
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerFilter) ||
            (t.description ?? '').toLowerCase().includes(lowerFilter) ||
            t.triggerType.toLowerCase().includes(lowerFilter),
        )
      : templates;

    const groups: Record<string, TemplateRow[]> = {};
    for (const t of filtered) {
      const cat = TRIGGER_TYPE_TO_CATEGORY[t.triggerType] ?? 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [templates, filterText]);

  const toggleCollapse = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  if (editingId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEditingId(null)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Playbooks
        </button>
        <PlaybookEditor
          templateId={editingId}
          onSaved={() => { setEditingId(null); fetchTemplates(); }}
          onCancel={() => setEditingId(null)}
        />
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setCreating(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Playbooks
        </button>
        <PlaybookEditor
          onSaved={() => { setCreating(false); fetchTemplates(); }}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Company Playbooks</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} playbooks across {Object.keys(grouped).length} categories.
            These templates inform how ActionWorkflows get assembled when triggers fire.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shrink-0"
        >
          + Create Playbook
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter playbooks..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setCollapsed(Object.fromEntries(CATEGORY_ORDER.map((c) => [c, true])))}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
        >
          Collapse All
        </button>
        <button
          type="button"
          onClick={() => setCollapsed({})}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
        >
          Expand All
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading playbooks...</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground mb-2">No playbooks yet.</p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Create your first playbook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => {
            const items = grouped[cat];
            const isCollapsed = collapsed[cat] ?? false;
            const colorCls = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Other'];
            const icon = CATEGORY_ICONS[cat] ?? '📋';

            return (
              <div
                key={cat}
                className={`rounded-lg border ${colorCls} overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => toggleCollapse(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-semibold">{cat}</span>
                    <span className="text-xs text-muted-foreground">
                      ({items.length} playbook{items.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="px-4 pb-3 space-y-2">
                    {items.map((t) => {
                      const pb = priorityBadge(t.priority);
                      return (
                        <div
                          key={t.id}
                          className="rounded-md border border-border bg-card/80 p-3 hover:border-blue-500/30 transition-colors cursor-pointer"
                          onClick={() => setEditingId(t.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <h3 className="text-xs font-semibold truncate">{t.name}</h3>
                                {t.isBuiltIn && (
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 shrink-0">
                                    Built-in
                                  </span>
                                )}
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0 rounded border shrink-0 ${pb.cls}`}>
                                  {pb.label}
                                </span>
                              </div>
                              {t.description && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[9px] text-muted-foreground mt-1">
                                <span>{t.stepCount} step{t.stepCount !== 1 ? 's' : ''}</span>
                                {t.targetPersonas && t.targetPersonas.length > 0 && (
                                  <span>{(t.targetPersonas as string[]).slice(0, 3).join(', ')}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingId(t.id); }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
                              >
                                Edit
                              </button>
                              {!t.isBuiltIn && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                  className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
