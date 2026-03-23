'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AutonomyLevel } from '@prisma/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';

type IndustryPlaybookRow = {
  id: string;
  name: string;
  slug: string;
  overview: string | null;
  buyingCommittee: string | null;
  landmines: string[] | null;
  departmentProductMapping: { department: string; productIds: string[]; typicalDealSize?: string }[] | null;
  valuePropsByDepartment: Record<string, unknown> | null;
};

/** PlayTemplate row from GET /api/play-templates (governance only; no run here). */
type PlayTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category: string;
  triggerType: string;
  scope?: string;
  phaseCount: number;
  defaultAutonomyLevel: AutonomyLevel | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
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

type CatalogProductOption = { id: string; name: string; slug: string };

const PLAY_CATEGORY_ORDER = ['RENEWAL', 'ENGAGEMENT', 'LAUNCH', 'EXPANSION', 'COMPETITIVE', 'PROSPECTING'];
const AUTONOMY_OPTIONS: { value: AutonomyLevel; label: string }[] = [
  { value: AutonomyLevel.NOTIFY_ONLY, label: 'Notify Only' },
  { value: AutonomyLevel.DRAFT_REVIEW, label: 'Draft + Review' },
  { value: AutonomyLevel.AUTO_EXECUTE, label: 'Auto-Execute' },
];

