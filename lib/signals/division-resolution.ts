/**
 * Division resolution pipeline for signals (Spec 3 Gap 1).
 * Resolves an AccountSignal or visit context to a division (CompanyDepartment) when the user
 * has an enterprise_expansion roadmap. Used by GET /api/signals/[signalId] and hot-signals
 * so CTAs can deep-link with division pre-selected.
 *
 * Pipeline order: contact lookup → department mapping → keyword match → fallback (null).
 */

import { prisma } from '@/lib/db';

export type ResolvedDivision = {
  id: string;   // CompanyDepartment.id for URL param and filters
  name: string; // Display name (customName or target name)
};

export type ResolutionResult = {
  division: ResolvedDivision | null;
  method: 'contact_lookup' | 'department_mapping' | 'keyword_match' | 'unresolved';
  confidence: number;
};

type DivisionTarget = {
  id: string;
  name: string;
  companyId?: string | null;
  companyDepartmentId: string | null;
  companyDepartment?: { id: string; customName: string | null } | null;
  intelligence?: unknown;
  contacts?: Array<{ contact: { email: string | null } | null }>;
};

function extractKeywords(name: string, intelligence?: unknown): string[] {
  const words = name
    .split(/[\s&,]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 2 && !/^(the|and|for|with|at|in|on)$/.test(w));
  const keywords = [...new Set(words)];
  if (intelligence && typeof intelligence === 'object' && 'initiatives' in intelligence) {
    const init = (intelligence as { initiatives?: unknown }).initiatives;
    if (Array.isArray(init)) {
      for (const item of init) {
        if (typeof item === 'string') keywords.push(item.toLowerCase());
      }
    }
  }
  return keywords;
}

/**
 * Resolve a signal (or visit) to a division for the given user and company.
 * Returns division id + name for URL params and UI; null when unresolved.
 */
export async function resolveDivisionForSignal(params: {
  userId: string;
  companyId: string;
  /** For contact lookup (e.g. from campaign visit) */
  contactEmail?: string | null;
  /** For department mapping (e.g. visit.departmentId or signal.companyDepartmentId if added) */
  companyDepartmentId?: string | null;
  /** For keyword match (e.g. signal.title + signal.summary) */
  signalTitle?: string | null;
  signalSummary?: string | null;
}): Promise<ResolutionResult> {
  const { userId, companyId, contactEmail, companyDepartmentId, signalTitle, signalSummary } = params;

  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, roadmapType: 'enterprise_expansion' },
    select: {
      targets: {
        where: { targetType: 'division' },
        include: {
          company: { select: { id: true } },
          companyDepartment: { select: { id: true, customName: true } },
          contacts: { include: { contact: { select: { email: true } } } },
        },
      },
    },
  });

  if (!roadmap?.targets.length) {
    return { division: null, method: 'unresolved', confidence: 0 };
  }

  const targets = roadmap.targets as DivisionTarget[];

  // 1. Contact lookup (highest confidence)
  if (contactEmail?.trim()) {
    const email = contactEmail.trim().toLowerCase();
    for (const t of targets) {
      if (t.companyId !== companyId) continue;
      const match = t.contacts?.some(
        (rc) => rc.contact?.email?.toLowerCase() === email
      );
      if (match && t.companyDepartment) {
        return {
          division: {
            id: t.companyDepartment.id,
            name: t.companyDepartment.customName ?? t.name,
          },
          method: 'contact_lookup',
          confidence: 1.0,
        };
      }
    }
  }

  // 2. CompanyDepartment mapping
  if (companyDepartmentId?.trim()) {
    const t = targets.find(
      (x) => (x.companyId ?? null) === companyId && x.companyDepartmentId === companyDepartmentId
    );
    if (t?.companyDepartment) {
      return {
        division: {
          id: t.companyDepartment.id,
          name: t.companyDepartment.customName ?? t.name,
        },
        method: 'department_mapping',
        confidence: 0.8,
      };
    }
  }

  // 3. Keyword matching against signal text
  const text = [signalTitle, signalSummary].filter(Boolean).join(' ').toLowerCase();
  if (text.length > 0) {
    let best: { target: DivisionTarget; score: number } | null = null;
    for (const t of targets) {
      if ((t.companyId ?? null) !== companyId) continue;
      const keywords = extractKeywords(t.name, t.intelligence);
      const overlap = keywords.filter((k) => text.includes(k)).length;
      if (overlap > 0) {
        const score = Math.min(0.3 + overlap * 0.15, 0.75);
        if (!best || score > best.score) {
          best = { target: t, score };
        }
      }
    }
    if (best?.target.companyDepartment) {
      return {
        division: {
          id: best.target.companyDepartment.id,
          name: best.target.companyDepartment.customName ?? best.target.name,
        },
        method: 'keyword_match',
        confidence: best.score,
      };
    }
  }

  return { division: null, method: 'unresolved', confidence: 0 };
}
