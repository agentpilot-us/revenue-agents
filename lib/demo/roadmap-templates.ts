import type { Prisma } from '@prisma/client';
import { getDemoPersona } from './context';

type RoadmapConfig = {
  roadmapType: string;
  objective: Prisma.JsonValue;
  contentStrategy: Prisma.JsonValue;
};

export function getDemoRoadmapConfigForEmail(email: string | null | undefined): RoadmapConfig | null {
  const persona = getDemoPersona(email);
  if (persona === 'sercante') return sercanteConfig;
  if (persona === 'nvidia_gm') return nvidiaGmConfig;
  if (persona === 'revenue_vessel_fedex') return revenueVesselConfig;
  return null;
}

const sercanteConfig: RoadmapConfig = {
  roadmapType: 'channel_influence',
  objective: {
    goalText:
      'Get pulled into 10 new Salesforce deals this quarter as the go-to implementation partner for Financial Services enterprise AEs.',
    metric: {
      type: 'partner_sourced_deals',
      targetCount: 10,
      timeHorizon: 'this_quarter',
    },
    partnerContext: {
      primaryPartner: 'Salesforce',
      partnerOrgUnits: [
        {
          name: 'Enterprise Sales, Financial Services',
          notes: 'Primary focus for this roadmap.',
        },
      ],
    },
    targetMapSummary: {
      targetType: 'partner_ae',
      primaryPersona: 'Salesforce Account Executive',
      additionalPersonas: ['Salesforce Solutions Engineer', 'Salesforce RVP'],
      territories: ['Financial Services – Enterprise'],
    },
    successDefinition: {
      dealDefinition:
        'Partner-sourced or partner-influenced opportunities where a Salesforce AE introduces us into an active customer deal.',
    },
  },
  contentStrategy: {
    tone: 'consultative_relationship_driven',
    voiceNotes: [
      'Sound like a trusted implementation partner, not an SDR.',
      'Celebrate AE wins and propose how we can help on the next deal.',
    ],
    primaryChannels: ['linkedin_dm', 'short_email'],
    contentTypes: [
      'co_sell_brief',
      'why_bring_us_in_one_pager',
      'deal_win_follow_up_message',
      'partner_enablement_page',
    ],
    personalizationDepth: 'high_per_ae',
  },
};

const nvidiaGmConfig: RoadmapConfig = {
  roadmapType: 'enterprise_expansion',
  objective: {
    goalText:
      'Land 2 new divisional NVIDIA use cases at General Motors this year, expanding beyond IT into Manufacturing and Autonomous Vehicles.',
    metric: {
      type: 'new_divisional_use_cases',
      targetCount: 2,
      timeHorizon: 'this_year',
    },
    accountContext: {
      primaryAccount: 'General Motors',
      divisions: ['Manufacturing', 'Autonomous Vehicles', 'IT (current footprint)'],
    },
  },
  contentStrategy: {
    tone: 'executive_consultative_technical',
    primaryChannels: ['executive_email', 'division_briefing_doc', 'sales_page'],
    contentTypes: [
      'division_specific_sales_page',
      'executive_briefing',
      'use_case_comparison_matrix',
      'technical_architecture_brief',
    ],
  },
};

const revenueVesselConfig: RoadmapConfig = {
  roadmapType: 'value_of_data',
  objective: {
    goalText:
      'Close 4 net-new mid-market data deals this quarter, starting with FedEx, by proving the value of Revenue Vessel data through personalized previews.',
    metric: {
      type: 'net_new_logos',
      targetCount: 4,
      timeHorizon: 'this_quarter',
    },
    accountContext: {
      primaryAccount: 'FedEx',
      industry: 'Shipping & Logistics',
    },
  },
  contentStrategy: {
    tone: 'data_driven_outcome_focused',
    primaryChannels: ['email', 'interactive_preview_page'],
    contentTypes: [
      'personalized_data_preview_page',
      'roi_calculator',
      'competitive_positioning_brief',
      'industry_insight_summary',
    ],
  },
};

