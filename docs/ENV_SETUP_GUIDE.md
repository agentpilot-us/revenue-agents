# Environment Variables Setup Guide

## Current Status

✅ `.env.local` file created from template

## What You Need to Fill In

### 1. Existing Environment Variables (from your Vercel project)

If you have these in your Vercel dashboard, copy them to `.env.local`:

**Auth:**
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (use `http://localhost:3000` for local dev)

**OAuth:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Database:**
- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` (this is what Prisma uses)
- `PGHOST`
- `PGUSER`
- `PGDATABASE`
- `PGPASSWORD`

**API Keys:**
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

### 2. NEW Variables to Add

**Stripe (Required for payments):**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your API keys from Developers → API keys
3. Add to `.env.local`:
   - `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)

4. Create products in Stripe:
   - Product 1: "Revenue Agents Pro - Monthly"
     - Price: $499/month (recurring)
     - Copy the Price ID (starts with `price_`)
     - Add as: `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY`
   
   - Product 2: "Revenue Agents Pro - Annual"
     - Price: $4,990/year (recurring)
     - Copy the Price ID
     - Add as: `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL`

5. Set up webhook:
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy webhook signing secret (starts with `whsec_`)
   - Add as: `STRIPE_WEBHOOK_SECRET`

**GitHub (Required for organization invitations):**
1. Create GitHub organization: `agentpilot-pro`
2. Create private repository: `blueprints`
3. Create team: "Active Subscribers" with read access
4. Generate personal access token:
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Create token with `admin:org` scope
   - Copy token (starts with `ghp_`)
   - Add as: `GITHUB_TOKEN`
5. Get team ID:
   - Use GitHub API: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/orgs/agentpilot-pro/teams`
   - Or check in GitHub organization settings
   - Add as: `GITHUB_TEAM_ID` (numeric value)
6. Add to `.env.local`:
   - `GITHUB_ORG=agentpilot-pro`
   - `GITHUB_TEAM_ID=123456` (your actual team ID)

**Public URL:**
- `NEXT_PUBLIC_URL=http://localhost:3000` (for local dev)
- For production, use your Vercel URL: `https://your-app.vercel.app`

## Quick Setup Commands

```bash
# Edit the .env.local file
nano .env.local
# or
code .env.local
# or
open -e .env.local
```

## Verification

After filling in all variables, verify with:

```bash
# Check if required variables are set (won't show values for security)
node -e "require('dotenv').config({path:'.env.local'}); console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING'); console.log('POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL ? 'SET' : 'MISSING');"
```

## Next Steps After Setup

1. ✅ Fill in all environment variables
2. Run: `npx prisma generate`
3. Run: `npx prisma migrate dev --name init`
4. Test: `npm run dev`

## Important Notes

- Never commit `.env.local` to git (it's in `.gitignore`)
- Use test keys (`sk_test_`, `pk_test_`) for development
- Switch to live keys (`sk_live_`, `pk_live_`) for production
- The `NEXT_PUBLIC_*` variables are exposed to the browser, so only use them for non-sensitive values

