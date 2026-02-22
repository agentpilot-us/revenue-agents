---
name: ""
overview: ""
todos: []
isProject: false
---

# Find and Enrich Contacts — Implementation Plan (revised)

## Overview

For each buying group, AgentPilot automates contact search and enrichment so users see real people mapped to each segment with roles, context, and "why they'd care" — faster multi-threading, less manual prospecting.

---

## Tool selection (critical)

**Tension:** LinkedIn data is most accurate for B2B finding, but direct access is either expensive (Apollo, ZoomInfo, Clay) or ToS-violating (PhantomBuster). Testing needs free/cheap + reasonable accuracy; production needs accurate + compliant.

**Decision:** Do not use PhantomBuster for production. Use a **provider abstraction** so finding/enrichment can be swapped by env without code changes.

### Recommended stack by stage


| Stage                | Finding                | Enrichment       | Cost     |
| -------------------- | ---------------------- | ---------------- | -------- |
| **Testing / Demo**   | Apollo free tier + API | Apollo enrich    | $0       |
| **Early production** | Apollo $49/mo          | People Data Labs | ~$50/mo  |
| **Scale**            | Apollo $99/mo          | Clay             | ~$250/mo |


- **Apollo free:** 50 exports/month, developer API, good for 3–4 segments × one company in demos.
- **Apollo enrich:** name + company domain → title, department, seniority, LinkedIn URL, email (when available).
- **People Data Labs:** $0/search up to 1000/mo free, then ~$0.005/search; enrichment only (no prospecting).
- **Clay:** Data waterfall (Apollo, Clearbit, Hunter, etc.); 95%+ accuracy when justified by pricing.

---

## Verify before coding

1. **Apollo free tier API access** — The plan assumes the Apollo developer API is available on the free tier. Verify before building the adapter: Apollo tightened API access in 2024 and some endpoints may require a paid plan. Specifically confirm that `v1/mixed_people/search` with `q_organization_domains` is available on free. If not, the $49/month plan is still the right testing tool; don't assume $0 for demos until confirmed.
2. **enrichmentStatus and not_needed** — In [prisma/schema.prisma](prisma/schema.prisma), `enrichmentStatus` is `String?` (not an enum). The comment documents allowed values: `pending | enriching | complete | failed | not_needed`. There is no Prisma enum; any string is valid. Use the literal `'not_needed'` in code when the contact has no linkedin/email. Existing enrich-pending logic already filters on `enrichmentStatus: 'pending'`; it will ignore `'not_needed'` and `null`. Confirm the schema comment is in place before writing the conditional.
3. **Concurrency limiter** — Do not use `Promise.all(departments.map(...))`; that will hit Apollo rate limits on 5+ segments. Use `p-limit` with max 3 concurrent:
  - Add `p-limit` as a direct dependency if not already: `npm install p-limit`.
  - In the batch flow: `import pLimit from 'p-limit'; const limit = pLimit(3);` then `await Promise.all(departments.map(dept => limit(() => findContactsForSegment(...))));`.

---

## 1. Provider abstraction and Apollo adapter

**Goal:** One abstraction for contact finding; swap provider via `CONTACT_FINDER_PROVIDER` (e.g. `apollo` | `clay`).

- **New:** [lib/tools/contact-finder.ts](lib/tools/contact-finder.ts)
  - `ContactFinderResult`: firstName, lastName, title, department, linkedinUrl?, email?, seniority?, confidence ('high'|'medium'|'low').
  - `findContactsForSegment(params)`: companyDomain, companyName, targetRoles (from department), maxResults, provider?.
  - Switch on provider → `findViaApollo(params)` (and later `findViaClay(params)`).
- **New:** [lib/tools/apollo.ts](lib/tools/apollo.ts)
  - `searchApolloContacts(params)`: POST to `https://api.apollo.io/v1/mixed_people/search` with q_organization_domains, person_titles (from targetRoles), person_seniorities (e.g. vp, director, manager, c_suite), per_page. Use `APOLLO_API_KEY`.
  - Map Apollo response → `ContactFinderResult[]` with confidence.
