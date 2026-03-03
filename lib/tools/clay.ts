/**
 * Clay – contact enrichment (email, company, etc.).
 * Requires CLAY_API_KEY to be set.
 */

export type EnrichContactParams = {
  email?: string;
  linkedinUrl?: string;
  domain?: string;
};

export type EnrichContactResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export async function enrichContact(
  _params: EnrichContactParams
): Promise<EnrichContactResult> {
  if (!process.env.CLAY_API_KEY) {
    return { ok: false, error: 'Clay not configured — set CLAY_API_KEY' };
  }
  return { ok: false, error: 'Clay API integration not yet implemented' };
}
