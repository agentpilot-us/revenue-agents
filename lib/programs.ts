export interface Program {
  slug: string;
  name: string;
  shortDescription: string;
  idealFor: string;
  colorTheme: {
    gradient: string;
    border: string;
    button: string;
    iconBg: string;
    checkColor: string;
  };
  programs: {
    slug: string;
    name: string;
    whoItsFor: string;
    primaryChannel: string;
    coreOutcome: string;
    exampleAgents?: string[];
    keyDataSignals?: string[];
  }[];
  features: string[];
  annualPriceId: string;
  monthlyPriceId: string;
}

export const programs: Program[] = [
  {
    slug: 'new-logo-acquisition',
    name: 'New Logo Acquisition',
    shortDescription: 'AI agents that identify, qualify, and engage target accounts',
    idealFor: 'Teams expanding into new markets',
    colorTheme: {
      gradient: 'from-blue-50 to-white',
      border: 'border-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-600',
      checkColor: 'text-blue-600'
    },
    programs: [
      {
        slug: 'vertical-abm-launch-program',
        name: 'Vertical ABM Launch Program',
        whoItsFor: 'GTM, marketing, and sales teams targeting key verticals',
        primaryChannel: 'Account-based, multi-channel (ads, email, SDR)',
        coreOutcome: 'Penetrate a priority industry and land high-value new logos'
      },
      {
        slug: 'event-orchestrated-pipeline-program',
        name: 'Event-Orchestrated Pipeline Program',
        whoItsFor: 'Teams investing in trade shows, field events, or summits',
        primaryChannel: 'In-person and virtual events + coordinated follow-up',
        coreOutcome: 'Turn event spend into qualified meetings and net-new pipeline'
      },
      {
        slug: 'relationship-driven-new-logo-program',
        name: 'Relationship-Driven New Logo Program',
        whoItsFor: 'Sales and RevOps with strong customer/prospect networks',
        primaryChannel: 'Warm intros, referrals, job-change and network plays',
        coreOutcome: 'Win new logos at higher win rates and lower CAC'
      },
      {
        slug: 'thought-leadership-demand-engine-program',
        name: 'Thought Leadership Demand Engine Program',
        whoItsFor: 'Brands with a strong POV and experts/evangelists',
        primaryChannel: 'Content, social, webinars, podcasts, communities',
        coreOutcome: 'Attract and convert ideal accounts through authority and trust'
      },
      {
        slug: 'strategic-free-experience-to-customer-program',
        name: 'Strategic Free Experience to Customer Program',
        whoItsFor: 'PLG-leaning or consultative sales orgs',
        primaryChannel: 'Free tool, assessment, or benchmark + nurture',
        coreOutcome: 'Convert high-intent evaluators into qualified opportunities'
      },
      {
        slug: 'product-led-trial-to-customer-program',
        name: 'Product-Led Trial-to-Customer Program',
        whoItsFor: 'SaaS teams with trials, freemium, or pilots',
        primaryChannel: 'In-product experiences + lifecycle messaging + sales assist',
        coreOutcome: 'Turn active users into PQLs/PQAs and closed-won new logos'
      },
      {
        slug: 'partner-co-sell-acquisition-program',
        name: 'Partner-Co-Sell Acquisition Program',
        whoItsFor: 'Companies with strong tech/channel partners',
        primaryChannel: 'Co-marketing, co-selling, and partner motions',
        coreOutcome: 'Access new segments via partners and close joint new logos'
      },
      {
        slug: 'always-on-paid-intent-new-logo-program',
        name: 'Always-On Paid + Intent New Logo Program',
        whoItsFor: 'Teams with budget for paid and access to intent data',
        primaryChannel: 'Paid media, review sites, intent platforms + outbound',
        coreOutcome: 'Capture in-market buyers and convert them into new customers'
      }
    ],
    features: [
      '5 strategic blueprints',
      '15 Apex classes, 8 LWCs',
      '12 Agentforce agents',
      'CLI-deployable demo',
      'Sample: $400K pipeline in 30 days'
    ],
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_ANNUAL!,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_MONTHLY!
  },
  {
    slug: 'customer-expansion',
    name: 'Customer Expansion',
    shortDescription: 'Upsell and cross-sell automation with AI-powered insights',
    idealFor: 'Teams with 100+ existing customers',
    colorTheme: {
      gradient: 'from-green-50 to-white',
      border: 'border-green-100',
      button: 'bg-green-600 hover:bg-green-700',
      iconBg: 'bg-green-600',
      checkColor: 'text-green-600'
    },
    programs: [
      {
        slug: 'health-based-expansion-signals-program',
        name: 'Health-Based Expansion Signals Program',
        whoItsFor: 'CS and RevOps teams managing customer health',
        primaryChannel: 'Account Health Monitoring Agent, CSM Alert Agent',
        coreOutcome: 'Surfaces expansion-ready and at-risk accounts for timely plays',
        exampleAgents: ['Account Health Monitoring Agent', 'CSM Alert Agent'],
        keyDataSignals: ['Product usage trends', 'Support tickets', 'NPS/CSAT', 'Contract value', 'Renewal date']
      },
      {
        slug: 'intelligent-upsell-play-recommendation-program',
        name: 'Intelligent Upsell Play Recommendation Program',
        whoItsFor: 'Sales and CS teams with existing customer relationships',
        primaryChannel: 'Next-Best-Offer Agent, Sales Upsell Coach Agent',
        coreOutcome: 'Recommends tailored upsell offers and sequences to AEs/CSMs',
        exampleAgents: ['Next-Best-Offer Agent', 'Sales Upsell Coach Agent'],
        keyDataSignals: ['Purchase history', 'Feature usage', 'Industry/segment', 'Deal notes', 'Past responses']
      },
      {
        slug: 'cross-sell-journey-orchestration-program',
        name: 'Cross-Sell Journey Orchestration Program',
        whoItsFor: 'Teams with multiple product lines or solutions',
        primaryChannel: 'Lifecycle Orchestration Agent, Campaign & Journey Agent',
        coreOutcome: 'Automates multi-channel cross-sell journeys across email, in-app, and sales',
        exampleAgents: ['Lifecycle Orchestration Agent', 'Campaign & Journey Agent'],
        keyDataSignals: ['Current product set', 'Adjacent product fit scores', 'User roles', 'Engagement history']
      },
      {
        slug: 'adoption-to-expansion-lifecycle-program',
        name: 'Adoption-to-Expansion Lifecycle Program',
        whoItsFor: 'Product-led growth and CS teams',
        primaryChannel: 'Onboarding & Adoption Agent, Milestone Tracking Agent',
        coreOutcome: 'Triggers expansion plays once value and adoption thresholds are reached',
        exampleAgents: ['Onboarding & Adoption Agent', 'Milestone Tracking Agent'],
        keyDataSignals: ['Time-to-value milestones', 'Seat activation', 'Feature adoption', 'Training completion']
      },
      {
        slug: 'executive-value-review-expansion-program',
        name: 'Executive Value Review & Expansion Program',
        whoItsFor: 'Enterprise CS and sales teams',
        primaryChannel: 'QBR Prep Agent, Executive Briefing Agent',
        coreOutcome: 'Auto-builds QBR decks and recommends new initiatives and expansions',
        exampleAgents: ['QBR Prep Agent', 'Executive Briefing Agent'],
        keyDataSignals: ['Outcome metrics', 'Product usage dashboards', 'Open initiatives', 'Expansion propensity']
      },
      {
        slug: 'ai-powered-pricing-packaging-optimization-program',
        name: 'AI-Powered Pricing & Packaging Optimization Program',
        whoItsFor: 'RevOps and Deal Desk teams',
        primaryChannel: 'Deal Desk Assistant Agent, Packaging Recommendation Agent',
        coreOutcome: 'Suggests better-fit packages and add-ons to increase ARPU and margin',
        exampleAgents: ['Deal Desk Assistant Agent', 'Packaging Recommendation Agent'],
        keyDataSignals: ['Deal size', 'Discounting history', 'Usage vs. limits', 'Adoption by team/region']
      },
      {
        slug: 'champion-power-user-expansion-program',
        name: 'Champion & Power-User Expansion Program',
        whoItsFor: 'Community and CS teams',
        primaryChannel: 'Champion Finder Agent, Advocacy & Referral Agent',
        coreOutcome: 'Identifies champions and orchestrates internal referrals and seat expansion',
        exampleAgents: ['Champion Finder Agent', 'Advocacy & Referral Agent'],
        keyDataSignals: ['User activity scores', 'Role/title', 'Engagement in community/events', 'Advocacy tags']
      },
      {
        slug: 'renewal-to-expansion-motion-program',
        name: 'Renewal-to-Expansion Motion Program',
        whoItsFor: 'CS and sales teams managing renewals',
        primaryChannel: 'Renewal Risk & Opportunity Agent, Pod Coordination Agent',
        coreOutcome: 'Turns renewals into structured expansion cycles with shared CS/sales plays',
        exampleAgents: ['Renewal Risk & Opportunity Agent', 'Pod Coordination Agent'],
        keyDataSignals: ['Renewal date', 'NRR metrics', 'Usage trends', 'Open risks', 'Expansion intent signals']
      }
    ],
    features: [
      '5 strategic blueprints',
      '12 Apex classes, 6 LWCs',
      '10 Agentforce agents',
      'Whitespace analysis',
      'Track 20+ buying groups'
    ],
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_ANNUAL!,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_MONTHLY!
  },
  {
    slug: 'partner-programs',
    name: 'Partner Programs',
    shortDescription: 'Channel enablement and co-selling automation',
    idealFor: 'Teams with reseller/referral partners',
    colorTheme: {
      gradient: 'from-purple-50 to-white',
      border: 'border-purple-100',
      button: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-600',
      checkColor: 'text-purple-600'
    },
    programs: [
      {
        slug: 'partner-onboarding-enablement-automation-program',
        name: 'Partner Onboarding & Enablement Automation Program',
        whoItsFor: 'Partner/channel teams managing partner lifecycle',
        primaryChannel: 'Partner Onboarding Agent, Training & Certification Agent',
        coreOutcome: 'Gets new partners enabled faster with the right content, playbooks, and certifications',
        exampleAgents: ['Partner Onboarding Agent', 'Training & Certification Agent'],
        keyDataSignals: ['Partner tier', 'Role', 'Completion of courses', 'Deal submission volume', 'Enablement engagement']
      },
      {
        slug: 'co-sell-opportunity-mapping-routing-program',
        name: 'Co-Sell Opportunity Mapping & Routing Program',
        whoItsFor: 'Co-sell and partner sales teams',
        primaryChannel: 'Account Mapping Agent, Co-Sell Opportunity Routing Agent',
        coreOutcome: 'Identifies joint targets and routes co-sell opportunities to the right reps and partners',
        exampleAgents: ['Account Mapping Agent', 'Co-Sell Opportunity Routing Agent'],
        keyDataSignals: ['Overlapping accounts', 'Open opps', 'Partner presence', 'Territory/segment data']
      },
      {
        slug: 'through-channel-campaign-lead-sharing-program',
        name: 'Through-Channel Campaign & Lead Sharing Program',
        whoItsFor: 'Partner marketing and channel teams',
        primaryChannel: 'Through-Channel Campaign Agent, Lead Distribution Agent',
        coreOutcome: 'Automates partner-led campaigns and distributes qualified leads back into Salesforce',
        exampleAgents: ['Through-Channel Campaign Agent', 'Lead Distribution Agent'],
        keyDataSignals: ['MDF usage', 'Campaign performance', 'Partner leads', 'Lead source and status']
      },
      {
        slug: 'deal-registration-prm-workflow-automation-program',
        name: 'Deal Registration & PRM Workflow Automation Program',
        whoItsFor: 'Partner operations and channel teams',
        primaryChannel: 'Deal Registration Agent, PRM Sync Agent',
        coreOutcome: 'Streamlines deal reg, keeps PRM and Salesforce in sync, and protects partner-sourced deals',
        exampleAgents: ['Deal Registration Agent', 'PRM Sync Agent'],
        keyDataSignals: ['Registered deals', 'Approval status', 'Stage', 'Partner attribution']
      },
      {
        slug: 'partner-co-sell-pipeline-orchestration-program',
        name: 'Partner Co-Sell Pipeline Orchestration Program',
        whoItsFor: 'Co-sell and partner sales teams',
        primaryChannel: 'Co-Sell Orchestration Agent, Joint Opportunity Management Agent',
        coreOutcome: 'Coordinates activities between internal reps and partners to advance and close co-sell deals',
        exampleAgents: ['Co-Sell Orchestration Agent', 'Joint Opportunity Management Agent'],
        keyDataSignals: ['Joint opps', 'Influenced revenue', 'Activity logs', 'Co-sell stages']
      },
      {
        slug: 'partner-performance-insights-coaching-program',
        name: 'Partner Performance Insights & Coaching Program',
        whoItsFor: 'Partner success and channel management teams',
        primaryChannel: 'Partner Performance Analytics Agent, Partner Success Coach Agent',
        coreOutcome: 'Surfaces which partners, motions, and assets drive revenue and recommends next-best actions',
        exampleAgents: ['Partner Performance Analytics Agent', 'Partner Success Coach Agent'],
        keyDataSignals: ['Partner-sourced and influenced revenue', 'Win rates', 'Cycle time', 'Enablement consumption']
      },
      {
        slug: 'marketplace-cloud-co-sell-integration-program',
        name: 'Marketplace & Cloud Co-Sell Integration Program',
        whoItsFor: 'Teams selling through cloud marketplaces',
        primaryChannel: 'Marketplace Connector Agent, Cloud Co-Sell Sync Agent',
        coreOutcome: 'Connects marketplace referrals into Salesforce and orchestrates cloud co-sell workflows',
        exampleAgents: ['Marketplace Connector Agent', 'Cloud Co-Sell Sync Agent'],
        keyDataSignals: ['Referrals from cloud marketplaces', 'Co-sell status', 'Payout and attribution data']
      },
      {
        slug: 'partner-recruitment-ideal-profile-program',
        name: 'Partner Recruitment & Ideal Profile Program',
        whoItsFor: 'Partner development and channel strategy teams',
        primaryChannel: 'Partner ICP & Scoring Agent, Partner Recruitment Agent',
        coreOutcome: 'Identifies, scores, and tracks high-fit new partners to grow the ecosystem strategically',
        exampleAgents: ['Partner ICP & Scoring Agent', 'Partner Recruitment Agent'],
        keyDataSignals: ['Ideal partner traits', 'Current ecosystem coverage', 'Sourced pipeline by partner type']
      }
    ],
    features: [
      '5 strategic blueprints',
      '10 Apex classes, 7 LWCs',
      '8 Agentforce agents',
      'Deal registration automation',
      'Manage 100+ partners'
    ],
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_ANNUAL!,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_MONTHLY!
  },
  {
    slug: 'sales-velocity',
    name: 'Sales Velocity',
    shortDescription: 'Pipeline acceleration and deal coaching agents',
    idealFor: 'Teams with long sales cycles (90+ days)',
    colorTheme: {
      gradient: 'from-orange-50 to-white',
      border: 'border-orange-100',
      button: 'bg-orange-600 hover:bg-orange-700',
      iconBg: 'bg-orange-600',
      checkColor: 'text-orange-600'
    },
    programs: [
      {
        slug: 'intelligent-pipeline-acceleration-program',
        name: 'Intelligent Pipeline Acceleration Program',
        whoItsFor: 'Sales ops and sales management teams',
        primaryChannel: 'Pipeline Risk Scanner Agent, Next-Step Recommendation Agent',
        coreOutcome: 'Flags stuck deals and recommends concrete next steps to keep opportunities moving',
        exampleAgents: ['Pipeline Risk Scanner Agent', 'Next-Step Recommendation Agent'],
        keyDataSignals: ['Deal stage history', 'Activity logs', 'Stakeholder roles', 'Idle time', 'Win/loss reasons']
      },
      {
        slug: 'multi-threaded-deal-orchestration-program',
        name: 'Multi-Threaded Deal Orchestration Program',
        whoItsFor: 'Enterprise sales teams',
        primaryChannel: 'Buying-Group Mapping Agent, Contact Expansion Agent',
        coreOutcome: 'Helps reps multi-thread into accounts and engage full buying committees',
        exampleAgents: ['Buying-Group Mapping Agent', 'Contact Expansion Agent'],
        keyDataSignals: ['Org charts', 'Contact roles', 'Engagement scores', 'Email/meeting data']
      },
      {
        slug: 'deal-coaching-call-insights-program',
        name: 'Deal Coaching & Call Insights Program',
        whoItsFor: 'Sales enablement and sales management',
        primaryChannel: 'Call Insights Agent, Deal Coaching Companion Agent',
        coreOutcome: 'Delivers targeted coaching and talk tracks to improve close rates on complex deals',
        exampleAgents: ['Call Insights Agent', 'Deal Coaching Companion Agent'],
        keyDataSignals: ['Call transcripts', 'Sentiment', 'Objections', 'Competitor mentions', 'Follow-up actions']
      },
      {
        slug: 'forecast-quality-risk-intelligence-program',
        name: 'Forecast Quality & Risk Intelligence Program',
        whoItsFor: 'Sales ops and revenue operations',
        primaryChannel: 'Forecast Health Agent, Slippage Risk Agent',
        coreOutcome: 'Improves forecast accuracy and highlights at-risk deals early',
        exampleAgents: ['Forecast Health Agent', 'Slippage Risk Agent'],
        keyDataSignals: ['Commit vs. pipeline', 'Stage aging', 'Push rates', 'Conversion benchmarks']
      },
      {
        slug: 'competitive-deal-strategy-program',
        name: 'Competitive Deal Strategy Program',
        whoItsFor: 'Sales and sales enablement teams',
        primaryChannel: 'Competitive Intelligence Agent, Battlecard Recommendation Agent',
        coreOutcome: 'Suggests competitive strategies, assets, and plays for live competitive deals',
        exampleAgents: ['Competitive Intelligence Agent', 'Battlecard Recommendation Agent'],
        keyDataSignals: ['Competitor fields', 'Win/loss codes', 'Notes', 'Call summaries']
      },
      {
        slug: 'pricing-deal-structuring-assist-program',
        name: 'Pricing & Deal Structuring Assist Program',
        whoItsFor: 'Deal desk and sales teams',
        primaryChannel: 'Deal Desk Assistant Agent, Scenario Modeling Agent',
        coreOutcome: 'Guides reps to smart pricing and structures that win deals without over-discounting',
        exampleAgents: ['Deal Desk Assistant Agent', 'Scenario Modeling Agent'],
        keyDataSignals: ['Historical discounts', 'Margins', 'Deal size', 'Product mix', 'Approvals']
      },
      {
        slug: 'executive-sponsor-influence-program',
        name: 'Executive Sponsor & Influence Program',
        whoItsFor: 'Enterprise sales and executive engagement teams',
        primaryChannel: 'Executive Alignment Agent, Sponsor Engagement Agent',
        coreOutcome: 'Orchestrates executive involvement on the right strategic opportunities',
        exampleAgents: ['Executive Alignment Agent', 'Sponsor Engagement Agent'],
        keyDataSignals: ['Executive contact engagement', 'Meeting attendance', 'Account tier', 'Deal size']
      },
      {
        slug: 'renewal-expansion-opportunity-acceleration-program',
        name: 'Renewal & Expansion Opportunity Acceleration Program',
        whoItsFor: 'CS and sales teams managing renewals',
        primaryChannel: 'Renewal Acceleration Agent, Expansion Signal Agent',
        coreOutcome: 'Accelerates late-stage renewal and expansion deals to protect and grow revenue',
        exampleAgents: ['Renewal Acceleration Agent', 'Expansion Signal Agent'],
        keyDataSignals: ['Renewal dates', 'Usage trends', 'Health scores', 'Expansion indicators']
      }
    ],
    features: [
      '5 strategic blueprints',
      '14 Apex classes, 9 LWCs',
      '11 Agentforce agents',
      'AI-powered deal risk scoring',
      'Reduce cycles 20-30%'
    ],
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_ANNUAL!,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_MONTHLY!
  }
];

export function getProgramBySlug(slug: string): Program | undefined {
  return programs.find(p => p.slug === slug);
}

export function getProgramDetail(categorySlug: string, programSlug: string): {
  category: Program;
  program: Program['programs'][0];
} | undefined {
  const category = getProgramBySlug(categorySlug);
  if (!category) return undefined;
  
  const program = category.programs.find(p => p.slug === programSlug);
  if (!program) return undefined;
  
  return { category, program };
}
