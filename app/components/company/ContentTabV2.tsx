'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildContentUrl } from '@/lib/urls/content';
import ContactSelector from '@/app/components/workflow/ContactSelector';

type DepartmentOption = {
  id: string;
  customName: string | null;
  type: string;
};

type ContentTypeItem = {
  id: string;
  label: string;
  stage: string;
  channelIds: string[];
  motions: string[];
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
  accountType?: string | null;
  primaryMotion?: string | null;
};

type ChannelItem = {
  id: string;
  label: string;
  mode: string;
  group: string;
  intents: { id: string; label: string }[];
};

type PlayItem = {
  id: string;
  label: string;
  description: string;
};

type MotionItem = {
  id: string;
  label: string;
  description: string;
  stageContext: string;
};

const CHANNEL_ICONS: Record<string, string> = {
  email: '\u2709',
  linkedin_inmail: 'in',
  linkedin_post: '\ud83d\udcdd',
  slack: '\ud83d\udcac',
  sms: '\ud83d\udcf1',
  sales_page: '\ud83c\udf10',
  presentation: '\ud83d\udcca',
  ad_brief: '\ud83d\udcf0',
  demo_script: '\ud83c\udfac',
  video: '\ud83c\udfa5',
  one_pager: '\ud83d\udcc4',
  talk_track: '\ud83c\udf99',
  champion_enablement: '\ud83c\udfc6',
  map: '\ud83d\uddfa',
  qbr_ebr_script: '\ud83d\udccb',
};

const SENDER_ROLES = [
  { id: 'ae', label: 'Account Executive' },
  { id: 'csm', label: 'Customer Success' },
  { id: 'sdr', label: 'SDR / BDR' },
  { id: 'executive', label: 'Executive' },
];

const TONE_OPTIONS = [
  { id: 'direct', label: 'Direct & concise' },
  { id: 'consultative', label: 'Consultative' },
  { id: 'friendly', label: 'Friendly & warm' },
  { id: 'formal', label: 'Formal' },
];

type SlideItem = { slideNumber: number; title: string; bullets: string[]; speakerNotes: string };

