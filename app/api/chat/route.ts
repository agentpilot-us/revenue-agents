import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getPlay } from '@/lib/plays';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';
import { getAccountMessagingPromptBlock } from '@/lib/account-messaging';
import {
  searchLinkedInContacts,
  enrichContact,
  researchCompany,
  sendEmail as resendSendEmail,
  createCalendarEvent,
  getCalendarRsvps,
} from '@/lib/tools';
import { isToolConfigured } from '@/lib/service-config';
import { chatTools } from '@/app/api/chat/tools';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    let body: { messages?: unknown[]; playId?: string; accountId?: string; companyId?: string; contactId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const playId = (typeof body.playId === 'string' ? body.playId : 'expansion');
    const accountId = typeof body.accountId === 'string' ? body.accountId : (body.companyId as string | undefined);
    const contactId = typeof body.contactId === 'string' ? body.contactId : undefined;

    const play = getPlay(playId);
    if (!play) {
      return new Response('Invalid play', { status: 400 });
    }

    // Resolve company (account) context and contacts with department
    type ContactRow = { id: string; firstName: string | null; lastName: string | null; title: string | null; department: string | null };
    let company: { id: string; name: string; domain: string | null; industry: string | null; contacts: ContactRow[] } | null = null;
    let targetContactDepartment: string | null = null;

    if (accountId) {
      const row = await prisma.company.findFirst({
        where: { id: accountId, userId: session.user.id },
        include: {
          contacts: {
            take: 10,
            orderBy: { lastContactedAt: 'desc' },
            select: { id: true, firstName: true, lastName: true, title: true, department: true },
          },
        },
      });
      if (!row) {
        return new Response('Account not found', { status: 404 });
      }
      company = {
        id: row.id,
        name: row.name,
        domain: row.domain,
        industry: row.industry,
        contacts: row.contacts,
      };
      if (contactId) {
        const contact = row.contacts.find((c: ContactRow) => c.id === contactId);
        if (contact?.department) targetContactDepartment = contact.department;
      }
    }

    // Content library: fetch content matching account industry and/or target contact's department for department-specific messaging.
    // When account (company) is set, include and prefer entries where company matches so account-specific guides (e.g. GM) are used.
    type ContentShape = {
      valueProp?: string;
      benefits?: string[];
      proofPoints?: string[];
      successStories?: Array<{ company?: string; results?: string[] }>;
    };
    const orConditions: Array<{ industry?: string | null; department?: string }> = [];
    if (company?.industry) {
      orConditions.push({ industry: company.industry }, { industry: null }, { industry: '' });
    }
    if (targetContactDepartment) {
      orConditions.push({ department: targetContactDepartment });
    }
    const whereClause: {
      userId: string;
      userConfirmed: boolean;
      isActive: boolean;
      OR?: Array<{ industry?: string | null; department?: string }>;
      AND?: Array<Record<string, unknown>>;
    } = {
      userId: session.user.id,
      userConfirmed: true,
      isActive: true,
    };
    if (company?.name) {
      whereClause.AND = [
        ...(orConditions.length > 0 ? [{ OR: orConditions }] : []),
        { OR: [{ company: company.name }, { company: null }, { company: '' }] },
      ];
    } else if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }
    const relevantContent = await prisma.contentLibrary.findMany({
      where: whereClause,
      orderBy: [
        { company: 'desc' }, // company-matched (non-null) first when account is set
        { department: 'desc' },
        { persona: 'desc' },
        { industry: 'desc' },
      ],
      take: 8,
    });

    const contentLibrarySection =
      relevantContent.length > 0
        ? `\nPRODUCT MESSAGING (Content Library — use for department-specific value props and use cases):\n${relevantContent
            .map((c: { type: string; title: string; industry: string | null; department: string | null; persona: string | null; content: unknown }) => {
              const body = c.content as ContentShape | null;
              const valueProp = body?.valueProp ?? '';
              const benefits = body?.benefits?.join(', ') ?? '';
              const proofPoints = body?.proofPoints?.join(', ') ?? '';
              const successStories =
                body?.successStories
                  ?.map(
                    (s) =>
                      `- ${s.company ?? 'Unknown'}: ${s.results?.join(', ') ?? ''}`
                  )
                  .join('\n') ?? '';
              return `[${c.type}] ${c.title}
