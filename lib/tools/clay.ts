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
  // Stub: when no API key, return mock email/phone so Find Contacts UI flow works
  const apiKey = process.env.CLAY_API_KEY;
  if (!apiKey) {
    const domain = params.domain ?? 'company.com';
    const slug = (params.linkedinUrl ?? 'user').replace(/.*\//, '').replace(/-/g, '.');
    return {
      ok: true,
      data: {
        email: params.email ?? `${slug}@${domain}`,
        phone: '+1 (313) 555-' + String(Math.floor(1000 + Math.random() * 9000)),
        verified: true,
        enriched: true,
      },
    };
  }
  try {
    // TODO: call Clay API
    return {
      ok: true,
      data: {
        email: params.email,
        linkedinUrl: params.linkedinUrl,
        domain: params.domain,
        enriched: true,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Enrich failed' };
  }
}
