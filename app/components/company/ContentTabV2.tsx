'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildContentUrl } from '@/lib/urls/content';

type DepartmentOption = {
  id: string;
  customName: string | null;
  type: string;
};

type Props = {
  companyId: string;
  companyName: string;
  departments: DepartmentOption[];
  hasMessaging?: boolean;
  initialDepartmentId?: string;
  signalId?: string;
  initialType?: string;
  contentFilter?: string;
  autoCreate?: boolean;
  initialContactId?: string;
};

// Temporary mock data and tokens for the v2 shell. These will be replaced by
// real Trigger + division + contact data and /api/content/generate results.
const MOCK_TRIGGER = {
  id: 'trg_001',
  type: 'SIGNAL',
  category: 'new_vp_hire',
  title: 'New VP of Engineering hired at General Motors',
  description:
    'David Chen joined GM as VP of Vehicle Software Engineering. Previously VP Platform at Rivian. Background in autonomous systems and ADAS.',
  priority: 'HIGH',
  timingWindow: 'Week 1–6',
  suggestedActions: [
    'Send personalized video message congratulating them',
    'Share relevant industry benchmark report they can use immediately',
    'Offer Tactical Onboarding session or Quick-Wins Assessment',
    "Reference their department's likely priorities based on role",
    'Position as fast path to early departmental success',
  ],
} as const;

const CHANNELS = [
  { id: 'email', label: 'Email', icon: '✉', desc: 'Subject + 3–5 paragraph body' },
  { id: 'linkedin_inmail', label: 'LinkedIn InMail', icon: 'in', desc: '300 char hook + 1–2 paragraphs' },
  { id: 'linkedin_post', label: 'LinkedIn Post', icon: '📝', desc: '1–3 paragraphs, conversational' },
  { id: 'slack', label: 'Slack DM', icon: '💬', desc: '2–4 sentences, casual' },
  { id: 'sms', label: 'Text / SMS', icon: '📱', desc: '160 chars or 2–3 sentences' },
  { id: 'sales_page', label: 'Sales Page', icon: '🌐', desc: 'Outline hero + key value props' },
  { id: 'presentation', label: 'Presentation', icon: '📊', desc: '3–5 slide outline with speaker notes for a sales meeting' },
] as const;

const SENIORITY_LEVELS = [
  { id: 'C-Suite', label: 'C-Suite' },
  { id: 'VP', label: 'VP & above' },
  { id: 'Director', label: 'Director & above' },
  { id: 'All', label: 'All contacts' },
] as const;

const MOCK_EMAIL = {
  subject: 'Congratulations on Your New Role — NVIDIA DRIVE for Vehicle Software Teams',
  body: `David,

Congratulations on joining General Motors as VP of Vehicle Software Engineering. Your background leading Rivian's platform team makes this an exciting move — GM's SDV ambitions are clearly accelerating.

Given your experience with autonomous systems, I wanted to share how NVIDIA DRIVE is helping vehicle software teams like yours accelerate simulation cycles by 40% while reducing physical testing costs. Teams at your scale typically see ROI within the first quarter.

I've put together a brief technical overview specific to GM's Vehicle Engineering division — would a 20-minute walkthrough be useful as you're getting oriented in the first few weeks?

Best,
[Your name]`,
} as const;

const MOCK_INMAIL = {
  hook: 'Congrats on the GM role, David — your Rivian platform experience is a perfect fit for their SDV push.',
  body: `I lead partnerships at NVIDIA for automotive software teams. Given your background in autonomous systems, thought you'd find our DRIVE platform overview relevant — it's helped similar teams cut simulation cycles by 40%.

Happy to share a quick technical brief if useful as you're ramping up.`,
} as const;

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.6)',
  surfaceSolid: '#0f172a',
  elevated: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
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
  amber: '#f59e0b',
};

type SlideItem = { slideNumber: number; title: string; bullets: string[]; speakerNotes: string };

