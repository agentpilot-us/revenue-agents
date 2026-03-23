# Strategist Onboarding Guide — New Client Configuration Playbook

Step-by-step guide for configuring AgentPilot before AE onboarding. Covers My Company setup, play governance, content templates, signal wiring, and validation.

**Audience:** Internal strategist / admin configuring a new client instance  
**Version:** 1.2 | March 2026

---

## Overview

This guide walks you through configuring AgentPilot for a new client, from initial company setup through validated play execution. The goal is to have a fully working instance where AEs can log in, see their My Day dashboard populated with active plays, and execute AI-generated content that reflects the client's brand, products, and strategic priorities.

Configuration happens primarily in **My Company**, which has six tabs: Profile, Products, Content Library, Playbooks, Messaging, and Intelligence. You'll work through these roughly in order, though some steps overlap.

**Also plan for:**

- **Minimum depth** — See **Minimum viable configuration** below so you know how much to add before AE onboarding vs. what can wait.
- **At least one test target account** — Required before **Step 10** (divisions, contacts, and for renewal tests a **CompanyProduct** with contract dates). Import via **Target Accounts** / Add Account (or your deployment’s equivalent) or API; see the AE Onboarding Guide for import details.
- **Play Catalog verification** — After templates are **ACTIVE**, confirm AEs see them under **sidebar → Plays** (`/dashboard/plays`); see Step 8.
- **Troubleshooting** — If smoke tests fail, use **Appendix: Troubleshooting** at the end of this doc.
- **In-app progress** — **My Company** shows a **Setup progress** card (counts + deep links) and **Validate setup** for automated query checks.

### Minimum viable configuration

You don’t need hundreds of rows to go live — the system works with **sparse** content; quality improves as you add more.

| Area | Initial target |
|------|----------------|
| Products | At least **2** product profiles if the client sells multiple SKUs / tiers |
| Content Library | **3–5** items per **type** you rely on first (e.g. use cases, success stories) |
| Messaging | **1** framework per **motion** you care about first (outreach, renewal, competitive) |
| Industry playbooks | **1** playbook for the **primary** target vertical |

Add depth after AE onboarding as you learn what reps use most.

---

## Step 1: Company Profile

Navigate to **My Company → Profile** tab. This is the foundation — everything the AI generates references these fields.

### Fields to Configure

Set **company name**, **industry**, **website**, and **primary industry you sell to**. Add **key initiatives** so the AI can align outreach to strategic priorities.

**Account Health Check**  
The Profile tab also shows account health metrics: number of accounts, contacts, roadmaps, products, and signals. At initial setup, these will all be zero. After you **import target accounts** (see the **AE Onboarding Guide** for importing / Target Accounts), verify these numbers increase.

---

## Step 2: Product Catalog

Navigate to **My Company → Products** tab. The product catalog is what the AI uses to recommend expansion SKUs, generate product-specific content, and match plays to accounts.

Two paths to populate (Path A — AI Discovery; Path B — Manual Entry), product profiles, and **Product Relationships**: If the client has 2+ products, define relationships in the Products tab (e.g. upgrade_path, complementary, prerequisite, replacement) using the product relationship editor per product. These inform expansion play recommendations.

---

## Step 3: Content Library

Navigate to **My Company → Content Library** tab. This is the raw material the AI uses to personalize outreach. When you create or update an item (in this tab or via upload/scrape), it is chunked and embedded for RAG and wired into buildContentContext() and play content generation. Chunking/embedding runs **asynchronously** after save — there is no fixed SLA in the product. **Verification:** After adding important content, run a **test content generation** (e.g. a play step or content flow). If the new material doesn’t show up in context, **wait up to ~5 minutes and retry** before assuming a failure. There is no separate "internal documents" store.

**Note:** Content can also be imported during initial company setup via the Smart Import flow at `/dashboard/company-setup`. The My Company → Content Library tab is the primary management interface for ongoing edits.

