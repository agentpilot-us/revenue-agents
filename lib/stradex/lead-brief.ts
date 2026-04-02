/**
 * Stradex marketing lead → AgentPilot Company + capped enrichment + optional drafts / shared briefing.
 */

import { createHash } from 'crypto';
import { generateObject } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';
import { sendSystemEmail } from '@/lib/email';
import { enrichCompanyWithExa, type EnrichCompanyOptions } from '@/lib/exa/enrich-company';
import { getChatModel } from '@/lib/llm/get-model';
import { runResearchPipeline } from '@/lib/research/run-research-pipeline';
import {
  buildStradexDemoNote,
  buildStradexSellerVoicePromptBlock,
  getStradexSellerProfile,
  rebuildStradexSellerProfile,
  refreshStradexDemoNoteLine,
} from '@/lib/stradex/seller-profile';

const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateBriefingCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

function hashBriefingCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase()).digest('hex');
}

export function normalizeDomain(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0]?.split(':')[0] ?? '';
  if (!s || s.length > 253) return null;
  if (!s.includes('.')) return null;
  return s;
}

export type StradexLeadPayload = {
  name: string;
  email: string;
  company: string;
  target_account: string;
  target_domain: string;
  target_industry?: string;
  product_focus?: string;
  priority_buyer?: string;
  challenge?: string;
};

export async function resolveStradexLeadServiceUserId(): Promise<string | null> {
  const byId = process.env.STRADEX_LEAD_BRIEF_USER_ID?.trim();
  if (byId) {
    const u = await prisma.user.findUnique({ where: { id: byId }, select: { id: true } });
    return u?.id ?? null;
  }
  const byEmail = process.env.STRADEX_LEAD_BRIEF_USER_EMAIL?.trim().toLowerCase();
  if (byEmail) {
    const u = await prisma.user.findUnique({ where: { email: byEmail }, select: { id: true } });
    return u?.id ?? null;
  }
  return null;
}

