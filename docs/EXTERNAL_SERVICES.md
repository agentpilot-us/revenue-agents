# External Services Configuration Guide

Every third-party service Revenue-Agents depends on, what it powers, how to configure it, and which webhook endpoints to register.

---

## Quick reference

| Service | Category | Required? | Powers |
|---------|----------|-----------|--------|
| [PostgreSQL (Neon / Supabase / Vercel Postgres)](#postgresql) | Database | **Yes** | All persisted data |
| [Google OAuth](#google-oauth) | Auth | **Yes** | User sign-in |
| [Google Gemini](#google-gemini) | AI | **Yes** (typical) | Chat, embeddings (direct); see also [AI / LLM Providers](#ai--llm-providers) |
| [Vercel AI Gateway](#vercel-ai-gateway) | AI | Optional | Unified chat + embeddings routing; `AI_GATEWAY_API_KEY` |
| [Anthropic (Claude)](#anthropic) | AI | Fallback | Chat, content generation |
| [Resend](#resend) | Email | **Yes** | Transactional email, magic-link auth, outreach |
| [Stripe](#stripe) | Payments | **Yes** | Subscriptions, checkout, billing |
| [Perplexity](#perplexity) | Research | Recommended | Web-grounded company research; optional earnings depth (`fetch-financial-signals`) — not a replacement for Exa account signals |
| [Web search](#web-search) | Research | Recommended | Account signals, news, executive changes |
| [Firecrawl](#firecrawl) | Scraping | Optional | Content Library import, site crawling |
| [Apollo](#apollo) | Enrichment | Recommended | Contact discovery, enrichment |
| [Cal.com](#calcom) | Scheduling | Recommended | Meeting booking, calendar integration |
| [Salesforce](#salesforce) | CRM | Optional | Account/contact sync, activity push |
| [HubSpot](#hubspot) | CRM | Optional | Account/contact sync, activity push |
| [Vercel](#vercel-platform) | Hosting | **Yes** | Hosting, cron jobs, sales page deployment |
| [Vercel Blob](#vercel-blob) | Storage | Optional | File uploads (content library, logos) |
| [Slack](#slack) | Alerts | Optional | Webhook-based alert notifications |
| [ActivePieces](#activepieces) | Automation | Optional | MCP-based flow automation (Cursor only) |

---

## Database

### PostgreSQL

Revenue-Agents uses PostgreSQL via Prisma ORM with the `@prisma/adapter-pg` driver adapter. Any PostgreSQL provider works (Neon, Supabase, Vercel Postgres, self-hosted).

**Env vars:**

```
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=verify-full"
```

`DATABASE_URL` is the only required variable. The app normalizes SSL to `verify-full` automatically. Legacy vars (`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `PGHOST`, etc.) are supported for Vercel Postgres compatibility but `DATABASE_URL` is preferred.

**Setup:**

1. Create a PostgreSQL database at your provider
2. Copy the connection string into `DATABASE_URL`
3. Append `?sslmode=verify-full` for hosted databases
4. Run `npx prisma migrate dev` to create tables

**Key files:** `prisma/schema.prisma`, `prisma.config.ts`, `lib/db.ts`

---

## Authentication

### Google OAuth

Primary sign-in method.

**Env vars:**

```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

**Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
4. For local dev, add `http://localhost:3000/api/auth/callback/google`
5. Generate `AUTH_SECRET` with `openssl rand -base64 32`

> Use `NEXTAUTH_URL` only (base URL, no path). Do NOT set `AUTH_URL` — it causes "UnknownAction" errors on sign-in. For local dev use `localhost` only (no ngrok) so cookies and callback URL match.

**Key files:** `auth.ts`

---

## AI / LLM Providers

**Embeddings** require **`GOOGLE_GENERATIVE_AI_API_KEY`** (Gemini `gemini-embedding-001`) **or** **`AI_GATEWAY_API_KEY`** (Gateway model `google/text-embedding-005`) — see `lib/llm/get-embedding.ts`.

**Chat routing** is **not** “Gemini always first.” Priority in `lib/llm/get-model.ts`: **mock** → **LM Studio** (`LLM_PROVIDER=lmstudio`) → **AI Gateway** (when `AI_GATEWAY_API_KEY` is set) → **Anthropic / Gemini** per env. Full detail: [TECHNICAL_IMPLEMENTATION_GUIDE.md §5](./TECHNICAL_IMPLEMENTATION_GUIDE.md#5-llm-vercel-ai-sdk-and-ai-gateway).

### Google Gemini

Typical default for chat and for **direct** embeddings when Gateway is not used.

**Env vars:**

```
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Optional overrides
LLM_PROVIDER="gemini"
GEMINI_CHAT_MODEL="gemini-2.5-pro"
GEMINI_FAST_MODEL="gemini-2.5-flash"
```

**Setup:**

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Set `GOOGLE_GENERATIVE_AI_API_KEY`

With this key (and no Gateway), Gemini is used for chat and embeddings (1536-dim). You can still set `ANTHROPIC_API_KEY` as fallback per `get-model.ts`.

**Key files:** `lib/llm/get-model.ts`, `lib/llm/get-embedding.ts`

### Vercel AI Gateway

When **`AI_GATEWAY_API_KEY`** is set (and not mock / not LM Studio), chat and embeddings can route through the Gateway for unified spend. Optional media model overrides: `GATEWAY_IMAGE_MODEL`, `GATEWAY_VIDEO_MODEL`.

**Env vars:**

```
AI_GATEWAY_API_KEY="..."
```

**Key files:** `lib/llm/get-model.ts`, `lib/llm/get-embedding.ts`

See [Vercel AI Gateway docs](https://vercel.com/docs/ai-gateway/getting-started) and [docs/ai-gateway-evaluation.md](./ai-gateway-evaluation.md).

### Anthropic

Chat fallback / alternate path per `get-model.ts` (not a simple “only if Gemini missing” — Gateway and env order matter).

**Env vars:**

```
ANTHROPIC_API_KEY="sk-ant-..."
```

**Setup:**

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Set `ANTHROPIC_API_KEY`

**Key files:** `lib/llm/get-model.ts`

### Perplexity

**Web-grounded research** for account intelligence flows (`researchCompany` / `lib/research/research-company.ts`) and **optional** earnings-style depth (`lib/signals/fetch-financial-signals.ts`). **Account signals** in the dashboard and **`fetch-account-signals` cron** use **Exa** (`EXA_API_KEY`), not Perplexity — configure both if you need research UI + signal monitoring.

**Env vars:**

```
PERPLEXITY_API_KEY="pplx-..."
```

**Setup:**

1. Go to [Perplexity API](https://docs.perplexity.ai/)
2. Create an API key

**Key files:** `lib/tools/perplexity.ts`, `lib/signals/fetch-financial-signals.ts`, `lib/research/research-company.ts`

### Web search

Powers real-time **account signal** monitoring (news, earnings, executive changes, product launches) via **Exa**.

**Env vars:**

```
EXA_API_KEY="..."
```

**Important:** `lib/signals/fetch-account-signals.ts` (including the **`fetch-account-signals` cron**) uses **`EXA_API_KEY` only** — there is **no** `EXASEARCH_API_KEY` fallback on that path. For reliable signal runs, set **`EXA_API_KEY`**. **`EXASEARCH_API_KEY`** is a fallback only in **`lib/exa/websets.ts`** and **`lib/exa/mcp-client.ts`**. If `EXA_API_KEY` is missing, the main signal Exa client is disabled.

**Setup:**

1. Obtain an Exa API key.
2. Set `EXA_API_KEY` in your environment.

**Key files:** `lib/exa/enrich-company.ts`, `lib/exa/websets.ts`, `lib/exa/mcp-client.ts`, `lib/signals/fetch-account-signals.ts`

> **Dev/test shortcut:** Set `USE_MOCK_LLM=true` to disable all real AI API calls and use mock responses.

---

## Email

### Resend

Handles all outbound email: transactional notifications, magic-link authentication, and sales outreach.

**Env vars:**

```
RESEND_API_KEY="re_..."
RESEND_FROM="you@yourdomain.com"

# Optional
RESEND_FROM_ALERTS="alerts@yourdomain.com"
RESEND_WEBHOOK_SECRET="whsec_..."
```

**Setup:**

1. Go to [Resend](https://resend.com/)
2. Create an API key
3. Verify your sending domain (or use `onboarding@resend.dev` for testing)
4. Set up the webhook for delivery tracking:

**Webhook endpoint:** `POST /api/webhooks/resend`

| Event | Purpose |
|-------|---------|
| `email.delivered` | Track delivery status |
| `email.opened` | Track email opens |
| `email.clicked` | Track link clicks |
| `email.bounced` | Handle bounces |

Register the webhook in Resend Dashboard → Webhooks → Add Endpoint:
- URL: `https://your-domain.com/api/webhooks/resend`
- Copy the signing secret into `RESEND_WEBHOOK_SECRET`

**Key files:** `lib/email/resend-provider.ts`, `lib/tools/resend.ts`, `app/api/webhooks/resend/route.ts`

---

## Payments

### Stripe

Manages subscriptions, checkout, and billing across multiple product tiers.

**Env vars:**

```
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Price IDs per tier (create in Stripe Dashboard → Products)
NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_ANNUAL="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_ANNUAL="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_ANNUAL="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_ANNUAL="price_..."
```

**Setup:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get API keys from Developers → API keys
3. Create products for each tier (New Logo, Expansion, Partner, Velocity) with monthly and annual prices
4. Copy each Price ID into the corresponding env var
5. Set up the webhook:

**Webhook endpoint:** `POST /api/stripe/webhook`

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Activate subscription |
| `customer.subscription.updated` | Handle plan changes |
| `customer.subscription.deleted` | Handle cancellations |

Register in Stripe Dashboard → Developers → Webhooks → Add Endpoint:
- URL: `https://your-domain.com/api/stripe/webhook`
- Copy signing secret into `STRIPE_WEBHOOK_SECRET`

**Key files:** `lib/stripe.ts`, `lib/programs.ts`, `app/api/stripe/webhook/route.ts`, `app/api/stripe/create-checkout/route.ts`

---

## Scraping

### Firecrawl

Powers the Content Library's "Import from URL" feature and site-wide content crawling.

**Env vars:**

```
FIRECRAWL_API_KEY="fc-..."

# Optional: canonical product site for health recommendations
CONTENT_LIBRARY_PRODUCT_ORIGIN="https://www.yourdomain.com"
```

**Setup:**

1. Go to [Firecrawl](https://www.firecrawl.dev/)
2. Sign up and get an API key (starts with `fc-`)

**Webhook endpoint:** `POST /api/content-library/webhooks/firecrawl` (no secret; called by Firecrawl when async crawl jobs complete)

**Key files:** `lib/tools/firecrawl.ts`, `lib/content-library/firecrawl-workflows.ts`, `app/api/content-library/webhooks/firecrawl/route.ts`

---

## Contact Discovery & Enrichment

### Apollo

Contact discovery and enrichment provider — finds people at target companies and returns verified emails, phone numbers, titles, and seniority data.

**Env vars:**

```
APOLLO_API_KEY="..."
```

**Setup:**

1. Go to [Apollo.io](https://www.apollo.io/)
2. Get an API key from Settings → Integrations → API

**Stub behavior:** If `APOLLO_API_KEY` is unset, `lib/tools/apollo.ts` returns **placeholder** people so demos and local dev still show a result list. Those are not live Apollo matches — configure a real key in staging/production for accurate play-run discovery (`POST .../roster/.../discover`).

**Play templates:** On each `PlayTemplateRole`, optional `apolloTitleTerms` (comma/newline-separated title keywords) narrows Apollo search from the run discover endpoint; `mapToContactRole` supports roster auto-population from roadmap/CRM data.

**Key files:** `lib/tools/apollo.ts`, `lib/tools/contact-finder.ts`, `lib/tools/enrich-contact.ts`

---

## Scheduling

### Cal.com

Meeting booking integration — create calendar invites, check availability, and receive booking notifications.

**Env vars:**

```
CAL_API_KEY="cal_..."
CAL_EVENT_TYPE_ID="123456"
CAL_WEBHOOK_SECRET="..."
CAL_PUBLIC_BOOKING_URL="https://cal.com/your-username"

# Optional: public-facing booking links
NEXT_PUBLIC_CAL_BOOKING_URL="https://cal.com/your-username"
NEXT_PUBLIC_DEMO_BOOKING_URL="https://calendly.com/your-username/demo"
```

**Webhook endpoint:** `POST /api/webhooks/cal`

| Event | Purpose |
|-------|---------|
| `BOOKING_CREATED` | Track new meetings |
| `BOOKING_CANCELLED` | Handle cancellations |

Register in Cal.com → Settings → Developer → Webhooks:
- URL: `https://your-domain.com/api/webhooks/cal`
- Copy the secret into `CAL_WEBHOOK_SECRET`

**Key files:** `lib/tools/cal.ts`, `app/api/webhooks/cal/route.ts`

---

## CRM Integrations

### Salesforce

Supports both static token and full OAuth flow. Import accounts/contacts, push activities and engagement data.

**Static token (quick setup):**

```
SALESFORCE_ACCESS_TOKEN="..."
SALESFORCE_INSTANCE_URL="https://yourorg.my.salesforce.com"
```

**OAuth flow (production):**

```
SALESFORCE_CLIENT_ID="..."
SALESFORCE_CLIENT_SECRET="..."
SALESFORCE_REDIRECT_URI="https://your-domain.com/api/integrations/salesforce/callback"
SALESFORCE_LOGIN_URL="https://login.salesforce.com"
```

**Optional field mappings:**

```
SALESFORCE_ACCOUNT_SEGMENT_FIELD="AgentPilot_Segment__c"
SALESFORCE_CONTACT_SEGMENT_FIELD="AgentPilot_Segment__c"
```

**OAuth setup:**

1. In Salesforce Setup → App Manager → New Connected App
2. Enable OAuth, add scopes: `api`, `refresh_token`, `offline_access`
3. Set callback URL to `https://your-domain.com/api/integrations/salesforce/callback`
4. Copy Consumer Key/Secret into env vars

**Key files:** `lib/crm/salesforce.ts`, `lib/integrations/salesforce-oauth.ts`, `app/api/integrations/salesforce/auth/route.ts`, `app/api/integrations/salesforce/callback/route.ts`

### HubSpot

Private app integration for contact import and activity push.

**Env vars:**

```
HUBSPOT_API_KEY="pat-..."
```

**Setup:**

1. In HubSpot → Settings → Integrations → Private Apps → Create
2. Required scopes: `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.emails.write`, `crm.objects.meetings.write`
3. Copy the access token

**Key files:** `lib/crm/hubspot.ts`

---

## Hosting & Deployment

### Vercel Platform

The app is designed for Vercel. It uses Vercel for hosting, cron jobs, and sales page deployment via the Vercel API.

**Env vars (auto-set by Vercel):**

```
VERCEL_URL    # Set automatically by Vercel at build time
```

**Env vars (for sales page deployment):**

```
VERCEL_ACCESS_TOKEN="..."
VERCEL_TEAM_ID="team_..."       # Optional: deploy to a specific team
VERCEL_PROJECT_ID="prj_..."     # Optional: deploy to a specific project
```

**Setup:**

1. Create a Vercel access token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Set `VERCEL_ACCESS_TOKEN` in your environment

**Cron jobs** (configured in [`vercel.json`](../vercel.json); schedules and auth nuances: [TECHNICAL_IMPLEMENTATION_GUIDE.md §4](./TECHNICAL_IMPLEMENTATION_GUIDE.md#4-cron-jobs)):

| Cron | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/calculate-engagement` | 02:00 daily | Engagement scoring |
| `/api/cron/aggregate-analytics` | 01:00 daily | Dashboard analytics |
| `/api/cron/content-library/run-schedules` | 03:00 daily | Scheduled content syncs |
| `/api/cron/fetch-account-signals` | Every 2 hours (`0 */2 * * *`) | Account signals + signal→PlayRun matching |
| `/api/cron/send-alert-digest` | 21:00 daily | Alert digest emails |
| `/api/cron/process-scheduled-actions` | Every 15 min | `ScheduledAction` queue |
| `/api/cron/advance-sequences` | Hourly | Sequence → scheduled emails |
| `/api/cron/play-timeline-triggers` | 04:00 daily | TIMELINE play activation |
| `/api/cron/play-crm-field-gates` | 04:00 daily | CRM_FIELD phase gates |
| `/api/cron/action-workflow-triggers` | Every 30 min | Meeting Prep + engagement catch-all |
| `/api/cron/contact-touch-cleanup` | Sun 11:00 | Prune old `ContactTouch` rows |
| `/api/cron/flag-stale-play-runs` | 13:00 daily | Mark stale `PlayRun` as `AT_RISK` |
| `/api/cron/refresh-account-research` | Sat 10:00 | Batch refresh stale company research |

**Required for production cron invocations (Vercel injects the Bearer header when set):**

```
CRON_SECRET="generate_random_string_here"
```

**Optional — cron tuning (defaults match code in `app/api/cron/*`):**

```
# Contact touch retention (contact-touch-cleanup). Default: 90
CONTACT_TOUCH_RETENTION_DAYS="90"

# Stale ACTIVE play run → AT_RISK (flag-stale-play-runs). Default: 14
PLAY_RUN_STALE_DAYS="14"

# Company research refresh: min age before a company is eligible (refresh-account-research). Default: 30 days.
# Use 14 only for aggressive / high-touch refresh (higher API cost at scale).
ACCOUNT_RESEARCH_STALE_DAYS="30"

# Max companies processed per weekly refresh run. Default: 4 (max 20 in code)
ACCOUNT_RESEARCH_BATCH_CAP="4"
```

**Key files:** `vercel.json`, `app/api/cron/`, `lib/vercel/deploy-static.ts`

### Vercel Blob

File storage for content library uploads and user logos.

**Env vars:**

```
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

**Setup:**

1. In Vercel Dashboard → Storage → Create Blob Store
2. Copy the read-write token

**Key files:** `app/api/content-library/upload/route.ts`, `app/api/user/logo/route.ts`

---

---

## Alerts & Notifications

### Slack

Webhook-based alert notifications. No global env var — each user configures their own Slack webhook URL in Settings → Alerts.

**Setup:**

1. In Slack → Apps → Incoming Webhooks → Create
2. Copy the webhook URL
3. Paste into Revenue-Agents Settings → Alerts → Slack Webhook URL

Custom webhook URLs (for Zapier, Make, n8n, etc.) are also supported in the same settings panel.

**Key files:** `lib/alerts/channels/slack.ts`, `lib/alerts/channels/webhook.ts`

---

## ActivePieces

ActivePieces is an open-source automation platform. In Revenue-Agents, it is integrated as a **Cursor MCP (Model Context Protocol) server** — it is not embedded in the application code itself, but rather extends the AI coding assistant's capabilities when developing and operating the app.

### Current state

ActivePieces is configured as an MCP server in the Cursor IDE, connecting to ActivePieces Cloud via SSE. As of this writing, the MCP server connection is in an error state and exposes no tools.

### What ActivePieces is intended for

ActivePieces was explored as the automation backbone for:

- **Scheduled/delayed actions** — executing deferred tasks (emails, sequence steps, plan actions) on a schedule
- **Multi-step workflow orchestration** — chaining AI research → content generation → outreach across accounts
- **Signal-to-action pipelines** — reacting to detected account signals with automated plays

The application currently handles these use cases internally via its `ScheduledAction` model and Vercel cron jobs (see [Vercel Platform](#vercel-platform) above). ActivePieces remains a candidate for replacing or augmenting this infrastructure.

### MCP configuration

The ActivePieces MCP server is configured in Cursor's global MCP settings:

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "Activepieces": {
      "url": "https://cloud.activepieces.com/api/v1/mcp/<your-project-id>/sse"
    }
  }
}
```

### Setting up ActivePieces

#### 1. Create an ActivePieces Cloud account

1. Go to [cloud.activepieces.com](https://cloud.activepieces.com)
2. Sign up and create a project
3. Note your project ID from the URL or Settings

#### 2. Create flows (automations)

ActivePieces flows define the automations that the MCP server exposes as tools. Example flows for Revenue-Agents:

| Flow | Trigger | Actions |
|------|---------|---------|
| Send Scheduled Email | Webhook (from ScheduledAction) | Delay → Send via Resend API |
| Process Signal | Webhook (from cron) | AI step → Create Play → Queue for approval |
| Advance Sequence | Schedule (every 15 min) | Query DB → Generate next step → Send or queue |

Each flow you create in ActivePieces becomes available as a callable tool through the MCP connection.

#### 3. Enable the MCP endpoint

1. In ActivePieces → Project Settings → MCP
2. Enable the MCP endpoint
3. Copy the SSE URL (format: `https://cloud.activepieces.com/api/v1/mcp/<project-id>/sse`)

#### 4. Configure Cursor MCP

Add or update `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Activepieces": {
      "url": "https://cloud.activepieces.com/api/v1/mcp/<your-project-id>/sse"
    }
  }
}
```

Restart Cursor after updating the config. The MCP tools panel should show the ActivePieces server with available flow tools.

#### 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| "The MCP server errored" | Check that the project ID in the SSE URL is correct and the MCP endpoint is enabled in ActivePieces settings |
| No tools showing | Create at least one flow in ActivePieces — tools are derived from published flows |
| Connection timeout | Verify network access; the SSE URL requires outbound HTTPS to `cloud.activepieces.com` |
| Tools not updating | Republish flows in ActivePieces; restart Cursor to refresh the MCP tool list |

#### 6. Self-hosting option

ActivePieces can also be self-hosted. Replace the cloud URL with your instance:

```json
{
  "mcpServers": {
    "Activepieces": {
      "url": "https://your-activepieces-instance.com/api/v1/mcp/<project-id>/sse"
    }
  }
}
```

See [ActivePieces self-hosting docs](https://www.activepieces.com/docs/install/overview) for Docker / Kubernetes deployment.

---

## Webhook endpoints summary

All webhook endpoints the application exposes, for quick reference when configuring external services:

| Service | Endpoint | Secret env var |
|---------|----------|---------------|
| Resend | `POST /api/webhooks/resend` | `RESEND_WEBHOOK_SECRET` |
| Stripe | `POST /api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` |
| Cal.com | `POST /api/webhooks/cal` | `CAL_WEBHOOK_SECRET` |
| Firecrawl | `POST /api/content-library/webhooks/firecrawl` | — |
| Gmail | `POST /api/webhooks/gmail` | — |
| Vercel Cron | `GET /api/cron/*` | `CRON_SECRET` (Bearer token) |

---

## Minimum viable configuration

To get the app running with core features:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI — embeddings: GOOGLE_GENERATIVE_AI_API_KEY and/or AI_GATEWAY_API_KEY (see AI / LLM Providers above)
GOOGLE_GENERATIVE_AI_API_KEY="..."
# AI_GATEWAY_API_KEY="..."          # optional: Gateway for chat + embeddings
# ANTHROPIC_API_KEY="..."            # optional chat path per get-model.ts

# Email
RESEND_API_KEY="re_..."
RESEND_FROM="onboarding@resend.dev"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App URL
NEXT_PUBLIC_URL="http://localhost:3000"

# Cron — set in production so Vercel and secured routes reject anonymous hits (see TECHNICAL_IMPLEMENTATION_GUIDE §4)
CRON_SECRET="..."
```

Everything else unlocks additional features progressively — add services as you need them.
