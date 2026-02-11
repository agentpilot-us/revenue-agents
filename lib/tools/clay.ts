/**
 * Clay – contact enrichment (email, company, etc.).
 */

export type EnrichContactParams = {
  email?: string;
  linkedinUrl?: string;
  domain?: string;
};

export type EnrichContactResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export async function enrichContact(params: EnrichContactParams): Promise<EnrichContactResult> {
  const apiKey = process.env.CLAY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'CLAY_API_KEY not configured' };
  }
  // Stub: real implementation would call Clay API
  try {
    return {
      ok: true,
      data: {
        email: params.email,
        linkedinUrl: params.linkedinUrl,
        domain: params.domain,
        enriched: true,
        message: '[Clay] Enrichment stub – wire to Clay API when ready',
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Enrich failed' };
  }
}