function buildDealObjective(payload: StradexLeadPayload): string | null {
  const parts = [payload.product_focus?.trim(), payload.priority_buyer?.trim()].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function enrichOptionsFromEnv(): EnrichCompanyOptions {
  return {
    maxPeopleResults: parseInt(process.env.STRADEX_BRIEF_MAX_PEOPLE ?? '8', 10),
    signalLookbackHours: parseInt(process.env.STRADEX_BRIEF_SIGNAL_HOURS ?? '72', 10),
    maxSignalsToPersist: parseInt(process.env.STRADEX_BRIEF_MAX_SIGNALS ?? '12', 10),
    skipWebset: process.env.STRADEX_BRIEF_SKIP_WEBSET !== 'false',
  };
}

/**
 * Create or return existing company for same service user + normalized domain (dedup).
 */
export async function createOrReuseLeadCompany(
  userId: string,
  payload: StradexLeadPayload,
  domain: string
): Promise<{ companyId: string; reused: boolean }> {
  const existing = await prisma.company.findFirst({
    where: { userId, domain },
    select: { id: true },
  });
  if (existing) {
    return { companyId: existing.id, reused: true };
  }

  const dealObjective = buildDealObjective(payload);
  const researchGoal = payload.challenge?.trim() || null;

  const sellerCompanyName = payload.company.trim();
  const leadMeta: Record<string, unknown> = {
    stradexLead: {
      submitterName: payload.name.trim(),
      submitterEmail: payload.email.trim().toLowerCase(),
      sellerCompany: sellerCompanyName,
      submittedAt: new Date().toISOString(),
    },
  };

  const agentContext = rebuildStradexSellerProfile({
    prevAgentContext: leadMeta,
    sellerCompanyName,
    dealObjective,
    researchGoal,
  });

  const company = await prisma.company.create({
    data: {
      name: payload.target_account.trim(),
      domain,
      industry: payload.target_industry?.trim() || null,
      userId,
      dealObjective,
      researchGoal,
      agentContext: agentContext as object,
      isDemoAccount: false,
      // Human-readable ops hint: seller identity visible without opening JSON.
      demoNote: buildStradexDemoNote(sellerCompanyName),
    },
  });

  return { companyId: company.id, reused: false };
}

const twoDraftsSchema = z.object({
  emails: z
    .array(
      z.object({
        subject: z.string(),
        body: z.string(),
      })
    )
    .length(2),
});

/** Optional follow-up: submitter adds product / buyer focus after initial fast submit. */
export async function applyStradexLeadSupplement(input: {
  companyId: string;
  submitterEmail: string;
  serviceUserId: string;
  product_focus?: string;
  priority_buyer?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const company = await prisma.company.findFirst({
    where: { id: input.companyId, userId: input.serviceUserId },
    select: { agentContext: true, dealObjective: true, researchGoal: true, demoNote: true },
  });
  if (!company) {
    return { ok: false, error: 'Not found' };
  }
  const lead = (company.agentContext as { stradexLead?: { submitterEmail?: string } } | null)?.stradexLead;
  const expected = lead?.submitterEmail?.trim().toLowerCase();
  if (!expected || expected !== input.submitterEmail.trim().toLowerCase()) {
    return { ok: false, error: 'Email does not match this request.' };
  }
  const parts = [input.product_focus?.trim(), input.priority_buyer?.trim()].filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, error: 'Add at least one detail.' };
  }
  const addition = parts.join(' · ');
  const prevObj = (company.dealObjective ?? '').trim();
  const dealObjective = prevObj ? `${prevObj} · ${addition}` : addition;
  const prevCtx = (company.agentContext as Record<string, unknown> | null) ?? {};
  const withSupplement: Record<string, unknown> = {
    ...prevCtx,
    stradexLeadSupplement: {
      updatedAt: new Date().toISOString(),
      product_focus: input.product_focus?.trim() || null,
      priority_buyer: input.priority_buyer?.trim() || null,
    },
  };
  const leadRow = prevCtx.stradexLead as { sellerCompany?: string } | undefined;
  const sellerCompanyName = leadRow?.sellerCompany?.trim() ?? '';
  if (!sellerCompanyName) {
    return { ok: false, error: 'Lead data missing seller company.' };
  }
  const agentContext = rebuildStradexSellerProfile({
    prevAgentContext: withSupplement,
    sellerCompanyName,
    dealObjective,
    researchGoal: company.researchGoal,
  });
  await prisma.company.update({
    where: { id: input.companyId },
    data: {
      dealObjective,
      agentContext: agentContext as object,
      demoNote: refreshStradexDemoNoteLine(company.demoNote, sellerCompanyName),
    },
  });
  return { ok: true };
}

