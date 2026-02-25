/**
 * Section types for static sales pages (no chatbot).
 * Stored in SegmentCampaign.sections as an ordered array.
 */
export type SalesPageSection =
  | { type: 'hero'; headline: string; body: string }
  | {
      type: 'value_props';
      items: { icon?: string; title: string; body: string }[];
    }
  | {
      type: 'feature';
      title: string;
      description: string;
      bulletPoints: string[];
    }
  | {
      type: 'event';
      name: string;
      date: string;
      location: string;
      description: string;
      registerUrl: string;
    }
  | { type: 'case_study'; company: string; result: string; quote?: string }
  | {
      type: 'social_proof';
      quotes: { text: string; author: string; title: string }[];
    }
  | {
      type: 'cta';
      headline: string;
      buttonLabel: string;
      buttonUrl: string;
    };

export type SalesPageSections = SalesPageSection[];

export function isSalesPageSections(
  value: unknown
): value is SalesPageSections {
  return Array.isArray(value) && value.length >= 0;
}
