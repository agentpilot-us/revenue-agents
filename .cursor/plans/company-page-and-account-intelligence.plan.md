---
name: ""
overview: ""
todos: []
isProject: false
---

# Company Page and Account Intelligence – Full Plan

This plan consolidates the workflow and UI changes we discussed: add-company flow, Account Intelligence (research, buying segments, messaging), Create content/landing page, and company detail page.

---

## 1. Add company flow: fewer steps, Research with AI sooner

**Goal:** After adding a company, the user lands where they can run Research with AI immediately. From the company list, they can also start research without an extra click.

**1.1 Redirect to Account Intelligence after creating a company**

- **Current:** Create company → redirect to company overview page → user clicks "Set up Account Intelligence" → Intelligence page → Research with AI.
- **Change:** After successful create (POST `/api/accounts`), redirect to `/dashboard/companies/[id]/intelligence` instead of `/dashboard/companies/[id]`.
- **File:** `app/dashboard/companies/new/page.tsx` — change `router.push(\`/dashboard/companies/${data.company.id})`to`router.push(/dashboard/companies/${data.company.id}/intelligence)`.

**1.2 Research with AI on company overview (optional)**

- **Goal:** When opening a company from the list, user can run "Research with AI" from the company page without clicking "Set up Account Intelligence" first.
- **Change:** In the company overview, for Step 1 (Account Intelligence), when the company has no research yet, show **ResearchButton** as the primary CTA alongside (or instead of) the link to the full Intelligence page. Once research exists, keep a single link "Review Account Intelligence."
- **File:** `app/components/company/CompanyGetStarted.tsx` — render `ResearchButton` when `!hasResearch`; keep link to `/dashboard/companies/[id]/intelligence` as secondary.  
- **Note:** If we remove the entire "Get started" section (see section 4), this bullet applies only if we keep a minimal CTA elsewhere (e.g. header) for "Research with AI" when no research exists.

---

## 2. Account Intelligence: rename the three steps

**Goal:** Clear labels that match what each step does. Keep all three steps; only copy changes.


| Step | New title                   | New description (short)                                                                                                      |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Research target company** | AI researches the account: basics, initiatives, and product fit.                                                             |
| 2    | **Create buying segments**  | Review and approve segments (function/division) and contact titles per segment. These drive LinkedIn research and analytics. |
| 3    | **Create messaging**        | Generate messaging for your approved buying segments. Rerun if you add or change segments.                                   |


**Files:**

- `app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx` — Update headings and body copy for steps 1–3 to use the titles and descriptions above.
- Any other UI that references "Research account," "Review microsegments," or "Generate account messaging" on the Intelligence page (e.g. `ProgressSteps` if it shows step names).

**Data flow (unchanged):**

- Step 1: POST `/api/companies/[id]/research` → returns structured research (companyBasics, whatTheyDo, productFit, microSegments with roles).
- Step 2: User reviews/edits in modal → Save → POST `/api/companies/[id]/apply-research` → saves to Company, creates/updates CompanyDepartment per segment (with targetRoles = contact titles), then auto-generates Account Messaging.
- Step 3: "Generate messaging" runs as part of apply-research; the separate button is for re-running when segments change.

---

## 3. One-click Account Intelligence (optional)

**Goal:** Single action that runs research and applies it (saves company, departments, messaging) without requiring the user to open the review modal and click Save.

**Options:**

- **A (client-driven):** One button "Research and set up account intelligence" that (1) POST research, (2) on success POST apply-research with the returned payload, (3) refresh and show success. Keep existing "Research with AI" for users who want to review before save.
- **B (server-driven):** New endpoint, e.g. POST `/api/companies/[id]/intelligence/run`, that runs research then apply-research server-side and returns one response.

**Implementation:** Prefer Option A in `AccountIntelligenceClient.tsx` (and optionally on company overview if we keep a CTA there). No schema changes; agent already consumes saved data via structured prompt blocks (not RAG).

---

## 4. Remove "Get started" from company detail page

**Goal:** Do not show Step 1 (Account Intelligence) and Step 2 (AI Powered Landing and chat) on the company detail page. Setup is done from the Intelligence page and Create content; the company page is for viewing and managing data in tabs.

**Change:** Remove or stop rendering the **CompanyGetStarted** component on the company detail page.

**File:** `app/dashboard/companies/[id]/page.tsx` — Remove the `<CompanyGetStarted ... />` block (and any wrapper). Keep the rest of the page: header, ARR/expansion, tabs (Departments, Overview, Contacts, Products, Activity, Messaging, Campaigns).