- **Remove / replace:** All usages of [lib/tools/phantombuster.ts](lib/tools/phantombuster.ts) in [app/actions/find-contacts.ts](app/actions/find-contacts.ts) with the new `findContactsForSegment`. PhantomBuster can be deleted or left as dead code; do not use in production path.

Enrichment can stay in [lib/tools/clay.ts](lib/tools/clay.ts) for now; add an optional Apollo enrich path later if desired for $0 demo. People Data Labs can be a second enrichment implementation behind an env switch when moving to early production.

---

## 2. Enrichment status fix (must-do first)

**Problem:** [addContactsToDepartment](app/actions/find-contacts.ts) does not set `enrichmentStatus`. Enrich-pending only processes `enrichmentStatus: 'pending'`, so newly added contacts never get enriched automatically.

**Change in** [app/actions/find-contacts.ts](app/actions/find-contacts.ts) when creating a contact:

```ts
// When creating:
enrichmentStatus: (c.linkedinUrl ?? c.email) ? 'pending' : 'not_needed',
```

Schema ([prisma/schema.prisma](prisma/schema.prisma)) documents `enrichmentStatus` as `pending | enriching | complete | failed | not_needed`. Use `'not_needed'` when the contact has no linkedin/email to enrich; use `'pending'` when we have something to enrich. Enrich-pending logic should only process contacts with `enrichmentStatus: 'pending'` (ignore `not_needed` and `null`).

---

## 3. Batch find-and-enrich flow

**Endpoint:** `POST /api/companies/[companyId]/contacts/find-and-enrich`

- Body: `{ departmentIds?: string[], maxPerDept?: number }` (default: all departments, e.g. 10 per dept).
- Auth: same as other company routes (session, company belongs to user).
- **Timeout:** Set `export const maxDuration = 120` on this route (Vercel default 60s). Use SSE like [batch-scrape](app/api/content-library/batch-scrape/route.ts): stream events (`started`, `department`, `enriching`, `complete`); client consumes `response.body` (see ContentLibraryActions). If moved to a background queue later, return job ID and poll.

**Flow:**

1. Load company (domain, name) and departments (id, targetRoles, customName, useCase, valueProp for later whyRelevant).
2. For each department with **max 3 concurrent** (use `pLimit(3)`):
  - `findContactsForSegment(companyDomain, companyName, targetRoles from department, maxResults)`.
  - Dedupe by email/linkedin if already in DB for this company.
  - `addContactsToDepartment(companyId, departmentId, contacts)` with enrichmentStatus set per contact (see above).
  - Send SSE event per department (e.g. `{ type: 'department', id, name, contactsAdded }`).
3. Call existing `POST .../contacts/enrich-pending` in a loop (or batch) until no pending, or once and return — so that by the time we respond, we can report `contactsAdded` and `enriched` counts.
4. Send final SSE: `{ type: 'complete', departmentsProcessed, contactsAdded, enriched, failed }`; client refreshes list.

**Server action:** Add `findAndEnrichContactsForCompany(companyId, options?)` in [app/actions/find-contacts.ts](app/actions/find-contacts.ts) that performs the above (contact-finder via pLimit(3), addContactsToDepartment, then enrichment). API route calls it and pipes progress into SSE. Target: 30–60s when fast so it’s fast; 120s maxDuration avoids timeouts.

---

## 4. UI: "Find & enrich all segments"

- **Contacts page:** [ContactsListClient.tsx](app/dashboard/companies/[id]/contacts/ContactsListClient.tsx)
  - Add primary CTA: **"Find & enrich all segments"** (or "Find and enrich contacts for all buying groups").
  - On click: POST to `.../contacts/find-and-enrich`, consume SSE stream (same pattern as batch-scrape in ContentLibraryActions), show real-time progress (e.g. "Finding contacts for 4 departments…", "Added 23 contacts; enriching…"), then on `complete` event show result summary and refresh list / scroll to table.
