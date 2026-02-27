import type { User, Company } from '@prisma/client';

const DEMO_EMAILS = new Set<string>([
  'demo-saas@agentpilot.us', // Revenue Vessel / FedEx
  'demo-techinfra@agentpilot.us', // NVIDIA / GM
  'demo-services@agentpilot.us', // Sercante / Salesforce
]);

export function isDemoUser(user: Pick<User, 'email'> | { email?: string | null }): boolean {
  const email = user.email ?? '';
  return DEMO_EMAILS.has(email.toLowerCase());
}

export function isDemoCompany(
  company: Pick<Company, 'isDemoAccount'> | { isDemoAccount?: boolean | null } | null
): boolean {
  return company?.isDemoAccount === true;
}

export function isDemoContext(opts: {
  user: { email?: string | null };
  company?: { isDemoAccount?: boolean | null } | null;
}): boolean {
  return isDemoUser(opts.user) || isDemoCompany(opts.company ?? null);
}

export type DemoPersona = 'sercante' | 'nvidia_gm' | 'revenue_vessel_fedex' | null;

export function getDemoPersona(userEmail: string | null | undefined): DemoPersona {
  const email = (userEmail ?? '').toLowerCase();
  if (email === 'demo-services@agentpilot.us') return 'sercante';
  if (email === 'demo-techinfra@agentpilot.us') return 'nvidia_gm';
  if (email === 'demo-saas@agentpilot.us') return 'revenue_vessel_fedex';
  return null;
}

