/**
 * Generate sales/landing page HTML with Tailwind CDN.
 * Used by deploy_sales_page_to_vercel and deploy_custom_landing_page.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type SalesPageOptions = {
  title: string;
  valueProp: string;
  benefits: string[];
  pricing?: string;
  ctaLabel: string;
  ctaUrl: string;
};

export function salesPageHtml(options: SalesPageOptions): string {
  const {
    title,
    valueProp,
    benefits,
    pricing,
    ctaLabel,
    ctaUrl,
  } = options;
  const t = escapeHtml(title);
  const v = escapeHtml(valueProp);
  const b = benefits.map((x) => escapeHtml(x));
  const p = pricing != null ? escapeHtml(pricing) : '';
  const cta = escapeHtml(ctaLabel);
  const ctaHref = escapeHtml(ctaUrl);

  const benefitsHtml = b
    .map(
      (item) => `
        <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p class="text-slate-700">${item}</p>
        </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900">
  <section class="py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-6">${t}</h1>
      <p class="text-xl mb-8 text-blue-100">${v}</p>
      <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" class="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
        ${cta}
      </a>
    </div>
  </section>

  <section class="py-16 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12 text-slate-800">Key benefits</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${benefitsHtml}
      </div>
    </div>
  </section>

  ${p ? `<section class="py-16 px-6 bg-white">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-6 text-slate-800">Pricing</h2>
      <p class="text-2xl text-slate-700 mb-8">${p}</p>
      <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" class="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
        ${cta}
      </a>
    </div>
  </section>` : ''}

  <footer class="py-8 px-6 text-center text-slate-500 text-sm">
    Powered by Agent Pilot
  </footer>
</body>
</html>`;
}

/** Pre-built play templates for deploy_sales_page_to_vercel */
export const PLAY_TEMPLATES: Record<
  string,
  { title: string; valueProp: string; benefits: string[]; pricing: string }
> = {
  accountExpansion: {
    title: 'Account Expansion',
    valueProp: 'Sell more to existing customers with AI-powered personalization and multi-tier orchestration.',
    benefits: [
      '5 specialized AI agents working in concert',
      'Multi-tier buying group orchestration',
      '$550K pipeline in 45 days (pilot results)',
      'Research, LinkedIn, enrich, and list contacts in one flow',
    ],
    pricing: 'Pilot: $15K–$25K | Production: $120K/year',
  },
  partnerEnablement: {
    title: 'Partner Enablement',
    valueProp: 'Scale through partners with AI-driven co-sell and partner-led campaigns.',
    benefits: [
      'Partner-led campaigns with qualified lead distribution',
      'Deal registration and PRM sync',
      'Co-sell and marketplace referral workflows',
    ],
    pricing: 'Contact for pricing',
  },
  referralProgram: {
    title: 'Referral Program',
    valueProp: 'Turn customers and partners into a repeatable referral engine.',
    benefits: [
      'Referral tracking and attribution',
      'Automated nurture for referrers',
      'Pipeline from referral to closed-won',
    ],
    pricing: 'Contact for pricing',
  },
};
