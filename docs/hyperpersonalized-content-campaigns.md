# Hyper-personalized content by company and segment (campaign / landing URL)

**Goal:** Make "personalized company URL" (e.g. one landing page or campaign link per account and/or per segment) a first-class concept so the agent always has it for segment emails and sequence steps. Content can be hosted on Vercel (same Next.js app).

---

## 1. First-class concept

- **Scope:** One or more **campaign links** (URLs) per **company**, optionally scoped to a **segment** (CompanyDepartment). Examples: "GM Autonomous Vehicle webinar landing", "Acme Corp IT segment demo page".
- **Use:** When the agent drafts a segment email (`send_email_to_segment`) or the next sequence touch for a contact in that segment, the prompt includes: "Hyper-personalized content for this segment: [title] – [url]. Use this URL in the email body."
- **Optional hosting:** The URL can point to a page **hosted on Vercel** in the same app (e.g. `/go/[slug]` or `/lp/[slug]`), so we store and render the landing page ourselves.

---

## 2. Minimal schema

Add a small table to store campaign URLs (and optional page content) keyed by company and optional segment:

```prisma
// Hyper-personalized content: one URL (and optional page) per company + optional segment
model SegmentCampaign {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  departmentId String?  // null = account-level; set = segment-level
  department  CompanyDepartment? @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  slug        String   // URL slug for /go/[slug] or /lp/[slug] (unique per user or global)
  title       String   // e.g. "AV Webinar – GM"
  description String?  @db.Text
  url         String   // full URL: either external or https://yourdomain.com/go/{slug}
  type        String   // landing_page | event_invite | demo | webinar | other

  // Optional: store page content so we can host on Vercel (same app)
  headline    String?  @db.Text
  body        String?  @db.Text   // HTML or markdown
  ctaLabel    String?
  ctaUrl      String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([companyId, departmentId, slug])  // or (userId, slug) if slug is global
  @@index([companyId])
  @@index([departmentId])
  @@index([userId])
}
```

- **companyId** + **departmentId** (nullable): account-level vs segment-level. One row per (company, department) for a given slug, or one per company if departmentId is null.
- **url**: If we host on Vercel, set to `https://<your-vercel-domain>/go/<slug>` (or `/lp/<slug>`). Otherwise external link.
- **slug**: Used in the hosted route; must be unique (e.g. per user or app-wide) so `/go/[slug]` resolves.

Add relation on **Company** and **CompanyDepartment** to `SegmentCampaign`; add relation on **User**.

---

## 3. Hosting on Vercel

- **Route:** e.g. `app/go/[slug]/page.tsx` (or `app/lp/[slug]/page.tsx`). Server component that:
  - Looks up `SegmentCampaign` by `slug` (and optionally userId if multi-tenant).
  - Renders a simple landing page using `headline`, `body`, `ctaLabel`, `ctaUrl`, and company/department name from the relation. No auth required for viewing (public campaign link).
- **URL we store:** When user or agent "creates" a campaign and chooses "Host on Vercel", we set `url = `${process.env.NEXT_PUBLIC_APP_URL}/go/${slug}`` and optionally fill `headline`/`body`/`ctaLabel`/`ctaUrl` (from AI or form). Same app deployed on Vercel serves the page.

---

## 4. Wiring into prompt and tools

**Chat system prompt (company + segment context):**

- When building the prompt for a company (and when drafting for a segment or a contact with a department), load `SegmentCampaign` rows for that `companyId` and, if segment exists, `departmentId` (plus rows where `departmentId` is null for account-level).
- Append a block, e.g.  
  `HYPER-PERSONALIZED CONTENT (use in segment emails and for this segment):`  
  For each campaign: `[title]: [url]` (and optionally `[description]`).  
  Instruct: "When sending to this segment or drafting for contacts in this segment, include the relevant campaign URL in the email body."

**send_email_to_segment:**

- When the tool runs, it already has company + department. Before or after creating the PendingAction, the chat context should already include the campaign block above (because the prompt is built with that company/segment). So the agent naturally includes the URL in the draft. No change to the tool signature; only to prompt building.

**Sequence step (optional enhancement):**

- Option A: Add optional `campaignId` (or `segmentCampaignId`) to `OutreachSequenceStep`. When building `getNextTouchContext`, if the step has a campaignId, load that campaign’s URL and add it to `promptContext`: "Include this link in the email: [url]".
- Option B: Don’t add a column; rely on the chat’s company/segment campaign block so that when the agent drafts the next touch for a contact in that segment, the campaign URL is already in context.

Recommendation: Start with **Option B** (no step column); add **Option A** later if you want step-level "use this campaign" binding.

---

## 5. Creating campaigns (product flow)

