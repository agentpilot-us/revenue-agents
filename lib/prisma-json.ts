import { Prisma } from '@prisma/client';

/**
 * Use this when filtering Prisma Json fields for "is not null" in where clauses.
 * Prisma requires { not: Prisma.JsonNull } for Json columns—plain `{ not: null }` causes type errors.
 *
 * Example:
 *   where: { previousContent: JSON_NOT_NULL }
 *   where: { targetRoles: JSON_NOT_NULL }
 */
export const JSON_NOT_NULL: { not: typeof Prisma.JsonNull } = { not: Prisma.JsonNull };

/**
 * Use when updating a Prisma Json field with a value that may be null.
 * Prisma expects Prisma.JsonNull for "set to null", not plain null.
 */
export function toJsonValue<T>(v: T | null): T | typeof Prisma.JsonNull {
  return v === null ? Prisma.JsonNull : v;
}
