/**
 * Shared instruction block appended to every sales-page generation prompt
 * so the AI produces sections in the exact typed format the renderer expects.
 */
export const SECTION_TYPES_INSTRUCTION = `
SECTION FORMAT — the page.sections array MUST use ONLY these typed section objects:
- { type: "hero", headline: string, body: string, backgroundContext?: string }
- { type: "value_props", items: [{ icon?: string (1 emoji), title: string, body: string }] }
- { type: "how_it_works", steps: [{ number: number, title: string, description: string }] }
- { type: "comparison", title?: string, withoutProduct: string, withProduct: string, rows?: [{ label: string, without: string, with: string }] }
- { type: "feature", title: string, description: string, bulletPoints: [string] }
- { type: "event", name: string, date: string, location: string, description: string, registerUrl: string }
- { type: "case_study", company: string, result: string, quote?: string }
- { type: "social_proof", metrics?: [{ value: string, label: string }], quotes: [{ text: string, author: string, title: string }] }
- { type: "faq", items: [{ question: string, answer: string }] }
- { type: "cta", headline: string, buttonLabel: string, buttonUrl: string, urgencyText?: string }

Produce 4-7 sections in a logical order. Always start with a "hero" section and end with a "cta" section.
Include a "value_props" section with 3-4 items. Use "comparison", "how_it_works", "faq", or "social_proof" when the context warrants it.
Do NOT invent section types beyond the list above.
`.trim();
