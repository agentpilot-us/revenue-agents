import type { ContentType } from '@prisma/client';

/**
 * Heuristic: which Content Library types strengthen generation for this step type.
 * v1 — type-level only (not department/industry targeting).
 */
export function libraryTypesForGenerationType(contentGenerationType: string): ContentType[] {
  const t = contentGenerationType.trim().toLowerCase();
  if (t.includes('competitive')) return ['Battlecard'];
  if (t.includes('renewal')) return ['SuccessStory', 'UseCase'];
  if (t.includes('roi') || t.includes('value_prop')) return ['UseCase', 'Framework'];
  if (t.includes('executive_intro') || t.includes('congratulations')) return ['Framework', 'Persona'];
  if (t.includes('event')) return ['CompanyEvent', 'Framework'];
  if (t.includes('follow_up')) return ['EmailContent', 'Framework'];
  if (t === 'custom_content') return [];
  if (t.includes('research') || t.includes('brief')) return ['Framework', 'UseCase'];
  if (t.includes('linkedin')) return ['Persona', 'Framework'];
  if (t.includes('meeting') || t.includes('agenda') || t.includes('talking')) return ['Framework', 'UseCase'];
  if (t.includes('phone')) return ['Framework', 'Battlecard'];
  return ['Framework', 'UseCase'];
}
