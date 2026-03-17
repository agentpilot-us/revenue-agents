import { generateObject, generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import {
  buildContentContext,
  type ContentContextInput,
} from '@/lib/content/build-content-context';
import type { GeneratedVariant } from '@/lib/content/channel-config';
import { generateImageAsset, type GeneratedImageAsset } from '@/lib/llm/generate-image';
import { generateVideoAsset, type GeneratedVideoAsset } from '@/lib/llm/generate-video';

export type GenerateContentInput = ContentContextInput & {
  prompt?: string;
  variantCount?: number;
  feedback?: string;
  previousOutput?: string;
  mediaAspectRatio?: string;
  mediaDurationSeconds?: number;
};

export type GeneratedMediaAsset = GeneratedImageAsset | GeneratedVideoAsset;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type GenerateContentOutput = {
  raw: string;
  parsed: Record<string, unknown>;
  variants?: GeneratedVariant[];
  media?: GeneratedMediaAsset;
  /** Set when the underlying model returns usage (e.g. for ContentGenerationLog). */
  usage?: TokenUsage;
};

function buildUserPrompt(
  basePrompt: string,
  prompt?: string,
  feedback?: string,
  previousOutput?: string,
): string {
  const sections = [prompt ? `User prompt: ${prompt}` : '', basePrompt];

  if (feedback?.trim()) {
    sections.push(
      [
        'Revision request:',
        feedback.trim(),
        previousOutput?.trim() ? `Previous output summary:\n${previousOutput.trim()}` : '',
        'Keep the same underlying goal and improve the output based on the request above.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

function buildMediaPrompt(systemPrompt: string, userPrompt: string): string {
  return `${systemPrompt}\n\n${userPrompt}`.trim();
}

export async function generateOneContent(
  input: GenerateContentInput,
): Promise<GenerateContentOutput> {
  const {
    prompt,
    feedback,
    previousOutput,
    mediaAspectRatio,
    mediaDurationSeconds,
    ...contextInput
  } = input;
  const ctx = await buildContentContext(contextInput);

  const userPrompt = buildUserPrompt(
    ctx.userPrompt,
    prompt,
    feedback,
    previousOutput,
  );

  if (ctx.channelConfig.generationKind === 'image') {
    const media = await generateImageAsset({
      prompt: buildMediaPrompt(ctx.systemPrompt, userPrompt),
      modelId: ctx.channelConfig.gatewayModel,
      aspectRatio: mediaAspectRatio,
    });
    const parsed = {
      assetKind: media.assetKind,
      base64: media.base64,
      mimeType: media.mimeType,
      filename: media.filename,
      promptUsed: media.promptUsed,
      aspectRatio: media.aspectRatio,
    };

    return {
      raw: media.promptUsed,
      parsed,
      media,
    };
  }

  if (ctx.channelConfig.generationKind === 'video') {
    const media = await generateVideoAsset({
      prompt: buildMediaPrompt(ctx.systemPrompt, userPrompt),
      modelId: ctx.channelConfig.gatewayModel,
      aspectRatio: mediaAspectRatio,
      durationSeconds: mediaDurationSeconds,
    });
    const parsed = {
      assetKind: media.assetKind,
      base64: media.base64,
      mimeType: media.mimeType,
      filename: media.filename,
      promptUsed: media.promptUsed,
      aspectRatio: media.aspectRatio,
      durationSeconds: media.durationSeconds,
    };

    return {
      raw: media.promptUsed,
      parsed,
      media,
    };
  }

  const model = getChatModel(
    ctx.effectiveModelTier,
    ctx.modelHint,
    ctx.gatewayModel,
  );

  if (
    input.variantCount &&
    input.variantCount > 1 &&
    ctx.channelConfig.buildVariantSchema
  ) {
    const result = await generateObject({
      model,
      schema: ctx.channelConfig.buildVariantSchema(input.variantCount),
      maxOutputTokens: ctx.maxOutputTokens,
      system: ctx.systemPrompt,
      prompt: `${userPrompt}\n\nReturn ${input.variantCount} distinct variants. Each variant must have a short label and a meaningfully different angle.`,
    });
    const { object } = result;
    const usage = extractUsage(result);
    const variants = object.variants.map((variant: Record<string, unknown>) => {
      const parsed = variant as Record<string, unknown>;
      const raw = ctx.channelConfig.formatOutput(parsed);
      return {
        label:
          typeof parsed.label === 'string' && parsed.label.trim()
            ? parsed.label
            : 'Variant',
        raw,
        parsed,
      };
    });

    return {
      raw: variants[0]?.raw ?? '',
      parsed: variants[0]?.parsed ?? {},
      variants,
      usage,
    };
  }

  if (ctx.channelConfig.outputMode === 'object' && ctx.channelConfig.outputSchema) {
    const result = await generateObject({
      model,
      schema: ctx.channelConfig.outputSchema,
      maxOutputTokens: ctx.maxOutputTokens,
      system: ctx.systemPrompt,
      prompt: userPrompt,
    });
    const { object } = result;
    const usage = extractUsage(result);
    const parsed = object as Record<string, unknown>;
    const raw = ctx.channelConfig.formatOutput(parsed);

    return { raw, parsed, usage };
  }

  const result = await generateText({
    model,
    maxOutputTokens: ctx.maxOutputTokens,
    system: ctx.systemPrompt,
    prompt: userPrompt,
  });
  const usage = extractUsage(result);
  const raw = result.text.trim();
  const parsed = ctx.channelConfig.parseOutput(raw);

  return { raw, parsed, usage };
}

function extractUsage(result: { usage?: unknown }): TokenUsage | undefined {
  const u = result.usage as
    | {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        inputTokens?: { total?: number };
        outputTokens?: { total?: number };
      }
    | undefined;
  if (!u) return undefined;
  const prompt =
    Number(u.promptTokens) ?? Number(u.inputTokens?.total) ?? 0;
  const completion =
    Number(u.completionTokens) ?? Number(u.outputTokens?.total) ?? 0;
  const total = Number(u.totalTokens) || prompt + completion;
  if (prompt === 0 && completion === 0) return undefined;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
}
