/**
 * Enrichment router: use Apollo when available (cheaper for demos), else Clay.
 * Set ENRICHMENT_PROVIDER=clay to force Clay; otherwise Apollo is used when APOLLO_API_KEY is set.
 * When Apollo is chosen but returns ok: false (e.g. credits exhausted), falls back to Clay.
 */

import { enrichContact as enrichContactClay } from '@/lib/tools/clay';
import { enrichPersonApollo } from '@/lib/tools/apollo';

export type EnrichContactParams = {
  email?: string;
  linkedinUrl?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
};

export type EnrichContactResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export async function enrichContact(params: EnrichContactParams): Promise<EnrichContactResult> {
  const provider =
    process.env.ENRICHMENT_PROVIDER === 'clay'
      ? 'clay'
      : process.env.APOLLO_API_KEY
        ? 'apollo'
        : 'clay';

  if (provider === 'apollo') {
    const apolloResult = await enrichPersonApollo({
      email: params.email,
      linkedinUrl: params.linkedinUrl,
      domain: params.domain,
      firstName: params.firstName,
      lastName: params.lastName,
      organizationName: params.organizationName,
    });
    if (apolloResult.ok) return apolloResult;
    // Fall through to Clay when Apollo fails (e.g. credits exhausted mid-flow)
  }

  return enrichContactClay({
    email: params.email,
    linkedinUrl: params.linkedinUrl,
    domain: params.domain,
  });
}
