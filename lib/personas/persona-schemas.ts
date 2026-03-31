import { z } from 'zod';
import { DepartmentType } from '@prisma/client';

const departmentEnum = z.nativeEnum(DepartmentType);

export const personaCreateBodySchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(20000).optional().nullable(),
  includeTitles: z.array(z.string().max(500)).max(100).default([]),
  excludeTitles: z.array(z.string().max(500)).max(100).default([]),
  primaryDepartment: departmentEnum.optional().nullable(),
  secondaryDepartments: z.array(departmentEnum).max(20).default([]),
  painPoints: z.array(z.string().max(1000)).max(50).default([]),
  successMetrics: z.array(z.string().max(1000)).max(50).default([]),
  contentTypes: z.array(z.string().max(200)).max(50).default([]),
  messagingTone: z.string().max(100).default('business'),
  preferredChannels: z.array(z.string().max(100)).max(20).default([]),
});

export const personaUpdateBodySchema = personaCreateBodySchema.partial();

export type PersonaCreateBody = z.infer<typeof personaCreateBodySchema>;
export type PersonaUpdateBody = z.infer<typeof personaUpdateBodySchema>;
