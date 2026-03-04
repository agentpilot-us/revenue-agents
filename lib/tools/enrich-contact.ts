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
  if (!process.env.APOLLO_API_KEY) {
    return { ok: false, error: 'Apollo not configured — set APOLLO_API_KEY' };
  }

  return enrichPersonApollo({
    email: params.email,
    linkedinUrl: params.linkedinUrl,
    domain: params.domain,
    firstName: params.firstName,
    lastName: params.lastName,
    organizationName: params.organizationName,
  });
}