- **Where:** Company detail or segment/department detail: e.g. "Hyper-personalized content" or "Campaign links" section with a list of campaigns for this company (and per segment) and "Add campaign".
- **Create flow:** Form or AI-assisted: title, type (landing_page / event_invite / demo / webinar), optional description. Choice: "External URL" (user pastes) vs "Host on Vercel" (we generate slug, create row with `url = /go/<slug>`, optional AI-generated headline/body/CTA). Save as `SegmentCampaign` with companyId and optional departmentId.
- **AI-generated content:** Optional: a chat tool or dedicated flow "create_personalized_content" that generates headline, body, CTA for a segment and creates a SegmentCampaign (and optionally a page at `/go/<slug>`). That fits the "hyper-personalized content MVP" in the main plan.

---

## 6. Summary

| Piece | Action |
|-------|--------|
| Schema | Add `SegmentCampaign` (companyId, departmentId?, slug, title, url, type, optional headline/body/cta for hosted pages). |
| Hosting | Add route `app/go/[slug]/page.tsx` (or `/lp/[slug]`) that loads campaign by slug and renders landing page; deploy on Vercel. |
| Prompt | When building chat context for a company/segment, load campaigns for that company (+ department) and add "HYPER-PERSONALIZED CONTENT" block with titles and URLs. |
| Segment send | No tool change; agent gets campaign URL from prompt and includes it in the draft for `send_email_to_segment`. |
| Sequence | Optional: add campaignId to step and inject URL into getNextTouchContext; or rely on prompt block only. |
| UI | Company/segment "Campaign links" or "Hyper-personalized content": list + add (external URL or "Host on Vercel" with optional AI-generated copy). |

This gives you first-class "personalized company URL" by company and segment, with optional Vercel-hosted landing pages, and the agent always has the URL when drafting segment emails or sequence touches for that segment.

---

## 7. Creating content at best price (token usage)

To minimize cost when **generating** hyper-personalized content (landing copy, email, event invite), use the following patterns. Reference: [AI SDK `generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text), [usage / output token details](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text#usage.language-model-usage.output-token-details), [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).

### Use `generateObject` (not `generateText`) for content creation

- **Why:** Fixed schema = only the fields you need are generated (headline, body, ctaLabel, ctaUrl, etc.). No extra prose, so **fewer output tokens** and lower cost. You also get typed, parseable output.
- **How:** Define a Zod (or JSON) schema for the content shape, e.g. `{ headline: z.string(), body: z.string(), ctaLabel: z.string(), ctaUrl: z.string().url().optional() }` (and optionally `email: { subject, body }`, `eventInvite: { body }` in one schema). Call `generateObject({ model, messages, schema })` once per “create content” request.
- **Single call for multiple artifacts:** One `generateObject` that returns `{ email: { subject, body }, eventInvite: { body }, demoConcept: { headline, ctaLabel, ctaUrl } }` is cheaper than three separate `generateText` calls, because you pay input tokens once and get one structured output.

### Use prompt caching (Anthropic) for the static context

- **Why:** Large, repeated context (content library, product knowledge, industry playbook, company/segment summary) is expensive when sent as normal input tokens every time. With [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), the first request pays for **cache creation**; later requests pay much less for **cache reads** for that same prefix.
- **How:** Put the static block (e.g. “Content library for this user”, “Product catalog”, “Industry playbook”) in a **system or user message block** and mark it for caching. In the AI SDK with Anthropic, use `experimental_providerMetadata` (or the provider’s cache option) on that block, e.g. `anthropic: { cacheControl: { type: 'ephemeral' } }`. Keep the **variable** part (company name, segment name, chosen event/product) in a separate, non-cached block so the cache key stays stable for the big prefix.
- **Result:** First “create content” call for a given content-library snapshot is full price; subsequent calls that reuse that snapshot pay reduced input cost for the cached tokens.

### Minimize input size

- **Only send what’s needed:** For “create landing page for segment X”, pass: company name, segment name, one relevant event (or product), one use case or success story — not the entire content library. Shorter prompt = fewer input tokens.
- **Reuse cached blocks:** If you have a “standard instructions” block (tone, format, do’s/don’ts), put it in the cacheable block so it’s not re-sent at full price on every request.

### Model choice

- Use a **smaller/cheaper model** (e.g. Claude Haiku or a smaller Sonnet variant) for straightforward “fill this template” content (headline, short body, CTA). Reserve a larger model for complex reasoning or multi-step flows.
- Check [usage](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text#usage.language-model-usage.output-token-details) in `onFinish` or the response to monitor `inputTokens`, `outputTokens`, and, when available, `cacheReadTokens` vs `noCacheTokens` so you can tune prompt layout and caching.

### Summary

| Lever | Action |
|-------|--------|
| Output | Use `generateObject` with a strict schema so only needed fields are generated (fewer output tokens). |
| Input | Put large static context in a cacheable block (Anthropic `cache_control`); keep variable data in a separate block. |
| Calls | One `generateObject` call that returns email + event invite + demo concept in one schema instead of multiple calls. |
| Prompt size | Send only the content library slice relevant to the segment (one event, one use case, etc.). |
| Model | Use a smaller model for simple content generation; reserve larger models for complex tasks. |
