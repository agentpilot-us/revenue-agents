/**
 * Resolves AI-suggested targeting for a workflow using:
 * 1. PlaybookTemplate targeting fields + expectedOutcome + step hints
 * 2. Signal context (who/what the signal is about)
 * 3. CompanyDepartment research data (useCase, valueProp, targetRoles, etc.)
 * 4. Company-level intel (dealObjective, businessOverview)
 * 5. Contact seniority, engagement, and channel availability
 *
 * Returns department-grouped suggestions with "why / what to say / expected outcome" briefs.
 * All deterministic — no LLM call.
 */

import { prisma } from '@/lib/db';

export type ActivePlayInfo = {
  workflowId: string;
  playName: string;
  channel: string | null;
  dueAt: string | null;
};

export type LastTouchInfo = {
  channel: string;
  daysAgo: number;
};

export type SuggestedContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  seniorityLevel: number | null;
  engagementStatus: string;
  departmentName: string;
  reason: string;
  activePlay?: ActivePlayInfo | null;
  lastTouch?: LastTouchInfo | null;
};

export type SuggestedDepartment = {
  departmentId: string;
  departmentName: string;
  departmentType: string;
  stage: string | null;
  whyThisTeam: string;
  whatToSay: string;
  expectedOutcome: string;
  contacts: SuggestedContact[];
};

export type TargetingSuggestion = {
  departments: SuggestedDepartment[];
  reasoning: string;
};

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  seniorityLevel: number | null;
  enrichmentStatus: string | null;
  engagementScore: number | null;
  companyDepartment: {
    id: string;
    type: string;
    customName: string | null;
  } | null;
};

type DepartmentData = {
  id: string;
  type: string;
  customName: string | null;
  status: string;
  useCase: string | null;
  valueProp: string | null;
  whyThisGroupBuys: string | null;
  estimatedOpportunity: string | null;
  targetRoles: unknown;
  notes: string | null;
};

const PERSONA_SENIORITY_MAP: Record<string, number> = {
  'C-Suite': 6,
  VP: 4,
  Director: 3,
  Manager: 2,
};