export async function runStradexBriefPipeline(companyId: string, userId: string): Promise<void> {
  const companyPre = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { agentContext: true },
  });
  const ctx = companyPre?.agentContext as { stradexBriefNeedsManualReview?: boolean } | null;
  if (ctx?.stradexBriefNeedsManualReview) {
    console.info(`[stradex-brief] Company ${companyId} flagged for manual review — skipping auto drafts/briefing.`);
    return;
  }

  /**
   * Full discover → enrich → save pipeline (multiple LLM calls). Off by default for free briefs.
   * Safe to enable only when the service user's catalog + content library represent one offering for every lead;
   * otherwise research uses My Company, not stradexSellerProfile (see docs/STRADEX_LEAD_BRIEF.md).
   */
  const runBuyingGroups = process.env.STRADEX_BRIEF_RUN_BUYING_GROUPS === 'true';
  if (runBuyingGroups) {
    const productCount =
      (await prisma.catalogProduct.count({ where: { userId } })) +
      (await prisma.product.count({ where: { userId } }));
    if (productCount > 0) {
      try {
        const company = await prisma.company.findFirst({
          where: { id: companyId, userId },
          select: { researchGoal: true },
        });
        const result = await runResearchPipeline({
          companyId,
          userId,
          userGoal: company?.researchGoal ?? undefined,
        });
        if (!result.ok) {
          console.warn('[stradex-brief] research pipeline:', result.error);
        }
      } catch (e) {
        console.warn('[stradex-brief] research pipeline error:', e);
      }
    }
  }

  const skipDrafts = process.env.STRADEX_BRIEF_SKIP_LLM_DRAFTS === 'true';
  if (skipDrafts) {
    await maybeCreateSharedBriefing(companyId, userId, null);
    return;
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    include: {
      accountSignals: { orderBy: { relevanceScore: 'desc' }, take: 5 },
      contacts: { orderBy: { enrichedAt: 'desc' }, take: 5 },
      departments: { take: 6, select: { customName: true, type: true, valueProp: true } },
    },
  });
  if (!company) return;

  let agentContextRecord = (company.agentContext as Record<string, unknown> | null) ?? {};
  let sellerProfile = getStradexSellerProfile(agentContextRecord);
  if (!sellerProfile) {
    const lead = agentContextRecord.stradexLead as { sellerCompany?: string } | undefined;
    const sellerName = lead?.sellerCompany?.trim();
    if (sellerName) {
      agentContextRecord = rebuildStradexSellerProfile({
        prevAgentContext: agentContextRecord,
        sellerCompanyName: sellerName,
        dealObjective: company.dealObjective,
        researchGoal: company.researchGoal,
      });
      await prisma.company.update({
        where: { id: companyId },
        data: {
          agentContext: agentContextRecord as object,
          demoNote: refreshStradexDemoNoteLine(company.demoNote, sellerName),
        },
      });
      sellerProfile = getStradexSellerProfile(agentContextRecord);
    }
  }

  const sellerVoiceBlock = sellerProfile
    ? buildStradexSellerVoicePromptBlock(sellerProfile)
    : [
        'Selling context (legacy row — no stradexSellerProfile): infer from deal fields.',
        `Deal / motion focus: ${company.dealObjective ?? 'not specified'}`,
        `Rep's goal / challenge: ${company.researchGoal ?? 'not specified'}`,
        'Write as the rep described by those fields, not as StradexAI unless that is explicitly the submitter.',
      ].join('\n');

  const targetLines = sellerProfile
    ? `Target account: ${company.name} (${company.domain ?? 'domain unknown'})
Industry: ${company.industry ?? 'unknown'}`
    : `Target account: ${company.name} (${company.domain ?? 'domain unknown'})
Industry: ${company.industry ?? 'unknown'}
Deal / motion focus: ${company.dealObjective ?? 'not specified'}
Rep's goal / challenge: ${company.researchGoal ?? 'not specified'}`;

  const deptLines = company.departments
    .map((d) => `- ${d.customName ?? d.type}: ${d.valueProp?.slice(0, 120) ?? ''}`)
    .join('\n');

  const signalLines = company.accountSignals
    .map((s) => `- [${s.type}] ${s.title}: ${s.summary.slice(0, 200)}`)
    .join('\n');
  const contactLines = company.contacts
    .map((c) => `- ${c.firstName ?? ''} ${c.lastName ?? ''}, ${c.title ?? ''}`.trim())
    .join('\n');

  const prompt = `You write enterprise B2B outbound email drafts. Output professional, specific copy (no placeholders like [Name] — use real names from contacts when available).

${sellerVoiceBlock}

${targetLines}

Recent signals:
${signalLines || '(none yet)'}

Contacts:
${contactLines || '(none yet)'}

Buying groups / divisions (if any):
${deptLines || '(none yet)'}

Write exactly 2 different email drafts (different angles, e.g. one tied to a signal, one tied to a role). Keep each body under 180 words.`;

  try {
    const { object } = await generateObject({
      model: getChatModel('fast'),
      schema: twoDraftsSchema,
      prompt,
      maxOutputTokens: 2000,
    });

    const prev = (company.agentContext as Record<string, unknown> | null) ?? {};
    await prisma.company.update({
      where: { id: companyId },
      data: {
        agentContext: {
          ...prev,
          stradexBriefDrafts: {
            generatedAt: new Date().toISOString(),
            emails: object.emails,
          },
        } as object,
      },
    });

    const lead = (agentContextRecord.stradexLead as { submitterName?: string } | undefined) ?? undefined;
    await maybeCreateSharedBriefing(companyId, userId, {
      companyName: company.name,
      domain: company.domain,
      leadName: lead?.submitterName,
      sellingCompanyName: sellerProfile?.companyName,
      sellerVoiceSummary: sellerProfile?.oneLiner ?? undefined,
      signals: company.accountSignals.map((s) => ({
        type: s.type,
        title: s.title,
        summary: s.summary.slice(0, 400),
      })),
      contacts: company.contacts.map((c) => ({
        name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
        title: c.title,
      })),
      drafts: object.emails,
    });
  } catch (e) {
    console.error('[stradex-brief] draft generation failed:', e);
    await maybeCreateSharedBriefing(companyId, userId, null);
  }
}

