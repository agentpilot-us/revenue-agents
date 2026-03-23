'use client';

import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { buildContentUrl, type ContentChannel } from '@/lib/urls/content';
import ContactSelector from '@/app/components/shared/ContactSelector';

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
  accountType?: string | null;
  primaryMotion?: string | null;
};

type ChannelItem = {
  id: string;
  label: string;
  mode: string;
  group: string;
  deliveryMode?: 'direct_draft' | 'asset_package';
  templateType?: string;
  destinationTargets?: string[];
  intents: { id: string; label: string }[];
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
  generated_image: '\ud83d\uddbc',
  generated_video: '\ud83c\udf9e',
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

type SlideItem = {
  slideNumber: number;
  title: string;
  bullets: string[];
  speakerNotes: string;
};

type GeneratedVariantItem = {
  id: string;
  label: string;
  raw: string;
  data: Record<string, unknown>;
};

type GeneratedState = {
  id?: string;
  renderer?: string;
  deliveryMode?: 'direct_draft' | 'asset_package';
  templateType?: string;
  destinationTargets?: string[];
  raw: string;
  data: Record<string, unknown>;
  assetPackage?: Record<string, unknown>;
  variants?: GeneratedVariantItem[];
  selectedVariantId?: string;
};

type MediaAsset = {
  assetKind: 'image' | 'video';
  base64: string;
  mimeType: string;
  filename: string;
  promptUsed?: string;
  aspectRatio?: string;
  durationSeconds?: number;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toMediaAsset(value: unknown): MediaAsset | null {
  const record = toRecord(value);
  const assetKind =
    record.assetKind === 'image' || record.assetKind === 'video'
      ? record.assetKind
      : null;
  const base64 = typeof record.base64 === 'string' ? record.base64 : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
  const filename = typeof record.filename === 'string' ? record.filename : '';

  if (!assetKind || !base64 || !mimeType || !filename) {
    return null;
  }

  return {
    assetKind,
    base64,
    mimeType,
    filename,
    promptUsed:
      typeof record.promptUsed === 'string' ? record.promptUsed : undefined,
    aspectRatio:
      typeof record.aspectRatio === 'string' ? record.aspectRatio : undefined,
    durationSeconds:
      typeof record.durationSeconds === 'number'
        ? record.durationSeconds
        : undefined,
  };
}

function getMediaAsset(data: Record<string, unknown>): MediaAsset | null {
  return toMediaAsset(data.media) ?? toMediaAsset(data);
}

function dataUrlForMedia(media: MediaAsset): string {
  return `data:${media.mimeType};base64,${media.base64}`;
}

function downloadMediaAsset(media: MediaAsset) {
  const a = document.createElement('a');
  a.href = dataUrlForMedia(media);
  a.download = media.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function toSlides(value: unknown): SlideItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const record = toRecord(item);
      const title = typeof record.title === 'string' ? record.title : `Slide ${index + 1}`;
      const bullets = toStringArray(record.bullets);
      const speakerNotes =
        typeof record.speakerNotes === 'string' ? record.speakerNotes : '';
      return {
        slideNumber: index + 1,
        title,
        bullets,
        speakerNotes,
      };
    })
    .filter((slide) => slide.title || slide.bullets.length > 0);
}

function normalizeGeneratedResponse(data: Record<string, unknown>): GeneratedState {
  const variants = Array.isArray(data.variants)
    ? data.variants
        .map((item) => {
          const record = toRecord(item);
          const id = typeof record.contentId === 'string' ? record.contentId : '';
          const label = typeof record.label === 'string' ? record.label : 'Variant';
          const raw = typeof record.raw === 'string' ? record.raw : '';
          const { contentId: _contentId, label: _label, raw: _raw, ...rest } = record;
          return {
            id,
            label,
            raw,
            data: rest,
          };
        })
        .filter((variant) => variant.id && variant.raw)
    : undefined;

  const {
    contentId,
    raw,
    renderer,
    deliveryMode,
    templateType,
    destinationTargets,
    assetPackage,
    variants: _variants,
    ...rest
  } = data;

  return {
    id: typeof contentId === 'string' ? contentId : undefined,
    raw: typeof raw === 'string' ? raw : '',
    renderer: typeof renderer === 'string' ? renderer : undefined,
    deliveryMode:
      deliveryMode === 'asset_package' || deliveryMode === 'direct_draft'
        ? deliveryMode
        : undefined,
    templateType: typeof templateType === 'string' ? templateType : undefined,
    destinationTargets: toStringArray(destinationTargets),
    data: rest,
    assetPackage: toRecord(assetPackage),
    variants,
    selectedVariantId: variants?.[0]?.id,
  };
}