export async function resolveTargetingSuggestion(opts: {
  templateId: string | null;
  companyId: string;
  accountSignalId: string | null;
  userId?: string | null;
  workflowTitle?: string | null;
  workflowDescription?: string | null;
}): Promise<TargetingSuggestion | null> {
  const { templateId, companyId, accountSignalId, userId, workflowTitle, workflowDescription } = opts;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [template, signal, contacts, departments, companyData, roadmapTargets, activeSteps, recentActivities] =
    await Promise.all([
      templateId
        ? prisma.playbookTemplate.findUnique({
            where: { id: templateId },
            select: {
              name: true,
              targetDepartmentTypes: true,
              targetPersonas: true,
              expectedOutcome: true,
              steps: {
                orderBy: { order: 'asc' },
                take: 1,
                select: { promptHint: true },
              },
            },
          })
        : null,
      accountSignalId
        ? prisma.accountSignal.findUnique({
            where: { id: accountSignalId },
            select: { title: true, summary: true, type: true },
          })
        : null,
      prisma.contact.findMany({
        where: { companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          email: true,
          linkedinUrl: true,
          seniority: true,
          seniorityLevel: true,
          enrichmentStatus: true,
          engagementScore: true,
          companyDepartment: {
            select: { id: true, type: true, customName: true },
          },
        },
      }),
      prisma.companyDepartment.findMany({
        where: { companyId },
        select: {
          id: true,
          type: true,
          customName: true,
          status: true,
          useCase: true,
          valueProp: true,
          whyThisGroupBuys: true,
          estimatedOpportunity: true,
          targetRoles: true,
          notes: true,
        },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          dealObjective: true,
          businessOverview: true,
          keyInitiatives: true,
        },
      }),
      prisma.roadmapTarget.findMany({
        where: { companyId },
        select: {
          companyDepartmentId: true,
          stage: true,
        },
      }),
      prisma.actionWorkflowStep.findMany({
        where: {
          contactId: { not: null },
          status: { in: ['pending', 'ready', 'generating'] },
          workflow: {
            companyId,
            ...(userId ? { userId } : {}),
            status: { in: ['pending', 'in_progress'] },
          },
        },
        select: {
          contactId: true,
          channel: true,
          dueAt: true,
          workflow: {
            select: {
              id: true,
              title: true,
              template: { select: { name: true } },
            },
          },
        },
      }),
      prisma.activity.findMany({
        where: {
          companyId,
          contactId: { not: null },
          createdAt: { gte: fourteenDaysAgo },
          type: { in: ['EMAIL_SENT', 'Email', 'LINKEDIN_DRAFTED', 'MEETING_SCHEDULED', 'Meeting'] },
        },
        select: { contactId: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  if (contacts.length === 0) return null;

  const targetDepts = parseJsonArray(template?.targetDepartmentTypes);
  const targetPersonas = parseJsonArray(template?.targetPersonas);

  const contextText = [signal?.title, signal?.summary, workflowTitle, workflowDescription]
    .filter(Boolean)
    .join(' ');
  const signalSubjectName = extractSubjectName(signal?.title, signal?.summary);
  const signalDeptHints = extractDeptHints(contextText);

  // Build department lookup
  const deptMap = new Map<string, DepartmentData>();
  for (const d of departments) {
    deptMap.set(d.id, d);
  }

  // Build roadmap target stage lookup
  const stageByDeptId = new Map<string, string>();
  for (const rt of roadmapTargets) {
    if (rt.companyDepartmentId && rt.stage) {
      stageByDeptId.set(rt.companyDepartmentId, rt.stage);
    }
  }

  // Build active-play lookup by contactId
  const activePlayByContact = new Map<string, ActivePlayInfo>();
  for (const s of activeSteps) {
    if (!s.contactId || activePlayByContact.has(s.contactId)) continue;
    activePlayByContact.set(s.contactId, {
      workflowId: s.workflow.id,
      playName: s.workflow.template?.name ?? s.workflow.title,
      channel: s.channel,
      dueAt: s.dueAt?.toISOString() ?? null,
    });
  }

  // Build last-touch lookup by contactId (most recent first due to orderBy)
  const lastTouchByContact = new Map<string, LastTouchInfo>();
  const now = Date.now();
  for (const a of recentActivities) {
    if (!a.contactId || lastTouchByContact.has(a.contactId)) continue;
    const channelFromType =
      a.type.includes('EMAIL') || a.type === 'Email' ? 'email' :
      a.type.includes('LINKEDIN') ? 'linkedin' :
      a.type.includes('MEETING') || a.type === 'Meeting' ? 'meeting' : 'other';
    lastTouchByContact.set(a.contactId, {
      channel: channelFromType,
      daysAgo: Math.floor((now - a.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    });
  }

  // Score contacts
  const scored = contacts.map((c) => {
    let score = 0;
    const reasons: string[] = [];
    const engStatus = deriveEngagementStatus(c);

    if (isSignalSubject(c, signalSubjectName)) {
      score += 100;
      reasons.push('Signal subject');
    }

    if (matchesDepartment(c, targetDepts, signalDeptHints)) {
      score += 40;
      reasons.push('Target department');
    }

    if (matchesPersona(c, targetPersonas)) {
      score += 30;
      reasons.push(c.seniority ? `${c.seniority} seniority` : 'Target persona');
    }

    score += Math.min((c.seniorityLevel ?? 0) * 3, 18);

    if (engStatus === 'Engaged') {
      score += 10;
      reasons.push('Engaged');
    }

    if (c.email) score += 2;
    if (c.linkedinUrl) score += 1;

    // Penalize contacts already in active plays
    const activePl = activePlayByContact.get(c.id) ?? null;
    if (activePl) {
      score -= 30;
      reasons.push(`In play: ${activePl.playName}`);
    }

    // Penalize contacts touched in last 3 days
    const lastTch = lastTouchByContact.get(c.id) ?? null;
    if (lastTch && lastTch.daysAgo <= 3) {
      score -= 15;
      reasons.push(`${lastTch.channel} ${lastTch.daysAgo}d ago`);
    }

    return { contact: c, score, reasons, engStatus, activePlay: activePl, lastTouch: lastTch };
  });

  scored.sort((a, b) => b.score - a.score);

  const threshold = 20;
  const suggested = scored.filter((s) => s.score >= threshold);
  if (suggested.length === 0) return null;

  // Group contacts by department
  const contactsByDept = new Map<string, typeof suggested>();
  for (const s of suggested) {
    const deptId = s.contact.companyDepartment?.id ?? '__none__';
    const existing = contactsByDept.get(deptId) ?? [];
    existing.push(s);
    contactsByDept.set(deptId, existing);
  }

  const templateFirstHint = template?.steps?.[0]?.promptHint ?? null;
  const templateExpectedOutcome = (template?.expectedOutcome as string) ?? null;

  // Build department-level briefs
  const suggestedDepartments: SuggestedDepartment[] = [];

  for (const [deptId, deptContacts] of contactsByDept) {
    if (deptId === '__none__') continue;
    const dept = deptMap.get(deptId);
    if (!dept) continue;

    const deptName = dept.customName ?? dept.type.replace(/_/g, ' ');
    const stage = stageByDeptId.get(deptId) ?? null;

    const whyThisTeam = buildWhyThisTeam(
      dept,
      signal?.title ?? workflowTitle ?? null,
      signal?.summary ?? workflowDescription ?? null,
    );

    const whatToSay = buildWhatToSay(
      dept,
      templateFirstHint,
      companyData?.dealObjective ?? null,
    );

    const expectedOutcome = buildExpectedOutcome(
      dept,
      templateExpectedOutcome,
    );

    suggestedDepartments.push({
      departmentId: deptId,
      departmentName: deptName,
      departmentType: dept.type,
      stage,
      whyThisTeam,
      whatToSay,
      expectedOutcome,
      contacts: deptContacts.slice(0, 5).map((s) => ({
        id: s.contact.id,
        firstName: s.contact.firstName,
        lastName: s.contact.lastName,
        title: s.contact.title,
        email: s.contact.email,
        linkedinUrl: s.contact.linkedinUrl,
        seniority: s.contact.seniority,
        seniorityLevel: s.contact.seniorityLevel,
        engagementStatus: s.engStatus,
        departmentName: deptName,
        reason: s.reasons.length > 0 ? s.reasons.join(' · ') : 'Matches criteria',
        activePlay: s.activePlay,
        lastTouch: s.lastTouch,
      })),
    });
  }

  // Sort departments: highest total contact score first
  suggestedDepartments.sort((a, b) => {
    const aScore = contactsByDept.get(a.departmentId)?.reduce((sum, s) => sum + s.score, 0) ?? 0;
    const bScore = contactsByDept.get(b.departmentId)?.reduce((sum, s) => sum + s.score, 0) ?? 0;
    return bScore - aScore;
  });

  const reasoning = buildReasoning(
    template?.name ?? null,
    signal?.title ?? workflowTitle ?? null,
    suggestedDepartments.length,
    suggestedDepartments.reduce((sum, d) => sum + d.contacts.length, 0),
    targetPersonas,
  );

  return {
    departments: suggestedDepartments,
    reasoning,
  };
}

// ── Brief builders ───────────────────────────────────────────────────────────

function buildWhyThisTeam(
  dept: DepartmentData,
  signalTitle: string | null,
  signalSummary: string | null,
): string {
  const parts: string[] = [];

  if (dept.whyThisGroupBuys) {
    parts.push(dept.whyThisGroupBuys);
  } else if (dept.useCase) {
    parts.push(dept.useCase);
  }

  if (signalTitle) {
    const deptName = dept.customName ?? dept.type.replace(/_/g, ' ');
    const signalLower = `${signalTitle} ${signalSummary ?? ''}`.toLowerCase();
    const deptLower = deptName.toLowerCase();
    if (signalLower.includes(deptLower) || deptLower.split(/\s+/).some((w) => w.length > 3 && signalLower.includes(w))) {
      parts.push(`Directly relevant to the signal: "${signalTitle}".`);
    }
  }

  return parts.length > 0
    ? parts.join(' ')
    : `This team is a mapped buying group for the account.`;
}

function buildWhatToSay(
  dept: DepartmentData,
  templateHint: string | null,
  dealObjective: string | null,
): string {
  const parts: string[] = [];

  if (dept.valueProp) {
    parts.push(dept.valueProp);
  }

  if (templateHint) {
    parts.push(templateHint);
  } else if (dealObjective) {
    parts.push(`Align with account objective: ${dealObjective}`);
  }

  return parts.length > 0
    ? parts.join(' — ')
    : 'Introduce how your solution maps to their team priorities.';
}

function buildExpectedOutcome(
  dept: DepartmentData,
  templateExpectedOutcome: string | null,
): string {
  const parts: string[] = [];

  if (templateExpectedOutcome) {
    parts.push(templateExpectedOutcome);
  }

  if (dept.estimatedOpportunity) {
    parts.push(`Estimated opportunity: ${dept.estimatedOpportunity}`);
  }

  return parts.length > 0
    ? parts.join('. ')
    : 'Progress engagement with this buying group.';
}

// ── Contact helpers ──────────────────────────────────────────────────────────

function deriveEngagementStatus(c: ContactRow): string {
  if ((c.engagementScore ?? 0) > 0) return 'Engaged';
  if (c.enrichmentStatus === 'complete') return 'Enriched';
  if (c.email) return 'Enriched';
  return 'Not enriched';
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return [];
}

function extractSubjectName(title?: string | null, summary?: string | null): string | null {
  const text = `${title ?? ''} ${summary ?? ''}`;
  const patterns = [
    /(?:appointed|hired|hires|named|announces)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:joined|appointed|hired|as\s+(?:new\s+)?(?:VP|Director|GM|General Manager|Chief))/i,
  ];
  for (const pat of patterns) {
    const match = text.match(pat);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractDeptHints(contextText: string): string[] {
  const text = contextText.toLowerCase();
  const deptKeywords: Record<string, string[]> = {
    AUTONOMOUS_VEHICLES: ['autonomous', 'adas', 'self-driving', 'av ', 'av/', 'av,', 'cruise'],
    ENGINEERING: ['engineering', 'vehicle engineering', 'software engineering', 'cfd', 'cae'],
    MANUFACTURING: ['manufacturing', 'factory', 'plant', 'production', 'supply chain'],
    IT: ['it infrastructure', 'data center', 'cloud', 'information technology'],
    CONNECTED_SERVICES: ['connected', 'infotainment', 'telematics', 'digital cockpit'],
  };
  const hints: string[] = [];
  for (const [dept, keywords] of Object.entries(deptKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      hints.push(dept);
    }
  }
  return hints;
}

function isSignalSubject(contact: ContactRow, subjectName: string | null): boolean {
  if (!subjectName) return false;
  const contactName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim().toLowerCase();
  return contactName === subjectName.toLowerCase();
}

function matchesDepartment(
  contact: ContactRow,
  targetDepts: string[],
  signalDeptHints: string[],
): boolean {
  const deptType = contact.companyDepartment?.type;
  if (!deptType) return false;
  const allDepts = [...new Set([...targetDepts, ...signalDeptHints])];
  if (allDepts.length === 0) return false;
  const deptLower = deptType.toLowerCase();
  return allDepts.some(
    (d) => deptLower.includes(d.toLowerCase()) || d.toLowerCase().includes(deptLower),
  );
}

function matchesPersona(contact: ContactRow, targetPersonas: string[]): boolean {
  if (targetPersonas.length === 0) return false;
  const minLevel = Math.min(...targetPersonas.map((p) => PERSONA_SENIORITY_MAP[p] ?? 1));
  return (contact.seniorityLevel ?? 0) >= minLevel;
}

function buildReasoning(
  templateName: string | null,
  signalTitle: string | null,
  deptCount: number,
  contactCount: number,
  personas: string[],
): string {
  const parts: string[] = [];

  if (templateName && signalTitle) {
    parts.push(`Based on the "${templateName}" play and the signal "${signalTitle}"`);
  } else if (templateName) {
    parts.push(`Based on the "${templateName}" play`);
  } else if (signalTitle) {
    parts.push(`Based on the signal "${signalTitle}"`);
  }

  if (deptCount > 0) {
    parts.push(
      `${deptCount} buying group${deptCount !== 1 ? 's' : ''} with ${contactCount} contact${contactCount !== 1 ? 's' : ''}`,
    );
  }

  if (personas.length > 0) {
    parts.push(`targeting ${personas.join('/')}+ seniority`);
  }

  return parts.join(' — ') + '.';
}
