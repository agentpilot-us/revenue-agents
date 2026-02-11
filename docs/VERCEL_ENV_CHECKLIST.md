# Vercel Environment Variables Checklist

## ✅ Required for Build (prisma generate)

These MUST be set in Vercel for the build to succeed:

- `POSTGRES_PRISMA_URL` - Required by prisma.config.ts during `prisma generate`
- `POSTGRES_URL` - May be needed for migrations (if you run them)

## ✅ Required for Runtime

These are needed when your app runs:

- `POSTGRES_PRISMA_URL` - Database connection (pooled)
- `POSTGRES_URL` - Direct connection (if needed)
- `DATABASE_URL` - Fallback connection string
- `AUTH_SECRET` / `NEXTAUTH_SECRET` - Authentication
- `NEXTAUTH_URL` - Your Vercel deployment URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `STRIPE_SECRET_KEY` - Stripe API
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY` - Monthly price ID
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL` - Annual price ID
- `GITHUB_TOKEN` - GitHub API token
- `GITHUB_ORG` - GitHub organization name
- `GITHUB_TEAM_ID` - GitHub team ID
- `NEXT_PUBLIC_URL` - Your Vercel deployment URL

## How to Verify in Vercel

1. Go to: https://vercel.com/stradexais-projects/revenue-agents
2. Click **Settings** → **Environment Variables**
3. Verify `POSTGRES_PRISMA_URL` exists and is set for:
   - ✅ Production
   - ✅ Preview (optional but recommended)
   - ✅ Development (optional)

## Why This Works

- `prisma generate` reads `prisma/schema.prisma` (no DB connection needed)
- `prisma.config.ts` references `POSTGRES_PRISMA_URL` but doesn't connect during generation
- Vercel injects environment variables during build time
- As long as `POSTGRES_PRISMA_URL` is set in Vercel, the build will succeed ✅

## If Build Fails

If you see: `Error: Environment variable not found: POSTGRES_PRISMA_URL`

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `POSTGRES_PRISMA_URL` with your Neon connection string
3. Make sure it's enabled for **Production** environment
4. Redeploy