**Where to put company intelligence**  
Use Content Library and related areas so the AI can use it:

| If you have… | Add it as… |
|--------------|------------|
| Battle cards, competitive claims | Content Library → type **Battlecard** |
| Pricing guides / discount policies | **PlayGovernance** (maxDiscountPct, etc.) + **Messaging** framework for approved pricing language |
| Brand guidelines / tone | **PlayGovernance.brandVoice** + **Messaging** framework for tone guidelines |
| Sales decks, pitch materials | Content Library → type **Framework** or **Persona** |
| Customer success stories (including internal metrics) | Content Library → type **Success Story**; put metrics in the content fields |

**Content types**  
Use Case, Success Story, Event, Feature Release, Framework, Battlecard, Email Template, Persona. Use the industry and department fields for targeting; content without targeting is used generically. Success stories should include quantified metrics. Events must have dates so the AI can time outreach.

---

## Step 4: Messaging Frameworks

Navigate to **My Company → Messaging** tab. Messaging frameworks define the tone, positioning, and key messages that the AI uses across all generated content.

**PlayGovernance** constraints are enforced during play execution (content generation within PlayRuns and contact cooldown checks). Messaging frameworks are used more broadly across all AI-generated content including chat and ad-hoc generation.

**Brand voice: governance vs. messaging**  
These are complementary, not duplicate:

- **`PlayGovernance.brandVoice`** (configured in Step 7 via API/seed) — a **short guardrail** string (e.g. “Professional, consultative; never aggressive”) that **constrains** generation during play execution.
- **Messaging frameworks** — fuller **substance**: value proposition, competitive narrative, approved phrases, tone guides. They **inform** what the model says across channels.

**Rule of thumb:** Governance **constrains**; messaging **informs**. See Step 7 for where to set `brandVoice` alongside discount caps and cooldown defaults.

Recommended frameworks (Core Value Proposition, Enterprise Outreach Tone, Competitive Positioning, Renewal Messaging, Expansion Messaging) — stored in MessagingFramework and injected into buildContentContext().

---

## Step 5: Industry Playbooks

Navigate to **My Company → Playbooks** tab. This tab contains **Industry Playbooks** — selling guides for specific verticals.

For each target industry, create a playbook with: Overview, Buying Committee, Department → Product Mapping, Value Props by Department, and Landmines. Industry playbooks also appear at `/dashboard/content-library/industry-playbooks/` for browsing; the primary creation and editing interface is My Company → Playbooks.

Play templates (starter plays and signal wiring) are configured in **Step 8** and **Step 9** using the PlayTemplate system, SignalPlayMapping, and account activations.

---

## Step 6: Intelligence & Signal Monitoring

Navigate to **My Company → Intelligence** tab. Configure what signals AgentPilot monitors and activate product/event triggers. Default Monitoring Rules (Signal Config Panel) and Product & Event Activation as in original guide.

---

## Step 7: Play Governance

Play Governance is configured in the PlayGovernance model (one row per user/tenant). Use **My Company → Governance** to edit all settings in the browser (Save calls `PUT /api/play-governance`). The API remains available for automation; seed scripts can still bootstrap values.

Settings to configure: discount caps, cooldown defaults, competitive rules, value narrative, expansion SKUs, **brand voice**. PlayGovernance feeds into play-run content generation and cooldown checks.

**Brand voice (see Step 4):** Keep `brandVoice` **short** — boundaries and “never do X” style rules. Put detailed positioning and tone examples in **Messaging** frameworks.

---

## Step 8: Configure Play Templates

Play templates are stored in **PlayTemplate** with phases in **PlayPhaseTemplate** and content blueprints in **ContentTemplate**.

### Primary path — UI (recommended)

1. Go to **My Company → Playbooks** and scroll to **Play Templates**.
2. Click **+ Create Template** to open the **Play Template Builder** (`/dashboard/my-company/play-templates/new`). Define phases (one step per phase in the v1 builder), **Save draft** or **Publish** (**ACTIVE** templates appear in the Play Catalog).
3. Edit anytime via **Edit template →** (`/dashboard/my-company/play-templates/[id]/edit`).