Industry: ${c.industry ?? '—'} | Department: ${c.department ?? '—'} | Persona: ${c.persona ?? '—'}

Value Prop: ${valueProp}
Benefits: ${benefits}
Proof Points: ${proofPoints}
${successStories ? `Success Stories:\n${successStories}` : ''}`;
            })
            .join('\n---\n')}

When drafting emails or messages:
1. Use the contact's department to select the right messaging: choose value propositions and use cases that match the recipient's department (e.g. Autonomous Vehicles, IT Infrastructure, Manufacturing).
2. Reference success stories and proof points relevant to that department and the account's industry.
3. Personalize by contact: department drives which messaging applies; use their title and department together.`
        : '';

    // Account-level messaging (additive to content library and department logic)
    let accountContextBlock = '';
    if (accountId && session.user.id) {
      const block = await getAccountMessagingPromptBlock(accountId, session.user.id);
      if (block) accountContextBlock = `\n\n${block}`;
    }

    // Messaging framework
    const lastUserContent = messages
      .filter((m: unknown) => (m as { role?: string }).role === 'user')
      .pop() as { content?: string } | undefined;
    const messagingContext = await getMessagingContextForAgent(
      session.user.id,
      typeof lastUserContent?.content === 'string' ? lastUserContent.content : undefined,
      accountId ?? null
    );
    const messagingSection = messagingContext
      ? `MESSAGING FRAMEWORK:\n${messagingContext.content}\n\nALWAYS use this messaging framework when drafting emails.`
      : '';

    const contactsList =
      company?.contacts
        ?.map(
          (c) =>
            `  - ${[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown'} (${c.title ?? '—'}) — Department: ${c.department ?? 'Not set'}`
        )
        .join('\n') ?? '  None';

    const systemPrompt = `${play.buildSystemPrompt({
      companyName: company?.name,
      companyDomain: company?.domain ?? undefined,
      stage: 'Unknown',
      tier: undefined,
      messagingSection,
      calendarBookingUrl: process.env.CAL_PUBLIC_BOOKING_URL || process.env.NEXT_PUBLIC_CAL_BOOKING_URL || undefined,
    })}

You are an AI assistant for account expansion.

You help account managers:
- Discover departments at their accounts
- Find contacts by department and role
- Match contacts to personas (ENHANCED)
- Identify product expansion opportunities
- Calculate product fit using AI
- Draft personalized outreach based on persona (NEW)

PERSONA-AWARE WORKFLOW:
When drafting emails or outreach:
1. Identify the contact's persona (Economic Buyer, Technical Buyer, Program Manager, etc.)
2. Understand what that persona cares about (pain points, success metrics)
3. Match messaging tone to persona (executive = strategic, technical = detailed, business = practical)
4. Reference relevant content that matches persona preferences
5. Use appropriate channel (Economic Buyer = exec dinner, Technical Buyer = sandbox trial)

EXAMPLE CONVERSATION:
User: "Draft an email to Michael Torres at GM about Jetson"

You:
1. Look up Michael Torres (VP Manufacturing at GM)
2. Match persona → "Economic Buyer - Manufacturing"
3. Get persona details → Cares about: quality defects, cost reduction, ROI
4. Draft email with persona-aware messaging:
   - Tone: Business (not too technical, focus on outcomes)
   - Pain point: Reference quality control / defect reduction
   - Proof: BMW case study ($40M savings, 60% defect reduction)
   - CTA: Soft ask (plant tour, ROI calculator)
   - Length: 100-150 words (exec is busy)

Always explain WHY you chose a certain messaging approach based on persona.

PERSONA TYPES:
- Economic Buyer: Budget owner, C-suite/VP, cares about ROI and business outcomes
- Technical Buyer: Evaluates tech fit, Director/Manager, cares about architecture and integration
- Program Manager: Implements solutions, Manager/Director, cares about deployment and change mgmt
- Champion: Your internal advocate, any level, cares about their personal success
- End User: Daily user, IC level, cares about ease of use and productivity

Be proactive—suggest persona-specific next steps based on context.

When presenting product penetration, format the full department-by-product matrix as a markdown table: rows = productList (product names), columns = departmentList (department type or customName), cells = status + amount (e.g. ACTIVE + arr as "$500K", OPPORTUNITY + opportunitySize as "$300K", TRIAL + amount, or "—" when matrix[departmentId][productId] is null). Use the departmentList, productList, and matrix returned by get_product_penetration to build this table.

CROSS-DEPARTMENT EXPANSION STRATEGY:
When the user asks "What's my best approach to expand at [company] across all departments?" or "strategy across departments" or "expand at [company]":
1. Call get_expansion_strategy(companyId) to get phase1, phase2, phase3 with department names, top product, opportunity size, and fit score per department.
2. Optionally call list_departments and get_product_penetration for more detail (contacts, last activity).
3. Respond with this EXACT structure (use the section headers and formatting below):
   - PHASE 1 (NOW - Q1): List each department from phase1 with product, $, fit %, status, action plan (bullet points: THIS WEEK, WEEK 2-3), timeline, success probability. Add a short "KEY INSIGHT" if relevant (e.g. "Run Manufacturing + Design plays SIMULTANEOUSLY").
   - PHASE 2 (Q2): List phase2 departments (upsell / existing customer expansion) with action plan and timeline.
   - PHASE 3 (Q3-Q4): List phase3 departments (longer cycle or lower priority) with action plan and timeline.
   - SUMMARY: Total expansion target ($), Phase 1/2/3 breakdown, expected close rate, timeline (e.g. "9-12 months for full account expansion").
   - FOCUS THIS WEEK: Numbered list of 1-3 concrete actions (e.g. "Follow up with Michael Torres (Manufacturing)", "Email David for Jennifer intro (Design)").
   - End with: "Want me to draft those emails?" or "Want me to draft the follow-up for [contact]?" so the user has a clear CTA.
Use clear section dividers (e.g. ━━━) and keep action plans specific (names, products, next step).

ACCOUNT CONTEXT:
- Current company ID (use this as companyId in list_departments, find_contacts_in_department, discover_departments): ${accountId || 'none'}
- Company: ${company?.name ?? 'N/A'}
- Domain: ${company?.domain ?? 'Unknown'}
- Industry: ${company?.industry ?? 'Unknown'}
- Contacts (use each contact's department to pick the right messaging):
${contactsList}
${!accountId ? '\nNo account is selected. If the user asks about departments or contacts, ask them to open a company (e.g. from the dashboard) and start the chat from that company\'s page.' : ''}

When the user asks "what departments does [company] have?" or similar: first call list_departments with the Current company ID above. That returns the departments already mapped for this account. Only use discover_departments if it is available and the user wants to find additional departments via AI research.

Parse research and save to database: When the user asks "what departments are interested in [product] and why?" (e.g. NVIDIA chips, Jetson): (1) call research_company with a query about that company and product interest, (2) call apply_department_product_research with the Current company ID and the research summary (and optional productFocus). That extracts departments and product interests with value prop and writes them to the account. Then summarize what was added. When the user pastes a block of research text (earnings notes, LinkedIn research, etc.) and wants it ingested: call apply_department_product_research with the Current company ID and the pasted text; then confirm what was created or updated.

DEPARTMENT-BASED MESSAGING: Each contact may have a department (e.g. Autonomous Vehicles, IT Infrastructure). Use the content library entries that match that department to determine value propositions and use cases when drafting to that contact. If department is "Not set", use industry and persona from the content library.

${messagingSection}
${contentLibrarySection}
${accountContextBlock}

Work step-by-step and explain what you're doing.`;

    const accountIdForTools = accountId ?? '';

    const allTools = {
      ...chatTools,
      search_linkedin_contacts: tool({
        description: 'Search for contacts on LinkedIn by company, job title, and keywords',
        inputSchema: z.object({
          companyName: z.string().optional().describe('Company name to search'),
          companyDomain: z.string().optional().describe('Company domain (e.g. acme.com)'),
          keywords: z.array(z.string()).optional().describe('Search keywords'),
          jobTitles: z.array(z.string()).optional().describe('Job titles to filter'),
          maxResults: z.number().default(50).optional().describe('Max number of results'),
        }),
        execute: async (params: { companyName?: string; companyDomain?: string; maxResults?: number }) => {
          const res = await searchLinkedInContacts({
            companyName: params.companyName,
            companyDomain: params.companyDomain,
            limit: params.maxResults,
          });
          if (!res.ok) return { error: res.error };
          return { found: res.contacts.length, profiles: res.contacts };
        },
      }),

      enrich_contact: tool({
        description: 'Enrich contact with email, phone, and other data (e.g. from Clay)',
        inputSchema: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          company: z.string().optional(),
          linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
          email: z.string().optional().describe('Known email to enrich'),
          domain: z.string().optional().describe('Company domain for lookup'),
        }),
        execute: async (params: Record<string, unknown>) => {
          const res = await enrichContact({
            email: params.email as string | undefined,
            linkedinUrl: params.linkedinUrl as string | undefined,
            domain: params.domain as string | undefined,
          });
          if (!res.ok) return { error: res.error };
          const data = res.data as Record<string, unknown> & { email?: string };
          if (accountIdForTools && data.email) {
            try {
              const contact = await (prisma as unknown as { contact: { upsert: (args: unknown) => Promise<{ id: string }> } }).contact.upsert({
                where: {
                  email_companyId: { email: data.email, companyId: accountIdForTools },
                },
                update: {
                  phone: (data.phone as string) ?? undefined,
                  title: (data.title as string) ?? undefined,
                  linkedinUrl: (data.linkedinUrl as string) ?? undefined,
                  city: (data.city as string) ?? undefined,
                  state: (data.state as string) ?? undefined,
                  country: (data.country as string) ?? undefined,
                  seniority: (data.seniority as string) ?? undefined,
                },
                create: {
                  firstName: (params.firstName as string) ?? '',
                  lastName: (params.lastName as string) ?? '',
                  email: data.email,
                  companyId: accountIdForTools,
                  phone: (data.phone as string) ?? undefined,
                  title: (data.title as string) ?? undefined,
                  linkedinUrl: (data.linkedinUrl as string) ?? undefined,
                  city: (data.city as string) ?? undefined,
                  state: (data.state as string) ?? undefined,
                  country: (data.country as string) ?? undefined,
                  seniority: (data.seniority as string) ?? undefined,
                },
              });
              return { contactId: contact.id, ...data };
            } catch (e) {
              return { error: e instanceof Error ? e.message : 'Failed to save contact', ...data };
            }
          }
          return data;
        },
      }),

      research_company: tool({
        description: 'Research company using Perplexity AI',
        inputSchema: z.object({
          companyName: z.string().optional().describe('Company name'),
          companyDomain: z.string().optional().describe('Company domain'),
          query: z.string().describe('Research question or topic'),
          focusAreas: z.array(z.string()).optional().describe('Areas to focus on'),
        }),
        execute: async (params: { companyName?: string; companyDomain?: string; query: string }) => {
          const res = await researchCompany({
            query: params.query,
            companyName: params.companyName,
            companyDomain: params.companyDomain,
          });
          if (!res.ok) return { error: res.error };
          if (accountIdForTools) {
            await (prisma as unknown as { activity: { create: (args: unknown) => Promise<unknown> } }).activity.create({
              data: {
                type: 'Research',
                summary: `Research completed for ${params.companyName ?? params.query}`,
                content: res.summary,
                companyId: accountIdForTools,
                userId: session!.user!.id,
                agentUsed: playId,
              },
            });
          }
          return { summary: res.summary };
        },
      }),

      send_email: tool({
        description: 'Send an email to a contact',
        inputSchema: z.object({
          contactId: z.string().optional(),
          to: z.string().optional(),
          subject: z.string(),
          body: z.string(),
        }),
        execute: async (params: { contactId?: string; to?: string; subject: string; body: string }) => {
          let toEmail = params.to;
          let contactId = params.contactId;
          let companyId = accountIdForTools;
          
          if (!toEmail && contactId) {
            const contact = await (prisma as unknown as { contact: { findUnique: (args: unknown) => Promise<{ email: string | null; companyId: string } | null> } }).contact.findUnique({
              where: { id: contactId },
            });
            toEmail = contact?.email ?? undefined;
            if (contact?.companyId) companyId = contact.companyId;
          }
          if (!toEmail) {
            return { error: 'Contact has no email or to address not provided' };
          }
          if (!companyId) {
            return { error: 'Account context required. Open a company first.' };
          }
          
          const result = await resendSendEmail({
            to: toEmail,
            subject: params.subject,
            html: params.body,
            text: params.body,
          });
          if (!result.ok) return { error: result.error };
          
          // Create Activity record with resendEmailId so webhooks can link back
          if (result.id && (contactId || toEmail)) {
            try {
              if (!contactId && toEmail && companyId) {
                // Try to find contact by email
                const existingContact = await (prisma as unknown as { contact: { findFirst: (args: unknown) => Promise<{ id: string } | null> } }).contact.findFirst({
                  where: { email: toEmail, companyId },
                });
                if (existingContact) contactId = existingContact.id;
              }
              
              if (contactId) {
                await (prisma as unknown as { activity: { create: (args: unknown) => Promise<unknown> } }).activity.create({
                  data: {
                    type: 'Email',
                    summary: `Sent email: ${params.subject}`,
                    content: params.body,
                    companyId,
                    contactId,
                    userId: session!.user!.id,
                    resendEmailId: result.id,
                    agentUsed: playId,
                  },
                });
                
                // Update contact's lastEmailSentAt and totalEmailsSent
                await (prisma as unknown as { contact: { update: (args: unknown) => Promise<unknown> } }).contact.update({
                  where: { id: contactId },
                  data: {
                    lastEmailSentAt: new Date(),
                    totalEmailsSent: { increment: 1 },
                  },
                });
              }
            } catch (e) {
              console.error('Failed to create activity for email:', e);
              // Don't fail the email send if activity creation fails
            }
          }
          
          return { id: result.id, sent: true };
        },
      }),

      create_calendar_event: tool({
        description:
          'Create a calendar event (meeting) via Cal.com. Returns a shareable booking link (link field) and booking id. When you send an email about this meeting, you MUST include the link in the email body so the recipient can confirm. IMPORTANT: start and end must be in UTC timezone (ISO 8601 format ending in Z, e.g. 2024-01-15T17:00:00.000Z). Convert PST to UTC by adding 8 hours (PST is UTC-8). The event duration must match the event type configuration exactly (check event type settings - typically 15, 30, 45, or 60 minutes). attendeeEmail is required - always provide it.',
        inputSchema: z.object({
          title: z.string().describe('Meeting title'),
          start: z.string().describe('Start time in UTC ISO 8601 format (e.g. 2024-01-15T17:00:00.000Z). Convert PST to UTC by adding 8 hours.'),
          end: z.string().describe('End time in UTC ISO 8601 format. Must match event type duration EXACTLY (check event type settings - common: 15, 30, 45, or 60 minutes). If you get "Invalid event length", try 30 minutes first.'),
          attendeeEmail: z.string().describe('Attendee email for the calendar invite (REQUIRED - always provide this)'),
        }),
        execute: async (args: { title: string; start: string; end: string; attendeeEmail?: string }) => {
          const res = await createCalendarEvent(args);
          if (!res.ok) {
            console.error('[create_calendar_event]', res.error);
            return { error: res.error };
          }
          return res.data;
        },
      }),

      get_calendar_rsvps: tool({
        description: 'Get calendar event RSVPs (attendee accept/decline status)',
        inputSchema: z.object({
          eventSlug: z.string().optional().describe('Event type slug'),
          after: z.string().optional().describe('ISO date to filter events after'),
        }),
        execute: async (args: { eventSlug?: string; after?: string }) => {
          const res = await getCalendarRsvps(args);
          return res.ok ? res.data : { error: res.error };
        },
      }),

      get_contacts_by_engagement: tool({
        description: 'Query contacts by engagement criteria, location, seniority, or event attendance',
        inputSchema: z.object({
          criteria: z
            .enum([
              'all',
              'replied_this_week',
              'replied_this_month',
              'never_contacted',
              'high_engagement',
              'low_engagement',
              'dormant',
            ])
            .optional().describe('Engagement filter'),
          minEngagementScore: z.number().optional().describe('Minimum engagement score'),
          maxEngagementScore: z.number().optional().describe('Maximum engagement score'),
          location: z.string().optional().describe('City or state to filter by'),
          seniority: z.enum(['VP+', 'Director+', 'Director-', 'Manager-', 'IC']).optional().describe('Seniority level'),
          attendedEvent: z.string().optional().describe('Event name to filter attendees'),
          attendedEventYear: z.number().optional().describe('Year of event for attendedEvent'),
        }),
        execute: async (params: {
          criteria?: string;
          minEngagementScore?: number;
          maxEngagementScore?: number;
          location?: string;
          seniority?: string;
          attendedEvent?: string;
          attendedEventYear?: number;
        }) => {
          if (!accountIdForTools) {
            return { error: 'Account context required. Open a company first.' };
          }
          const where: Record<string, unknown> = {
            companyId: accountIdForTools,
          };

          if (params.criteria && params.criteria !== 'all') {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            switch (params.criteria) {
              case 'replied_this_week':
                where.lastEmailRepliedAt = { gte: oneWeekAgo };
                break;
              case 'replied_this_month':
                where.lastEmailRepliedAt = { gte: oneMonthAgo };
                break;
              case 'never_contacted':
                where.lastContactedAt = null;
                break;
              case 'high_engagement':
                where.engagementScore = { gte: 70 };
                break;
              case 'low_engagement':
                where.engagementScore = { lte: 30 };
                break;
              case 'dormant':
                where.isDormant = true;
                break;
            }
          }

          if (params.minEngagementScore !== undefined) {
            const existing = (where.engagementScore as Record<string, number>) ?? {};
            where.engagementScore = { ...existing, gte: params.minEngagementScore };
          }
          if (params.maxEngagementScore !== undefined) {
            const existing = (where.engagementScore as Record<string, number>) ?? {};
            where.engagementScore = { ...existing, lte: params.maxEngagementScore };
          }

          if (params.location) {
            where.OR = [
              { city: { contains: params.location, mode: 'insensitive' } },
              { state: { contains: params.location, mode: 'insensitive' } },
            ];
          }

          if (params.seniority) {
            switch (params.seniority) {
              case 'VP+':
                where.seniorityLevel = { gte: 4 };
                break;
              case 'Director+':
                where.seniorityLevel = { gte: 3 };
                break;
              case 'Director-':
                where.seniorityLevel = { lte: 3 };
                break;
              case 'Manager-':
                where.seniorityLevel = { lte: 2 };
                break;
              case 'IC':
                where.seniorityLevel = 1;
                break;
            }
          }

          if (params.attendedEvent) {
            const eventWhere: Record<string, unknown> = {
              eventName: { contains: params.attendedEvent, mode: 'insensitive' } as unknown,
            };
            if (params.attendedEventYear !== undefined) {
              const yearStart = new Date(params.attendedEventYear, 0, 1);
              const yearEnd = new Date(params.attendedEventYear + 1, 0, 1);
              eventWhere.eventDate = { gte: yearStart, lt: yearEnd };
            }
            where.eventAttendances = { some: eventWhere };
          }

          const contacts = await (prisma as unknown as {
            contact: {
              findMany: (args: {
                where: Record<string, unknown>;
                include: unknown;
                orderBy: unknown;
                take: number;
              }) => Promise<
                Array<{
                  id: string;
                  firstName: string | null;
                  lastName: string | null;
                  email: string | null;
                  title: string | null;
                  city: string | null;
                  state: string | null;
                  seniority: string | null;
                  engagementScore: number | null;
                  lastContactedAt: Date | null;
                  isResponsive: boolean;
                }>
              >;
            };
          }).contact.findMany({
            where,
            include: {
              eventAttendances: !!params.attendedEvent,
              activities: { take: 3, orderBy: { createdAt: 'desc' as const } },
            },
            orderBy: { engagementScore: 'desc' as const },
            take: 100,
          });

          return {
            found: contacts.length,
            contacts: contacts.map((c) => ({
              id: c.id,
              name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown',
              email: c.email,
              title: c.title,
              location: [c.city, c.state].filter(Boolean).join(', '),
              seniority: c.seniority,
              engagementScore: c.engagementScore,
              lastContacted: c.lastContactedAt,
              isResponsive: c.isResponsive,
            })),
          };
        },
      }),

      import_event_attendees: tool({
        description: 'Import event attendees (e.g., from conference, webinar) as contacts with event attendance',
        inputSchema: z.object({
          eventName: z.string().describe('Name of the event'),
          eventDate: z.string().describe('Event date in ISO format'),
          attendees: z.array(
            z.object({
              email: z.string().describe('Attendee email'),
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              company: z.string().optional(),
            })
          ).describe('List of attendees'),
        }),
        execute: async ({
          eventName,
          eventDate,
          attendees,
        }: {
          eventName: string;
          eventDate: string;
          attendees: Array<{ email: string; firstName?: string; lastName?: string; company?: string }>;
        }) => {
          if (!accountIdForTools) {
            return { error: 'Account context required. Open a company first.' };
          }
          let imported = 0;
          const errors: string[] = [];

          for (const attendee of attendees) {
            try {
              const contact = await (prisma as unknown as {
                contact: {
                  upsert: (args: {
                    where: { email_companyId: { email: string; companyId: string } };
                    update: { firstName?: string; lastName?: string };
                    create: {
                      email: string;
                      firstName: string;
                      lastName: string;
                      companyId: string;
                    };
                  }) => Promise<{ id: string }>;
                };
              }).contact.upsert({
                where: {
                  email_companyId: {
                    email: attendee.email,
                    companyId: accountIdForTools,
                  },
                },
                update: {
                  firstName: attendee.firstName ?? undefined,
                  lastName: attendee.lastName ?? undefined,
                },
                create: {
                  email: attendee.email,
                  firstName: attendee.firstName ?? '',
                  lastName: attendee.lastName ?? '',
                  companyId: accountIdForTools,
                },
              });

              await (prisma as unknown as {
                eventAttendance: {
                  upsert: (args: {
                    where: { contactId_eventName: { contactId: string; eventName: string } };
                    update: { eventDate: Date };
                    create: {
                      contactId: string;
                      eventName: string;
                      eventDate: Date;
                      source: string;
                      rsvpStatus: string;
                    };
                  }) => Promise<unknown>;
                };
              }).eventAttendance.upsert({
                where: {
                  contactId_eventName: {
                    contactId: contact.id,
                    eventName,
                  },
                },
                update: { eventDate: new Date(eventDate) },
                create: {
                  contactId: contact.id,
                  eventName,
                  eventDate: new Date(eventDate),
                  source: 'import',
                  rsvpStatus: 'attended',
                },
              });

              imported++;
            } catch (error) {
              errors.push(`Failed to import ${attendee.email}: ${String(error)}`);
            }
          }

          return {
            imported,
            total: attendees.length,
            ...(errors.length > 0 ? { errors } : {}),
          };
        },
      }),
    };

    const playTools: Record<string, (typeof allTools)[keyof typeof allTools]> = {};
    for (const toolName of play.toolIds) {
      if (toolName in allTools && isToolConfigured(toolName)) {
        playTools[toolName] = allTools[toolName as keyof typeof allTools];
      }
    }

    const modelMessages = await convertToModelMessages(messages as Parameters<typeof convertToModelMessages>[0]);
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: modelMessages,
      system: systemPrompt,
      tools: Object.keys(playTools).length > 0 ? playTools : undefined,
      abortSignal: req.signal,
      stopWhen: stepCountIs(20),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
