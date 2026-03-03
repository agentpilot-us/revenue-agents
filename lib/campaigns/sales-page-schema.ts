import { z } from 'zod';

export const salesPageSectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    headline: z.string(),
    body: z.string(),
    backgroundContext: z.string().optional(),
  }),
  z.object({
    type: z.literal('value_props'),
    items: z.array(
      z.object({
        icon: z.string().optional(),
        title: z.string(),
        body: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('feature'),
    title: z.string(),
    description: z.string(),
    bulletPoints: z.array(z.string()),
  }),
  z.object({
    type: z.literal('how_it_works'),
    steps: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        description: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('comparison'),
    title: z.string().optional(),
    withoutProduct: z.string(),
    withProduct: z.string(),
    rows: z.array(
      z.object({
        label: z.string(),
        without: z.string(),
        with: z.string(),
      })
    ).optional(),
  }),
  z.object({
    type: z.literal('event'),
    name: z.string(),
    date: z.string(),
    location: z.string(),
    description: z.string(),
    registerUrl: z.string(),
  }),
  z.object({
    type: z.literal('case_study'),
    company: z.string(),
    result: z.string(),
    quote: z.string().optional(),
  }),
  z.object({
    type: z.literal('social_proof'),
    metrics: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ).optional(),
    quotes: z.array(
      z.object({
        text: z.string(),
        author: z.string(),
        title: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('faq'),
    items: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('cta'),
    headline: z.string(),
    buttonLabel: z.string(),
    buttonUrl: z.string(),
    urgencyText: z.string().optional(),
  }),
]);

export const salesPageGenerateSchema = z.object({
  headline: z.string().describe('Main headline for the page'),
  subheadline: z.string().optional().describe('Optional subheadline'),
  sections: z.array(salesPageSectionSchema).min(1).describe('Ordered array of section blocks'),
  ctaLabel: z.string().optional().describe('Primary CTA button label, e.g. Register Now, Book a Demo'),
  ctaUrl: z.string().optional().describe('URL for the primary CTA button'),
});

export type SalesPageGenerateOutput = z.infer<typeof salesPageGenerateSchema>;
