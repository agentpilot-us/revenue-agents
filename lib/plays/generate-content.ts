import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import {
  buildContentContext,
  type ContentContextInput,
} from '@/lib/content/build-content-context';

export type GenerateContentInput = ContentContextInput & {
  prompt?: string;
};

export type GenerateContentOutput = {
  raw: string;
  parsed: Record<string, unknown>;
};

export async function generateOneContent(
  input: GenerateContentInput,
): Promise<GenerateContentOutput> {
  const { prompt, ...contextInput } = input;
  const ctx = await buildContentContext(contextInput);

  const userPrompt = prompt
    ? `User prompt: ${prompt}\n\n${ctx.userPrompt}`
    : ctx.userPrompt;

  const { text } = await generateText({
    model: getChatModel(ctx.effectiveModelTier, ctx.modelHint),
    maxOutputTokens: ctx.maxOutputTokens,
    system: ctx.systemPrompt,
    prompt: userPrompt,
  });

  const raw = text.trim();
  const parsed = ctx.channelConfig.parseOutput(raw);

  return { raw, parsed };
}
