'use server';

import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { ContentItemType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function draftEmail(params: {
  contactId: string;
  context?: string;
  productSlug?: string;
  signal?: string; // e.g., "new-executive-hire", "product-launch"
}) {
  // 1. Fetch contact with full context
  const contact = await prisma.contact.findUnique({
    where: { id: params.contactId },
    include: {
      company: {
        include: {
          departments: {
            include: {
              companyProducts: {
                include: { product: true },
              },
            },
          },
          companyProducts: {
            include: { product: true },
          },
        },
      },
      companyDepartment: true,
    },
  });

  if (!contact) throw new Error('Contact not found');

  // 2. Fetch persona
  const persona = contact.personaId
    ? await prisma.persona.findUnique({ where: { id: contact.personaId } })
    : null;

  // 3. Fetch product (if specified) — catalog product by slug
  const product = params.productSlug
    ? await prisma.catalogProduct.findUnique({
        where: { slug: params.productSlug },
      })
    : null;

  // 4. Fetch relevant content from library
  const contentWhere: Prisma.ContentItemWhereInput = {};
  if (persona?.contentTypes?.length) {
    const mappedTypes = persona.contentTypes
      .map((t) => t.toUpperCase().replace(/-/g, '_'))
      .filter((t) =>
        Object.values(ContentItemType).includes(t as ContentItemType)
      ) as ContentItemType[];
    if (mappedTypes.length) contentWhere.type = { in: mappedTypes };
  }
  if (product?.contentTags?.length) {
    contentWhere.tags = { hasSome: product.contentTags };
  }

  const relevantContent = await prisma.contentItem.findMany({
    where: Object.keys(contentWhere).length > 0 ? contentWhere : undefined,
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  // 5. Use Claude to draft email
  const deptType = contact.companyDepartment?.type ?? 'Unknown';
  const activeProducts =
    contact.company.companyProducts
      ?.filter((cp) => cp.status === 'ACTIVE')
      .map((cp) => cp.product.name)
      .join(', ') || 'None';

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt: `
      You are drafting a personalized outreach email for account expansion.
      
      CONTACT INFORMATION:
      Name: ${contact.firstName ?? ''} ${contact.lastName ?? ''}
      Title: ${contact.title ?? 'Unknown'}
      Company: ${contact.company.name}
      Department: ${deptType}
      LinkedIn: ${contact.linkedinUrl ?? 'Not available'}
      
      PERSONA: ${persona ? persona.name : 'Unknown'}
      ${
        persona
          ? `
      Description: ${persona.description ?? ''}
      
      What they care about:
      ${persona.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
      
      Success metrics:
      ${persona.successMetrics.map((m, i) => `${i + 1}. ${m}`).join('\n')}
      
      Messaging tone: ${persona.messagingTone}
      `
          : ''
      }
      
      COMPANY CONTEXT:
      Industry: ${contact.company.industry ?? 'Unknown'}
      Current products owned: ${activeProducts}
      
      ${
        product
          ? `
      PRODUCT TO PITCH: ${product.name}
      Description: ${product.description ?? ''}
      Price Range: $${Number(product.priceMin ?? 0).toLocaleString()} - $${Number(product.priceMax ?? 0).toLocaleString()}
      Use Cases: ${product.useCases.join(', ')}
      `
          : ''
      }
      
      ${
        params.signal
          ? `
      TRIGGER/SIGNAL: ${params.signal}
      (This email is triggered by this event/signal)
      `
          : ''
      }
      
      ${
        relevantContent.length > 0
          ? `
      RELEVANT CONTENT TO REFERENCE:
      ${relevantContent
        .map(
          (c) => `
        - ${c.title} (${c.type})
          ${c.description ?? ''}
      `
        )
        .join('\n')}
      `
          : ''
      }
      
      ${params.context ? `
      ADDITIONAL CONTEXT: ${params.context}
      ` : ''}
      
      TASK:
      Draft a personalized email that:
      
      1. SUBJECT LINE:
         - Specific to their situation (reference signal, pain point, or relevant context)
         - Not generic ("Quick question" ❌, "GM's quality control initiatives" ✅)
         - 5-7 words max
      
      2. OPENING (1-2 sentences):
         - Reference specific signal or context (job posting, announcement, pain point)
         - Show you did research (don't be generic)
      
      3. BODY (2-3 short paragraphs):
         - Lead with THEIR pain points (from persona), not YOUR product features
         - Use peer proof (case study from similar company/role)
         - Include specific metrics (Ford reduced X by Y%)
         - Keep it conversational, not salesy
      
      4. CALL TO ACTION:
         - Soft ask ("Worth 15 minutes?" not "Buy now")
         - Offer value (demo, calculator, workshop, peer intro)
         - Make it easy to say yes
      
      5. TONE:
         - Match persona messaging tone (${persona?.messagingTone ?? 'business'})
         - If "executive": Strategic, business outcomes, ROI
         - If "business": Practical, results-driven, efficient
         - If "technical": Detailed, architecture, integration
      
      6. LENGTH:
         - Economic Buyer / Executive: 100-150 words (they're busy)
         - Program Manager / Technical: 150-200 words (more details okay)
      
      IMPORTANT:
      - Don't mention that I'm an AI or that this is automated
      - Don't use phrases like "I hope this email finds you well"
      - Be specific, not generic
      - Reference their company, role, and pain points
      - Use first person ("I" not "we")
      
      OUTPUT FORMAT:
      Subject: [subject line]
      
      [email body]
      
      [signature line]
    `,
  });

  const firstLine = text.split('\n')[0] ?? '';
  const subject = firstLine.replace(/^Subject:\s*/i, '').trim();
  const body = text
    .split('\n')
    .slice(2)
    .join('\n')
    .trim();

  return {
    subject,
    body,
    contact: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      title: contact.title,
      company: contact.company.name,
    },
    persona: persona
      ? {
          name: persona.name,
          tone: persona.messagingTone,
        }
      : null,
    contentUsed: relevantContent.map((c) => ({
      title: c.title,
      type: c.type,
      url: c.url,
    })),
  };
}
