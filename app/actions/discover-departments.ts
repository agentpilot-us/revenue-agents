'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { researchCompany } from '@/lib/tools/perplexity';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { DepartmentType } from '@prisma/client';
import { z } from 'zod';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const departmentDiscoverySchema = z.object({
  departments: z.array(
    z.object({
      type: z.nativeEnum(DepartmentType),
      customName: z.string().optional(),
      confidence: z.number().min(0).max(100),
      reasoning: z.string(),
      estimatedSize: z.number().optional(),
    })
  ),
});

export type DiscoveredDepartment = z.infer<
  typeof departmentDiscoverySchema
>['departments'][number];

export async function discoverDepartments(
  companyId: string
): Promise<DiscoveredDepartment[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    include: {
      contacts: {
        select: { title: true, department: true },
      },
    },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const researchPrompt = `
Research the organizational structure of ${company.name}${company.domain ? ` (${company.domain})` : ''}.
Based on their website, LinkedIn company page, and job postings:

1. What departments/business units do they have?
2. How large is each department (estimated employee count)?
3. What are the primary functions of each department?

Focus on departments relevant to B2B sales/expansion (not HR, Legal, etc. unless strategic).
`.trim();

  const researchResult = await researchCompany({
    query: researchPrompt,
    companyName: company.name,
    companyDomain: company.domain ?? undefined,
  });

  if (!researchResult.ok) {
    throw new Error(researchResult.error || 'Research failed');
  }

  const researchSummary = researchResult.summary;
  const contactTitles = company.contacts
    .map((c) => c.title ?? c.department)
    .filter(Boolean);
  const contactContext =
    contactTitles.length > 0
      ? `Known contacts (job titles/departments): ${[...new Set(contactTitles)].join(', ')}`
      : 'No known contacts yet.';

  const { output } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    maxOutputTokens: 2000,
    prompt: `
Based on this research about ${company.name}:

${researchSummary}

${contactContext}

Identify which departments exist at this company.
Map each to one of these standardized DepartmentTypes:
${Object.values(DepartmentType).join(', ')}

For each department:
- Provide confidence score (0-100)
- Explain reasoning
- Estimate size (estimated employee count) if possible
- Optionally provide a customName if they use a specific name (e.g. "Cruise" for autonomous vehicles)

Only include departments relevant to potential product sales/expansion.
    `.trim(),
    output: Output.object({
      schema: departmentDiscoverySchema,
      name: 'DepartmentDiscovery',
      description:
        'List of departments inferred from research and contact data',
    }),
  });

  return output.departments;
}