function PresentationSlidesOutput({
  slides,
  onCopyAll,
  onDownloadPptx,
  isDownloading,
}: {
  slides: SlideItem[];
  onCopyAll: () => void;
  onDownloadPptx: () => void;
  isDownloading: boolean;
}) {
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const copySlide = (slide: SlideItem) => {
    const text = `Slide ${slide.slideNumber}: ${slide.title}\n${slide.bullets.map((b) => `- ${b}`).join('\n')}${slide.speakerNotes ? `\nSpeaker notes: ${slide.speakerNotes}` : ''}`;
    void navigator.clipboard.writeText(text);
  };
  return (
    <div className="p-4">
      <div className="flex justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={onDownloadPptx}
          disabled={isDownloading}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-default transition-all"
        >
          {isDownloading ? 'Generating\u2026' : '\u2913 Download as PowerPoint'}
        </button>
        <button
          type="button"
          onClick={onCopyAll}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          Copy All
        </button>
      </div>
      <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="bg-zinc-950/40 border border-zinc-700/60 rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-700/60 flex items-center gap-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md shrink-0">
                {slide.slideNumber}
              </span>
              <span className="text-sm font-semibold text-gray-100 flex-1 min-w-0">
                {slide.title}
              </span>
              <button
                type="button"
                onClick={() => copySlide(slide)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold border border-zinc-700 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="px-4 py-3">
              <ul className="list-disc pl-5 text-sm text-gray-400 leading-relaxed">
                {slide.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              {slide.speakerNotes && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNotes((prev) => ({
                        ...prev,
                        [slide.slideNumber]: !prev[slide.slideNumber],
                      }))
                    }
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {expandedNotes[slide.slideNumber] ? '\u25bc' : '\u25b6'} Speaker notes
                  </button>
                  {expandedNotes[slide.slideNumber] && (
                    <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-950/40 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
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

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-zinc-700/60 text-gray-500 hover:text-gray-300 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
    >
      {label}
    </button>
  );
}

function getSuggestionChips(motionId: string, intentId: string): string[] {
  const byMotion: Record<string, string[]> = {
    new_logo: ['Set up intro meeting', 'Share relevant case study', 'Congratulate on recent news', 'Invite to upcoming webinar'],
    upsell: ['Show new feature value', 'Reference their usage data', 'Propose upgrade path', 'Share expansion ROI'],
    cross_sell: ['Introduce new product line', 'Connect to existing workflow', 'Share cross-sell case study'],
    renewal: ['Highlight value delivered', 'Share usage metrics', 'Discuss roadmap alignment', 'Address upcoming renewal'],
    customer_success: ['Check in on adoption', 'Share best practices', 'Celebrate a milestone', 'Recommend next training'],
  };
  const byIntent: Record<string, string[]> = {
    competitive_displacement: ['Compare key differentiators', 'Migration support details', 'Switching success story'],
    event_invite: ['Invite to webinar', 'Invite to in-person event', 'Share event agenda'],
  };
  return byIntent[intentId] ?? byMotion[motionId] ?? ['Set up a meeting', 'Share a case study', 'Reference recent news'];
}

function defaultMotion(primaryMotion: string | null | undefined, accountType: string | null | undefined): string {
  if (primaryMotion) return primaryMotion;
  if (accountType === 'customer') return 'renewal';
  return 'new_logo';
}

export function ContentTabV2({
  companyId,
  companyName,
  initialDepartmentId,
  signalId,
  initialType,
  accountType,
  primaryMotion,
}: Props) {
  const router = useRouter();
  const defaultMotionValue = defaultMotion(primaryMotion ?? null, accountType ?? null);

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [motions, setMotions] = useState<MotionItem[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeItem[]>([]);
  const [playsByMotion, setPlaysByMotion] = useState<Record<string, PlayItem[]>>({});
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDepartmentId ?? null);
  const [selectedMotion, setSelectedMotion] = useState<string>(defaultMotionValue);
  const [selectedPlayId, setSelectedPlayId] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>(initialType || 'email');
  const [selectedIntent, setSelectedIntent] = useState<string>('introduction');
  const [senderRole, setSenderRole] = useState<string>('ae');
  const [tone, setTone] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generated, setGenerated] = useState<{
    id?: string;
    subject?: string;
    hook?: string;
    body?: string;
    slides?: SlideItem[];
    raw?: string;
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [contextTouched, setContextTouched] = useState(false);
  const [regenerationFeedback, setRegenerationFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  useEffect(() => {
    setSelectedMotion(defaultMotionValue);
  }, [defaultMotionValue, primaryMotion, accountType]);

  useEffect(() => {
    const url = selectedMotion ? `/api/content/channels?motion=${encodeURIComponent(selectedMotion)}` : '/api/content/channels';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.channels)) setChannels(data.channels);
        if (data.defaultContentIntent) setSelectedIntent(data.defaultContentIntent);
        if (Array.isArray(data.motions)) setMotions(data.motions);
        if (Array.isArray(data.contentTypes)) setContentTypes(data.contentTypes);
      })
      .catch(() => {});
  }, [selectedMotion]);

  useEffect(() => {
    fetch('/api/content/plays')
      .then((r) => r.json())
      .then((data) => {
        if (data?.plays && typeof data.plays === 'object') {
          setPlaysByMotion(data.plays as Record<string, PlayItem[]>);
        }
      })
      .catch(() => {});
  }, []);

  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const plays = playsByMotion[selectedMotion] ?? [];
  const availableIntents = currentChannel?.intents ?? [{ id: 'introduction', label: 'Introduction' }, { id: 'custom', label: 'Other / Custom' }];
  const outreachChannels = channels.filter((c) => c.group === 'outreach');
  const salesAssetChannels = channels.filter((c) => c.group === 'sales_asset');

  useEffect(() => {
    if (availableIntents.length > 0 && !availableIntents.find((i) => i.id === selectedIntent)) {
      setSelectedIntent(availableIntents[0].id);
    }
  }, [selectedChannel, availableIntents, selectedIntent]);

  useEffect(() => {
    if (plays.length === 0) {
      if (selectedPlayId) setSelectedPlayId('');
      return;
    }
    if (selectedPlayId && plays.some((play) => play.id === selectedPlayId)) return;
    setSelectedPlayId('');
  }, [plays, selectedPlayId]);

  const handleSelectionChange = useCallback(
    (contactIds: string[], divisionId: string | null) => {
      setSelectedContacts(contactIds);
      if (divisionId) setSelectedDivisionId(divisionId);
      setIsGenerated(false);
    },
    [],
  );

  const handleGenerate = async () => {
    if (needContacts && selectedContacts.length === 0) return;
    setGenerateError(null);
    setIsGenerating(true);
    setIsGenerated(false);
    setGenerated(null);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          divisionId: selectedDivisionId ?? undefined,
          channel: selectedChannel,
          contactIds: selectedContacts,
          triggerId: signalId,
          userContext: userContext.trim() || undefined,
          contentIntent: selectedIntent || undefined,
          motion: selectedMotion || undefined,
          playId: selectedPlayId || undefined,
          contentType: selectedContentType || undefined,
          senderRole: senderRole || undefined,
          tone: tone || undefined,
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
        raw: data.raw ?? data.body ?? '',
      });
      setIsGenerated(true);
      setShowFeedbackInput(false);
      setRegenerationFeedback('');

      const url = buildContentUrl({
        companyId,
        divisionId: selectedDivisionId ?? undefined,
        channel: selectedChannel as 'email' | 'linkedin_inmail',
        contactId: selectedContacts[0],
        triggerId: signalId,
      });
      router.replace(url, { scroll: false });
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate content.');
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
      const res = await fetch('/api/content/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: generated.id,
          companyId,
          divisionId: selectedDivisionId ?? undefined,
          channel: selectedChannel,
          contactIds: selectedContacts,
          triggerId: signalId,
          userContext: userContext.trim() || undefined,
          contentIntent: selectedIntent || undefined,
          motion: selectedMotion || undefined,
          playId: selectedPlayId || undefined,
          contentType: selectedContentType || undefined,
          senderRole: senderRole || undefined,
          tone: tone || undefined,
          feedback: regenerationFeedback.trim() || undefined,
          previousOutput: generated.raw || undefined,
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
        raw: data.raw ?? generated.raw,
      });
      setIsGenerated(true);
      if (regenerationFeedback.trim()) {
        setShowFeedbackInput(false);
        setRegenerationFeedback('');
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to regenerate content.');
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
        headers: { 'Content-Type': 'application/json' },
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
        selectedChannel === 'email' ? 'Email ready to send (mock).' : 'Content ready to send (mock).'
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send content.');
    } finally {
      setSending(false);
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
          title: `${companyName} \u2013 Sales Presentation`,
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

  const isBroadcast = currentChannel?.mode === 'broadcast';
  const needContacts = !isBroadcast;
  const canGenerate = needContacts ? selectedContacts.length > 0 : true;
  const generateDisabled = !canGenerate || isGenerating;
  const channelLabel = currentChannel?.label ?? selectedChannel;
  const generateLabel = isGenerating
    ? 'Generating...'
    : needContacts && selectedContacts.length === 0
      ? 'Select contacts to generate'
      : isBroadcast
      ? `Generate ${channelLabel}`
      : `Generate ${channelLabel} for ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`;

  const chips = getSuggestionChips(selectedMotion, selectedIntent);
  const showContextHint = !contextTouched && !userContext.trim();

  return (
    <div className="space-y-5">
      {/* Contact Selector */}
      <ContactSelector
        companyId={companyId}
        selectedContactIds={selectedContacts}
        selectedDivisionId={selectedDivisionId}
        onSelectionChange={handleSelectionChange}
      />

      {/* Main content builder card */}
      <div className="bg-white dark:bg-zinc-900/70 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">

        {/* ── Selling Motion ─────────────────────────────────── */}
        {motions.length > 0 && (
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
              Selling Motion
            </div>
            <div className="flex flex-wrap gap-2">
              {motions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.description}
                  onClick={() => {
                    setSelectedMotion(m.id);
                    setSelectedContentType('');
                    setIsGenerated(false);
                    setGenerated(null);
                  }}
                  className={`group relative px-3.5 py-2 rounded-xl text-left border transition-all duration-150 ${
                    selectedMotion === m.id
                      ? 'bg-violet-500/10 border-violet-500/30 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]'
                      : 'bg-transparent border-gray-200 dark:border-zinc-700/60 hover:border-violet-500/20 hover:bg-violet-500/5'
                  }`}
                >
                  <span className={`text-xs font-semibold block ${
                    selectedMotion === m.id ? 'text-violet-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {m.label}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 block mt-0.5 leading-tight">
                    {m.stageContext}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Content Goal (pills replacing dropdown) ──────── */}
        {contentTypes.length > 0 && (
          <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
              Content Goal <span className="font-normal normal-case tracking-normal text-gray-400/60">(optional)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedContentType('');
                  setIsGenerated(false);
                  setGenerated(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedContentType === ''
                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                    : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 dark:text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                }`}
              >
                Any
              </button>
              {contentTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedContentType(t.id);
                    if (t.channelIds?.length) {
                      setSelectedChannel(t.channelIds[0]);
                    }
                    setIsGenerated(false);
                    setGenerated(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    selectedContentType === t.id
                      ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                      : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 dark:text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Channels (grouped: Outreach / Sales Assets) ──── */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
            Channel
          </div>

          {outreachChannels.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] font-semibold tracking-wider uppercase text-gray-400/50 dark:text-gray-600 mb-1.5">
                Outreach
              </div>
              <div className="flex flex-wrap gap-1.5">
                {outreachChannels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch.id);
                      setIsGenerated(false);
                      setGenerated(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-left border transition-all duration-150 ${
                      selectedChannel === ch.id
                        ? 'bg-violet-500/10 border-violet-500/25 shadow-[0_0_0_1px_rgba(139,92,246,0.1)]'
                        : 'bg-transparent border-gray-200 dark:border-zinc-700/50 hover:border-violet-500/20 hover:bg-violet-500/5'
                    }`}
                  >
                    <span className="text-sm opacity-70">{CHANNEL_ICONS[ch.id] ?? '\u2709'}</span>
                    <span className={`text-[11px] font-semibold ${selectedChannel === ch.id ? 'text-violet-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {ch.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {salesAssetChannels.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold tracking-wider uppercase text-gray-400/50 dark:text-gray-600 mb-1.5">
                Sales Assets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {salesAssetChannels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch.id);
                      setIsGenerated(false);
                      setGenerated(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-left border transition-all duration-150 ${
                      selectedChannel === ch.id
                        ? 'bg-violet-500/10 border-violet-500/25 shadow-[0_0_0_1px_rgba(139,92,246,0.1)]'
                        : 'bg-transparent border-gray-200 dark:border-zinc-700/50 hover:border-violet-500/20 hover:bg-violet-500/5'
                    }`}
                  >
                    <span className="text-sm opacity-70">{CHANNEL_ICONS[ch.id] ?? '\ud83d\udcc4'}</span>
                    <span className={`text-[11px] font-semibold ${selectedChannel === ch.id ? 'text-violet-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {ch.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {channels.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-left border bg-violet-500/10 border-violet-500/25"
              >
                <span className="text-sm opacity-70">{'\u2709'}</span>
                <span className="text-[11px] font-semibold text-violet-400">Email</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Content Intent ───────────────────────────────── */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
            Content Intent
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableIntents.map((intent) => (
              <button
                key={intent.id}
                type="button"
                onClick={() => setSelectedIntent(intent.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedIntent === intent.id
                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                    : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 dark:text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                }`}
              >
                {intent.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-400/70 dark:text-gray-600 leading-relaxed">
            Uses account research, division context, and your value props; optimized for 1:1 outreach.
          </p>
        </div>

        {plays.length > 0 && (
          <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
              Play <span className="font-normal normal-case tracking-normal text-gray-400/60">(optional)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPlayId('')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedPlayId === ''
                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                    : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                }`}
              >
                None
              </button>
              {plays.map((play) => (
                <button
                  key={play.id}
                  type="button"
                  title={play.description}
                  onClick={() => setSelectedPlayId(play.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    selectedPlayId === play.id
                      ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                      : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                  }`}
                >
                  {play.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sender Role + Tone ───────────────────────────── */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2">
                Sender Role
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SENDER_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSenderRole(r.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      senderRole === r.id
                        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                        : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2">
                Tone <span className="font-normal normal-case tracking-normal text-gray-400/60">(optional)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(tone === t.id ? '' : t.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      tone === t.id
                        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                        : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── User Context ─────────────────────────────────── */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <label
            htmlFor="user-context"
            className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2 block"
          >
            What do you want to say?
            {showContextHint && (
              <span className="ml-2 font-normal normal-case tracking-normal text-amber-500/80 text-[10px]">
                Adding context makes content significantly better
              </span>
            )}
          </label>
          <textarea
            id="user-context"
            value={userContext}
            onChange={(e) => {
              setUserContext(e.target.value);
              if (!contextTouched) setContextTouched(true);
            }}
            maxLength={1000}
            rows={2}
            placeholder="e.g. Set up a meeting to discuss renewal, Congratulate on new role, Invite to our upcoming webinar..."
            className="w-full rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-gray-50 dark:bg-zinc-950/40 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 resize-none transition-all"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map((chip) => (
              <SuggestionChip
                key={chip}
                label={chip}
                onClick={() => {
                  setUserContext(chip);
                  setContextTouched(true);
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Generate Button ──────────────────────────────── */}
        <div className="px-6 py-5">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateDisabled}
            className={`w-full py-3.5 rounded-xl text-sm font-bold text-white tracking-wide transition-all duration-200 ${
              generateDisabled
                ? 'bg-gray-300 dark:bg-zinc-700 cursor-default text-gray-500 dark:text-gray-500'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 cursor-pointer'
            } ${isGenerating ? 'opacity-70' : ''}`}
          >
            {generateLabel}
          </button>
          {(generateError || sendError || sendSuccess) && (
            <div className={`mt-2.5 text-xs font-medium ${generateError || sendError ? 'text-red-400' : 'text-emerald-400'}`}>
              {generateError || sendError || sendSuccess}
            </div>
          )}
        </div>
      </div>

      {/* ── Content Output ───────────────────────────────── */}
      {!isGenerated && !isGenerating ? (
        <div className="bg-gray-50 dark:bg-zinc-950/40 rounded-2xl border border-gray-200 dark:border-zinc-800 py-16 px-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 mb-5">
            <span className="text-2xl opacity-60">{CHANNEL_ICONS[selectedChannel] ?? '\u2709'}</span>
          </div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            Select contacts and a channel, then generate content
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-600 max-w-sm mx-auto leading-relaxed">
            The AI will use division data, buying group details, and your company value props to create personalized outreach.
          </div>
        </div>
      ) : isGenerating ? (
        <div className="bg-gray-50 dark:bg-zinc-950/40 rounded-2xl border border-violet-500/20 py-16 px-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 mb-5 animate-pulse">
            <span className="text-2xl">{CHANNEL_ICONS[selectedChannel] ?? '\u2709'}</span>
          </div>
          <div className="text-sm text-violet-400 font-semibold">
            Generating personalized content...
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Using division data + your company value props
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/70 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Output header */}
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <span className="text-sm opacity-70">
                {CHANNEL_ICONS[selectedChannel] ?? '\u2709'}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {channelLabel}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackInput((value) => !value)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
              >
                {showFeedbackInput ? 'Hide Feedback' : 'Add Feedback'}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || !generated}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
              >
                {'\u21bb'} Regenerate
              </button>
              {needContacts && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !generated?.body || selectedContacts.length === 0}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                >
                  {'\u2709'} Send
                </button>
              )}
            </div>
          </div>

          {showFeedbackInput && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
              <label
                htmlFor="regeneration-feedback"
                className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-2 block"
              >
                Regeneration Feedback
              </label>
              <textarea
                id="regeneration-feedback"
                value={regenerationFeedback}
                onChange={(e) => setRegenerationFeedback(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g. Make this shorter, sound more executive, or lean harder into the product launch signal."
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-950/40 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 resize-none transition-all"
              />
            </div>
          )}

          {/* Subject / hook */}
          {selectedChannel === 'email' && generated?.subject && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800">
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                Subject
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {generated.subject}
              </div>
            </div>
          )}

          {selectedChannel === 'linkedin_inmail' && generated?.hook && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800">
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                Subject (200 char max)
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                  .map((s) => `Slide ${s.slideNumber}: ${s.title}\n${s.bullets.map((b) => `- ${b}`).join('\n')}${s.speakerNotes ? `\nSpeaker notes: ${s.speakerNotes}` : ''}`)
                  .join('\n\n');
                void navigator.clipboard.writeText(text);
              }}
              onDownloadPptx={handleDownloadPptx}
              isDownloading={downloadingPptx}
            />
          )}

          {/* Body */}
          {selectedChannel !== 'presentation' && (
            <div className="p-5">
              <div className="font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap p-4 rounded-xl bg-gray-50 dark:bg-zinc-950/40 border border-gray-200 dark:border-zinc-800 max-h-[400px] overflow-y-auto">
                {generated?.body ?? 'Content generation not available for this channel.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
