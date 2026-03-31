'use server';

import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';

const personaMatchSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestedDepartment: z.string().optional(),
});

export async function matchPersona(contactData: {
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  linkedinBio?: string;
  companyIndustry?: string;
  department?: string;
}) {
  const personas = await prisma.persona.findMany({
    where: { userId: contactData.userId },
    orderBy: { name: 'asc' },
  });

  if (personas.length === 0) {
    return {
      personaId: '',
      personaName: '',
      confidence: 0,
      reasoning:
        'No buyer personas in your workspace yet. Add them under My Company → Personas, then try again.',
    };
  }

  const deptLine = contactData.department ? `Department: ${contactData.department}` : '';

  const { object } = await generateObject({
    model: getChatModel(),
    schema: personaMatchSchema,
    prompt: `
      You are matching a contact to the best persona in our system.
      
      CONTACT INFORMATION:
      Name: ${contactData.firstName} ${contactData.lastName}
      Title: ${contactData.title}
      Company: ${contactData.companyName}
      Industry: ${contactData.companyIndustry ?? 'Unknown'}
      ${contactData.linkedinBio ? `Bio: ${contactData.linkedinBio}` : ''}
      ${deptLine}
      
      AVAILABLE PERSONAS:
      ${personas
        .map(
          (p) => `
        ID: ${p.id}
        Name: ${p.name}
        Description: ${p.description}
        Typical Titles: ${p.includeTitles.join(', ')}
        Department: ${p.primaryDepartment}
        Pain Points: ${p.painPoints.join(', ')}
      `
        )
        .join('\n---\n')}
      
      TASK:
      Match this contact to the best persona based on:
      1. Job title (exact match or semantic similarity)
      2. Department (if known)
      3. Seniority level (IC vs Manager vs Director vs VP vs C-suite)
      4. Industry context
      
      Return:
      - Persona ID (from list above)
      - Confidence score (0-100)
      - Reasoning (why this persona fits)
      - Suggested department (if not provided and you can infer it)
      
      IMPORTANT:
      - If title contains "VP", "SVP", "Chief", they're likely Economic Buyer
      - If title contains "Director", "Manager", they're likely Program Manager or Technical Buyer
      - If title is IC (Engineer, Designer, etc.), they're End User or Technical Buyer
      - Consider industry: Automotive → Manufacturing/AV personas, SaaS → GTM personas
    `,
  });

  return object;
}