Fallback for bulk or fresh environments: starter templates via **`prisma/seed-plays.ts`** and related seeds (see **Technical Implementation Guide**). You can also use **`POST /api/play-templates`** for automation.

### Default autonomy (do this during setup)

In the **Play Templates** list, set **Default autonomy** per template (Notify Only, Draft + Review, Auto-Execute).

**Recommendation:** Start all plays at **Draft + Review** for the first ~2 weeks. Once strategists and AEs trust content quality, selectively move **low-risk, high-volume** plays (e.g. event follow-up) to **Auto-Execute**. Account-level behavior can still be influenced by activation settings / `customConfig` where the product supports it.

### Renewal and timeline plays

**Renewal and timeline plays** anchor to **product-level contract dates**, not account-level. Use **CompanyProduct.contractEnd** or **CompanyProduct.contractRenewalDate** when setting up test accounts or validating renewal plays. A company can have multiple products with different renewal dates.

Company-style plays (e.g. Contract Renewal — **TIMELINE**, anchored to **CompanyProduct** dates; Quarterly Check-In; New Product / Feature Launch) and account plays (Executive Intro, Competitive Displacement, Expansion) follow the same template model; names and counts depend on your seeds and custom templates.

### Verify the Play Catalog (AE visibility)

1. Open **sidebar → Plays** → `/dashboard/plays` (**Play Catalog**).
2. Confirm **ACTIVE** templates appear with expected categories and descriptions.
3. If a template is **missing**: in My Company → Play Templates, check **status** — **DRAFT** and **ARCHIVED** templates do **not** appear in the global catalog.
4. If you use **`/dashboard/plays?companyId=...`**, the catalog may show only templates **activated** for that account’s Strategic Account Plan (**AccountPlayActivation**). A template can be ACTIVE globally but still hidden for one account until it’s activated for that roadmap — don’t confuse “not in list” with “broken template.”

---

## Step 9: Signal-to-Play Rules and Account Activations

Configure signal behavior from the **Strategic Account Plan (SAP)** for a chosen account: **Configuration** tab → **Play Rules** (same panel hosts both areas below).

### Signal → play mappings (`SignalPlayMapping`)

- These rows are **per user (tenant)** — they apply **across accounts**, not per roadmap.
- The Play Rules UI loads them via **`/api/signal-play-mappings`**. When a signal fires, matching uses these mappings (plus optional **`conditions`** such as account tier or ARR) to choose a **PlayTemplate**.
- **My Company → Playbooks → Play Templates → “Signal rules →”** links to **`/dashboard/roadmap`** — use it as a **shortcut**: pick an account, open **Configuration → Play Rules**, and manage the same global mappings there. It is **not** a separate mapping database.

Use **`conditions`** on a mapping when you need “only run this template for this signal when the account matches X” without maintaining different rows per account.

> **Product note:** True “for Account A use Template 1, for Account B use Template 2 for the **same** signal type” as separate DB rows is **not** modeled today beyond **conditions**. Broader per-account overrides would require a product/schema change.

### Activated plays for this account (`AccountPlayActivation`)

- **Per roadmap** (Strategic Account Plan): which **PlayTemplate**s are **allowed** to run for **this** account — including what shows in the **catalog** when `?companyId=` is present.
- Managed in the same **Play Rules** panel (activated plays section) via **`/api/roadmap/account-play-activations`**.

**Workflow:** Ensure templates exist and are **ACTIVE** (Step 8). Configure **signal → template** mappings globally as needed. For each important account, open its SAP **Play Rules** and confirm **activations** (and mappings/conditions) match your GTM plan.

---

## Prerequisites for Step 10 (validation)

Before running the smoke tests, ensure:

- At least **one target account** exists (divisions / buying groups, at least one **contact**).
- For **Test 4**, a **CompanyProduct** on that account with **contractRenewalDate** or **contractEnd** set appropriately.
- A **Strategic Account Plan** (roadmap) for that account if your tests involve account-scoped catalog or activations.

Import paths: **Target Accounts** / Add Account (or equivalent in your build) or API — align with the **AE Onboarding Guide** for bulk import.

---

## Step 10: Validation Smoke Test

Before inviting AEs, walk through the flow end-to-end. If a test fails, start with **Appendix: Troubleshooting**, then re-check the hints in each test.

**Test 1: Signal → PlayRun → My Day** — Trigger a test signal; verify SignalPlayMapping resolves and creates a PlayRun; open My Day and run page.

**Test 2: Content Generation Quality** — Generate content on the play run page; verify account context, governance rules, product profile data, and ContactTouch on send.

**Test 3: Contact Cooldown** — Second play targeting same contact; verify cooldown warning and alternate contact suggestion.

**Test 4: Renewal Play Timeline**  
Create a test **CompanyProduct** with **contractRenewalDate** (or **contractEnd**) 85 days from today. Verify the Contract Renewal play auto-activates (T-90 phase should be active) via the timeline cron. Verify Health Check & EBR content and phase gates. Renewal plays anchor to **CompanyProduct** contract dates, not account-level fields.

**If any test fails (quick checks):** PlayTemplate **ACTIVE**; **SignalPlayMapping** exists and signal type matches; **PlayGovernance** populated; **CompanyProduct** has required contract fields; **buildContentContext** and timeline cron / logs. See the appendix for systematic triage.

---

## Post-Setup Checklist

Before handing off to AE onboarding, confirm:

- [ ] Profile, Products, Content Library, Messaging, Industry Playbooks, Intelligence  
- [ ] Play Governance (**My Company → Governance** or API/seed) — including **brand voice** guardrails  
- [ ] Play templates — **created or seeded**, **ACTIVE** as needed, **default autonomy** set per template  
- [ ] **Play Catalog** verified (`/dashboard/plays`; account-scoped check with `?companyId=` if used)  
- [ ] **Signal → play** mappings (**SignalPlayMapping**) and per-account **activations** (**AccountPlayActivation**) configured via SAP **Play Rules** where required  
- [ ] **Test account** and **CompanyProduct** data ready for Step 10  
- [ ] **Setup progress** / **Validate setup** on My Company reviewed (optional but recommended)  
- [ ] **Validation smoke tests** (Step 10) passed, or failures triaged via **Appendix: Troubleshooting**

Once this checklist is complete, proceed to AE Onboarding Guide.

---

## Appendix: Troubleshooting

Use this when Step 10 fails or something “doesn’t show up.”

| Symptom | What to check |
|--------|----------------|
| **Content feels generic** | Content Library has enough items; industry/department targeting matches test account; Messaging frameworks + PlayGovernance (`valueNarrative`, `brandVoice`, etc.) populated |
| **Signal doesn’t create a PlayRun** | **SignalPlayMapping** exists for that `signalType`; template **ACTIVE**; signal type string matches ingestion; cron/webhook path for your deployment; optional **`conditions`** on the mapping — account must match |
| **Renewal / timeline play wrong or idle** | **CompanyProduct** `contractRenewalDate` / `contractEnd` set; timeline cron ran (check logs / ops runbook) |
| **Template missing from catalog (global)** | Template **status** is **ACTIVE** (not DRAFT/ARCHIVED) |
| **Template missing when `?companyId=` is set** | **AccountPlayActivation** for that account’s roadmap; roadmap exists for the company |
| **Still stuck** | Reconfirm rows via API or DB; for demos, see **`prisma/check-demo-play-mappings.ts`** or repair scripts your team uses after cleanup/seeds |

There is no single “rollback” button — fix data/config (status, mappings, activations, governance), re-run seeds if appropriate, and repeat the relevant smoke test.
