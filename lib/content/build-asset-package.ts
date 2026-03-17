import {
  buildContentContext,
  type ContentContextInput,
  type ContentContextOutput,
} from '@/lib/content/build-content-context';
import type {
  ChannelId,
  DestinationTarget,
  TemplateType,
} from '@/lib/content/channel-config';
import type { GenerateContentOutput } from '@/lib/content/generate-content';

export type AssetPackage = {
  channel: ChannelId;
  templateType: TemplateType;
  routing: {
    gatewayModel?: string;
    modelHint?: string;
    effectiveModelTier: 'fast' | 'full';
  };
  contextSummary: {
    systemPromptPreview: string;
    userPrompt: string;
  };
  structuredPayload: Record<string, unknown>;
  formattedRaw: string;
  exportTargets: DestinationTarget[];
  workspaceTargets: DestinationTarget[];
};

type BuildAssetPackageInput = {
  contextInput: ContentContextInput;
  generation: GenerateContentOutput;
  context?: ContentContextOutput;
};

function summarizePrompt(text: string, maxChars = 500): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > maxChars
    ? `${compact.slice(0, maxChars).trimEnd()}…`
    : compact;
}

export async function buildAssetPackage({
  contextInput,
  generation,
  context,
}: BuildAssetPackageInput): Promise<AssetPackage | null> {
  const resolvedContext = context ?? (await buildContentContext(contextInput));
  const config = resolvedContext.channelConfig;

  if (config.deliveryMode !== 'asset_package') {
    return null;
  }

  return {
    channel: config.id,
    templateType: config.templateType,
    routing: {
      gatewayModel: resolvedContext.gatewayModel,
      modelHint: resolvedContext.modelHint,
      effectiveModelTier: resolvedContext.effectiveModelTier,
    },
    contextSummary: {
      systemPromptPreview: summarizePrompt(resolvedContext.systemPrompt),
      userPrompt: resolvedContext.userPrompt,
    },
    structuredPayload: generation.parsed,
    formattedRaw: generation.raw,
    exportTargets: config.destinationTargets.filter(
      (target) => target === 'pptx_download' || target === 'html_preview' || target === 'copy',
    ),
    workspaceTargets: config.destinationTargets.filter((target) =>
      ['google_docs', 'google_slides', 'google_drive_file', 'gmail_draft'].includes(
        target,
      ),
    ),
  };
}
