// Persona Definition (stored in BuyingGroupTemplate.personas)
export interface PersonaDefinition {
  role: string; // "Champion" | "Economic Buyer" | "Technical Buyer" | "Influencer"
  label: string; // e.g. "Enterprise AE - Financial Services"
  titleVariants: string[];
  keywords?: string[];
  seniority?: string[];
  departments?: string[];
  segmentFilters?: {
    yearsExperience?: { min?: number; max?: number };
    currentCompanySize?: string[];
    location?: string[];
    customKeywords?: string[];
    excludeKeywords?: string[];
  };
  maxResults: number;
}

// Segmentation Rule (stored in BuyingGroupTemplate.segmentationRules)
export interface SegmentationRule {
  name: string;
  description: string;
  filters: {
    titleIncludes?: string[];
    titleExcludes?: string[];
    keywords?: string[];
    yearsExperience?: { min?: number; max?: number };
    location?: string[];
    companySize?: string[];
  };
}

// Discovery result structure (returned from MCP tool)
export interface LinkedInContact {
  profile_id: string;
  name: string;
  title: string;
  linkedin_url: string;
  company: string;
  location?: string;
  seniority?: string;
  years_experience?: number;
  found_via: string;
}

export interface BuyingGroupDiscoveryResult {
  company: string;
  total_contacts: number;
  personas_searched: number;
  segments: string[];
  results_by_segment: {
    [segmentName: string]: {
      persona: string;
      segment: string;
      role: string;
      contacts: LinkedInContact[];
      found: number;
      target: number;
    }[];
  };
  all_contacts: LinkedInContact[];
}
