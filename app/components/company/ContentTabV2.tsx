'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildContentUrl } from '@/lib/urls/content';
import ContactSelector from '@/app/components/workflow/ContactSelector';

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

const CHANNELS = [
  { id: 'email', label: 'Email', icon: '\u2709', desc: 'Subject + 3\u20135 paragraph body' },
  { id: 'linkedin_inmail', label: 'LinkedIn InMail', icon: 'in', desc: '200 char subject + 2\u20133 paragraphs' },
  { id: 'linkedin_post', label: 'LinkedIn Post', icon: '\ud83d\udcdd', desc: '1\u20133 paragraphs, conversational' },
  { id: 'slack', label: 'Slack DM', icon: '\ud83d\udcac', desc: '2\u20134 sentences, casual' },
  { id: 'sms', label: 'Text / SMS', icon: '\ud83d\udcf1', desc: '160 chars or 2\u20133 sentences' },
  { id: 'sales_page', label: 'Sales Page', icon: '\ud83c\udf10', desc: 'Outline hero + key value props' },
  { id: 'presentation', label: 'Presentation', icon: '\ud83d\udcca', desc: '3\u20135 slide outline with speaker notes' },
  { id: 'ad_brief', label: 'Ad Brief', icon: '\ud83d\udcf0', desc: 'Structured ad brief with headline options' },
  { id: 'demo_script', label: 'Demo Script', icon: '\ud83c\udfac', desc: '5-section scripted demo with talk tracks' },
  { id: 'video', label: 'Video Script', icon: '\ud83c\udfa5', desc: 'Structured video script with timing cues' },
] as const;

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
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-blue-500/25 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-default"
        >
          {isDownloading ? 'Generating\u2026' : '\u2913 Download as PowerPoint'}
        </button>
        <button
          type="button"
          onClick={onCopyAll}
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-zinc-700 text-gray-400 hover:text-gray-300"
        >
          Copy All
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="bg-black/20 border border-zinc-700 rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-3">
              <span className="text-xs font-semibold text-blue-500 shrink-0">
                Slide {slide.slideNumber}
              </span>
              <span className="text-sm font-semibold text-gray-100 flex-1 min-w-0">
                {slide.title}
              </span>
              <button
                type="button"
                onClick={() => copySlide(slide)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold border border-zinc-700 text-gray-400 hover:text-gray-300"
              >
                Copy Slide
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
                    className="text-xs font-semibold text-blue-500 hover:text-blue-400"
                  >
                    {expandedNotes[slide.slideNumber] ? '\u25bc' : '\u25b6'} Speaker notes
                  </button>
                  {expandedNotes[slide.slideNumber] && (
                    <div className="mt-1.5 p-2.5 rounded-md bg-black/20 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
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
  initialDepartmentId,
  signalId,
  initialType,
}: Props) {
  const router = useRouter();

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDepartmentId ?? null);
  const [selectedChannel, setSelectedChannel] = useState<string>(initialType || 'email');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generated, setGenerated] = useState<{
    id?: string;
    subject?: string;
    hook?: string;
    body?: string;
    slides?: SlideItem[];
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [userContext, setUserContext] = useState('');

  const handleSelectionChange = useCallback(
    (contactIds: string[], divisionId: string | null) => {
      setSelectedContacts(contactIds);
      if (divisionId) setSelectedDivisionId(divisionId);
      setIsGenerated(false);
    },
    [],
  );

  const handleGenerate = async () => {
    const broadcastChannels = ['presentation', 'ad_brief', 'demo_script', 'video'];
    if (!broadcastChannels.includes(selectedChannel) && selectedContacts.length === 0) return;
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

  const broadcastChannels = new Set(['presentation', 'ad_brief', 'demo_script', 'video']);
  const needContacts = !broadcastChannels.has(selectedChannel);
  const canGenerate = needContacts ? selectedContacts.length > 0 : true;
  const generateDisabled = !canGenerate || isGenerating;
  const channelLabel = CHANNELS.find((c) => c.id === selectedChannel)?.label ?? selectedChannel;
  const generateLabel = isGenerating
    ? 'Generating...'
    : needContacts && selectedContacts.length === 0
      ? 'Select contacts to generate'
      : broadcastChannels.has(selectedChannel)
        ? `Generate ${channelLabel}`
        : `Generate ${channelLabel} for ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`;

  return (
    <div className="space-y-4">
      {/* Contact Selector — full-width, same UX as play execution */}
      <ContactSelector
        companyId={companyId}
        selectedContactIds={selectedContacts}
        selectedDivisionId={selectedDivisionId}
        onSelectionChange={handleSelectionChange}
      />

      {/* Channel strip + Generate */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-5">
        <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-3">
          Channel
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                setSelectedChannel(ch.id);
                setIsGenerated(false);
                setGenerated(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-left border transition-colors ${
                selectedChannel === ch.id
                  ? 'bg-blue-500/10 border-blue-500/25'
                  : 'bg-transparent border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-sm">{ch.icon}</span>
              <span className={`text-xs font-semibold ${selectedChannel === ch.id ? 'text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {ch.label}
              </span>
            </button>
          ))}
        </div>

        {/* User context / intent */}
        <div className="mb-4">
          <label
            htmlFor="user-context"
            className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-1.5 block"
          >
            What do you want to say? <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="user-context"
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="e.g. Set up a meeting to discuss renewal, Congratulate on new role, Invite to our upcoming webinar..."
            className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/60 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateDisabled}
          className={`w-full py-3 rounded-lg text-sm font-bold text-white tracking-wide transition-colors ${
            generateDisabled
              ? 'bg-gray-400 dark:bg-gray-600 cursor-default'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 cursor-pointer'
          } ${isGenerating ? 'opacity-70' : ''}`}
        >
          {generateLabel}
        </button>
        {(generateError || sendError || sendSuccess) && (
          <div className={`mt-2 text-xs ${generateError || sendError ? 'text-amber-500' : 'text-gray-400'}`}>
            {generateError || sendError || sendSuccess}
          </div>
        )}
      </div>

      {/* Content output */}
      {!isGenerated && !isGenerating ? (
        <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl border border-gray-200 dark:border-zinc-700 py-16 px-10 text-center">
          <div className="text-4xl mb-4 opacity-30">{'✉'}</div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            Select contacts and a channel, then generate content
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            The AI will use division data, buying group details, and your company value props to create personalized outreach.
          </div>
        </div>
      ) : isGenerating ? (
        <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-xl border border-gray-200 dark:border-zinc-700 py-16 px-10 text-center">
          <div className="text-sm text-blue-500 font-semibold">
            {'⟳'} Generating personalized content...
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Using division data + your company value props
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/80 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {CHANNELS.find((c) => c.id === selectedChannel)?.icon}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {channelLabel}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || !generated}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                {'↻'} Regenerate
              </button>
              {!broadcastChannels.has(selectedChannel) && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !generated?.body || selectedContacts.length === 0}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  {'✉'} Send
                </button>
              )}
            </div>
          </div>

          {/* Subject / hook */}
          {selectedChannel === 'email' && generated?.subject && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-[10px] font-semibold tracking-wide uppercase text-blue-500 mb-1">
                Subject
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {generated.subject}
              </div>
            </div>
          )}

          {selectedChannel === 'linkedin_inmail' && generated?.hook && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-[10px] font-semibold tracking-wide uppercase text-blue-500 mb-1">
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

          {/* Body (all channels except presentation, which renders slides) */}
          {selectedChannel !== 'presentation' && (
            <div className="p-5">
              <div className="font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap p-4 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-zinc-700">
                {generated?.body ?? 'Content generation not available for this channel.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
