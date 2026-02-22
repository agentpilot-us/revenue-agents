/**
 * Generate a one-line "why this contact would care" for display in contact lists.
 * Stored in enrichedData.whyRelevant (no schema change).
 */

import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';

export type WhyRelevantParams = {
  contactTitle: string;
  departmentName: string;
  companyName: string;
  valueProp?: string | null;
  useCase?: string | null;
};

/**
 * Returns a single sentence explaining why this contact (by title) would care
 * about the seller's offer in the context of the department and company.
 */
export async function generateWhyRelevant(params: WhyRelevantParams): Promise<string> {
  const { contactTitle, departmentName, companyName, valueProp, useCase } = params;
  const { text } = await generateText({
    model: getChatModel(),
    maxOutputTokens: 150,
    prompt: `You are a B2B sales analyst. In one short sentence (max 25 words), explain why a contact with this job title would care about our solution in the context of this buying group and company. Be specific and actionable.

Contact title: ${contactTitle || 'Unknown'}
Buying group / segment: ${departmentName}
Company: ${companyName}
${valueProp ? `Our value prop for this segment: ${valueProp}` : ''}
${useCase ? `Use case: ${useCase}` : ''}

Output only the one sentence, no quotes or prefix.`,
  });
  return (text || '').trim().slice(0, 300);
}
