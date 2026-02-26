/**
 * Chat tools for deploying sales/landing pages to Vercel via REST API.
 */
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isDemoAccount } from '@/lib/demo/is-demo-account';
import { deployStaticPage } from '@/lib/vercel/deploy-static';
import {
  salesPageHtml,
  PLAY_TEMPLATES,
} from '@/lib/templates/sales-page-html';

type ChatContext = {
  accountId?: string;
  userId?: string;
  companyName?: string | null;
  isDemoMode?: boolean;
};

async function ensureUniqueSlug(userId: string, baseSlug: string): Promise<string> {
  let slug = baseSlug.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 50) || 'page';
  let counter = 1;
  while (
    await prisma.segmentCampaign.findFirst({
      where: { userId, slug },
    })
  ) {
    slug = `${baseSlug.slice(0, 45)}-${counter}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    counter++;
  }
  return slug;
}

// Cast so Zod inputSchema is accepted when merged with chatTools (avoids FlexibleSchema<never>)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asToolConfig = (c: any) => c as Parameters<typeof tool>[0];

export const vercelDeployTools: Record<string, Tool> = {
  deploy_sales_page_to_vercel: tool(asToolConfig({
    description:
      'Deploy a pre-built sales page for a play (Account Expansion, Partner Enablement, Referral Program) to Vercel. Returns the live URL. Use when the user asks to create or deploy a sales page for one of these plays.',
    inputSchema: z.object({
      playName: z
        .enum(['accountExpansion', 'partnerEnablement', 'referralProgram'])
        .describe('Which play template to use'),
      companyId: z.string().optional().describe('Current account ID (for dashboard listing)'),
      ctaUrl: z.string().url().optional().describe('Override CTA button URL (e.g. Calendly)'),
    }),
    execute: async (
      params: {
        playName: 'accountExpansion' | 'partnerEnablement' | 'referralProgram';
        companyId?: string;
        ctaUrl?: string;
      },
      opts?: { experimental_context?: ChatContext }
    ) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };

      const ctx = opts?.experimental_context;
      const companyId = params.companyId ?? ctx?.accountId;
      if (companyId && (await isDemoAccount(companyId)))
        return { error: 'Demo account — deployment disabled.', url: null };

      const template = PLAY_TEMPLATES[params.playName];
      if (!template)
        return { error: `Unknown play: ${params.playName}` };

      const ctaUrl = params.ctaUrl ?? 'https://calendly.com';
      const html = salesPageHtml({
        ...template,
        ctaLabel: 'Book a Demo',
        ctaUrl,
      });

      const projectName = `agentpilot-${params.playName}`;
      const result = await deployStaticPage({
        name: projectName,
        files: { 'index.html': html },
        teamId: process.env.VERCEL_TEAM_ID ?? undefined,
        projectId: process.env.VERCEL_PROJECT_ID ?? undefined,
      });

      if (result.error)
        return { error: result.error, url: null };

      const url = result.url ?? undefined;
      const userId = session.user.id;

      if (companyId && url) {
        try {
          const slug = await ensureUniqueSlug(userId, projectName);
          await prisma.segmentCampaign.create({
            data: {
              userId,
              companyId,
              slug,
              title: `${template.title} Sales Page`,
              description: template.valueProp,
              url,
              type: 'landing_page',
              headline: template.title,
              body: template.valueProp,
              ctaLabel: 'Book a Demo',
              ctaUrl,
            },
          });
        } catch (e) {
          console.error('SegmentCampaign create failed:', e);
        }
      }

      return {
        url,
        deploymentId: result.deploymentId,
        readyState: result.readyState,
        message: url ? `Deployed at ${url}` : 'Deployment created; URL pending.',
      };
    },
  })),

  deploy_custom_landing_page: tool(asToolConfig({
    description:
      'Deploy a custom landing page to Vercel with user-specified title, value prop, benefits, and CTA. Use when the user wants a one-off or custom marketing page (e.g. webinar, product launch).',
    inputSchema: z.object({
      name: z.string().describe('URL-safe project name (e.g. "ai-coaching-product")'),
      title: z.string().describe('Page headline/title'),
      valueProp: z.string().describe('Value proposition or short description'),
      benefits: z.array(z.string()).min(1).max(6).describe('Key benefits (1–6 bullets)'),
      pricing: z.string().optional().describe('Pricing text if any'),
      ctaLabel: z.string().describe('Button label (e.g. "Book a Demo", "Register Now")'),
      ctaUrl: z.string().url().describe('CTA button URL'),
      companyId: z.string().optional().describe('Current account ID (for dashboard listing)'),
    }),
    execute: async (
      params: {
        name: string;
        title: string;
        valueProp: string;
        benefits: string[];
        pricing?: string;
        ctaLabel: string;
        ctaUrl: string;
        companyId?: string;
      },
      opts?: { experimental_context?: ChatContext }
    ) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };

      const ctx = opts?.experimental_context;
      const companyId = params.companyId ?? ctx?.accountId;
      if (companyId && (await isDemoAccount(companyId)))
        return { error: 'Demo account — deployment disabled.', url: null };

      const html = salesPageHtml({
        title: params.title,
        valueProp: params.valueProp,
        benefits: params.benefits,
        pricing: params.pricing,
        ctaLabel: params.ctaLabel,
        ctaUrl: params.ctaUrl,
      });

      const projectName = params.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 100) || 'landing-page';
      const result = await deployStaticPage({
        name: projectName,
        files: { 'index.html': html },
        teamId: process.env.VERCEL_TEAM_ID ?? undefined,
        projectId: process.env.VERCEL_PROJECT_ID ?? undefined,
      });

      if (result.error)
        return { error: result.error, url: null };

      const url = result.url ?? undefined;
      const userId = session.user.id;

      if (companyId && url) {
        try {
          const slug = await ensureUniqueSlug(userId, projectName);
          await prisma.segmentCampaign.create({
            data: {
              userId,
              companyId,
              slug,
              title: params.title,
              description: params.valueProp,
              url,
              type: 'landing_page',
              headline: params.title,
              body: params.valueProp,
              ctaLabel: params.ctaLabel,
              ctaUrl: params.ctaUrl,
            },
          });
        } catch (e) {
          console.error('SegmentCampaign create failed:', e);
        }
      }

      return {
        url,
        deploymentId: result.deploymentId,
        readyState: result.readyState,
        message: url ? `Deployed at ${url}` : 'Deployment created; URL pending.',
      };
    },
  })),
};
