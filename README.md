# Revenue Agents Subscription Platform

A Next.js 14 subscription platform for Revenue Agents - selling Agentforce blueprint packages with Stripe integration and GitHub access management.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Prisma
- **Payments:** Stripe
- **Auth:** NextAuth.js (configured but not fully implemented)
- **GitHub Integration:** Octokit for organization invitations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

**Important:** Use your existing environment variables from Vercel for:
- `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`
- `PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`
- `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

**Add new variables:**
- Stripe keys (from Stripe dashboard)
- GitHub token and organization details
- `NEXT_PUBLIC_URL` (your deployment URL)

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 4. Stripe (optional for MVP)

Payment (Stripe Checkout/webhook) is not wired for MVP. See [`docs/STRIPE_PRICE_ID_GUIDE.md`](docs/STRIPE_PRICE_ID_GUIDE.md) when re-enabling.

### 5. Set Up GitHub

1. Create GitHub organization: `agentpilot-us` (or use existing)
2. Create private repository: `blueprints`
3. Create team: "Active Subscribers" with read access
4. Generate personal access token with `admin:org` scope
5. Get team ID from GitHub API or settings
6. Add to `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # Landing page
│   ├── plays/page.tsx     # Play selection (Expansion, Partner, Referral)
│   ├── chat/page.tsx       # Chat UI (?play=expansion&accountId=…)
│   ├── dashboard/          # Companies, messaging, settings
│   ├── pricing/            # Pricing page
│   ├── portal/             # Customer dashboard
│   └── api/
│       ├── auth/           # NextAuth
│       ├── chat/route.ts   # Single chat route (playId, accountId)
│       ├── webhooks/resend/, webhooks/cal/
│       ├── cron/calculate-engagement/
│       └── messaging-frameworks/
├── lib/
│   ├── db.ts               # Prisma client
│   ├── tools/              # Resend, Clay, PhantomBuster, Cal, Perplexity, Firecrawl
│   ├── plays/              # Expansion, Partner, Referral configs
│   └── engagement/         # Engagement scoring
├── docs/                   # All setup and reference docs (see below)
└── prisma/schema.prisma
```

**Documentation** is in the [`docs/`](docs/) folder: setup, database, env vars, Vercel, testing, troubleshooting, etc.

## Features

- ✅ Landing page with hero section and social proof
- ✅ Pricing page with monthly/annual toggle
- ✅ Stripe Checkout integration
- ✅ Webhook handling for subscription events
- ✅ GitHub organization invitation automation
- ✅ Customer portal (basic implementation)
- ✅ Responsive design with Tailwind CSS
- ✅ Account Intelligence & Expansion Enhancements (v1.1)
  - Account Map view for strategic "who's who" per account
  - Expansion Canvas for visualizing growth opportunities
  - Signal Tiers & Digest View for prioritized account activity
  - Champion-led and exec-level expansion plays

## What Lives Where

**AgentPilot is the strategic workbench:**
- Intelligence: buying groups, contacts, engagement, signals
- Expansion: microsegments, pages, plays

**CRM is the ledger (optional sync v2+):**
- Stages, pipeline values, ownership

## Deployment

1. Push to GitHub
2. Deploy to Vercel
3. Add all environment variables in Vercel dashboard
4. Configure Stripe webhook URL in Stripe dashboard
5. Run database migrations: `npx prisma migrate deploy`

## Next Steps

- [ ] Add authentication (NextAuth.js)
- [ ] Implement user session management
- [ ] Add subscription management UI
- [ ] Add email notifications (Resend)
- [ ] Add analytics
- [ ] Add error tracking

## Environment Variables Reference

See `.env.local.example` for required variables. Detailed guides: [`docs/ENV_SETUP_GUIDE.md`](docs/ENV_SETUP_GUIDE.md), [`docs/CHECK_ENV_VARS.md`](docs/CHECK_ENV_VARS.md).
