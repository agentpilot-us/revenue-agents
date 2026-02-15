import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCompanyEventsBlock } from '@/lib/prompt-context';
import { sendEmail as resendSendEmail } from '@/lib/tools/resend';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const campaign = await prisma.segmentCampaign.findUnique({
      where: { id: campaignId },
      include: {
        company: { select: { name: true, industry: true } },
        department: { select: { customName: true, type: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let body: { messages?: unknown[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const companyName = campaign.company.name;
    const departmentName = campaign.department
      ? (campaign.department.customName ?? campaign.department.type.replace(/_/g, ' '))
      : null;

    const [companyEventsBlock, catalogProducts] = await Promise.all([
      getCompanyEventsBlock(
        campaign.userId,
        campaign.company.industry ?? null,
        departmentName,
        null
      ),
      prisma.catalogProduct.findMany({
        select: { name: true, slug: true, description: true, priceMin: true, priceMax: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const pricingBlock =
      catalogProducts.length > 0
        ? catalogProducts
            .map(
              (p) =>
                `- ${p.name}: ${p.description || 'No description'}. Price: ${p.priceMin != null ? `$${Number(p.priceMin).toLocaleString()}` : '—'} - ${p.priceMax != null ? `$${Number(p.priceMax).toLocaleString()}` : '—'}`
            )
            .join('\n')
        : 'No product pricing data available. Say you can connect them with the team for pricing.';

    const bookingUrl =
      process.env.CAL_PUBLIC_BOOKING_URL ||
      process.env.NEXT_PUBLIC_CAL_BOOKING_URL ||
      '';

    const eventsSection = companyEventsBlock
      ? `\n\n${companyEventsBlock}\n\nWhen the visitor asks for session or event recommendations (e.g. best sessions for automotive, autonomous vehicles), use the events above. Recommend by topic/industry and include registration links when available.`
      : '\n\nNo events data available. Suggest they ask the team for event recommendations.';

    const systemPrompt = `You are a helpful assistant for visitors of ${companyName}'s campaign page: "${campaign.title}".

You can:
1. Answer pricing questions using the PRODUCTS & PRICING section below.
2. Recommend events and sessions (e.g. best sessions for automotive, autonomous vehicles) using the COMPANY EVENTS section when available.
3. Share the booking link when they want to book a meeting, or send them an email with the calendar link using send_visitor_email with template "calendar_link".
4. Send them a demo link by email using send_visitor_email with template "demo_link" (when they ask to be emailed a demo or link).
5. When they want a person to follow up (not an automated link), use request_follow_up to capture their email and tell them the team will reach out.

PRODUCTS & PRICING:
${pricingBlock}
${eventsSection}

BOOKING LINK: When the visitor wants to book a meeting or get a calendar link, share this URL or send it by email: ${bookingUrl || '(not configured - say the team will send a link)'}

EMAIL TOOLS:
- For "email me the calendar link" or "send me a meeting link": use send_visitor_email with template "calendar_link" and their email.
- For "email me a demo link" or "send me the demo": use send_visitor_email with template "demo_link" and their email.
- For "have someone email me" or "I'd like to be contacted": use request_follow_up to store their request; do not use send_visitor_email.

Keep responses concise and friendly.`;

    const demoUrl = campaign.ctaUrl || campaign.url || '';

    const campaignChatTools = {
      send_visitor_email: tool({
        description:
          'Send a templated email to the visitor: calendar_link (meeting booking link) or demo_link (demo/link from this campaign). Use when they ask to be emailed a link.',
        inputSchema: z.object({
          to: z.string().email(),
          template: z.enum(['calendar_link', 'demo_link']),
          name: z.string().optional(),
        }),
        execute: async ({
          to,
          template,
          name,
        }: {
          to: string;
          template: 'calendar_link' | 'demo_link';
          name?: string;
        }) => {
          const greeting = name ? `Hi ${name},` : 'Hi,';
          const calendarLinkUrl =
            process.env.CAL_PUBLIC_BOOKING_URL ||
            process.env.NEXT_PUBLIC_CAL_BOOKING_URL ||
            '';
          const subject =
            template === 'calendar_link'
              ? `Your calendar link – ${companyName}`
              : `Your demo link – ${companyName}`;
          let html: string;
          if (template === 'calendar_link') {
            if (!calendarLinkUrl) {
              return `Calendar booking link is not configured. Tell the visitor the team will send them a link shortly.`;
            }
            html = `${greeting}<br><br>Here's your link to book a meeting:<br><br><a href="${calendarLinkUrl}">${calendarLinkUrl}</a><br><br>Best,<br>${companyName}`;
          } else {
            if (!demoUrl) {
              return `Demo link is not set for this campaign. Tell the visitor the team will send them the link.`;
            }
            html = `${greeting}<br><br>Here's your demo link:<br><br><a href="${demoUrl}">${demoUrl}</a><br><br>Best,<br>${companyName}`;
          }
          const result = await resendSendEmail({ to, subject, html });
          if (!result.ok) {
            return `Failed to send email: ${result.error}. Ask the visitor to try again or request a follow-up from the team.`;
          }
          return `I've sent the ${template === 'calendar_link' ? 'calendar' : 'demo'} link to ${to}. Check your inbox.`;
        },
      }),
      request_follow_up: tool({
        description:
          'Capture the visitor\'s email (and optional name/message) when they want a human to follow up. Use when they say "have someone email me" or "I\'d like to be contacted" — do not use for sending a calendar or demo link (use send_visitor_email for that).',
        inputSchema: z.object({
          email: z.string().email(),
          name: z.string().optional(),
          message: z.string().optional(),
        }),
        execute: async ({
          email,
          name,
          message,
        }: {
          email: string;
          name?: string;
          message?: string;
        }) => {
          await prisma.campaignLead.create({
            data: {
              campaignId: campaign.id,
              email,
              name: name ?? null,
              message: message ?? null,
            },
          });
          return `Thanks! We've noted your request. Our team at ${companyName} will send you an email shortly.`;
        },
      }),
    };

    const modelMessages = await convertToModelMessages(
      messages as Parameters<typeof convertToModelMessages>[0]
    );

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: modelMessages,
      system: systemPrompt,
      tools: campaignChatTools,
      abortSignal: req.signal,
      stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Campaign chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
