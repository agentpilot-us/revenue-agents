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

### 4. Set Up Stripe

1. Create products in Stripe dashboard:
   - "Revenue Agents Pro - Monthly" ($499/month)
   - "Revenue Agents Pro - Annual" ($4,990/year)
2. Copy Price IDs to `.env.local`
3. Set up webhook endpoint in Stripe:
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

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
│   ├── layout.tsx          # Root layout with Navbar/Footer
│   ├── page.tsx            # Landing page
│   ├── pricing/
│   │   └── page.tsx        # Pricing page
│   ├── portal/
│   │   └── page.tsx        # Customer dashboard
│   └── api/
│       ├── stripe/
│       │   ├── create-checkout/route.ts
│       │   └── webhook/route.ts
│       └── github/
│           └── invite/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── PricingPage.tsx    # Full pricing UI with checkout
├── lib/
│   ├── db.ts               # Prisma client
│   ├── stripe.ts           # Stripe client
│   └── github.ts           # GitHub Octokit client
└── prisma/
    └── schema.prisma       # Database schema
```

## Features

- ✅ Landing page with hero section and social proof
- ✅ Pricing page with monthly/annual toggle
- ✅ Stripe Checkout integration
- ✅ Webhook handling for subscription events
- ✅ GitHub organization invitation automation
- ✅ Customer portal (basic implementation)
- ✅ Responsive design with Tailwind CSS

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

See `.env.local.example` for all required variables.
