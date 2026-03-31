# Technical Implementation Guide — AgentPilot

This guide is for **developers** and **technical deployment strategists** who need to deploy AgentPilot, configure integrations (especially Salesforce), set up CRON jobs, configure AI/LLM and external services, and create/upload seed data so plays and the rest of the product run correctly.

**Related docs:** [EXTERNAL_SERVICES.md](./EXTERNAL_SERVICES.md) (env vars and webhooks), [salesforce-sync.md](./salesforce-sync.md) (push/pull and conflict policy), [.env.example](../.env.example).

---

## 1. Overview: What Must Be in Place for Plays to Run

Plays depend on:

- **Database** — PostgreSQL (e.g. Neon, Supabase, Vercel Postgres).
- **Auth** — Google OAuth (and optionally NextAuth magic link).
- **LLM** — Chat via Gemini, Anthropic, optional AI Gateway, or LM Studio (see [§5](#5-llm-vercel-ai-sdk-and-ai-gateway)). **Embeddings** need **`GOOGLE_GENERATIVE_AI_API_KEY`** and/or **`AI_GATEWAY_API_KEY`** per `get-embedding.ts`.
- **CRON jobs** — Including play-specific crons: signal ingest + **signal→PlayRun** matching (`fetch-account-signals`), timeline triggers, CRM field gates, meeting/engagement triggers (see [§4](#4-cron-jobs)).
- **Integrations (by use case):**
  - **Salesforce** — Account/Contact/Opportunity ingest; activity and segment push; phase gates (CRM_FIELD).
  - **Web search** — Account signals (news, executive changes, earnings) used by signal-based plays and dashboard.
  - **Apollo** — Contact discovery and enrichment.
  - **Resend** — Outbound email (plays, sequences, alerts).
  - **Cal.com** — Meeting booking and Meeting Prep play triggers.
  - **Google Workspace** — Optional; send from rep’s Gmail and calendar handoff.
  - **Slack** — Optional; alert webhooks.

Seed data (Content Library, products, industries, playbooks) is created/uploaded via the **Seed API and Content Library upload flows** described in [§6](#6-seed-api-and-content-library-upload).

---

## 2. Salesforce Integration

Salesforce supports: (1) ingesting Accounts, Contacts, and Opportunity data; (2) pushing activities and segment data back; (3) CRM_FIELD phase gates in plays. The schema uses **`salesforceId`** (not `crmId`) on Company and Contact; Opportunity data is cached in **`Company.salesforceOpportunityData`** (JSON).

### Step 1: Minimal Salesforce (get plays running)

Goal: link accounts/contacts to AgentPilot and run plays without full bi-directional sync.

**Auth:** Set `SALESFORCE_ACCESS_TOKEN` and `SALESFORCE_INSTANCE_URL` (or use OAuth per user in Settings). See [EXTERNAL_SERVICES.md § Salesforce](./EXTERNAL_SERVICES.md) for Connected App setup (scopes: `api`, `refresh_token`, `offline_access`).

**Ingest (pull) — what the code uses today:**

| SF object   | AgentPilot target | Fields used in code | How |
|-------------|-------------------|----------------------|-----|
| **Account** | `Company`         | `Id` → `Company.salesforceId`, `Name`, `Website`, `Industry` | CRM import creates/updates Company; match by `salesforceId` or create from Contact’s Account. `lib/crm/salesforce.ts`: `salesforceFetchAccounts`, `salesforceFetchAccountById`; Account from Contact query: `Account.Name`, `Account.Website`. |
| **Contact** | `Contact`         | `Id` → `Contact.salesforceId`, `Email`, `FirstName`, `LastName`, `Title`, `Phone`, `AccountId`, `Account.Name`, `Account.Website` | `POST /api/crm/import` with `companyId` and optional `accountId`; “Import from Salesforce” in UI. |
| **Opportunity** | `Company.salesforceOpportunityData` (JSON) | `Name`, `StageName`, `Amount`, `CloseDate` (open opps only); last Task for `lastActivityDate` | `POST /api/integrations/salesforce/sync` with `companyId`; 4h cache. Needed for CRM_FIELD gates and opportunity badge. |

**Push (minimal):** After sending email or logging a meeting, push a **Task** to Salesforce (`WhoId` = Contact/Lead Id, `Subject`, `Description`, `ActivityDate`, `Status: Completed`). Implemented in `lib/crm/salesforce.ts` (`salesforcePushActivity`) and `lib/integrations/salesforce-push-activity.ts` (user OAuth).

**What to do:** Connect Salesforce (token or OAuth). Import Accounts/Contacts via UI or `POST /api/crm/import`. For companies with plays that use CRM_FIELD gates, call Opportunity sync (e.g. from Company page). Ensure play cron jobs are scheduled (§4).

### Step 2: Salesforce for max impact (full sync and push)

Goal: daily/periodic sync, segment push-back, campaign leads, and correct field mapping for prioritization and gates.

**Additional ingest (optional fields / frequency):**

- **Company:** Schema has `domain`, `website`, `industry`, `headquarters`, `size`, `accountType`, `revenue`, `employees` (string). Salesforce Account can map: `Website` → `domain`/`website`, `Industry` → `industry`, `BillingCity/State` → `headquarters`, `NumberOfEmployees` → `employees`, `AnnualRevenue` → `revenue`, `Type` → `accountType`. *Today the CRM import path does not write all of these; extend `lib/crm/salesforce.ts` and import pipeline if you need them.*
- **Contact:** Schema has `department`, `linkedinUrl`, `city`, `state`, `country`. Map SF `Department`, custom LinkedIn URL, `MailingCity`/`MailingState` if you add them to the Contact query and import logic.
- **CompanyProduct (for TIMELINE plays):** Schema has `contractStart`, `contractEnd`, `contractRenewalDate`, `arr`, `opportunitySize`. These are **not** currently populated from Salesforce Opportunity in bulk; Opportunity data is cached on **Company** as `salesforceOpportunityData`. To drive TIMELINE plays from SF, you need either: (a) a sync that writes Opportunity `CloseDate`/`Amount`/etc. into `CompanyProduct` (and set `contractRenewalDate`/`contractEnd`), or (b) keep using on-demand Opportunity sync for display/gates and set `CompanyProduct` dates from another process (e.g. manual or custom job).

> **Callout — renewal / TIMELINE plays and the Strategist smoke test**  
> **`play-timeline-triggers`** only creates runs when the template’s **`anchorField`** maps to a populated **`CompanyProduct`** date: **`contractRenewalDate`**, **`contractEnd`**, or **`contractStart`** (see `ANCHOR_FIELD_TO_SOURCE` in `app/api/cron/play-timeline-triggers/route.ts`). If those fields are empty for matching products, **TIMELINE plays will not fire**. If a developer follows this guide but never populates those fields (Salesforce bulk sync does not write them today), **TIMELINE plays will not fire** and Strategist onboarding **Step 11 / Test 4** (renewal play) can fail **silently** (cron runs but matches zero products).  
> **Mitigation:** Treat contract dates as a first-class data step: manual entry in UI, seed data, or a **custom sync job** that maps Opportunity **`CloseDate`** (or your SF source of truth) into **`CompanyProduct.contractRenewalDate`** / **`contractEnd`**. Document that path for each deployment.

**Push (full):**

| Event | SF object | When |
|-------|-----------|------|
| Email sent / meeting logged | **Task** | On execute (approval queue); `WhoId`, `Subject`, `Description`, `ActivityDate`, `Status=Completed`. |
| Segment/buying group updates | **Account** / **Contact** PATCH | When segment is pushed; requires `SALESFORCE_ACCOUNT_SEGMENT_FIELD` and/or `SALESFORCE_CONTACT_SEGMENT_FIELD` (e.g. `AgentPilot_Segment__c`). `lib/crm/salesforce.ts`: `salesforcePushSegmentUpdates`. |
| Campaign lead | **Lead** | Cron `campaign-leads-push`; `salesforceCreateLead`. |

**Sync strategy:** Accounts/Contacts — on demand (UI) or scheduled job calling same CRM import. Opportunity — on demand per company or before play runs; 4h cache. The **play-crm-field-gates** cron reads `Company.salesforceOpportunityData` (e.g. `stage`) and advances phases when gateConfig matches. **Field-level security:** Grant integration user read on Account, Contact, Opportunity, Task and write on Task, Lead, and any custom segment fields.

**Conflict resolution:** Match by `salesforceId` first; then Contact by `email` + `companyId`, Company by domain/name. Salesforce wins on pull. See [salesforce-sync.md](./salesforce-sync.md).

---

## 3. Other Integrations (Summary)

| Integration       | Required for plays? | Purpose | Config reference |
|------------------|---------------------|---------|-------------------|
| **Google OAuth** | Yes                 | Sign-in | EXTERNAL_SERVICES § Google OAuth |
| **Google Workspace** | Optional        | Send email from rep’s Gmail; calendar handoff | `app/api/handoff/google-workspace`, `lib/integrations/google-workspace-tools.ts`; user connects in Settings |
| **Slack**        | Optional            | Alert webhooks | User-configurable webhook URL in Settings → Alerts; EXTERNAL_SERVICES § Slack |
| **Resend**       | Yes                 | Transactional and outreach email | `RESEND_API_KEY`, `RESEND_FROM`; EXTERNAL_SERVICES § Resend |
| **Apollo**       | Recommended         | Contact discovery, enrichment | `APOLLO_API_KEY`; EXTERNAL_SERVICES § Apollo |
| **Web search**   | Recommended         | Account signals for plays and dashboard | `EXA_API_KEY`; see [§3.1](#31-web-search-configuration) |
| **Perplexity**   | Recommended         | Web-grounded **company research** (`research-company`); optional **earnings depth** (`fetch-financial-signals`) — **not** used for Exa account-signal cron | `PERPLEXITY_API_KEY`; EXTERNAL_SERVICES § Perplexity |
| **Cal.com**      | Recommended         | Meeting booking; Meeting Prep play triggers | `CAL_*` env vars; EXTERNAL_SERVICES § Cal.com |
| **Stripe**       | Yes (billing)       | Subscriptions | EXTERNAL_SERVICES § Stripe |
| **Firecrawl**    | Optional            | Content Library “Import from URL”, site crawl | `FIRECRAWL_API_KEY` |
| **Vercel**       | Yes (hosting)       | Hosting, crons, optional sales page deploy | `VERCEL_ACCESS_TOKEN` optional |

### 3.1 Web search configuration

- **Env:** The **main account-signal search** in `lib/signals/fetch-account-signals.ts` instantiates Exa with **`EXA_API_KEY` only** (no `EXASEARCH_API_KEY` fallback in that file). **`EXASEARCH_API_KEY`** is used as a fallback in **`lib/exa/websets.ts`** and **`lib/exa/mcp-client.ts`** for websets / other Exa flows. For reliable signal cron runs, set **`EXA_API_KEY`**. If it is missing, that pipeline skips Exa search.
- **Powers:** Account signals (news, earnings, executive changes, product launches) via `lib/signals/fetch-account-signals.ts` and `lib/exa/enrich-company.ts`; used by signal-based plays and dashboard.
- **Cron:** `GET`/`POST` `/api/cron/fetch-account-signals` (every 2 hours in `vercel.json`).

### 3.2 Apollo Configuration

- **Env:** `APOLLO_API_KEY`.
- **Powers:** Contact discovery and enrichment (`lib/tools/apollo.ts`, `lib/tools/contact-finder.ts`). Used when building contact lists and for play context.

### 3.3 Premium / consulting add-on media (optional)

Not required for core plays, sequences, or signal workflows. Some consulting SOWs include **HeyGen**, **ElevenLabs**, **Google Stitch**, or similar for video, voice, or design-forward assets.

- **In product today:** Generated image/video paths can use **Vercel AI Gateway** media model overrides (`GATEWAY_IMAGE_MODEL`, `GATEWAY_VIDEO_MODEL`); see [§5](#5-llm-vercel-ai-sdk-and-ai-gateway) and `.env.example`.
- **When positioning add-ons:** Document which premium types are in scope for that engagement. **Configure provider keys and UI flows only when those content types are activated** for the tenant; there is no single global env block for HeyGen/ElevenLabs/Stitch in core AgentPilot — integrate per vendor when the feature ships or is customized.

---

## 4. CRON Jobs

**Auth behavior (matches code — do not assume every route is locked the same way):**

- **Always require a valid `CRON_SECRET` when the env is set** (401 otherwise): e.g. `fetch-account-signals`, `content-library/run-schedules`, `aggregate-analytics`, `send-alert-digest`, `contact-touch-cleanup`, `flag-stale-play-runs`, `refresh-account-research` (Bearer or `?secret=` where implemented).
- **Optional lock:** `calculate-engagement`, `play-timeline-triggers`, `play-crm-field-gates`, and `action-workflow-triggers` use `if (cronSecret && authHeader !== Bearer ...)`. **If `CRON_SECRET` is unset, these routes accept unauthenticated GETs** — fine for local dev, **unsafe for production** unless the deployment blocks them another way.
- **No cron auth in code:** **`advance-sequences`** and **`process-scheduled-actions`** have **no** `CRON_SECRET` check; anyone who can hit the URL can trigger them. **Set `CRON_SECRET` and protect these paths** (Vercel-only invocation, middleware, or add auth in code).

**Production:** Set `CRON_SECRET` everywhere and treat unauthenticated cron URLs as a gap until locked down.

**Signal → PlayRun (important):** **`SignalPlayMapping`** / template matching and **`PlayRun` creation from new account signals** run **inside** **`/api/cron/fetch-account-signals`** after signals are ingested (`lib/plays/match-signal-to-play-mapping.ts`). That path is **not** `action-workflow-triggers`.

**`action-workflow-triggers` (every 30 min)** only covers **Meeting Prep** (upcoming meetings/events) and **Engagement Catch-All** (recent high-value visits). It does **not** evaluate signal-to-play mappings.

**`process-scheduled-actions` (every 15 min)** drains the **`ScheduledAction`** queue (deferred emails, sequence advances, etc.). It does **not** run signal matching or `generatePlayActionContent`; play drafts are generated on demand (API routes / autonomous execute).

**Schedule vs Vercel UI:** The repo’s [`vercel.json`](../vercel.json) is the source of truth checked into git. **`fetch-account-signals`** is set to **`0 */2 * * *`** (every 2 hours) there. If the Vercel dashboard still shows **`0 */6 * * *`**, the production project may be on an older deployment — **redeploy** or **edit crons in the dashboard** to match. To reduce Exa/LLM cost, you may intentionally use **`0 */6 * * *`** or another expression; treat the interval as **tunable** and keep this guide aligned with whatever is deployed.

**All crons (configured in `vercel.json`):**

| Path | Schedule (cron) | Purpose |
|------|------------------|---------|
| `/api/cron/calculate-engagement` | 02:00 UTC daily | Engagement scoring |
| `/api/cron/aggregate-analytics` | 01:00 UTC daily | Dashboard analytics |
| `/api/cron/content-library/run-schedules` | 03:00 UTC daily | Scheduled content syncs |
| `/api/cron/fetch-account-signals` | Every 2 hours (`0 */2 * * *` in repo) | Ingest web signals **and** run **signal → `SignalPlayMapping` → `PlayRun`** when mappings match (`matchSignalToPlayMapping`). Tunable (e.g. `0 */6 * * *` for cost). |
| `/api/cron/send-alert-digest` | 21:00 UTC daily | Alert digest emails (~afternoon US Pacific) |
| `/api/cron/process-scheduled-actions` | Every 15 min | `ScheduledAction` queue: deferred emails, sequence advances, etc. (not signal matching). |
| `/api/cron/advance-sequences` | Hourly | Multi-step sequence progression |
| `/api/cron/play-timeline-triggers` | 04:00 UTC daily | TIMELINE plays: create PlayRuns when contract/renewal dates hit offset (e.g. T-90 renewal). Requires `CompanyProduct` dates populated (see §2 callout). |
| `/api/cron/play-crm-field-gates` | 04:00 UTC daily | CRM_FIELD phase gates: evaluate `Company.salesforceOpportunityData`; complete phase and advance when gateConfig matches. |
| `/api/cron/action-workflow-triggers` | Every 30 min | **Meeting Prep** + **Engagement Catch-All** only; creates PlayRuns from meetings/visits. **Does not** run signal-to-play matching. |
| `/api/cron/contact-touch-cleanup` | Sun 11:00 UTC | Delete `ContactTouch` rows older than retention (`CONTACT_TOUCH_RETENTION_DAYS`, default 90). |
| `/api/cron/flag-stale-play-runs` | 13:00 UTC daily | Set `PlayRun` to `AT_RISK` when `ACTIVE` and stale (`PLAY_RUN_STALE_DAYS`, default 14). |
| `/api/cron/refresh-account-research` | Sat 10:00 UTC | Batch refresh stale `Company` research (`ACCOUNT_RESEARCH_STALE_DAYS`, default **30**; use **14** for aggressive/high-touch only), `ACCOUNT_RESEARCH_BATCH_CAP` (default 4). |

**Optional:** `/api/cron/campaign-leads-push` (as needed, e.g. daily) — push campaign leads to Salesforce as Leads. Add to `vercel.json` if using campaign leads.

---

## 5. LLM, Vercel AI SDK, and AI Gateway

- **Chat / generation:** Centralized in `lib/llm/get-model.ts`. Use `getChatModel()` (and tier: default, `'fast'`, etc.) everywhere.
- **Embeddings:** `lib/llm/get-embedding.ts` — 1536-dim vectors for RAG. If **`AI_GATEWAY_API_KEY`** is set, embeddings route through the Gateway (`google/text-embedding-005`); otherwise **`GOOGLE_GENERATIVE_AI_API_KEY`** is required for Gemini `gemini-embedding-001`.
- **Env priority:**  
  - `USE_MOCK_LLM=true` → mock (no API calls).  
  - `LLM_PROVIDER=lmstudio` → local LM Studio (bypasses Gateway).  
  - `AI_GATEWAY_API_KEY` → Vercel AI Gateway (unified spend; OpenAI-compatible base URL).  
  - Else Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`) or Anthropic (`ANTHROPIC_API_KEY`).

**Model types in use:**

- **Full / default:** e.g. `gemini-2.5-flash` or Anthropic Claude; via Gateway when `AI_GATEWAY_API_KEY` set (e.g. `anthropic/claude-sonnet-4-20250514`).
- **Fast / extraction:** Lighter model for tool use and extraction.
- **Content hints (Gateway):** `visual`, `web_grounded`, `long_form` map to specific Gateway model IDs (see `get-model.ts`).

**AI Gateway (optional):**

- Get key: [Vercel AI Gateway](https://vercel.com/docs/ai-gateway/getting-started). Set `AI_GATEWAY_API_KEY`.
- BYOK: configure provider credentials in Vercel dashboard; no markup.
- Optional: `GATEWAY_IMAGE_MODEL`, `GATEWAY_VIDEO_MODEL` for generated media.

See [docs/ai-gateway-evaluation.md](./ai-gateway-evaluation.md) for rationale and implementation notes.

---

## 6. Seed API and Content Library Upload

This section is for **developers** who need to create seed data (docs, products, industries, playbooks) and load them into the app. “Seed” flows are the main way content and configuration are ingested so plays and strategies have something to run on.

### 6.1 Content Library (Seller Content and RAG)

Content Library items are the source for RAG (value props, case studies, use cases, etc.) and for health scoring and recommendations.

**Buyer personas vs Content Library:** Structured **buyer personas** (titles, pains, channels, assignable on `Contact.personaId`) live in **My Company → Personas** and are injected into generation as a **BUYER PERSONA** block in `lib/content/build-content-context.ts`. They are **not** created as Content Library rows. The legacy `ContentType.Persona` enum value may still exist on old library items for RAG-only narrative text; new persona-style setup should use the Personas tab, not the Content Library wizard.

**Ways to create/upload Content Library items:**

| Method | Endpoint / flow | Auth | Use case |
|--------|------------------|------|----------|
| **File upload** | `POST /api/content-library/upload` (multipart/form-data, file) | Session | PDF, DOCX, TXT, MD (max 4MB). Runs extraction; stores with `userConfirmed: false` until user confirms. |
| **Pasted text** | `POST /api/content-library/upload` (JSON body: `{ text, productId? }`) | Session | Paste ≥100 chars; same extraction and confirmation flow. |
| **Import from URL** | Scrape flow (e.g. batch or single URL) using Firecrawl | Session | Requires `FIRECRAWL_API_KEY`. Single or batch scrape; extraction and health. |
| **Import pipeline** | `POST /api/content-library/import` (inference from URL/page) | Session | LLM extraction from URL/content; creates structured Content Library entries (Framework, UseCase, SuccessStory, etc.). |

**Important for deployment:** Upload and scrape paths must run **enrichScrapedContent** (and persist extraction) so health dimensions and RAG work. See [CONTENT-LIBRARY-READINESS.md](./CONTENT-LIBRARY-READINESS.md).

**Optional env:** `CONTENT_LIBRARY_PRODUCT_ORIGIN` — canonical product URL for health recommendations (e.g. `https://www.agentpilot.us`).

### 6.2 Products and Industries (CSV Upload)

- **Products:** `POST /api/content-library/products/upload` — multipart/form-data, CSV. Columns: `name` (required), `description`, `priceMin`, `priceMax`, `pricingModel`, `category` (or `contentTags`). Creates/updates Product records used by playbooks and content.
- **Industries:** `POST /api/content-library/industries/upload` — multipart/form-data, CSV. Columns: `name` (required), `overview`, `buyingCommittee`, `landmines` (comma-separated in cell). Seeds industry context for targeting and playbooks.

Both require an authenticated session. Use these to seed the catalog your plays and strategies reference.

### 6.3 Playbooks and Demo Seed Data

- **Playbooks:** Stored as `PlayTemplate`, `PlayPhaseTemplate`, etc. **Primary paths today:**
  - **Ongoing creation:** **My Company → Play Templates → + Create Template** (**PlayTemplateBuilder** UI) or **`POST /api/play-templates`** for programmatic creates/updates.
  - **Initial / starter templates:** **Prisma seeds** (e.g. `prisma/seed-plays.ts`, `prisma/seed-signal-playbooks.ts`, `prisma/seed-proactive-playbooks.ts`) — use `npx prisma db seed` (or run seed scripts as needed) after schema sync / migrations so a new environment has baseline templates and signal mappings.
- **Demo setup:** Admin demo setup can create demo companies, roadmap config, and sample data; see `app/dashboard/admin/demo-setup/` and `lib/demo/`. Roadmap seed: `lib/demo/seed-roadmap-config.ts`, `app/dashboard/roadmap/SeedRoadmapConfigButton.tsx`.

**Creating seed docs and uploading into the app (developer checklist):**

1. **Content Library** — Use file upload or pasted text (`POST /api/content-library/upload`) or URL import (Firecrawl) to add case studies, use cases, and frameworks. Confirm extraction in the UI so health and RAG are populated.
2. **Products** — Prepare a CSV (name, description, pricing, category) and call `POST /api/content-library/products/upload`.
3. **Industries** — Prepare a CSV (name, overview, buyingCommittee, landmines) and call `POST /api/content-library/industries/upload`.
4. **Playbooks** — Seed starter templates via Prisma (`db seed`) and/or create templates in **Play Templates** UI or **`POST /api/play-templates`**; ensure CRON routes for play triggers and CRM field gates are scheduled (see [§4](#4-cron-jobs)).
5. **Salesforce** — Ensure Accounts/Contacts (and optionally Opportunity sync) are ingested so plays have companies and contacts; configure segment fields if you push segment data back.

---

## 7. Comparison: Technical Operations Guide (v1.0) vs Codebase

This section corrects a separate “Technical Operations Guide” (March 2026) against the actual codebase. Use it to fix doc errors and to see where the codebase does not yet implement assumed behavior.

### 7.1 Errors in the doc (correct as follows)

| Doc says | Actual (codebase) |
|----------|-------------------|
| **RESEND_FROM_EMAIL** | Env var is **`RESEND_FROM`** (and optionally `RESEND_FROM_ALERTS`). |
| **CAL_COM_API_KEY**, **CAL_COM_EVENT_TYPE_ID** | Env vars are **`CAL_API_KEY`**, **`CAL_EVENT_TYPE_ID`**. |
| **NEXTAUTH_SECRET** only | Auth accepts **`AUTH_SECRET`** or **`NEXTAUTH_SECRET`** (`auth.ts`). |
| **ANTHROPIC_API_KEY** as required / primary LLM | Chat routing is in **`lib/llm/get-model.ts`**: mock → LM Studio → AI Gateway (if key) → Anthropic/Gemini per env. **Not** “Gemini always first.” Embeddings: **`lib/llm/get-embedding.ts`** (Gateway or Gemini key). |
| **SLACK_BOT_TOKEN**, **SLACK_WEBHOOK_URL** | Slack is **per-user webhook URL** in Settings → Alerts; no global env. |
| **Company.crmId**, **Contact.crmId** | Schema uses **`Company.salesforceId`**, **`Contact.salesforceId`** (and `hubspotId` when HubSpot). No generic `crmId`. |
| **action-workflow-triggers:** “RoadmapSignalRule + RoadmapActionMapping” | Cron does **Meeting Prep** (meetings in 24h) + **Engagement Catch-All** (recent high-value visits); creates PlayRuns. No RoadmapSignalRule in this path. See `app/api/cron/action-workflow-triggers/route.ts`. |
| **Signal → PlayRun** assumed to be `action-workflow-triggers` or `process-scheduled-actions` | **Signal matching and PlayRun creation from account signals** run in **`/api/cron/fetch-account-signals`** via **`matchSignalToPlayMapping`** (`lib/plays/match-signal-to-play-mapping.ts`), after signals are fetched/stored. `process-scheduled-actions` only processes the `ScheduledAction` queue. |
| **buildContentContext** in `lib/plays/build-content-context.ts` | **`lib/content/build-content-context.ts`**. |
| **generateOneContent** in `lib/ai/generate-one-content.ts` | **`lib/content/generate-content.ts`** (`generateOneContent`). |
| Content generation: “generatePlayActionContent (lib/plays/generate-action-content.ts) … buildContentContext() … generateOneContent (lib/ai/generate-one-content.ts)” | Flow is correct; paths are **`lib/plays/generate-action-content.ts`** → **`lib/content/build-content-context.ts`** → **`lib/content/generate-content.ts`** (generateOneContent). |
| **PUT /api/play-governance** “if the endpoint exists” | Endpoint **exists**: `app/api/play-governance/route.ts` (**GET + PUT** — session auth). |
| **prisma/seed-client.ts** | No **seed-client.ts**. Playbook seed lives in **`prisma/seed-plays.ts`** and related seeds (`seed-signal-playbooks.ts`, `seed-proactive-playbooks.ts`, etc.). |

### 7.2 Salesforce field mapping: doc vs schema (gaps)

The Operations Guide’s SF → AgentPilot tables reference fields that **do not exist** or are **named differently** in the schema:

| Doc SF → AP mapping | In codebase |
|--------------------|-------------|
| Account.Id → **Company.crmId** | **Company.salesforceId** (no `crmId`). |
| Account.AnnualRevenue → **Company.arr** | Company has **`revenue`** (string), not `arr`. **`arr`** is on **CompanyProduct** (Decimal). |
| Account.NumberOfEmployees → **Company.employeeCount** | Company has **`employees`** (string), not `employeeCount`. |
| Account.Type → **Company.accountTier** | Company has **`accountType`** (string). |
| Account.OwnerId → **Company.ownerId** | **No `ownerId`** on Company. |
| Account.Description → **Company.description** | **No `description`** on Company model. |
| Contact.Id → **Contact.crmId** | **Contact.salesforceId** (no `crmId`). |
| Contact.Department → **Contact.department** | **Exists** as `Contact.department`. |
| Contact.MailingCity/State → **Contact.location** | Contact has **`city`, `state`, `country`** (no single `location`). |
| Opportunity.Id → **CompanyProduct.crmOpportunityId** | **No `crmOpportunityId`** on CompanyProduct. Opportunity data lives in **Company.salesforceOpportunityData** (JSON). |
| Opportunity.Amount → **CompanyProduct.dealValue** | CompanyProduct has **`arr`**, **`opportunitySize`** (no `dealValue`). |
| Opportunity.StageName → **Company.salesforceOpportunityData.stage** | **Correct** — stage is in `Company.salesforceOpportunityData`. |
| Opportunity.ContractStartDate → **CompanyProduct.contractStart** | **CompanyProduct.contractStart** exists; not populated from SF in current sync. |
| Opportunity.Competitor__c → **Company.primaryCompetitor** | **No `primaryCompetitor`** on Company. |
| Push: **Event** for meeting booked | Code pushes **Task** only (no Event object). `lib/crm/salesforce.ts`, `lib/integrations/salesforce-push-activity.ts`. |

### 7.3 Other codebase gaps (doc assumes feature exists)

| Topic | Status | Workaround / notes |
|-------|--------|-------------------|
| **PlayRun completed → Task** (SF push on COMPLETED) | **Not implemented** | **Roadmap.** Log completion manually in Salesforce or add a custom push/webhook. Today Tasks are pushed on email/meeting execute paths only. |
| **Contact research saved → Task/Note** | **Not implemented** | **Roadmap.** Manual SF logging or custom automation for consulting. |
| **Objection recorded → Opportunity Note / custom field** | **Not implemented** | **Roadmap.** Manual entry or custom handler. |
| **“SignalConfigRule” per account** (legacy doc) | **Doc ≠ code** | Use **`CustomSignalConfig`** and company websets; see `lib/signals/fetch-account-signals.ts`, `lib/exa/websets.ts`. |
| **`ContentTemplate.modelTier` (SONNET/HAIKU)** vs runtime | **Partial alignment** | Schema enum exists; chat routing uses **`full` / `fast` / `extraction`** in `get-model.ts`. Mapping from template tier to provider models lives in the content-generation path. |

**Roadmap / consulting (rows 1–3):** These Salesforce push-backs are **product gaps**, not documentation typos. For consulting engagements, **log activities manually in Salesforce** or **build custom push handlers** until product support ships.

---

## 8. Deployment Checklist

- [ ] **Database:** `DATABASE_URL` set; schema applied (`npx prisma migrate deploy` **or** `npx prisma db push`, per team practice).
- [ ] **Auth:** `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- [ ] **LLM:** `GOOGLE_GENERATIVE_AI_API_KEY` (or Anthropic); optional `AI_GATEWAY_API_KEY`.
- [ ] **Email:** `RESEND_API_KEY`, `RESEND_FROM`.
- [ ] **Cron:** `CRON_SECRET` set for production; all required crons registered in `vercel.json` and **enabled** in Vercel (compare dashboard schedules to git — see [§4](#4-cron-jobs) for `fetch-account-signals` tunability). **Review** `advance-sequences` and `process-scheduled-actions`: they do not verify `CRON_SECRET` in code — restrict by deployment or add auth.
- [ ] **Cron tuning (optional env):** `CONTACT_TOUCH_RETENTION_DAYS` (default 90), `PLAY_RUN_STALE_DAYS` (default 14), `ACCOUNT_RESEARCH_STALE_DAYS` (default **30** in code; set **14** only if you want biweekly refresh for all queued accounts — higher cost), `ACCOUNT_RESEARCH_BATCH_CAP` (default 4).
- [ ] **Salesforce:** Access token or OAuth configured; optional `SALESFORCE_ACCOUNT_SEGMENT_FIELD`, `SALESFORCE_CONTACT_SEGMENT_FIELD`. Sync strategy decided (when to pull Account/Contact/Opportunity; when to push Task/segment). **TIMELINE plays:** plan how `CompanyProduct` contract dates get populated (§2 callout).
- [ ] **Web search:** `EXA_API_KEY` if account signals and signal-based plays are used.
- [ ] **Apollo:** `APOLLO_API_KEY` for contact discovery/enrichment.
- [ ] **Cal.com:** `CAL_*` for meeting booking and Meeting Prep plays.
- [ ] **Content Library:** Upload/import and scrape paths deployed with extraction; `CONTENT_LIBRARY_PRODUCT_ORIGIN` set if using health recommendations.
- [ ] **Seed data:** Products/industries CSV uploads or API calls; Content Library populated.
- [ ] **PlayTemplates:** Starter templates via **`npx prisma db seed`** (or equivalent) **and/or** created in **My Company → Play Templates** (PlayTemplateBuilder) / **`POST /api/play-templates`**; `SignalPlayMapping` rows aligned with templates if using signal-triggered plays.
- [ ] For doc vs codebase corrections and gaps, see §7.

For a minimal list of env vars, see “Minimum viable configuration” in [EXTERNAL_SERVICES.md](./EXTERNAL_SERVICES.md). For webhook endpoints and secrets, see the same doc.

---

## 9. Operational runbook (day 2)

After deploy, developers and operators use this for common tasks and debugging. Strategist-facing troubleshooting stays in [STRATEGIST_ONBOARDING_GUIDE.md](./STRATEGIST_ONBOARDING_GUIDE.md); this section is **technical**.

### 9.1 Add a new target account

- **UI:** Create/import company (CRM import, manual company create) under the rep’s workspace; complete company setup (Content Library / products) as required for research and plays.
- **API:** Use existing company/account creation and CRM import endpoints (`POST /api/crm/import`, etc.) per [§2](#2-salesforce-integration).

### 9.2 Manually test signals or speed up a run

- **Cron path:** Invoke the same URL Vercel calls, with auth:  
  `curl -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/fetch-account-signals"`  
  (GET or POST; both are supported for that route.)
- **UI / product:** Use dashboard signal feeds and any “preview” / dry-run tools exposed for mappings (e.g. signal → play preview APIs) without waiting for the cron interval.
- **End-to-end signal → PlayRun without waiting 2h:** Use the dashboard **Hot Signals** flow (or chat/agent flows that create or surface account signals for the target company), ensure **`SignalPlayMapping`** matches the signal type, then confirm a **`PlayRun`** appears on **My Day** / the company play list. That exercises the same matching logic the cron uses after ingest; pair with **`curl …/fetch-account-signals`** if you need to force batch ingest immediately. **If no PlayRun appears,** check **`SignalPlayMapping.signalType` vs `AccountSignal.type`:** matching in `lib/plays/match-signal-to-play.ts` **lowercases and trims** both sides, then allows **equality or substring** (`includes`). **Different slugs with no shared substring still miss** — e.g. `exec_hire` vs `executive_hire` typically **do not** match; align mapping strings with the **exact type strings** your ingest pipeline stores.

### 9.3 Verify crons are running

- **Vercel:** Project → **Settings → Cron Jobs** → execution history / logs; confirm schedules match [`vercel.json`](../vercel.json) after latest deploy.
- **Runtime logs:** Filter by route path (e.g. `/api/cron/fetch-account-signals`) in Vercel **Logs**; check for 401 (missing/wrong `CRON_SECRET`) or 5xx/timeouts.

### 9.4 Debug: play did not fire

| Symptom | Check |
|---------|--------|
| **Signal-based play never created** | `SignalPlayMapping` exists, template **ACTIVE**, **`signalType` compatible with stored signal `type`** per `match-signal-to-play.ts` (lowercased; equality or `includes` — unrelated slugs like `exec_hire` vs `executive_hire` often fail); **`fetch-account-signals`** ran successfully; **`EXA_API_KEY`** set; company not stuck in demo-only restrictions. |
| **TIMELINE / renewal play never created** | **`CompanyProduct.contractRenewalDate`** or **`contractEnd`** (and template anchor config) populated; **`play-timeline-triggers`** ran; template trigger type **TIMELINE** and offsets correct. |
| **CRM_FIELD phase did not advance** | **`Company.salesforceOpportunityData`** fresh enough; gate **`gateConfig`** matches cached stage; **`play-crm-field-gates`** ran. |
| **Meeting Prep / engagement play** | Upcoming meeting **`Activity`** metadata dates within window; **`action-workflow-triggers`** ran — this path is **separate** from signals (§4). |
| **Generated content is generic / missing context** | **`RoadmapTarget.companyDepartmentId`** → division context in `generate-action-content`; **`PlayRun.accountSignalId`** → signal title/summary in prompts; **Contact** `enrichedData` / bio fields populated where the template expects them; **Content Library** has items with **industry / department** (or other) targeting that matches the account — see `lib/content/build-content-context.ts` and `lib/plays/generate-action-content.ts`. (Developer counterpart to Strategist Guide “content feels generic.”) |

### 9.5 Debug: stale or stuck PlayRuns

- **`AT_RISK` surfaced on My Day:** Set by **`flag-stale-play-runs`** when **`ACTIVE`** and **`updatedAt`** older than **`PLAY_RUN_STALE_DAYS`**. Cleared when the rep **executes** an action, **generates** content, or **PATCH**es the run off `AT_RISK` (see `lib/plays/clear-play-run-at-risk.ts` and `app/api/play-runs/[runId]/route.ts`).