- **Discover contacts page (optional):** [DiscoverContactsClient.tsx](app/dashboard/companies/[id]/discover-contacts/DiscoverContactsClient.tsx) — add "Run for all departments" that calls the same endpoint and redirects to contacts page with a success message.

---

## 5. "Why they'd care" (high value, cheap)

**Goal:** One-line callout per contact so the list feels like intelligence, not just names.

- **Generate after enrichment:** Small LLM call per contact (or batched): inputs = contact title, department name, department valueProp/useCase, company name. Output = one sentence stored in `enrichedData.whyRelevant` (no schema change; enrichedData is Json).
- **Surface:** In [ContactsByBuyingGroup](app/components/company/ContactsByBuyingGroup.tsx) and optionally in the contacts table, show `enrichedData?.whyRelevant` as a one-line callout.

Implementation: add a helper e.g. `generateWhyRelevant(contact, department, company)` in a small module (e.g. [lib/contacts/why-relevant.ts](lib/contacts/why-relevant.ts)), call it from the enrich-pending flow or from a post-enrich step in the find-and-enrich batch, and write result into `enrichedData` when updating the contact.

---

## Implementation order

1. **Wire Apollo + contact-finder abstraction** — Create [lib/tools/contact-finder.ts](lib/tools/contact-finder.ts) and [lib/tools/apollo.ts](lib/tools/apollo.ts); replace PhantomBuster usage in [app/actions/find-contacts.ts](app/actions/find-contacts.ts) with `findContactsForSegment`.
2. **Fix enrichmentStatus** — In [addContactsToDepartment](app/actions/find-contacts.ts), set `enrichmentStatus: 'pending'` when contact has linkedinUrl or email, else `'not_needed'`.
3. **Batch find-and-enrich** — Add [findAndEnrichContactsForCompany](app/actions/find-contacts.ts) (use `pLimit(3)` for departments) and `POST /api/companies/[companyId]/contacts/find-and-enrich` route with `maxDuration = 120` and SSE streaming progress; then trigger enrich-pending; stream final counts in `complete` event.
4. **UI CTA** — Add "Find & enrich all segments" to [ContactsListClient.tsx](app/dashboard/companies/[id]/contacts/ContactsListClient.tsx) with progress and refresh.
5. **Why relevant** — Add whyRelevant generation (LLM), store in enrichedData, surface in [ContactsByBuyingGroup](app/components/company/ContactsByBuyingGroup.tsx).

Steps 1–4 get to demo-ready. Step 5 makes it "genuinely impressive."

---

## File summary


| Step | Files                                                                                                                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | New: [lib/tools/contact-finder.ts](lib/tools/contact-finder.ts), [lib/tools/apollo.ts](lib/tools/apollo.ts). Edit: [app/actions/find-contacts.ts](app/actions/find-contacts.ts) (use findContactsForSegment, drop PhantomBuster).                                                                                                           |
| 2    | [app/actions/find-contacts.ts](app/actions/find-contacts.ts) (addContactsToDepartment: set enrichmentStatus).                                                                                                                                                                                                                               |
| 3    | [app/actions/find-contacts.ts](app/actions/find-contacts.ts) (findAndEnrichContactsForCompany with pLimit(3)), new [app/api/companies/[companyId]/contacts/find-and-enrich/route.ts](app/api/companies/[companyId]/contacts/find-and-enrich/route.ts) (maxDuration = 120, SSE progress). Add `p-limit` to package.json if not a direct dep. |
| 4    | [app/dashboard/companies/[id]/contacts/ContactsListClient.tsx](app/dashboard/companies/[id]/contacts/ContactsListClient.tsx). Optionally [DiscoverContactsClient.tsx](app/dashboard/companies/[id]/discover-contacts/DiscoverContactsClient.tsx).                                                                                           |
| 5    | New: [lib/contacts/why-relevant.ts](lib/contacts/why-relevant.ts). Edit: enrich-pending or find-and-enrich flow to call it and set enrichedData.whyRelevant; [ContactsByBuyingGroup.tsx](app/components/company/ContactsByBuyingGroup.tsx) and optionally contacts table to display it.                                                     |