export function PlaybooksTab({ catalogProducts = [] }: { catalogProducts?: CatalogProductOption[] } = {}) {
  const [templates, setTemplates] = useState<PlayTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');
  const [patchingAutonomyId, setPatchingAutonomyId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const router = useRouter();

  const [industryPlaybooks, setIndustryPlaybooks] = useState<IndustryPlaybookRow[]>([]);
  const [ipLoading, setIpLoading] = useState(true);
  const [editingIpId, setEditingIpId] = useState<string | null>(null);
  const [creatingIp, setCreatingIp] = useState(false);

  const fetchIndustryPlaybooks = useCallback(async () => {
    try {
      const res = await fetch('/api/industry-playbooks');
      if (res.ok) {
        const data = await res.json();
        setIndustryPlaybooks(data ?? []);
      }
    } finally {
      setIpLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/play-templates?scope=governance');
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
    fetchIndustryPlaybooks();
  }, [fetchTemplates, fetchIndustryPlaybooks]);

  const handleDuplicateTemplate = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await fetch(`/api/play-templates/${templateId}/clone`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { templateId?: string; error?: string };
      if (!res.ok) {
        alert(data.error ?? 'Could not duplicate template.');
        return;
      }
      if (data.templateId) {
        router.push(`/dashboard/my-company/play-templates/${data.templateId}/edit`);
      }
      await fetchTemplates();
    } finally {
      setCloningId(null);
    }
  };

  const handleDefaultAutonomyChange = async (templateId: string, value: string) => {
    setPatchingAutonomyId(templateId);
    try {
      await fetch(`/api/play-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultAutonomyLevel: value }),
      });
      await fetchTemplates();
    } finally {
      setPatchingAutonomyId(null);
    }
  };

  const handleDeleteIp = async (id: string) => {
    if (!confirm('Delete this industry playbook?')) return;
    await fetch(`/api/industry-playbooks/${id}`, { method: 'DELETE' });
    await fetchIndustryPlaybooks();
  };

  const grouped = useMemo(() => {
    const lowerFilter = filterText.toLowerCase();
    const filtered = filterText
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerFilter) ||
            (t.description ?? '').toLowerCase().includes(lowerFilter) ||
            (t.triggerType ?? '').toLowerCase().includes(lowerFilter) ||
            (t.category ?? '').toLowerCase().includes(lowerFilter),
        )
      : templates;

    const groups: Record<string, PlayTemplateRow[]> = {};
    for (const t of filtered) {
      const cat = t.category ?? 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [templates, filterText]);

  const toggleCollapse = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  if (editingIpId) {
    const ip = industryPlaybooks.find((p) => p.id === editingIpId);
    return (
      <IndustryPlaybookEditor
        playbook={ip}
        catalogProducts={catalogProducts}
        onSaved={() => { setEditingIpId(null); fetchIndustryPlaybooks(); }}
        onCancel={() => setEditingIpId(null)}
      />
    );
  }

  if (creatingIp) {
    return (
      <IndustryPlaybookEditor
        catalogProducts={catalogProducts}
        onSaved={() => { setCreatingIp(false); fetchIndustryPlaybooks(); }}
        onCancel={() => setCreatingIp(false)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Industry Playbooks Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Industry Playbooks</h2>
            <p className="text-sm text-muted-foreground">
              Industry-specific selling guides: buying committees, value props by department, and common objections. The AI uses these to personalize outreach.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreatingIp(true)}
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shrink-0"
          >
            + Add Industry Playbook
          </button>
        </div>
        {ipLoading ? (
          <p className="text-sm text-muted-foreground">Loading industry playbooks...</p>
        ) : industryPlaybooks.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground mb-2">No industry playbooks yet.</p>
            <button type="button" onClick={() => setCreatingIp(true)} className="text-sm text-blue-400 hover:text-blue-300">
              Create your first industry playbook
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {industryPlaybooks.map((ip) => (
              <div key={ip.id} className="rounded-lg border border-border bg-card/80 p-4 hover:border-blue-500/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{ip.name}</h3>
                    {ip.overview && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ip.overview}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
                      {ip.departmentProductMapping && (
                        <span>{ip.departmentProductMapping.length} department{ip.departmentProductMapping.length !== 1 ? 's' : ''} mapped</span>
                      )}
                      {ip.landmines && ip.landmines.length > 0 && (
                        <span>{ip.landmines.length} landmine{ip.landmines.length !== 1 ? 's' : ''}</span>
                      )}
                      {ip.buyingCommittee && <span>Buying committee defined</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingIpId(ip.id)} className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5">Edit</button>
                    <button type="button" onClick={() => handleDeleteIp(ip.id)} className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Play Templates (governance only: default autonomy, signal rules; run plays from Play Catalog) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Play Templates</h2>
            <p className="text-sm text-muted-foreground">
              Create and govern play templates. Run plays from the Play Catalog.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard/my-company/play-templates/new"
              className="text-sm font-semibold text-primary hover:text-primary/90"
            >
              + Create Template
            </Link>
            <Link
              href="/dashboard/plays"
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              Open Play Catalog →
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter templates..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setCollapsed(Object.fromEntries(PLAY_CATEGORY_ORDER.map((c) => [c, true])))}
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
          <p className="text-sm text-muted-foreground">Loading play templates...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground mb-2">No play templates yet.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <Link
                href="/dashboard/my-company/play-templates/new"
                className="text-sm font-semibold text-primary hover:text-primary/90"
              >
                + Create Template
              </Link>
              <Link href="/dashboard/plays" className="text-sm text-blue-400 hover:text-blue-300">
                Open Play Catalog →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              ...PLAY_CATEGORY_ORDER.filter((cat) => grouped[cat]?.length),
              ...Object.keys(grouped).filter((cat) => !PLAY_CATEGORY_ORDER.includes(cat)),
            ].map((cat) => {
              const items = grouped[cat];
              const isCollapsed = collapsed[cat] ?? false;
              const colorCls = CATEGORY_COLORS[cat] ?? 'border-border bg-card/60';
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
                      <span className="text-sm font-semibold">{cat.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        ({items.length} template{items.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isCollapsed ? '▸' : '▾'}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="px-4 pb-3 space-y-2">
                      {items.map((t) => {
                        const autonomy = t.defaultAutonomyLevel ?? AutonomyLevel.DRAFT_REVIEW;
                        const st = t.status ?? 'ACTIVE';
                        const statusCls =
                          st === 'DRAFT' ?
                            'bg-amber-500/15 text-amber-600 border-amber-500/30'
                          : st === 'ARCHIVED' ?
                            'bg-muted text-muted-foreground border-border'
                          : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
                        return (
                          <div
                            key={t.id}
                            className="rounded-md border border-border bg-card/80 p-3 hover:border-blue-500/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-xs font-semibold truncate">{t.name}</h3>
                                  <span
                                    className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${statusCls}`}
                                  >
                                    {st}
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-[9px] text-muted-foreground mt-1">
                                  <span>{t.phaseCount} phase{t.phaseCount !== 1 ? 's' : ''}</span>
                                  <span className="uppercase">{t.triggerType}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/dashboard/my-company/play-templates/${t.id}/edit`}
                                    className="text-[10px] font-medium text-primary hover:text-primary/90 whitespace-nowrap"
                                  >
                                    Edit template →
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={cloningId === t.id || st === 'ARCHIVED'}
                                    onClick={() => void handleDuplicateTemplate(t.id)}
                                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {cloningId === t.id ? 'Duplicating…' : 'Duplicate'}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  <label className="text-[10px] text-muted-foreground whitespace-nowrap">Default autonomy:</label>
                                  <select
                                    value={autonomy}
                                    disabled={patchingAutonomyId === t.id || st === 'ARCHIVED'}
                                    onChange={(e) => handleDefaultAutonomyChange(t.id, e.target.value)}
                                    className="text-[10px] rounded border border-border bg-background px-2 py-1 text-foreground"
                                  >
                                    {AUTONOMY_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <Link
                                    href="/dashboard/roadmap"
                                    className="text-[10px] text-blue-400 hover:text-blue-300 whitespace-nowrap"
                                  >
                                    Signal rules →
                                  </Link>
                                </div>
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
      </section>
    </div>
  );
}

function IndustryPlaybookEditor({
  playbook,
  catalogProducts = [],
  onSaved,
  onCancel,
}: {
  playbook?: IndustryPlaybookRow;
  catalogProducts?: CatalogProductOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isNew = !playbook;
  const [name, setName] = useState(playbook?.name ?? '');
  const [overview, setOverview] = useState(playbook?.overview ?? '');
  const [buyingCommittee, setBuyingCommittee] = useState(playbook?.buyingCommittee ?? '');
  const [landmines, setLandmines] = useState((playbook?.landmines ?? []).join('\n'));
  const [deptMapping, setDeptMapping] = useState(() => {
    const raw = playbook?.departmentProductMapping ?? [];
    return raw.map((row: { department: string; productIds?: string[]; typicalDealSize?: string }) => ({
      department: row.department,
      productIds: Array.isArray(row.productIds) ? row.productIds : [],
      typicalDealSize: row.typicalDealSize ?? '',
    }));
  });
  const [valuePropsByDept, setValuePropsByDept] = useState(() => {
    const vp = playbook?.valuePropsByDepartment ?? {};
    return Object.entries(vp)
      .map(([dept, content]) => ({
        dept,
        content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      }));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');

    const vpObj: Record<string, unknown> = {};
    for (const row of valuePropsByDept) {
      if (row.dept.trim()) {
        try { vpObj[row.dept.trim()] = JSON.parse(row.content); } catch {
          vpObj[row.dept.trim()] = row.content;
        }
      }
    }

    const body = {
      name: name.trim(),
      overview: overview.trim() || null,
      buyingCommittee: buyingCommittee.trim() || null,
      landmines: landmines.split('\n').map((l) => l.trim()).filter(Boolean),
      departmentProductMapping: deptMapping.filter((d) => d.department.trim()),
      valuePropsByDepartment: Object.keys(vpObj).length > 0 ? vpObj : null,
    };

    try {
      const url = isNew
        ? '/api/industry-playbooks'
        : `/api/industry-playbooks/${playbook.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? 'Failed to save');
        return;
      }
      onSaved();
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
        &larr; Back to Playbooks
      </button>
      <h2 className="text-lg font-semibold">
        {isNew ? 'New Industry Playbook' : `Edit: ${playbook.name}`}
      </h2>

      {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</p>}

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Name *</span>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Enterprise SaaS Sales"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Overview</span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          placeholder="Industry overview, key trends, and selling approach..."
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Buying Committee</span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
          value={buyingCommittee}
          onChange={(e) => setBuyingCommittee(e.target.value)}
          placeholder="Typical roles involved in purchasing decisions..."
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Landmines (one per line)</span>
        <p className="text-[10px] text-muted-foreground">Common objections or traps to avoid in this industry.</p>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
          value={landmines}
          onChange={(e) => setLandmines(e.target.value)}
          placeholder="One landmine per line..."
        />
      </label>

      {/* Department Product & Opportunity Mapping */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Department Product &amp; Opportunity Mapping</span>
          <button
            type="button"
            onClick={() => setDeptMapping((prev) => [...prev, { department: '', productIds: [], typicalDealSize: '' }])}
            className="text-[10px] text-blue-400 hover:text-blue-300"
          >
            + Add Department
          </button>
        </div>
        {deptMapping.map((row, i) => (
          <div key={i} className="flex flex-wrap items-start gap-2 rounded border border-border/40 bg-background/60 p-2.5">
            <input
              className="min-w-[140px] flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={row.department}
              onChange={(e) => {
                const next = [...deptMapping];
                next[i] = { ...next[i], department: e.target.value };
                setDeptMapping(next);
              }}
              placeholder="Department name"
            />
            <div className="flex min-w-[160px] flex-1 flex-wrap items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  type="button"
                >
                  <span className="text-xs">Products {row.productIds.length > 0 ? `(${row.productIds.length})` : ''}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {catalogProducts.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No catalog products. Add products in My Company → Products.</div>
                  ) : (
                    catalogProducts.map((p) => (
                      <DropdownMenuCheckboxItem
                        key={p.id}
                        checked={row.productIds.includes(p.id)}
                        onSelect={(e) => {
                          e.preventDefault();
                          const next = [...deptMapping];
                          const ids = next[i].productIds.includes(p.id)
                            ? next[i].productIds.filter((id) => id !== p.id)
                            : [...next[i].productIds, p.id];
                          next[i] = { ...next[i], productIds: ids };
                          setDeptMapping(next);
                        }}
                      >
                        {p.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {row.productIds.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {row.productIds.map((id) => {
                    const p = catalogProducts.find((c) => c.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {p?.name ?? id}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
            <input
              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs"
              value={row.typicalDealSize ?? ''}
              onChange={(e) => {
                const next = [...deptMapping];
                next[i] = { ...next[i], typicalDealSize: e.target.value };
                setDeptMapping(next);
              }}
              placeholder="Deal size"
            />
            <button
              type="button"
              onClick={() => setDeptMapping((prev) => prev.filter((_, j) => j !== i))}
              className="text-[10px] text-red-400 hover:text-red-300 shrink-0 pt-1"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Value Props by Department */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Value Props by Department</span>
          <button
            type="button"
            onClick={() => setValuePropsByDept((prev) => [...prev, { dept: '', content: '' }])}
            className="text-[10px] text-blue-400 hover:text-blue-300"
          >
            + Add Department
          </button>
        </div>
        {valuePropsByDept.map((row, i) => (
          <div key={i} className="rounded border border-border/40 bg-background/60 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                value={row.dept}
                onChange={(e) => {
                  const next = [...valuePropsByDept];
                  next[i] = { ...next[i], dept: e.target.value };
                  setValuePropsByDept(next);
                }}
                placeholder="Department name"
              />
              <button
                type="button"
                onClick={() => setValuePropsByDept((prev) => prev.filter((_, j) => j !== i))}
                className="text-[10px] text-red-400 hover:text-red-300 shrink-0"
              >
                Remove
              </button>
            </div>
            <textarea
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs min-h-[60px]"
              value={row.content}
              onChange={(e) => {
                const next = [...valuePropsByDept];
                next[i] = { ...next[i], content: e.target.value };
                setValuePropsByDept(next);
              }}
              placeholder="Value propositions, pitch, bullets..."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
