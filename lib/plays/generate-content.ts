import { generateObject, generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import {
  buildContentContext,
  type ContentContextInput,
} from '@/lib/content/build-content-context';
import type { GeneratedVariant } from '@/lib/content/channel-config';

export type GenerateContentInput = ContentContextInput & {
  prompt?: string;
  variantCount?: number;
};

export type GenerateContentOutput = {
  raw: string;
  parsed: Record<string, unknown>;
  variants?: GeneratedVariant[];
};

export async function generateOneContent(
  input: GenerateContentInput,
): Promise<GenerateContentOutput> {
  const { prompt, ...contextInput } = input;
  const ctx = await buildContentContext(contextInput);

  const userPrompt = prompt
    ? `User prompt: ${prompt}\n\n${ctx.userPrompt}`
    : ctx.userPrompt;
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
    const { object } = await generateObject({
      model,
      schema: ctx.channelConfig.buildVariantSchema(input.variantCount),
      maxOutputTokens: ctx.maxOutputTokens,
      system: ctx.systemPrompt,
      prompt: `${userPrompt}\n\nReturn ${input.variantCount} distinct variants. Each variant must have a short label and a meaningfully different angle.`,
    });
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
    };
  }

  if (ctx.channelConfig.outputMode === 'object' && ctx.channelConfig.outputSchema) {
    const { object } = await generateObject({
      model,
      schema: ctx.channelConfig.outputSchema,
      maxOutputTokens: ctx.maxOutputTokens,
      system: ctx.systemPrompt,
      prompt: userPrompt,
    });

    const parsed = object as Record<string, unknown>;
    const raw = ctx.channelConfig.formatOutput(parsed);

    return { raw, parsed };
  }

  const { text } = await generateText({
    model,
    maxOutputTokens: ctx.maxOutputTokens,
    system: ctx.systemPrompt,
    prompt: userPrompt,
  });

  const raw = text.trim();
  const parsed = ctx.channelConfig.parseOutput(raw);

  return { raw, parsed };
}