type BriefingPayload = {
  companyName: string;
  domain: string | null;
  leadName?: string;
  sellingCompanyName?: string;
  sellerVoiceSummary?: string;
  signals: { type: string; title: string; summary: string }[];
  contacts: { name: string; title: string | null }[];
  drafts: { subject: string; body: string }[];
};

function buildStradexBriefingSections(p: BriefingPayload): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = [
    {
      title: 'Target account',
      body: [p.companyName, p.domain ? `Domain: ${p.domain}` : null].filter(Boolean).join('\n'),
    },
  ];
  if (p.sellingCompanyName || p.sellerVoiceSummary) {
    sections.push({
      title: "Who's reaching out",
      body: [
        p.sellingCompanyName ? `${p.sellingCompanyName}` : null,
        p.sellerVoiceSummary ? `Context: ${p.sellerVoiceSummary}` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
  }
  if (p.signals.length > 0) {
    sections.push({
      title: 'Recent signals',
      body: p.signals.map((s) => `• [${s.type}] ${s.title}\n${s.summary}`).join('\n\n'),
    });
  }
  if (p.contacts.length > 0) {
    sections.push({
      title: 'Contacts surfaced',
      body: p.contacts.map((c) => `• ${c.name || 'Unknown'}${c.title ? ` — ${c.title}` : ''}`).join('\n'),
    });
  }
  p.drafts.forEach((e, i) => {
    sections.push({
      title: `Outreach draft ${i + 1}: ${e.subject}`,
      body: e.body,
    });
  });
  return sections;
}

async function maybeCreateSharedBriefing(
  companyId: string,
  userId: string,
  payload: BriefingPayload | null
): Promise<void> {
  if (process.env.STRADEX_BRIEF_CREATE_SHARE_LINK !== 'true') return;
  if (!payload) return;

  const hours = parseInt(process.env.BRIEFING_LINK_EXPIRY_HOURS ?? '48', 10);
  const token = nanoid(24);
  const code = generateBriefingCode();
  const codeHash = hashBriefingCode(code);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const sections = buildStradexBriefingSections(payload);

  await prisma.sharedBriefing.create({
    data: {
      userId,
      companyId,
      token,
      codeHash,
      expiresAt,
      briefingPayload: {
        kind: 'stradex_free_brief',
        companyName: payload.companyName,
        contactName: payload.leadName ?? '',
        sections,
      } as object,
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  console.info(
    `[stradex-brief] Shared briefing created for company ${companyId}: ${baseUrl}/go/briefing/${token} (code for recipient)`
  );
}

/**
 * Capped enrichment then pipeline (buying groups / drafts / briefing).
 * Schedule with `after(() => runStradexLeadBackgroundJobs(...))` from a Route Handler so work completes on Vercel.
 */
export async function runStradexLeadBackgroundJobs(
  companyId: string,
  userId: string,
  reused: boolean
): Promise<void> {
  if (reused) {
    console.info(`[stradex-brief] Duplicate domain for user ${userId}; skipping enrichment and pipeline.`);
    return;
  }
  const opts = enrichOptionsFromEnv();
  try {
    const enrich = await enrichCompanyWithExa(companyId, opts);
    const minSignals = parseInt(process.env.STRADEX_BRIEF_MIN_SIGNALS ?? '3', 10);
    const minContacts = parseInt(process.env.STRADEX_BRIEF_MIN_CONTACTS ?? '2', 10);
    const thin =
      enrich.signalsFound < minSignals || enrich.contactsFound < minContacts;

    const row = await prisma.company.findUnique({
      where: { id: companyId },
      select: { agentContext: true, demoNote: true },
    });
    const prevCtx = (row?.agentContext as Record<string, unknown> | null) ?? {};
    const enrichmentMeta = {
      signalsFound: enrich.signalsFound,
      contactsFound: enrich.contactsFound,
      minSignals,
      minContacts,
      thin,
    };

    if (thin) {
      // Source of truth for automation/ops filters: agentContext.stradexBriefNeedsManualReview (boolean).
      // demoNote line is optional human scan aid only — do not key business logic on string matching demoNote long-term.
      const note =
        `Manual review: thin enrichment (signals=${enrich.signalsFound}, contacts=${enrich.contactsFound}; min ${minSignals}/${minContacts}).`;
      await prisma.company.update({
        where: { id: companyId },
        data: {
          agentContext: {
            ...prevCtx,
            stradexBriefEnrichment: enrichmentMeta,
            stradexBriefNeedsManualReview: true,
          } as object,
          demoNote: row?.demoNote ? `${row.demoNote}\n${note}` : note,
        },
      });
      console.warn(`[stradex-brief] ${note}`);
      return;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        agentContext: {
          ...prevCtx,
          stradexBriefEnrichment: enrichmentMeta,
          stradexBriefNeedsManualReview: false,
        } as object,
      },
    });

    await runStradexBriefPipeline(companyId, userId);
  } catch (e) {
    console.error('[stradex-brief] background job error:', e);
  }
}

/**
 * Immediate “we received your request” mail (Resend). Silence after submit hurts trust with enterprise buyers.
 * Set STRADEX_LEAD_SEND_CONFIRMATION_EMAIL=false to disable.
 */
export async function sendStradexLeadConfirmationEmail(
  to: string,
  targetAccountName: string
): Promise<void> {
  if (process.env.STRADEX_LEAD_SEND_CONFIRMATION_EMAIL === 'false') return;
  const subject = 'We received your free account brief request';
  const safeName = targetAccountName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
  const text = `Hi,

Thanks for requesting a free account brief for ${targetAccountName}. We've received your details and our team is on it — you'll hear from us within 48 hours.

If you didn't submit this form, you can ignore this email.

— StradexAI`;
  const html = `<p>Hi,</p><p>Thanks for requesting a free account brief for <strong>${safeName}</strong>. We've received your details and our team is on it — you'll hear from us within 48 hours.</p><p>If you didn't submit this form, you can ignore this email.</p><p>— StradexAI</p>`;
  const result = await sendSystemEmail({
    to,
    subject,
    text,
    html,
    from: process.env.STRADEX_LEAD_FROM_EMAIL?.trim() || undefined,
  });
  if (!result.ok) {
    console.warn('[stradex-brief] confirmation email skipped:', result.error);
  }
}

/**
 * Same domain already existed for the service user (different or same submitter).
 * Generic acknowledgment only — no enrichment status, no prior submitter identity.
 */
export async function sendStradexLeadDuplicateInterestEmail(
  to: string,
  targetAccountName: string
): Promise<void> {
  if (process.env.STRADEX_LEAD_SEND_CONFIRMATION_EMAIL === 'false') return;
  const safeName = targetAccountName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
  const subject = `We received your interest in ${targetAccountName}`;
  const text = `Hi,

Thanks for your interest in ${targetAccountName}. We've received your request and our team will take a look.

If you didn't submit this form, you can ignore this email.

— StradexAI`;
  const html = `<p>Hi,</p><p>Thanks for your interest in <strong>${safeName}</strong>. We've received your request and our team will take a look.</p><p>If you didn't submit this form, you can ignore this email.</p><p>— StradexAI</p>`;
  const result = await sendSystemEmail({
    to,
    subject,
    text,
    html,
    from: process.env.STRADEX_LEAD_FROM_EMAIL?.trim() || undefined,
  });
  if (!result.ok) {
    console.warn('[stradex-brief] duplicate-interest email skipped:', result.error);
  }
}