**Where data is viewed:** All data from Account Intelligence and landing pages is already available in the tabs:

- **Departments** — Buying segments (microsegments), contact titles per segment, use cases, products.
- **Messaging** — Account messaging (why-this-company, use cases, success stories, objections).
- **Campaigns** — Landing pages / sales pages + chat.
- **Overview** — Pipeline and funnel (and optionally research narrative; see section 6).
- **Contacts, Products, Activity** — Contact list, product matrix, activity.

---

## 5. Create landing page on Create content page; research required

**Goal:** "Create landing page" (sales page + chat) lives under **Create content**, not as Step 2 on the company page. Company must be researched (and optionally full account intelligence) before any content—including landing page—can be created.

**5.1 Move landing page creation to Create content**

- **Current:** Landing page flow (CreateLandingPageFlow, generate-draft, approve, launch) lives in `CampaignsTab` on the company page; entry from "Get started" Step 2 and Campaigns tab.
- **Change:** On the **per-company Create content page** (`/dashboard/companies/[id]/create-content`), add a clear section or entry point for **"Create landing page + chat"** that reuses the same flow (e.g. embed CreateLandingPageFlow or link to a sub-route that wraps it). The Create content page becomes the single place to generate copy (email, LinkedIn, custom URL) and to create a landing page.
- **Files:** `app/dashboard/companies/[id]/create-content/page.tsx`, `CreateContentClient.tsx`; reuse or extract `CreateLandingPageFlow` from `CampaignsTab.tsx` so it can be used from create-content. Optionally add a route like `/dashboard/companies/[id]/create-content/landing-page` if the flow is large.

**5.2 Research required before content (including landing page)**

- **Current:** Create content page already shows "Complete Account Intelligence first" when `!hasIntelligence` and disables generate for copy.
- **Change:** For the new "Create landing page" section, only show or enable it when the company has at least **research** (e.g. `!!company.researchData`) or full `hasIntelligence` (research + departments + messaging). Otherwise show "Research this company first" with link to `/dashboard/companies/[id]/intelligence`. Enforce the same rule server-side in the generate-draft (or equivalent) API if needed.

**5.3 Company page: de-emphasize Step 2**

- With "Get started" removed (section 4), the company page no longer shows Step 2. The **Campaigns** tab remains for viewing and managing existing campaigns; "Create landing page" is reached from Create content.

---

## 6. (Optional) Show research narrative on company page

**Goal:** Step 1 output (company basics, business overview, key initiatives) is stored in Company but today only shows as "✅ AI Researched" on the company page. Optionally expose the full research narrative where users view the company.

**Change:** Add a section or tab that displays the research content (basics, overview, initiatives). Options:

- Add a **Research** (or **Account research**) section on the **Overview** tab that renders the same data `CompanyResearchDisplay` uses (from Company.researchData / businessOverview / keyInitiatives), or
- Add a **Research** tab that shows this narrative and optionally links to "Edit in Account Intelligence."

**Files:** `app/dashboard/companies/[id]/page.tsx` and/or `CompanyTabs.tsx`; reuse or adapt `CompanyResearchDisplay` (currently used in Chat) to read from Company and display on the company page.

---

## 7. Summary: data storage and agent use

- **Research target company** → Stored in `Company` (researchData, businessOverview, keyInitiatives, basics).  
- **Create buying segments** → Stored in `CompanyDepartment` (useCase, targetRoles, products).  
- **Create messaging** → Stored in `AccountMessaging` (whyThisCompany, useCases, successStories, objectionHandlers, doNotMention).  
- **Landing pages** → Stored in `SegmentCampaign` (and related).

**Agent use:** The agent does **not** use RAG for account intelligence. It uses **structured DB data** via `getCompanyResearchPromptBlock` and `getAccountMessagingPromptBlock`, which format Company, departments, and AccountMessaging into prompt text for chat, create-content, generate-draft, and draft-follow-up. RAG is used for **your company data** (content library) only.

---

## Implementation order (suggested)

1. Rename Account Intelligence steps (section 2) — copy only.
2. Remove CompanyGetStarted from company detail page (section 4).
3. Redirect after create to Intelligence page (section 1.1).
4. Add "Create landing page" to Create content page and gate on research (section 5).
5. Optional: Research with AI on company overview (section 1.2) if we add a small CTA after removing Get started.
6. Optional: One-click Research and apply (section 3).
7. Optional: Research narrative on company Overview or new tab (section 6).

