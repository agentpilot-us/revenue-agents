import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType, DepartmentStatus } from '@prisma/client';
import { discoverDepartments } from '@/app/actions/discover-departments';

/**
 * Chat tools for department discovery and lookup.
 * Each tool verifies the user owns the company before running.
 */
export const chatTools = {
  discover_departments: tool({
    description:
      'Discover departments at a company using AI research. Use when the user wants to find or add departments at an account. Only available when research (Perplexity) is configured.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID to research'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      try {
        const departments = await discoverDepartments(companyId);
        return { departments };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Research failed';
        return {
          error: `Department discovery failed: ${message}. Use list_departments to see departments already mapped for this account.`,
        };
      }
    },
  }),

  list_departments: tool({
    description: 'List all departments at a company with contact/activity counts and products.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const departments = await prisma.companyDepartment.findMany({
        where: { companyId },
        include: {
          _count: { select: { contacts: true, activities: true } },
          companyProducts: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { departments };
    },
  }),

  find_contacts_in_department: tool({
    description:
      'Find contacts in a specific department at a company. departmentType must be the exact enum value (e.g. MANUFACTURING_OPERATIONS for Manufacturing, AUTONOMOUS_VEHICLES for Autonomous Vehicles, IT_DATA_CENTER for IT). Use the type returned by list_departments.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (use the current account ID from context)'),
      departmentType: z.nativeEnum(DepartmentType).describe('Department type enum, e.g. MANUFACTURING_OPERATIONS, SALES, AUTONOMOUS_VEHICLES'),
    }),
    execute: async ({ companyId, departmentType }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const department = await prisma.companyDepartment.findUnique({
        where: {
          companyId_type: { companyId, type: departmentType },
        },
        include: {
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true,
              linkedinUrl: true,
            },
          },
        },
      });
      if (!department) {
        return { error: 'Department not found' };
      }
      return {
        department: department.type,
        customName: department.customName,
        contacts: department.contacts,
      };
    },
  }),

  list_products: tool({
    description: 'List all products in the catalog.',
    inputSchema: z.object({}),
    execute: async () => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const products = await prisma.catalogProduct.findMany({
        where: { userId: session.user.id },
        orderBy: { name: 'asc' },
      });
      return { products };
    },
  }),

  calculate_product_fit: tool({
    description:
      'Calculate which products are the best fit for a company using AI. Returns prioritized opportunities with fit scores and next steps.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID to analyze'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const { calculateProductFit } = await import('@/app/actions/calculate-product-fit');
      const opportunities = await calculateProductFit(companyId);
      return { opportunities };
    },
  }),

  get_product_penetration: tool({
    description:
      'Get product penetration summary for a company: which products they own, which are opportunities, ARR, top opportunities, and full department-by-product matrix data for building a table.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        include: {
          departments: {
            include: {
              companyProducts: {
                include: { product: true },
              },
            },
          },
        },
      });
      if (!company) return { error: 'Company not found' };

      const catalogProducts = await prisma.catalogProduct.findMany({
        where: { userId: session.user.id },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });

      const departmentList = company.departments.map((d) => ({
        id: d.id,
        type: d.type,
        customName: d.customName,
      }));

      const productList = catalogProducts.map((p) => ({ id: p.id, name: p.name }));

      const matrix: Record<string, Record<string, { status: string; arr?: number; opportunitySize?: number; fitScore?: number } | null>> = {};
      for (const dept of company.departments) {
        matrix[dept.id] = {};
        for (const prod of catalogProducts) {
          const cp = dept.companyProducts.find((c) => c.productId === prod.id);
          if (!cp) {
            matrix[dept.id][prod.id] = null;
          } else {
            matrix[dept.id][prod.id] = {
              status: cp.status,
              ...(cp.arr != null && { arr: Number(cp.arr) }),
              ...(cp.opportunitySize != null && { opportunitySize: Number(cp.opportunitySize) }),
              ...(cp.fitScore != null && { fitScore: Number(cp.fitScore) }),
            };
          }
        }
      }

      const activeProducts = company.departments.flatMap((d) =>
        d.companyProducts.filter((cp) => cp.status === 'ACTIVE')
      );
      const opportunities = company.departments.flatMap((d) =>
        d.companyProducts.filter((cp) => cp.status === 'OPPORTUNITY')
      );
      const totalARR = activeProducts.reduce((sum, cp) => sum + Number(cp.arr ?? 0), 0);
      const totalOpportunity = opportunities.reduce(
        (sum, cp) => sum + Number(cp.opportunitySize ?? 0),
        0
      );
      const topOpportunities = opportunities
        .sort((a, b) => Number(b.fitScore ?? 0) - Number(a.fitScore ?? 0))
        .slice(0, 5)
        .map((opp) => {
          const dept = company.departments.find((d) => d.id === opp.companyDepartmentId);
          return {
            product: opp.product.name,
            department: dept?.type ?? opp.companyDepartmentId,
            fitScore: opp.fitScore != null ? Number(opp.fitScore) : null,
            estimatedARR: opp.opportunitySize != null ? Number(opp.opportunitySize) : null,
            reasoning: opp.fitReasoning,
          };
        });

      return {
        company: company.name,
        departments: company.departments.length,
        activeProducts: activeProducts.length,
        totalARR,
        opportunities: opportunities.length,
        totalOpportunity,
        topOpportunities,
        departmentList,
        productList,
        matrix,
      };
    },
  }),

  get_expansion_strategy: tool({
    description:
      'Get the recommended expansion strategy for a company: which departments to focus on in Phase 1 (highest priority), Phase 2 (upsell), and Phase 3 (longer cycle). Use this when the user asks "What\'s my best approach to expand at [company]?" or "strategy across all departments".',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (use the current account ID from context)'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const departments = await prisma.companyDepartment.findMany({
        where: { companyId },
        include: {
          companyProducts: {
            where: { status: 'OPPORTUNITY' },
            include: { product: { select: { name: true } } },
            orderBy: { fitScore: 'desc' },
            take: 1,
          },
        },
      });
      const deptLabel = (d: { type: string; customName: string | null }) =>
        d.customName || d.type.replace(/_/g, ' ');
      const phase1 = departments
        .filter(
          (d) =>
            d.status === DepartmentStatus.EXPANSION_TARGET ||
            d.status === DepartmentStatus.RESEARCH_PHASE
        )
        .map((d) => ({
          department: deptLabel(d),
          type: d.type,
          topProduct: d.companyProducts[0]?.product.name,
          opportunitySize: d.companyProducts[0]?.opportunitySize != null ? Number(d.companyProducts[0].opportunitySize) : null,
          fitScore: d.companyProducts[0]?.fitScore != null ? Number(d.companyProducts[0].fitScore) : null,
        }));
      const phase2 = departments
        .filter((d) => d.status === DepartmentStatus.ACTIVE_CUSTOMER)
        .map((d) => ({
          department: deptLabel(d),
          type: d.type,
          topProduct: d.companyProducts[0]?.product.name,
          opportunitySize: d.companyProducts[0]?.opportunitySize != null ? Number(d.companyProducts[0].opportunitySize) : null,
          fitScore: d.companyProducts[0]?.fitScore != null ? Number(d.companyProducts[0].fitScore) : null,
        }));
      const phase3 = departments
        .filter(
          (d) =>
            d.status === DepartmentStatus.NOT_ENGAGED ||
            d.status === DepartmentStatus.NOT_APPLICABLE
        )
        .map((d) => ({
          department: deptLabel(d),
          type: d.type,
          topProduct: d.companyProducts[0]?.product.name,
          opportunitySize: d.companyProducts[0]?.opportunitySize != null ? Number(d.companyProducts[0].opportunitySize) : null,
          fitScore: d.companyProducts[0]?.fitScore != null ? Number(d.companyProducts[0].fitScore) : null,
        }));
      return {
        companyName: company.name,
        phase1,
        phase2,
        phase3,
      };
    },
  }),

  get_product_details: tool({
    description: 'Get detailed information about a specific product by id or slug.',
    inputSchema: z.object({
      productId: z.string().optional().describe('Product ID'),
      productSlug: z.string().optional().describe('Product slug, e.g. drive-platform'),
    }),
    execute: async ({ productId, productSlug }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      if (!productId && !productSlug) return { error: 'Provide productId or productSlug' };
      const product = await prisma.catalogProduct.findFirst({
        where: productId ? { id: productId } : { slug: productSlug! },
        include: {
          companyProducts: {
            where: { status: 'ACTIVE' },
            include: {
              company: { select: { name: true } },
              companyDepartment: { select: { type: true } },
            },
          },
        },
      });
      if (!product) return { error: 'Product not found' };
      return {
        product: {
          name: product.name,
          description: product.description,
          priceRange: `$${Number(product.priceMin ?? 0).toLocaleString()} - $${Number(product.priceMax ?? 0).toLocaleString()}`,
          targetDepartments: product.targetDepartments,
          targetPersonas: product.targetPersonas,
          useCases: product.useCases,
          currentCustomers: product.companyProducts.length,
          exampleCustomers: product.companyProducts.slice(0, 5).map((cp) => ({
            company: cp.company.name,
            department: cp.companyDepartment?.type,
            arr: cp.arr != null ? Number(cp.arr) : null,
          })),
        },
      };
    },
  }),

  list_personas: tool({
    description: 'List all personas in the system, optionally filtered by department.',
    inputSchema: z.object({
      departmentType: z.nativeEnum(DepartmentType).optional(),
    }),
    execute: async ({ departmentType }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const personas = await prisma.persona.findMany({
        where: departmentType
          ? {
              OR: [
                { primaryDepartment: departmentType },
                { secondaryDepartments: { has: departmentType } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          description: true,
          includeTitles: true,
          primaryDepartment: true,
          painPoints: true,
          successMetrics: true,
          messagingTone: true,
        },
      });
      return { personas };
    },
  }),

  match_persona: tool({
    description:
      'Match a contact to the best persona based on their title, company, and context.',
    inputSchema: z.object({
      contactId: z.string().optional(),
      title: z.string(),
      companyName: z.string(),
      companyIndustry: z.string().optional(),
      departmentType: z.nativeEnum(DepartmentType).optional(),
    }),
    execute: async (params) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const { matchPersona } = await import('@/app/actions/match-persona');
      const result = await matchPersona({
        firstName: '',
        lastName: '',
        title: params.title,
        companyName: params.companyName,
        companyIndustry: params.companyIndustry,
        departmentType: params.departmentType,
      });
      return result;
    },
  }),

  draft_email: tool({
    description:
      'Draft a personalized email to a contact, taking into account their persona, pain points, and company context.',
    inputSchema: z.object({
      contactId: z.string(),
      context: z
        .string()
        .optional()
        .describe(
          'Additional context for the email (e.g., "following up on meeting", "congratulate on new role")'
        ),
      productSlug: z
        .string()
        .optional()
        .describe('Product to pitch (e.g., "jetson-edge-ai", "omniverse")'),
      signal: z
        .string()
        .optional()
        .describe(
          'Trigger signal (e.g., "new-executive-hire", "product-launch", "funding-round")'
        ),
    }),
    execute: async (params) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const contact = await prisma.contact.findFirst({
        where: { id: params.contactId },
        include: { company: { select: { userId: true } } },
      });
      if (!contact || contact.company.userId !== session.user.id) {
        return { error: 'Contact not found' };
      }
      const { draftEmail } = await import('@/app/actions/draft-email');
      const draft = await draftEmail(params);
      return draft;
    },
  }),

  get_persona_details: tool({
    description:
      'Get detailed information about a specific persona (pain points, success metrics, messaging preferences).',
    inputSchema: z.object({
      personaId: z.string().optional(),
      personaName: z.string().optional(),
    }),
    execute: async ({ personaId, personaName }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      if (!personaId && !personaName) return { error: 'Provide personaId or personaName' };
      const persona = await prisma.persona.findFirst({
        where: personaId ? { id: personaId } : { name: personaName! },
      });
      if (!persona) return { error: 'Persona not found' };
      return { persona };
    },
  }),

  apply_department_product_research: tool({
    description:
      'Parse raw research text (from research_company or pasted by the user) and write extracted departments and product interests (with value prop) into the database. Use when the user asks "what departments are interested in [product] and why?" (call research_company first, then this with the summary) or when the user pastes research to ingest.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (current account)'),
      researchText: z.string().describe('Raw research text to parse (e.g. from research_company or user paste)'),
      productFocus: z
        .string()
        .optional()
        .describe('Optional product focus, e.g. product name or category, to guide extraction'),
    }),
    execute: async ({ companyId, researchText, productFocus }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      try {
        const { applyDepartmentProductResearch } = await import(
          '@/app/actions/apply-department-product-research'
        );
        const result = await applyDepartmentProductResearch(companyId, researchText, productFocus);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Apply research failed';
        return { error: message };
      }
    },
  }),

  get_campaign_engagement: tool({
    description:
      'Get landing page performance metrics for campaigns. Returns visits, unique visitors, chat messages, and CTA clicks per campaign. Use when the user asks about landing page performance, campaign engagement, or "who has viewed the landing page".',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (current account)'),
      days: z.number().optional().default(7).describe('Number of days to look back (default: 7)'),
      campaignId: z.string().optional().describe('Optional: specific campaign ID to filter'),
    }),
    execute: async ({ companyId, days = 7, campaignId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const visits = await prisma.campaignVisit.findMany({
        where: {
          campaign: {
            companyId,
            ...(campaignId ? { id: campaignId } : {}),
          },
          visitedAt: { gte: startDate, lte: endDate },
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });

      // Aggregate by campaign
      const campaignPerformance: Record<
        string,
        {
          campaignId: string;
          campaignTitle: string;
          campaignSlug: string;
          visits: number;
          uniqueVisitors: Set<string>;
          chatMessages: number;
          ctaClicks: number;
        }
      > = {};

      for (const visit of visits) {
        const id = visit.campaignId;
        if (!campaignPerformance[id]) {
          campaignPerformance[id] = {
            campaignId: id,
            campaignTitle: visit.campaign.title,
            campaignSlug: visit.campaign.slug,
            visits: 0,
            uniqueVisitors: new Set(),
            chatMessages: 0,
            ctaClicks: 0,
          };
        }
        campaignPerformance[id].visits++;
        if (visit.sessionId) {
          campaignPerformance[id].uniqueVisitors.add(visit.sessionId);
        }
        campaignPerformance[id].chatMessages += visit.chatMessages || 0;
        if (visit.ctaClicked) {
          campaignPerformance[id].ctaClicks++;
        }
      }

      const results = Object.values(campaignPerformance).map((cp) => ({
        campaignId: cp.campaignId,
        campaignTitle: cp.campaignTitle,
        campaignSlug: cp.campaignSlug,
        visits: cp.visits,
        uniqueVisitors: cp.uniqueVisitors.size,
        chatMessages: cp.chatMessages,
        ctaClicks: cp.ctaClicks,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      }));

      return { campaigns: results };
    },
  }),

  list_campaigns: tool({
    description:
      'List all campaigns (landing pages) for a company. Returns campaign details including title, URL, department, type, and optional engagement summary. Use when the user asks about campaigns or landing pages.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (current account)'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };

      const campaigns = await prisma.segmentCampaign.findMany({
        where: { companyId },
        include: {
          department: {
            select: {
              id: true,
              customName: true,
              type: true,
            },
          },
          _count: {
            select: {
              visits: true,
              leads: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get engagement summary for each campaign
      const campaignsWithEngagement = await Promise.all(
        campaigns.map(async (campaign) => {
          const recentVisits = await prisma.campaignVisit.findMany({
            where: {
              campaignId: campaign.id,
              visitedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            select: {
              sessionId: true,
              chatMessages: true,
              ctaClicked: true,
            },
          });

          const uniqueVisitors = new Set(
            recentVisits.map((v) => v.sessionId).filter(Boolean)
          ).size;
          const chatMessages = recentVisits.reduce((sum, v) => sum + (v.chatMessages || 0), 0);
          const ctaClicks = recentVisits.filter((v) => v.ctaClicked).length;

          return {
            id: campaign.id,
            title: campaign.title,
            url: campaign.url,
            slug: campaign.slug,
            type: campaign.type,
            departmentName: campaign.department
              ? campaign.department.customName || campaign.department.type.replace(/_/g, ' ')
              : 'Account-wide',
            departmentId: campaign.departmentId,
            engagementSummary: {
              totalVisits: campaign._count.visits,
              totalLeads: campaign._count.leads,
              recentVisits: recentVisits.length,
              uniqueVisitors,
              chatMessages,
              ctaClicks,
            },
          };
        })
      );

      return { campaigns: campaignsWithEngagement };
    },
  }),

  get_account_changes: tool({
    description:
      'Get recent changes and activity for an account. Returns new contacts, email engagements, campaign visits, and research updates. Use when the user asks "What\'s changed at this account?" or "What\'s new at [company]?".',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (current account)'),
      days: z.number().optional().default(7).describe('Number of days to look back (default: 7)'),
    }),
    execute: async ({ companyId, days = 7 }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      // New contacts
      const newContacts = await prisma.contact.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      });

      // Email engagements
      const emailActivities = await prisma.activity.findMany({
        where: {
          companyId,
          type: { in: ['Email', 'EMAIL_SENT', 'EmailOpen', 'EmailClick'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          type: true,
          summary: true,
          createdAt: true,
        },
      });

      const emailsSent = emailActivities.filter(
        (a) => a.type === 'Email' || a.type === 'EMAIL_SENT'
      ).length;
      const emailsOpened = emailActivities.filter((a) => a.type === 'EmailOpen').length;
      const emailsClicked = emailActivities.filter((a) => a.type === 'EmailClick').length;

      // Campaign visits
      const campaignVisits = await prisma.campaignVisit.findMany({
        where: {
          campaign: { companyId },
          visitedAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          visitorEmail: true,
          chatMessages: true,
          ctaClicked: true,
          campaign: {
            select: {
              title: true,
            },
          },
        },
      });

      const uniqueVisitors = new Set(
        campaignVisits.map((v) => v.visitorEmail).filter(Boolean)
      ).size;
      const totalChatMessages = campaignVisits.reduce((sum, v) => sum + (v.chatMessages || 0), 0);
      const totalCtaClicks = campaignVisits.filter((v) => v.ctaClicked).length;

      // Research updates (check if researchData was updated)
      const researchUpdated =
        company.updatedAt && company.updatedAt >= startDate && company.researchData
          ? true
          : false;

      const summary = [
        `${newContacts.length} new contact${newContacts.length !== 1 ? 's' : ''} added`,
        `${emailsSent} email${emailsSent !== 1 ? 's' : ''} sent, ${emailsOpened} opened, ${emailsClicked} clicked`,
        `${campaignVisits.length} landing page visit${campaignVisits.length !== 1 ? 's' : ''} (${uniqueVisitors} unique visitors, ${totalChatMessages} chat messages, ${totalCtaClicks} CTA clicks)`,
        researchUpdated ? 'Account research updated' : null,
      ]
        .filter(Boolean)
        .join('; ');

      return {
        period: `${days} days`,
        newContacts: {
          count: newContacts.length,
          contacts: newContacts.map((c) => ({
            id: c.id,
            name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
            email: c.email,
            title: c.title,
          })),
        },
        emailEngagements: {
          sent: emailsSent,
          opened: emailsOpened,
          clicked: emailsClicked,
        },
        campaignVisits: {
          total: campaignVisits.length,
          uniqueVisitors,
          chatMessages: totalChatMessages,
          ctaClicks: totalCtaClicks,
        },
        researchUpdates: researchUpdated ? 1 : 0,
        summary,
      };
    },
  }),

  launch_campaign: tool({
    description:
      'Create and launch a new campaign (landing page) for a company. Returns the campaign URL. Use when the user asks to "launch a landing page" or "create a campaign".',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (current account)'),
      title: z.string().describe('Campaign title'),
      departmentId: z.string().optional().describe('Optional department ID for segment-specific campaign'),
      type: z
        .enum(['landing_page', 'event_invite', 'demo', 'webinar', 'other'])
        .default('landing_page')
        .describe('Campaign type'),
      headline: z.string().optional().describe('Optional headline for the landing page'),
      body: z.string().optional().describe('Optional body content for the landing page'),
    }),
    execute: async ({ companyId, title, departmentId, type = 'landing_page', headline, body }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };

      // Verify department belongs to company if provided
      if (departmentId) {
        const department = await prisma.companyDepartment.findFirst({
          where: { id: departmentId, companyId },
        });
        if (!department) {
          return { error: 'Department not found or does not belong to this company' };
        }
      }

      try {
        // Generate slug from title
        const slugBase = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        let slug = slugBase;
        let counter = 1;
        while (
          await prisma.segmentCampaign.findFirst({
            where: { userId: session.user.id, slug },
          })
        ) {
          slug = `${slugBase}-${counter}`;
          counter++;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const url = `${baseUrl}/go/${slug}`;

        const campaign = await prisma.segmentCampaign.create({
          data: {
            userId: session.user.id,
            companyId,
            departmentId: departmentId || null,
            slug,
            title,
            description: null,
            type,
            url,
            headline: headline || null,
            body: body || null,
            ctaLabel: null,
            ctaUrl: null,
            isMultiDepartment: false,
          },
        });

        return {
          campaignId: campaign.id,
          slug: campaign.slug,
          url: campaign.url,
          title: campaign.title,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create campaign';
        return { error: message };
      }
    },
  }),
};
