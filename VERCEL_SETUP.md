# Vercel Setup Guide

## Link to Your Vercel Project

Your project is at: https://vercel.com/stradexais-projects/revenue-agents-hktv

## Steps to Pull Environment Variables

### 1. Login to Vercel (if not already logged in)

```bash
cd ~/devgirl/revenue-agents
vercel login
```

This will open a browser window for authentication.

### 2. Link to Your Project

```bash
vercel link
```

When prompted:
- **Select scope:** `stradexais-projects`
- **Select project:** `revenue-agents-hktv`

Or link directly:
```bash
vercel link --project=revenue-agents-hktv --scope=stradexais-projects
```

### 3. Pull Environment Variables

```bash
vercel env pull .env.local
```

This will:
- Download all environment variables from your Vercel project
- Merge them into your `.env.local` file
- Preserve any existing local values

### 4. Verify

Check that your `.env.local` file has been updated:

```bash
cat .env.local | grep -v "^#" | head -20
```

## What This Will Pull

All environment variables from your Vercel project, including:
- `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`
- `PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`
- `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
- And any other variables you've set in Vercel

## After Pulling Variables

You'll still need to add the NEW variables manually:
- Stripe keys (from Stripe dashboard)
- Stripe Price IDs
- GitHub token and organization details
- `NEXT_PUBLIC_URL` (your Vercel deployment URL)

## Troubleshooting

**If `vercel link` doesn't find your project:**
- Make sure you're logged in: `vercel login`
- Check you have access to the `stradexais-projects` team
- Try: `vercel projects ls` to see available projects

**If environment variables aren't pulling:**
- Make sure the project is linked: `vercel project ls`
- Check Vercel dashboard to ensure variables are set
- Try: `vercel env ls` to see available variables