function PresentationSlidesOutput({
  slides,
  onCopyAll,
  onDownloadPptx,
  isDownloading,
  t: tokens,
}: {
  slides: SlideItem[];
  onCopyAll: () => void;
  onDownloadPptx: () => void;
  isDownloading: boolean;
  t: typeof t;
}) {
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const copySlide = (slide: SlideItem) => {
    const text = `Slide ${slide.slideNumber}: ${slide.title}\n${slide.bullets.map((b) => `- ${b}`).join('\n')}${slide.speakerNotes ? `\nSpeaker notes: ${slide.speakerNotes}` : ''}`;
    void navigator.clipboard.writeText(text);
  };
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={onDownloadPptx}
          disabled={isDownloading}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: isDownloading ? 'transparent' : tokens.blueBg,
            border: `1px solid ${tokens.blueBorder}`,
            color: isDownloading ? tokens.text3 : tokens.blueLight,
            cursor: isDownloading ? 'default' : 'pointer',
            opacity: isDownloading ? 0.7 : 1,
          }}
        >
          {isDownloading ? 'Generating…' : '⤓ Download as PowerPoint'}
        </button>
        <button
          type="button"
          onClick={onCopyAll}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: 'transparent',
            border: `1px solid ${tokens.border}`,
            color: tokens.text2,
            cursor: 'pointer',
          }}
        >
          Copy All
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${tokens.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: tokens.blue, flexShrink: 0 }}>
                Slide {slide.slideNumber}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.text1, flex: 1, minWidth: 0 }}>
                {slide.title}
              </span>
              <button
                type="button"
                onClick={() => copySlide(slide)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'transparent',
                  border: `1px solid ${tokens.border}`,
                  color: tokens.text2,
                  cursor: 'pointer',
                }}
              >
                Copy Slide
              </button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: tokens.text2, lineHeight: 1.6 }}>
                {slide.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              {slide.speakerNotes && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNotes((prev) => ({
                        ...prev,
                        [slide.slideNumber]: !prev[slide.slideNumber],
                      }))
                    }
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: tokens.blue,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {expandedNotes[slide.slideNumber] ? '▼' : '▶'} Speaker notes
                  </button>
                  {expandedNotes[slide.slideNumber] && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: 10,
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.2)',
                        fontSize: 12,
                        color: tokens.text3,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {slide.speakerNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentTabV2({
  companyId,
  companyName,
  departments,
  hasMessaging, // reserved for future use
  initialDepartmentId,
  signalId, // reserved for future Trigger wiring
  initialType,
  contentFilter,
  autoCreate,
  initialContactId,
}: Props) {
  const router = useRouter();
  const [trigger] = useState(MOCK_TRIGGER);

  const initialDivisions = useMemo(
    () =>
      (departments.length > 0
        ? departments
        : [{ id: 'div_default', customName: 'Primary Buying Group', type: 'PRIMARY' }]
      ).map((d) => ({
        id: d.id,
        name: d.customName || d.type.replace(/_/g, ' '),
        contactCount: 0,
      })),
    [departments]
  );

  const [divisions, setDivisions] = useState(initialDivisions);
  const [divisionsError, setDivisionsError] = useState<string | null>(null);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  useEffect(() => {
    setDivisions(initialDivisions);
  }, [initialDivisions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDivisions(true);
        setDivisionsError(null);
        const res = await fetch(`/api/companies/${companyId}/divisions`);
        if (!res.ok) {
          throw new Error('Failed to load divisions');
        }
        const data = await res.json();
        const apiDivisions = (data?.divisions ?? []) as Array<{
          id: string;
          name: string;
          contactCount?: number;
        }>;
        if (!cancelled && Array.isArray(apiDivisions) && apiDivisions.length > 0) {
          setDivisions(
            apiDivisions.map((d) => ({
              id: d.id,
              name: d.name,
              contactCount: d.contactCount ?? 0,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          setDivisionsError(
            e instanceof Error ? e.message : 'Unable to load divisions right now.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDivisions(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const initialDivision =
    initialDepartmentId && divisions.some((d) => d.id === initialDepartmentId)
      ? initialDepartmentId
      : divisions[0]?.id ?? null;

  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDivision);
  const [seniorityFilter, setSeniorityFilter] = useState<'C-Suite' | 'VP' | 'Director' | 'All'>('VP');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>(initialType || 'email');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [activeAction, setActiveAction] = useState(0);
  const [allContacts, setAllContacts] = useState<
    Array<{
      id: string;
      name: string;
      title: string | null;
      email: string | null;
      linkedin: boolean;
      engagement: 'active' | 'warm' | 'cold' | 'new';
      levelRank: number;
      levelLabel: string;
    }>
  >([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [generated, setGenerated] = useState<{
    id?: string;
    subject?: string;
    hook?: string;
    body?: string;
    slides?: Array<{ slideNumber: number; title: string; bullets: string[]; speakerNotes: string }>;
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [findingContacts, setFindingContacts] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  useEffect(() => {
    if (!selectedDivisionId) {
      setAllContacts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingContacts(true);
        setContactsError(null);
        const res = await fetch(
          `/api/companies/${companyId}/divisions/${selectedDivisionId}/contacts`
        );
        if (!res.ok) {
          throw new Error('Failed to load contacts');
        }
        const data = await res.json();
        const contacts = (data?.contacts ?? []) as Array<{
          id: string;
          name: string;
          title: string | null;
          email: string | null;
          linkedin: boolean;
          engagement: 'active' | 'warm' | 'cold' | 'new';
          levelRank: number;
          levelLabel: string;
        }>;
        if (!cancelled) {
          setAllContacts(contacts);
        }
      } catch (e) {
        if (!cancelled) {
          setContactsError(
            e instanceof Error ? e.message : 'Unable to load contacts right now.'
          );
          setAllContacts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingContacts(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, selectedDivisionId]);

  const filteredContacts = useMemo(() => {
    if (!allContacts.length) return [];
    const maxRank =
      seniorityFilter === 'C-Suite'
        ? 0
        : seniorityFilter === 'VP'
          ? 1
          : seniorityFilter === 'Director'
            ? 2
            : 4;
    return allContacts.filter((c) => c.levelRank <= maxRank);
  }, [allContacts, seniorityFilter]);

  const selectedDiv = divisions.find((d) => d.id === selectedDivisionId);

  // Keep URL in sync with Content tab state so deep-links remain shareable.
  useEffect(() => {
    const primaryContactId = selectedContacts[0];
    const personaMap: Record<typeof seniorityFilter, 'csuite' | 'vp' | 'director' | 'all'> = {
      'C-Suite': 'csuite',
      VP: 'vp',
      Director: 'director',
      All: 'all',
    };
    const persona = personaMap[seniorityFilter];
    const url = buildContentUrl({
      companyId,
      divisionId: selectedDivisionId ?? undefined,
      channel: selectedChannel as 'email' | 'linkedin_inmail',
      persona,
      contactId: primaryContactId,
      triggerId: signalId,
    });
    router.replace(url, { scroll: false });
  }, [router, companyId, selectedDivisionId, selectedChannel, seniorityFilter, selectedContacts, signalId]);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setIsGenerated(false);
  };

  const handleGenerate = async () => {
    if (!selectedDivisionId) return;
    if (selectedChannel !== 'presentation' && selectedContacts.length === 0) return;
    setGenerateError(null);
    setIsGenerating(true);
    setIsGenerated(false);
    setGenerated(null);
    try {
      const personaMap: Record<typeof seniorityFilter, 'csuite' | 'vp' | 'director' | 'all'> = {
        'C-Suite': 'csuite',
        VP: 'vp',
        Director: 'director',
        All: 'all',
      };
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          divisionId: selectedDivisionId,
          channel: selectedChannel,
          persona: personaMap[seniorityFilter],
          contactIds: selectedContacts,
          triggerId: signalId,
          activeActionIndex: activeAction,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGenerateError(data?.error ?? 'Failed to generate content.');
        return;
      }
      const data = await res.json();
      setGenerated({
        id: data.contentId ?? undefined,
        subject: data.subject ?? undefined,
        hook: data.hook ?? undefined,
        body: data.body ?? '',
        slides: Array.isArray(data.slides) ? data.slides : undefined,
      });
      setIsGenerated(true);
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : 'Failed to generate content.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!generated?.id) {
      await handleGenerate();
      return;
    }
    setGenerateError(null);
    setIsGenerating(true);
    setIsGenerated(false);
    try {
      const personaMap: Record<typeof seniorityFilter, 'csuite' | 'vp' | 'director' | 'all'> = {
        'C-Suite': 'csuite',
        VP: 'vp',
        Director: 'director',
        All: 'all',
      };
      const res = await fetch('/api/content/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: generated.id,
          companyId,
          divisionId: selectedDivisionId ?? undefined,
          channel: selectedChannel,
          persona: personaMap[seniorityFilter],
          contactIds: selectedContacts,
          triggerId: signalId,
          activeActionIndex: activeAction,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGenerateError(data?.error ?? 'Failed to regenerate content.');
        return;
      }
      const data = await res.json();
      setGenerated({
        id: data.contentId ?? generated.id,
        subject: data.subject ?? generated.subject,
        hook: data.hook ?? generated.hook,
        body: data.body ?? generated.body,
        slides: Array.isArray(data.slides) ? data.slides : generated.slides,
      });
      setIsGenerated(true);
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : 'Failed to regenerate content.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!generated?.body || selectedContacts.length === 0 || !selectedDivisionId) return;
    setSendError(null);
    setSendSuccess(null);
    setSending(true);
    try {
      const res = await fetch('/api/content/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          divisionId: selectedDivisionId,
          channel: selectedChannel,
          contactIds: selectedContacts,
          subject: generated.subject,
          hook: generated.hook,
          body: generated.body,
          contentId: generated.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSendError(data?.error ?? 'Failed to send content.');
        return;
      }
      setSendSuccess(
        selectedChannel === 'email'
          ? 'Email ready to send (mock).'
          : 'InMail ready to send (mock).'
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send content.');
    } finally {
      setSending(false);
    }
  };

  const handleFindContacts = async () => {
    if (!selectedDivisionId) return;
    setFindError(null);
    setFindingContacts(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/divisions/${selectedDivisionId}/contacts/find`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFindError(data?.error ?? 'Failed to start contact discovery.');
        return;
      }
      // After find completes, refetch contacts for this division
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        // Trigger a refresh by forcing contacts effect to re-run
        setSelectedContacts([]);
        setIsGenerated(false);
      }
    } catch (e) {
      setFindError(
        e instanceof Error ? e.message : 'Failed to start contact discovery.'
      );
    } finally {
      setFindingContacts(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!generated?.slides || generated.slides.length === 0) return;
    setDownloadingPptx(true);
    try {
      const res = await fetch('/api/export/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${companyName} – Sales Presentation`,
          companyName,
          slides: generated.slides.map((s) => ({
            title: s.title,
            bullets: s.bullets,
            speakerNotes: s.speakerNotes || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')}_presentation.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PPTX download failed:', e);
    } finally {
      setDownloadingPptx(false);
    }
  };

  const engagementColor = (e: string) =>
    e === 'active' ? t.green : e === 'warm' ? t.amber : e === 'new' ? t.blue : t.text4;

  const priorityColor = trigger.priority === 'HIGH' ? t.amber : t.text3;

  return (
    <div
      style={{
        background: t.bg,
        borderRadius: 12,
        padding: '16px 24px 24px',
        color: t.text1,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Trigger banner */}
      <div
        style={{
          background: t.elevated,
          borderRadius: 10,
          border: `1px solid ${t.blueBorder}`,
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: t.blueBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: t.blueLight,
                }}
              >
                Signal
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: priorityColor,
                  background: `${priorityColor}15`,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {trigger.priority}
              </span>
              <span style={{ fontSize: 11, color: t.text3 }}>
                Window: {trigger.timingWindow}
              </span>
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: t.text1,
                lineHeight: 1.3,
              }}
            >
              {trigger.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: t.text2,
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {trigger.description}
            </div>
          </div>
        </div>

        {/* Suggested actions stepper */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: t.text3,
              marginBottom: 8,
            }}
          >
            Suggested Actions
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {trigger.suggestedActions.map((action, i) => (
              <button
                key={action}
                type="button"
                onClick={() => setActiveAction(i)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: 1.3,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: i === activeAction ? t.blueBg : 'transparent',
                  border: `1px solid ${i === activeAction ? t.blueBorder : t.border}`,
                  color: i === activeAction ? t.blueLight : t.text3,
                  fontWeight: i === activeAction ? 600 : 400,
                }}
              >
                <span
                  style={{
                    color: i === activeAction ? t.blue : t.text4,
                    fontWeight: 700,
                    marginRight: 4,
                  }}
                >
                  {i + 1}.
                </span>
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* Left: selection panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Division */}
          <div
            style={{
              background: t.surface,
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: t.text3,
                marginBottom: 10,
              }}
            >
              Division
            </div>
            <select
              value={selectedDivisionId ?? ''}
              onChange={(e) => {
                setSelectedDivisionId(e.target.value || null);
                setSelectedContacts([]);
                setIsGenerated(false);
                setGenerated(null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: t.surfaceSolid,
                border: `1px solid ${t.borderMed}`,
                color: t.text1,
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.contactCount ? ` (${d.contactCount})` : ''}
                </option>
              ))}
            </select>
            {divisionsError && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: t.amber,
                }}
              >
                {divisionsError}
              </p>
            )}
          </div>

          {/* Buying group */}
          <div
            style={{
              background: t.surface,
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: t.text3,
                }}
              >
                Buying Group
              </div>
              <span style={{ fontSize: 11, color: t.text3 }}>
                {selectedContacts.length} selected
              </span>
            </div>

            {/* Seniority filter */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {SENIORITY_LEVELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSeniorityFilter(s.id as typeof seniorityFilter);
                    setSelectedContacts([]);
                    setIsGenerated(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      seniorityFilter === s.id ? t.blueBg : 'transparent',
                    border: `1px solid ${
                      seniorityFilter === s.id ? t.blueBorder : t.border
                    }`,
                    color:
                      seniorityFilter === s.id ? t.blue : t.text4,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Contact list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingContacts ? (
                <div
                  style={{
                    fontSize: 12,
                    color: t.text4,
                    textAlign: 'center',
                    padding: 16,
                  }}
                >
                  Loading contacts…
                </div>
              ) : filteredContacts.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: t.text4,
                    textAlign: 'center',
                    padding: 16,
                  }}
                >
                  No contacts at this seniority level.
                  <br />
                  <button
                    type="button"
                    onClick={handleFindContacts}
                    style={{
                      color: t.blue,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {findingContacts ? 'Finding contacts…' : 'Find contacts with Exa →'}
                  </button>
                  {findError && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: t.amber,
                      }}
                    >
                      {findError}
                    </div>
                  )}
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const selected = selectedContacts.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: selected ? t.blueBg : 'transparent',
                        border: `1px solid ${
                          selected ? t.blueBorder : t.border
                        }`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selected ? t.blue : 'transparent',
                          border: `2px solid ${
                            selected ? t.blue : t.border
                          }`,
                          fontSize: 11,
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      >
                        {selected ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: selected ? t.text1 : t.text2,
                            }}
                          >
                            {c.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: `${engagementColor(c.engagement)}15`,
                              color: engagementColor(c.engagement),
                            }}
                          >
                            {c.engagement}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: t.text3,
                            marginTop: 1,
                          }}
                        >
                          {c.title}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              color: t.text4,
                            }}
                          >
                            ✉ {c.email}
                          </span>
                          {c.linkedin && (
                            <span
                              style={{
                                fontSize: 10,
                                color: t.blue,
                              }}
                            >
                              in LinkedIn
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Channels */}
          <div
            style={{
              background: t.surface,
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: t.text3,
                marginBottom: 10,
              }}
            >
              Channel
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
              }}
            >
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setSelectedChannel(ch.id);
                    setIsGenerated(false);
                    setGenerated(null);
                  }}
                  style={{
                    padding: '10px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background:
                      selectedChannel === ch.id ? t.blueBg : 'transparent',
                    border: `1px solid ${
                      selectedChannel === ch.id ? t.blueBorder : t.border
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{ch.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          selectedChannel === ch.id
                            ? t.blueLight
                            : t.text2,
                      }}
                    >
                      {ch.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: t.text4,
                      marginTop: 3,
                      marginLeft: 22,
                    }}
                  >
                    {ch.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          {(() => {
            const needContacts = selectedChannel !== 'presentation';
            const canGenerate = selectedDivisionId && (needContacts ? selectedContacts.length > 0 : true);
            const disabled = !canGenerate || isGenerating;
            const label = isGenerating
              ? 'Generating...'
              : !selectedDivisionId
                ? 'Select a division'
                : needContacts && selectedContacts.length === 0
                  ? 'Select contacts to generate'
                  : selectedChannel === 'presentation'
                    ? `Generate ${CHANNELS.find((c) => c.id === selectedChannel)?.label}`
                    : `Generate ${CHANNELS.find((c) => c.id === selectedChannel)?.label} for ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`;
            return (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: disabled ? 'default' : 'pointer',
                  background: disabled ? t.text4 : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  color: '#fff',
                  letterSpacing: '0.02em',
                  opacity: isGenerating ? 0.7 : 1,
                }}
              >
                {label}
              </button>
            );
          })()}
          {(generateError || sendError || sendSuccess) && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: generateError || sendError ? t.amber : t.text2,
              }}
            >
              {generateError || sendError || sendSuccess}
            </div>
          )}
        </div>

        {/* Right: content output */}
        <div>
          {!isGenerated && !isGenerating ? (
            <div
              style={{
                background: t.surface,
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                padding: '80px 40px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>✉</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: t.text2,
                  marginBottom: 6,
                }}
              >
                Select a contact and channel to generate content
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: t.text4,
                  maxWidth: 400,
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}
              >
                The AI will use trigger context, division data, buying group
                details, and your company value props to create personalized
                outreach.
              </div>
            </div>
          ) : isGenerating ? (
            <div
              style={{
                background: t.surface,
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                padding: '80px 40px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: t.blue,
                  fontWeight: 600,
                }}
              >
                ⟳ Generating personalized content...
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: t.text3,
                  marginTop: 8,
                }}
              >
                Using signal context + {selectedDiv?.name ?? 'division'} data +
                your company value props
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Recipient banner */}
              <div
                style={{
                  background: t.surface,
                  borderRadius: 10,
                  border: `1px solid ${t.border}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.text3,
                  }}
                >
                  For:
                </div>
                {selectedContacts.map((cid) => {
                  const c = filteredContacts.find((x) => x.id === cid);
                  if (!c) return null;
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: t.blueBg,
                        border: `1px solid ${t.blueBorder}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: t.text1,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: t.text3,
                        }}
                      >
                        {c.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Content card */}
              <div
                style={{
                  background: t.elevated,
                  borderRadius: 10,
                  border: `1px solid ${t.border}`,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: `1px solid ${t.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>
                      {
                        CHANNELS.find((c) => c.id === selectedChannel)?.icon
                      }
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: t.text1,
                      }}
                    >
                      {CHANNELS.find((c) => c.id === selectedChannel)?.label ?? selectedChannel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={isGenerating || !generated}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'transparent',
                        border: `1px solid ${t.border}`,
                        color: t.text2,
                        cursor: 'pointer',
                      }}
                    >
                      ↻ Regenerate
                    </button>
                    {selectedChannel !== 'presentation' && (
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !generated?.body || selectedContacts.length === 0}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'transparent',
                          border: `1px solid ${t.border}`,
                          color: t.text2,
                          cursor: 'pointer',
                        }}
                      >
                        ✉ Send
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject / hook */}
                {selectedChannel === 'email' && generated && generated.subject && (
                  <div
                    style={{
                      padding: '12px 20px',
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: t.blue,
                        marginBottom: 4,
                      }}
                    >
                      Subject
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: t.text1,
                      }}
                    >
                      {generated.subject}
                    </div>
                  </div>
                )}

                {selectedChannel === 'linkedin_inmail' && generated && generated.hook && (
                  <div
                    style={{
                      padding: '12px 20px',
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: t.blue,
                        marginBottom: 4,
                      }}
                    >
                      Hook (300 char max)
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: t.text1,
                      }}
                    >
                      {generated.hook}
                    </div>
                  </div>
                )}

                {/* Presentation slides */}
                {selectedChannel === 'presentation' && generated?.slides && generated.slides.length > 0 && (
                  <PresentationSlidesOutput
                    slides={generated.slides}
                    onCopyAll={() => {
                      const text = generated.slides!
                        .map(
                          (s) =>
                            `Slide ${s.slideNumber}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join('\n')}${s.speakerNotes ? `\nSpeaker notes: ${s.speakerNotes}` : ''}`
                        )
                        .join('\n\n');
                      void navigator.clipboard.writeText(text);
                    }}
                    onDownloadPptx={handleDownloadPptx}
                    isDownloading={downloadingPptx}
                    t={t}
                  />
                )}

                {/* Body (email, linkedin, etc.) */}
                {selectedChannel !== 'presentation' && (
                  <div style={{ padding: '16px 20px' }}>
                    <div
                      style={{
                        fontFamily:
                          "ui-monospace, 'Cascadia Code', Consolas, monospace",
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: t.text2,
                        whiteSpace: 'pre-wrap',
                        padding: 16,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      {generated?.body ??
                        'Content generation not available for this channel.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

