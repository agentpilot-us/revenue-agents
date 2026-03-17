# Technical Implementation Guide — AgentPilot

This guide is for **developers** and **technical deployment strategists** who need to deploy AgentPilot, configure integrations (especially Salesforce), set up CRON jobs, configure AI/LLM and external services, and create/upload seed data so plays and the rest of the product run correctly.

**Related docs:** [EXTERNAL_SERVICES.md](./EXTERNAL_SERVICES.md) (env vars and webhooks), [salesforce-sync.md](./salesforce-sync.md) (push/pull and conflict policy), [.env.example](../.env.example).

---

## 1. Overview: What Must Be in Place for Plays to Run

Plays depend on:

- **Database** — PostgreSQL (e.g. Neon, Supabase, Vercel Postgres).
- **Auth** — Google OAuth (and optionally NextAuth magic link).
- **LLM** — Gemini (required for embeddings) or Anthropic; optional Vercel AI Gateway.
- **CRON jobs** — Including play-specific crons: timeline triggers, CRM field gates, action-workflow triggers (see [§4](#4-cron-jobs)).
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
| **Cal.com**      | Recommended         | Meeting booking; Meeting Prep play triggers | `CAL_*` env vars; EXTERNAL_SERVICES § Cal.com |
| **Stripe**       | Yes (billing)       | Subscriptions | EXTERNAL_SERVICES § Stripe |
| **Firecrawl**    | Optional            | Content Library “Import from URL”, site crawl | `FIRECRAWL_API_KEY` |
| **Vercel**       | Yes (hosting)       | Hosting, crons, optional sales page deploy | `VERCEL_ACCESS_TOKEN` optional |

### 3.1 Web search configuration

- **Env:** `EXA_API_KEY` (or fallback `EXASEARCH_API_KEY`). If neither is set, cron skips signal fetching.
- **Powers:** Account signals (news, earnings, executive changes, product launches) via `lib/signals/fetch-account-signals.ts` and `lib/exa/enrich-company.ts`; used by signal-based plays and dashboard.
- **Cron:** `GET /api/cron/fetch-account-signals` (every 6 hours in `vercel.json`).

### 3.2 Apollo Configuration

- **Env:** `APOLLO_API_KEY`.
- **Powers:** Contact discovery and enrichment (`lib/tools/apollo.ts`, `lib/tools/contact-finder.ts`). Used when building contact lists and for play context.

---

## 4. CRON Jobs

All cron routes expect `Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` in the environment.

**All crons (configured in `vercel.json`):**

| Path | Schedule (cron) | Purpose |
|------|------------------|---------|
| `/api/cron/calculate-engagement` | 02:00 UTC daily | Engagement scoring |
| `/api/cron/aggregate-analytics` | 01:00 UTC daily | Dashboard analytics |
| `/api/cron/content-library/run-schedules` | 03:00 UTC daily | Scheduled content syncs |
| `/api/cron/fetch-account-signals` | Every 6 hours | Web-based account signals |
| `/api/cron/send-alert-digest` | 14:00 UTC daily | Alert digest emails |
| `/api/cron/process-scheduled-actions` | Every 15 min | Deferred tasks (emails, sequence steps) |
| `/api/cron/advance-sequences` | Hourly | Multi-step sequence progression |
| `/api/cron/play-timeline-triggers` | 04:00 UTC daily | TIMELINE plays: create PlayRuns when contract/renewal dates hit offset (e.g. T-90 renewal). |
| `/api/cron/play-crm-field-gates` | 04:00 UTC daily | CRM_FIELD phase gates: evaluate `Company.salesforceOpportunityData`; complete phase and advance when gateConfig matches. |
| `/api/cron/action-workflow-triggers` | Every 30 min | Meeting Prep (meetings in 24h) + Engagement Catch-All (recent high-value visits); creates PlayRuns. |

**Optional:** `/api/cron/campaign-leads-push` (as needed, e.g. daily) — push campaign leads to Salesforce as Leads. Add to `vercel.json` if using campaign leads.

---

## 5. LLM, Vercel AI SDK, and AI Gateway

- **Chat / generation:** Centralized in `lib/llm/get-model.ts`. Use `getChatModel()` (and tier: default, `'fast'`, etc.) everywhere.
- **Embeddings:** `lib/llm/get-embedding.ts` — Gemini `gemini-embedding-001` (1536-dim). Required for RAG (e.g. Content Library).
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

- **Playbooks:** Stored as `PlayTemplate`, `PlayPhaseTemplate`, etc. Seeded via Prisma seeds (e.g. `prisma/seed-plays.ts`, `prisma/seed-signal-playbooks.ts`, `prisma/seed-proactive-playbooks.ts`). For a custom deployment, run `npx prisma db seed` (or run seed scripts as needed) after migrations.
- **Demo setup:** Admin demo setup can create demo companies, roadmap config, and sample data; see `app/dashboard/admin/demo-setup/` and `lib/demo/`. Roadmap seed: `lib/demo/seed-roadmap-config.ts`, `app/dashboard/roadmap/SeedRoadmapConfigButton.tsx`.

**Creating seed docs and uploading into the app (developer checklist):**

1. **Content Library** — Use file upload or pasted text (`POST /api/content-library/upload`) or URL import (Firecrawl) to add case studies, use cases, and frameworks. Confirm extraction in the UI so health and RAG are populated.
2. **Products** — Prepare a CSV (name, description, pricing, category) and call `POST /api/content-library/products/upload`.
3. **Industries** — Prepare a CSV (name, overview, buyingCommittee, landmines) and call `POST /api/content-library/industries/upload`.
4. **Playbooks** — Add or adjust PlayTemplate/phase/step data via Prisma seeds or admin flows; ensure CRON routes for play triggers and CRM field gates are scheduled (see [§4](#4-cron-jobs)).
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
| **ANTHROPIC_API_KEY** as required / primary LLM | **Gemini** is primary when `GOOGLE_GENERATIVE_AI_API_KEY` is set; Anthropic is fallback. Embeddings require Gemini. See `lib/llm/get-model.ts`. |
| **SLACK_BOT_TOKEN**, **SLACK_WEBHOOK_URL** | Slack is **per-user webhook URL** in Settings → Alerts; no global env. |
| **Company.crmId**, **Contact.crmId** | Schema uses **`Company.salesforceId`**, **`Contact.salesforceId`** (and `hubspotId` when HubSpot). No generic `crmId`. |
| **action-workflow-triggers:** “RoadmapSignalRule + RoadmapActionMapping” | Cron does **Meeting Prep** (meetings in 24h) + **Engagement Catch-All** (recent high-value visits); creates PlayRuns. No RoadmapSignalRule in this path. See `app/api/cron/action-workflow-triggers/route.ts`. |
| **buildContentContext** in `lib/plays/build-content-context.ts` | **`lib/content/build-content-context.ts`**. |
| **generateOneContent** in `lib/ai/generate-one-content.ts` | **`lib/content/generate-content.ts`** (`generateOneContent`). |
| Content generation: “generatePlayActionContent (lib/plays/generate-action-content.ts) … buildContentContext() … generateOneContent (lib/ai/generate-one-content.ts)” | Flow is correct; paths are **`lib/plays/generate-action-content.ts`** → **`lib/content/build-content-context.ts`** → **`lib/content/generate-content.ts`** (generateOneContent). |
| **PUT /api/play-governance** “if the endpoint exists” | Endpoint **exists**: `app/api/play-governance/route.ts` (GET + PUT). |
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

- **PlayRun completed → Task:** Doc says push a Task “On PlayRun status → COMPLETED”. No automatic push on PlayRun completion in code; only Task on email/meeting execute.
- **Contact research saved → Task/Note:** Doc says push on `research_company` via chat. Not implemented.
- **Objection recorded → Opportunity Note / custom field:** Doc says push on `record_objection` via chat. Not implemented.
- **SignalConfigRule entries per account:** Doc says cron “Builds search queries from SignalConfigRule entries per account.” Actual signal config uses **CustomSignalConfig** and company websets; see `lib/signals/fetch-account-signals.ts` and `lib/exa/websets.ts`.
- **ContentTemplate.modelTier** and **ModelTier (SONNET/HAIKU):** Schema has `ContentTemplate.modelTier` and enum `ModelTier { HAIKU, SONNET }`. Actual LLM routing in `get-model.ts` uses tiers `full` / `fast` / `extraction` and can use Gemini or Anthropic; mapping from SONNET/HAIKU to provider models is in content generation path.

---

## 8. Deployment Checklist

- [ ] **Database:** `DATABASE_URL` set; migrations run (`npx prisma migrate deploy`).
- [ ] **Auth:** `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- [ ] **LLM:** `GOOGLE_GENERATIVE_AI_API_KEY` (or Anthropic); optional `AI_GATEWAY_API_KEY`.
- [ ] **Email:** `RESEND_API_KEY`, `RESEND_FROM`.
- [ ] **Cron:** `CRON_SECRET` set; all required crons (including play-timeline-triggers, play-crm-field-gates, action-workflow-triggers) registered in `vercel.json` and enabled in Vercel.
- [ ] **Salesforce:** Access token or OAuth configured; optional `SALESFORCE_ACCOUNT_SEGMENT_FIELD`, `SALESFORCE_CONTACT_SEGMENT_FIELD`. Sync strategy decided (when to pull Account/Contact/Opportunity; when to push Task/segment).
- [ ] **Web search:** `EXA_API_KEY` if account signals and signal-based plays are used.
- [ ] **Apollo:** `APOLLO_API_KEY` for contact discovery/enrichment.
- [ ] **Cal.com:** `CAL_*` for meeting booking and Meeting Prep plays.
- [ ] **Content Library:** Upload/import and scrape paths deployed with extraction; `CONTENT_LIBRARY_PRODUCT_ORIGIN` set if using health recommendations.
- [ ] **Seed data:** Products/industries CSV uploads or API calls; Content Library populated; playbook seeds run if needed (see §6). For doc vs codebase corrections and gaps, see §7.

For a minimal list of env vars, see “Minimum viable configuration” in [EXTERNAL_SERVICES.md](./EXTERNAL_SERVICES.md). For webhook endpoints and secrets, see the same doc.
