import { generatePptxBuffer } from '@/lib/export/generate-pptx';
import { type AssetPackage } from '@/lib/content/build-asset-package';
import { getAssetTemplate } from '@/lib/templates/asset-template-registry';
import { salesPageHtml } from '@/lib/templates/sales-page-html';

type Slide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

type ArtifactRenderResult = {
  templateLabel: string;
  html?: string;
  pptx?: Buffer;
  googleDocsBody?: string;
  googleSlides?: Slide[];
  gmailDraft?: {
    subject: string;
    body: string;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderGenericHtml(title: string, raw: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #111827; margin: 0; }
    main { max-width: 920px; margin: 0 auto; padding: 48px 24px 80px; }
    .eyebrow { text-transform: uppercase; letter-spacing: .12em; color: #6d28d9; font-size: 12px; font-weight: 700; }
    .hero { margin-top: 12px; font-size: 34px; font-weight: 800; }
    pre { white-space: pre-wrap; background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 24px; line-height: 1.6; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">AgentPilot Asset</div>
    <div class="hero">${escapeHtml(title)}</div>
    <pre>${escapeHtml(raw)}</pre>
  </main>
</body>
</html>`;
}

function toSlides(assetPackage: AssetPackage): Slide[] {
  if (Array.isArray(assetPackage.structuredPayload.slides)) {
    return assetPackage.structuredPayload.slides.reduce<Slide[]>((slides, slide) => {
      if (!slide || typeof slide !== 'object') return slides;
      const record = slide as Record<string, unknown>;
      slides.push({
        title: typeof record.title === 'string' ? record.title : 'Slide',
        bullets: Array.isArray(record.bullets)
          ? record.bullets.filter((item): item is string => typeof item === 'string')
          : [],
        speakerNotes:
          typeof record.speakerNotes === 'string' ? record.speakerNotes : undefined,
      });
      return slides;
    }, []);
  }

  if (assetPackage.channel === 'champion_enablement') {
    const outline = Array.isArray(assetPackage.structuredPayload.deckOutline)
      ? assetPackage.structuredPayload.deckOutline.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];
    return outline.map((title) => ({
      title,
      bullets: [],
    }));
  }

  if (assetPackage.channel === 'qbr_ebr_script') {
    const sections = Array.isArray(assetPackage.structuredPayload.sections)
      ? assetPackage.structuredPayload.sections
      : [];
    return sections.map((section, index) => {
      const record = section as Record<string, unknown>;
      return {
        title: typeof record.title === 'string' ? record.title : `Section ${index + 1}`,
        bullets: Array.isArray(record.recommendations)
          ? record.recommendations.filter((item): item is string => typeof item === 'string')
          : [],
        speakerNotes: typeof record.narrative === 'string' ? record.narrative : undefined,
      };
    });
  }

  return [];
}

export async function renderAssetArtifact(
  assetPackage: AssetPackage,
): Promise<ArtifactRenderResult> {
  const template = getAssetTemplate(assetPackage.templateType);

  if (assetPackage.templateType === 'presentation_deck') {
    const slides = toSlides(assetPackage);
    return {
      templateLabel: template.label,
      html: renderGenericHtml(template.label, assetPackage.formattedRaw),
      pptx: await generatePptxBuffer({
        title: template.label,
        slides,
      }),
      googleSlides: slides,
    };
  }

  if (assetPackage.templateType === 'sales_page_html') {
    const payload = assetPackage.structuredPayload;
    return {
      templateLabel: template.label,
      html: salesPageHtml({
        title: typeof payload.headline === 'string' ? payload.headline : template.label,
        valueProp:
          Array.isArray(payload.valueProps) && payload.valueProps[0]
            ? String(payload.valueProps[0])
            : assetPackage.formattedRaw,
        benefits: Array.isArray(payload.valueProps)
          ? payload.valueProps.filter((item): item is string => typeof item === 'string')
          : [],
        ctaLabel: typeof payload.cta === 'string' ? payload.cta : 'Contact us',
        ctaUrl: '#',
      }),
      googleDocsBody: assetPackage.formattedRaw,
    };
  }

  const html = renderGenericHtml(template.label, assetPackage.formattedRaw);
  const gmailDraft =
    assetPackage.channel === 'champion_enablement' &&
    assetPackage.structuredPayload.forwardEmail &&
    typeof assetPackage.structuredPayload.forwardEmail === 'object'
      ? {
          subject:
            typeof (assetPackage.structuredPayload.forwardEmail as Record<string, unknown>).subject ===
            'string'
              ? ((assetPackage.structuredPayload.forwardEmail as Record<string, unknown>).subject as string)
              : `${template.label} for review`,
          body:
            typeof (assetPackage.structuredPayload.forwardEmail as Record<string, unknown>).body ===
            'string'
              ? ((assetPackage.structuredPayload.forwardEmail as Record<string, unknown>).body as string)
              : assetPackage.formattedRaw,
        }
      : undefined;

  return {
    templateLabel: template.label,
    html,
    googleDocsBody: assetPackage.formattedRaw,
    googleSlides: toSlides(assetPackage),
    gmailDraft,
  };
}
