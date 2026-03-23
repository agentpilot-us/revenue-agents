/**
 * Normalize DATABASE_URL for Prisma + `pg` / PrismaPg adapter.
 *
 * Non-Neon: map `sslmode=require|prefer|verify-ca` → `verify-full` so behavior
 * matches today's node-pg (and avoids the v3 deprecation warning for those modes).
 *
 * Neon: keep `sslmode=require` (Neon pooler + `verify-full` often breaks hostname
 * verification / P1001). node-pg warns that `require` will change meaning in v9;
 * opt into libpq-compatible SSL parsing explicitly via `uselibpqcompat=true`.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
function appendQueryParam(raw: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, 'i').test(raw)) {
    return raw;
  }
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}${key}=${value}`;
}

export function normalizeDatabaseUrlForPg(url: string): string {
  if (/\.neon\.tech\b/i.test(url)) {
    if (
      /sslmode=(require|prefer|verify-ca)\b/i.test(url) &&
      !/uselibpqcompat=true\b/i.test(url)
    ) {
      return appendQueryParam(url, 'uselibpqcompat', 'true');
    }
    return url;
  }
  return url
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
}