function getSelectedOutput(generated: GeneratedState | null) {
  if (!generated) return null;
  if (generated.variants?.length) {
    return (
      generated.variants.find((variant) => variant.id === generated.selectedVariantId) ??
      generated.variants[0]
    );
  }
  return {
    id: generated.id ?? '',
    label: '',
    raw: generated.raw,
    data: generated.data,
  };
}

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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/40 p-4">
      <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-2">
        {title}
      </div>
      <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function StructuredOutput({
  renderer,
  data,
}: {
  renderer: string;
  data: Record<string, unknown>;
}) {
  const media = getMediaAsset(data);

  if (renderer === 'image_asset' && media?.assetKind === 'image') {
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/40">
          <img
            src={dataUrlForMedia(media)}
            alt="Generated asset preview"
            className="w-full h-auto max-h-[520px] object-contain bg-zinc-950"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span>{media.mimeType}</span>
          {media.aspectRatio && <span>{media.aspectRatio}</span>}
          <span>{media.filename}</span>
        </div>
        {media.promptUsed && (
          <SectionCard title="Generation Prompt">{media.promptUsed}</SectionCard>
        )}
      </div>
    );
  }

  if (renderer === 'video_asset' && media?.assetKind === 'video') {
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-black">
          <video
            controls
            src={dataUrlForMedia(media)}
            className="w-full h-auto max-h-[520px]"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span>{media.mimeType}</span>
          {media.aspectRatio && <span>{media.aspectRatio}</span>}
          {media.durationSeconds && <span>{media.durationSeconds}s</span>}
          <span>{media.filename}</span>
        </div>
        {media.promptUsed && (
          <SectionCard title="Generation Prompt">{media.promptUsed}</SectionCard>
        )}
      </div>
    );
  }

  if (renderer === 'email' || renderer === 'linkedin_inmail') {
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Body">{String(data.body ?? '')}</SectionCard>
        {typeof data.ps === 'string' && data.ps && (
          <SectionCard title="P.S.">{data.ps}</SectionCard>
        )}
      </div>
    );
  }

  if (renderer === 'linkedin_post') {
    const hashtags = toStringArray(data.hashtags);
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Hook">{String(data.hook ?? '')}</SectionCard>
        <SectionCard title="Post">{String(data.body ?? '')}</SectionCard>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (renderer === 'sales_page') {
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Headline">{String(data.headline ?? '')}</SectionCard>
        <SectionCard title="Value Props">
          <ul className="list-disc pl-5 space-y-1">
            {toStringArray(data.valueProps).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="CTA">{String(data.cta ?? '')}</SectionCard>
      </div>
    );
  }

  if (renderer === 'ad_brief') {
    return (
      <div className="p-5 grid gap-4 md:grid-cols-2">
        <SectionCard title="Objective">{String(data.objective ?? '')}</SectionCard>
        <SectionCard title="Target Audience">
          {String(data.targetAudience ?? '')}
        </SectionCard>
        <SectionCard title="Key Message">{String(data.keyMessage ?? '')}</SectionCard>
        <SectionCard title="Body Copy">{String(data.bodyCopy ?? '')}</SectionCard>
        <SectionCard title="Headline Options">
          <ul className="list-disc pl-5 space-y-1">
            {toStringArray(data.headlineOptions).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="CTA">{String(data.cta ?? '')}</SectionCard>
        <div className="md:col-span-2">
          <SectionCard title="Visual Direction">
            {String(data.visualDirection ?? '')}
          </SectionCard>
        </div>
      </div>
    );
  }

  if (renderer === 'one_pager') {
    const sections = Array.isArray(data.sections)
      ? data.sections.map((item) => toRecord(item))
      : [];
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {String(data.headline ?? '')}
          </div>
        </div>
        {sections.map((section) => (
          <SectionCard
            key={`${String(section.heading ?? '')}-${String(section.body ?? '')}`}
            title={String(section.heading ?? 'Section')}
          >
            {String(section.body ?? '')}
          </SectionCard>
        ))}
        <SectionCard title="CTA">{String(data.cta ?? '')}</SectionCard>
      </div>
    );
  }

  if (renderer === 'talk_track') {
    const objections = Array.isArray(data.objections)
      ? data.objections.map((item) => toRecord(item))
      : [];
    return (
      <div className="p-5 grid gap-4 md:grid-cols-2">
        <SectionCard title="Opening">{String(data.opening ?? '')}</SectionCard>
        <SectionCard title="Pain Probe">{String(data.painProbe ?? '')}</SectionCard>
        <SectionCard title="Value Props">
          <ul className="list-disc pl-5 space-y-1">
            {toStringArray(data.valueProps).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Proof Point">{String(data.proofPoint ?? '')}</SectionCard>
        <div className="md:col-span-2">
          <SectionCard title="Objections">
            <div className="space-y-3">
              {objections.map((item, index) => (
                <div key={`${String(item.objection ?? '')}-${index}`}>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {String(item.objection ?? '')}
                  </div>
                  <div>{String(item.response ?? '')}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-2">
          <SectionCard title="Next Step">{String(data.nextStep ?? '')}</SectionCard>
        </div>
      </div>
    );
  }

  if (renderer === 'champion_enablement') {
    const deckOutline = Array.isArray(data.deckOutline)
      ? data.deckOutline.map((item) => toRecord(item))
      : [];
    const forwardEmail = toRecord(data.forwardEmail);
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Deck Outline">
          <div className="space-y-3">
            {deckOutline.map((item, index) => (
              <div key={`${String(item.slide ?? '')}-${index}`}>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Slide {index + 1}: {String(item.slide ?? '')}
                </div>
                <div>{String(item.content ?? '')}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Talking Points">
          <ul className="list-disc pl-5 space-y-1">
            {toStringArray(data.talkingPoints).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Forward Email">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {String(forwardEmail.subject ?? '')}
          </div>
          <div>{String(forwardEmail.body ?? '')}</div>
        </SectionCard>
      </div>
    );
  }

  if (renderer === 'map') {
    const milestones = Array.isArray(data.milestones)
      ? data.milestones.map((item) => toRecord(item))
      : [];
    return (
      <div className="p-5 space-y-3">
        {milestones.map((item, index) => (
          <div
            key={`${String(item.date ?? '')}-${index}`}
            className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {String(item.action ?? '')}
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-violet-500/10 text-violet-400">
                {String(item.status ?? '')}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {String(item.date ?? '')} · {String(item.owner ?? '')}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (renderer === 'video') {
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Hook">{String(data.hook ?? '')}</SectionCard>
        <SectionCard title="Script">{String(data.body ?? '')}</SectionCard>
        <SectionCard title="Talk Track">{String(data.talkTrack ?? '')}</SectionCard>
        <SectionCard title="CTA">{String(data.cta ?? '')}</SectionCard>
      </div>
    );
  }

  if (renderer === 'demo_script') {
    const discoveryQuestions = toStringArray(data.discoveryQuestions);
    const demoFlow = Array.isArray(data.demoFlow)
      ? data.demoFlow.map((item) => toRecord(item))
      : [];
    return (
      <div className="p-5 space-y-4">
        <SectionCard title="Setup">{String(data.setup ?? '')}</SectionCard>
        <SectionCard title="Discovery Questions">
          <ul className="list-disc pl-5 space-y-1">
            {discoveryQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Demo Flow">
          <div className="space-y-3">
            {demoFlow.map((item, index) => (
              <div key={`${String(item.feature ?? '')}-${index}`}>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {String(item.feature ?? '')}
                </div>
                <div>{String(item.narrative ?? '')}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Close">{String(data.close ?? '')}</SectionCard>
      </div>
    );
  }

  if (renderer === 'qbr_ebr_script') {
    const sections = Array.isArray(data.sections)
      ? data.sections.map((item) => toRecord(item))
      : [];
    return (
      <div className="p-5 space-y-4">
        {sections.map((section, index) => (
          <div
            key={`${String(section.title ?? '')}-${index}`}
            className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/40 p-4"
          >
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {String(section.title ?? '')}
            </div>
            {toStringArray(section.metrics).length > 0 && (
              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                  Metrics
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {toStringArray(section.metrics).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {String(section.narrative ?? '')}
            </div>
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                Recommendations
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {toStringArray(section.recommendations).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap p-4 rounded-xl bg-gray-50 dark:bg-zinc-950/40 border border-gray-200 dark:border-zinc-800">
        {String(data.body ?? data.raw ?? '')}
      </div>
    </div>
  );
}

function getSuggestionChips(intentId: string): string[] {
  const byIntent: Record<string, string[]> = {
    introduction: ['Set up intro meeting', 'Congratulate on recent news', 'Invite to upcoming webinar'],
    competitive_displacement: ['Compare key differentiators', 'Migration support details', 'Switching success story'],
    event_invite: ['Invite to webinar', 'Invite to in-person event', 'Share event agenda'],
    follow_up: ['Reference last conversation', 'Share relevant case study', 'Propose next steps'],
    value_reinforcement: ['Highlight value delivered', 'Share usage metrics', 'Discuss roadmap alignment'],
  };
  return byIntent[intentId] ?? ['Set up a meeting', 'Share a case study', 'Reference recent news'];
}

export function ContentTabV2({
  companyId,
  companyName,
  initialDepartmentId,
  signalId,
  initialType,
}: Props) {
  const router = useRouter();

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDepartmentId ?? null);
  const [selectedChannel, setSelectedChannel] = useState<string>(initialType || 'email');
  const [selectedIntent, setSelectedIntent] = useState<string>('introduction');
  const [senderRole, setSenderRole] = useState<string>('ae');
  const [tone, setTone] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generated, setGenerated] = useState<GeneratedState | null>(null);
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
    fetch('/api/content/channels')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.channels)) setChannels(data.channels);
        if (data.defaultContentIntent) setSelectedIntent(data.defaultContentIntent);
      })
      .catch(() => {});
  }, []);

  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const availableIntents = currentChannel?.intents ?? [{ id: 'introduction', label: 'Introduction' }, { id: 'custom', label: 'Other / Custom' }];
  const outreachChannels = channels.filter((c) => c.group === 'outreach');
  const selectedOutput = useMemo(() => getSelectedOutput(generated), [generated]);
  const selectedOutputData = selectedOutput?.data ?? {};
  const selectedOutputRaw = selectedOutput?.raw ?? '';
  const selectedRenderer = generated?.renderer ?? selectedChannel;
  const selectedMedia = useMemo(
    () => getMediaAsset(selectedOutputData),
    [selectedOutputData],
  );
  const isMediaOutput =
    selectedRenderer === 'image_asset' || selectedRenderer === 'video_asset';
  const isAssetPackage =
    (generated?.deliveryMode ?? currentChannel?.deliveryMode) === 'asset_package';
  const selectedAssetPackage = useMemo(() => {
    const base = toRecord(generated?.assetPackage);
    if (Object.keys(base).length > 0) return base;
    if (!generated || !isAssetPackage) return {};
    return {
      channel: selectedChannel,
      templateType: generated.templateType ?? currentChannel?.templateType,
      structuredPayload: selectedOutputData,
      formattedRaw: selectedOutputRaw,
    };
  }, [
    currentChannel?.templateType,
    generated,
    isAssetPackage,
    selectedChannel,
    selectedOutputData,
    selectedOutputRaw,
  ]);
  const selectedSlides = useMemo(
    () => toSlides(selectedOutputData.slides),
    [selectedOutputData],
  );
  const sendSubject =
    typeof selectedOutputData.subject === 'string'
      ? selectedOutputData.subject
      : undefined;
  const sendBody =
    typeof selectedOutputData.body === 'string'
      ? selectedOutputData.body
      : selectedOutputRaw;
  const destinationTargets =
    generated?.destinationTargets ?? currentChannel?.destinationTargets ?? [];

  useEffect(() => {
    if (availableIntents.length > 0 && !availableIntents.find((i) => i.id === selectedIntent)) {
      setSelectedIntent(availableIntents[0].id);
    }
  }, [selectedChannel, availableIntents, selectedIntent]);

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
      setGenerated(normalizeGeneratedResponse(toRecord(data)));
      setIsGenerated(true);
      setShowFeedbackInput(false);
      setRegenerationFeedback('');

      const url = buildContentUrl({
        companyId,
        divisionId: selectedDivisionId ?? undefined,
        channel: selectedChannel as ContentChannel,
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
    if (!selectedOutput?.id && !generated?.id) {
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
          contentId: selectedOutput?.id || generated?.id,
          companyId,
          divisionId: selectedDivisionId ?? undefined,
          channel: selectedChannel,
          contactIds: selectedContacts,
          triggerId: signalId,
          userContext: userContext.trim() || undefined,
          contentIntent: selectedIntent || undefined,
          senderRole: senderRole || undefined,
          tone: tone || undefined,
          feedback: regenerationFeedback.trim() || undefined,
          previousOutput: selectedOutputRaw || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGenerateError(data?.error ?? 'Failed to regenerate content.');
        return;
      }
      const data = await res.json();
      const normalized = normalizeGeneratedResponse(toRecord(data));
      setGenerated((prev) => {
        if (!prev?.variants?.length || !selectedOutput?.id) {
          return normalized;
        }
        return {
          ...prev,
          raw: normalized.raw,
          data: normalized.data,
          renderer: normalized.renderer ?? prev.renderer,
          variants: prev.variants.map((variant) =>
            variant.id === selectedOutput.id
              ? {
                  id: normalized.id ?? variant.id,
                  label: variant.label,
                  raw: normalized.raw,
                  data: normalized.data,
                }
              : variant,
          ),
          selectedVariantId: normalized.id ?? selectedOutput.id,
        };
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
    if (!sendBody || selectedContacts.length === 0 || !selectedDivisionId) return;
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
          subject: sendSubject,
          body: sendBody,
          contentId: selectedOutput?.id || generated?.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSendError(data?.error ?? 'Failed to send content.');
        return;
      }
      const data = await res.json().catch(() => null);
      const draftCount =
        typeof data?.draftsCreated === 'number' ? data.draftsCreated : undefined;
      setSendSuccess(
        draftCount
          ? `Created ${draftCount} Gmail draft${draftCount === 1 ? '' : 's'}.`
          : 'Created Gmail draft.',
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send content.');
    } finally {
      setSending(false);
    }
  };

  const handleAssetPreview = async () => {
    if (!isAssetPackage || Object.keys(selectedAssetPackage).length === 0) return;
    setSendError(null);
    try {
      const res = await fetch('/api/export/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'html_preview',
          assetPackage: selectedAssetPackage,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.html !== 'string') {
        throw new Error(data?.error ?? 'Preview failed');
      }
      const previewWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (previewWindow) {
        previewWindow.document.open();
        previewWindow.document.write(data.html);
        previewWindow.document.close();
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to open preview.');
    }
  };

  const downloadResponse = async (res: Response, fallbackName: string) => {
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAssetExport = async (mode: 'html_download' | 'pptx_download') => {
    if (!isAssetPackage || Object.keys(selectedAssetPackage).length === 0) return;
    setDownloadingPptx(mode === 'pptx_download');
    setSendError(null);
    try {
      const res = await fetch('/api/export/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          assetPackage: selectedAssetPackage,
        }),
      });
      await downloadResponse(
        res,
        `${companyName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')}.${mode === 'pptx_download' ? 'pptx' : 'html'}`,
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to export asset.');
    } finally {
      setDownloadingPptx(false);
    }
  };

  const handleGoogleWorkspaceHandoff = async (
    destination: 'google_docs' | 'google_slides' | 'google_drive_file' | 'gmail_draft',
  ) => {
    if (!isAssetPackage || Object.keys(selectedAssetPackage).length === 0) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      const res = await fetch('/api/handoff/google-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          assetPackage: selectedAssetPackage,
          companyId,
          contactId: selectedContacts[0],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Google Workspace handoff failed.');
      }
      if (typeof data?.result?.url === 'string') {
        window.open(data.result.url, '_blank', 'noopener,noreferrer');
      }
      setSendSuccess(`Opened in ${destination.replace(/_/g, ' ')}.`);
    } catch (e) {
      setSendError(
        e instanceof Error ? e.message : 'Failed to open asset in Google Workspace.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (isAssetPackage) {
      await handleAssetExport('pptx_download');
      return;
    }
    if (selectedSlides.length === 0) return;
    setDownloadingPptx(true);
    try {
      const res = await fetch('/api/export/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${companyName} \u2013 Sales Presentation`,
          companyName,
          slides: selectedSlides.map((s) => ({
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
  const canCreateEmailDraft =
    !isAssetPackage && needContacts && selectedChannel === 'email';
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

  const chips = getSuggestionChips(selectedIntent);
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

        {/* ── Channel ──────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-gray-500 mb-2.5">
            Channel
          </div>
          <div className="flex flex-wrap gap-1.5">
            {outreachChannels.length > 0
              ? outreachChannels.map((ch) => (
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
                ))
              : (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-left border bg-violet-500/10 border-violet-500/25"
                >
                  <span className="text-sm opacity-70">{'\u2709'}</span>
                  <span className="text-[11px] font-semibold text-violet-400">Email</span>
                </button>
              )}
          </div>
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
              {isMediaOutput && selectedMedia && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadMediaAsset(selectedMedia)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                  >
                    {selectedMedia.assetKind === 'video'
                      ? 'Download Video'
                      : 'Download Image'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        selectedMedia.promptUsed ?? selectedOutputRaw,
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                  >
                    Copy Prompt
                  </button>
                </>
              )}
              {isAssetPackage && (
                <>
                  {destinationTargets.includes('html_preview') && (
                    <button
                      type="button"
                      onClick={handleAssetPreview}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                    >
                      Open Preview
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(selectedOutputRaw)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                  >
                    Copy Brief
                  </button>
                  {destinationTargets.includes('google_docs') && (
                    <button
                      type="button"
                      onClick={() => handleGoogleWorkspaceHandoff('google_docs')}
                      disabled={sending}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                    >
                      Open in Google Docs
                    </button>
                  )}
                  {destinationTargets.includes('google_slides') && (
                    <button
                      type="button"
                      onClick={() => handleGoogleWorkspaceHandoff('google_slides')}
                      disabled={sending}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                    >
                      Open in Google Slides
                    </button>
                  )}
                  {destinationTargets.includes('google_drive_file') && (
                    <button
                      type="button"
                      onClick={() => handleGoogleWorkspaceHandoff('google_drive_file')}
                      disabled={sending}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                    >
                      Save to Drive
                    </button>
                  )}
                  {destinationTargets.includes('gmail_draft') && (
                    <button
                      type="button"
                      onClick={() => handleGoogleWorkspaceHandoff('gmail_draft')}
                      disabled={sending || selectedContacts.length === 0}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-50"
                    >
                      Create Gmail Draft
                    </button>
                  )}
                  {destinationTargets.includes('pptx_download') && (
                    <button
                      type="button"
                      onClick={() => handleAssetExport('pptx_download')}
                      disabled={downloadingPptx}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                    >
                      Export Artifact
                    </button>
                  )}
                  {!destinationTargets.includes('pptx_download') && (
                    <button
                      type="button"
                      onClick={() => handleAssetExport('html_download')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                    >
                      Export Artifact
                    </button>
                  )}
                </>
              )}
              {canCreateEmailDraft && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !sendBody || selectedContacts.length === 0}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/25 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                >
                  {'\u2709'} Create Gmail Draft
                </button>
              )}
              {!isAssetPackage && !isMediaOutput && (
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(selectedOutputRaw)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
                >
                  Copy Draft
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

          {generated?.variants && generated.variants.length > 1 && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/30">
              <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-2">
                Variants
              </div>
              <div className="flex flex-wrap gap-2">
                {generated.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      setGenerated((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedVariantId: variant.id,
                            }
                          : prev,
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      generated.selectedVariantId === variant.id
                        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                        : 'bg-transparent border-gray-200 dark:border-zinc-700/50 text-gray-500 hover:border-violet-500/20 hover:text-gray-300'
                    }`}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject / hook */}
          {selectedChannel === 'email' &&
            typeof selectedOutputData.subject === 'string' && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800">
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                Subject
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedOutputData.subject}
              </div>
            </div>
          )}

          {selectedChannel === 'linkedin_inmail' &&
            typeof selectedOutputData.subject === 'string' && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800">
              <div className="text-[10px] font-bold tracking-wider uppercase text-violet-400 mb-1">
                Subject (200 char max)
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedOutputData.subject}
              </div>
            </div>
          )}

          {/* Presentation slides */}
          {selectedChannel === 'presentation' && selectedSlides.length > 0 && (
            <PresentationSlidesOutput
              slides={selectedSlides}
              onCopyAll={() => {
                const text = selectedSlides
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
            <StructuredOutput renderer={selectedRenderer} data={selectedOutputData} />
          )}
        </div>
      )}
    </div>
  );
}
