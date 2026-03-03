/**
 * Section types for static sales pages (no chatbot).
 * Stored in SegmentCampaign.sections as an ordered array.
 */
export type SalesPageSection =
  | { type: 'hero'; headline: string; body: string; backgroundContext?: string }
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
      type: 'how_it_works';
      steps: { number: number; title: string; description: string }[];
    }
  | {
      type: 'comparison';
      title?: string;
      withoutProduct: string;
      withProduct: string;
      rows?: { label: string; without: string; with: string }[];
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
      metrics?: { value: string; label: string }[];
      quotes: { text: string; author: string; title: string }[];
    }
  | {
      type: 'faq';
      items: { question: string; answer: string }[];
    }
  | {
      type: 'cta';
      headline: string;
      buttonLabel: string;
      buttonUrl: string;
      urgencyText?: string;
    };

export type SalesPageSections = SalesPageSection[];

export function isSalesPageSections(
  value: unknown
): value is SalesPageSections {
  return Array.isArray(value) && value.length >= 0;
}
