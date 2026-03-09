import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';

export const maxDuration = 60;

const suggestedStepSchema = z.object({
  label: z.string().describe('Short action-oriented step name'),
  description: z.string().describe('Why this step matters and what to do'),
  channel: z.enum([
    'email', 'linkedin', 'phone', 'call', 'meeting', 'sales_page',
    'briefing', 'video', 'gift', 'event', 'content', 'ad_brief',
    'crm', 'in_product', 'demo', 'proposal', 'case_study', 'task', 'internal',
  ]).describe('Best channel for this step'),
  dayOffset: z.number().describe('Suggested day offset from play start'),
});

const suggestPlanResponseSchema = z.object({
  playName: z.string().describe('Suggested play name'),
  playDescription: z.string().describe('One-sentence play description'),
  steps: z.array(suggestedStepSchema).min(2).max(12),
  reasoning: z.string().describe('Brief explanation of why this plan fits the objective'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; departmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, departmentId } = await params;
    const body = await req.json();
    const objective: string = body.objective?.trim();

    if (!objective) {
      return NextResponse.json({ error: 'objective is required' }, { status: 400 });
    }

    const [company, dept, roadmap, contentLibrary] = await Promise.all([
      prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: {
          id: true, name: true, domain: true, industry: true,
          accountType: true, dealObjective: true, keyInitiatives: true,
          researchData: true,
        },
      }),
      prisma.companyDepartment.findFirst({
        where: { id: departmentId, companyId },
        select: {
          id: true, type: true, customName: true, segmentType: true,
          industry: true, useCase: true, valueProp: true,
          targetRoles: true, notes: true, estimatedOpportunity: true,
          whyThisGroupBuys: true, objectionHandlers: true,
        },
      }),
      prisma.adaptiveRoadmap.findFirst({
        where: { companyId, userId: session.user.id },
        select: {
          roadmapType: true, objective: true, contentStrategy: true,
        },
      }),
      prisma.contentLibrary.findMany({
        where: { userId: session.user.id, isActive: true, archivedAt: null },
        select: { title: true, type: true, persona: true, department: true, industry: true },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const divisionName = dept.customName || dept.type.replace(/_/g, ' ');

    const contentSummary = contentLibrary.length > 0
      ? contentLibrary.map((c) => {
          const tags = [c.type, c.persona, c.department, c.industry].filter(Boolean).join(', ');
          return `- ${c.title} (${tags})`;
        }).join('\n')
      : 'No content library items available yet.';

    const channels = [
      'email', 'linkedin', 'phone', 'meeting', 'video',
      'demo', 'sales_page', 'content', 'event', 'gift',
      'briefing', 'proposal', 'case_study', 'task',
    ];

    const sapContext = roadmap
      ? `Strategic Account Plan: type=${roadmap.roadmapType}, objective=${JSON.stringify(roadmap.objective)}, contentStrategy=${JSON.stringify(roadmap.contentStrategy)}`
      : 'No strategic account plan configured yet.';

    const researchSnippet = company.researchData
      ? JSON.stringify(company.researchData).slice(0, 2000)
      : 'No research data.';

    const systemPrompt = `You are an expert B2B sales strategist and account executive coach. You help AEs create actionable, step-by-step play plans tailored to their selling objectives, target accounts, and available resources.

Your plans should be practical and specific — each step should be something the AE can execute this week or month. Favor high-impact, low-friction actions. Consider the buying group context, available content, and channels when suggesting steps.

Important guidelines:
- Start with relationship-building or intelligence-gathering steps when appropriate
- Include content creation/sharing steps that leverage the AE's content library
- Mix channels for multi-touch engagement (don't just send emails)
- For partner accounts, emphasize co-selling and mutual value
- For existing customers, emphasize expansion and executive alignment
- Include follow-up and measurement steps
- Keep steps actionable and specific, not generic`;

    const userPrompt = `AE OBJECTIVE: ${objective}

TARGET COMPANY: ${company.name} (${company.industry || 'industry unknown'})
Account Type: ${company.accountType || 'unknown'}
Deal Objective: ${company.dealObjective || 'not set'}
Key Initiatives: ${company.keyInitiatives || 'not set'}

TARGET BUYING GROUP: ${divisionName}
Segment Type: ${dept.segmentType || 'FUNCTIONAL'}
Industry: ${dept.industry || 'general'}
Use Case: ${dept.useCase || 'not specified'}
Value Prop: ${dept.valueProp || 'not defined'}
Why They Buy: ${dept.whyThisGroupBuys || 'unknown'}
Target Roles: ${JSON.stringify(dept.targetRoles) || '[]'}
Est. Opportunity: ${dept.estimatedOpportunity || 'unknown'}
Objection Handlers: ${JSON.stringify(dept.objectionHandlers) || '[]'}

${sapContext}

COMPANY RESEARCH (excerpt):
${researchSnippet}

AVAILABLE CONTENT LIBRARY:
${contentSummary}

AVAILABLE CHANNELS: ${channels.join(', ')}

Create a focused play plan with 3-8 concrete steps that help this AE achieve their objective with this buying group. Each step should have a clear action, the best channel, and a suggested timeline (day offset from start). Reference specific content from the library when relevant.`;

    const { object } = await generateObject({
      model: getChatModel(),
      schema: suggestPlanResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('[suggest-plan] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
