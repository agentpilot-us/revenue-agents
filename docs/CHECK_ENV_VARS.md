# Checking Environment Variables in Vercel

## Issue
Database variables were added to Vercel but aren't downloading with `vercel env pull`.

## Possible Reasons

1. **Variables are set for specific environments only**
   - Check if variables are set for "Production", "Preview", or "Development"
   - `vercel env pull` by default pulls from "development" environment
   - Variables might only be set for "production"

2. **Variables are in a different project**
   - Verify you're looking at the correct project: `revenue-agents-hktv`
   - Check the project ID matches

3. **Variables need to be verified in dashboard**
   - Go to: https://vercel.com/stradexais-projects/revenue-agents-hktv/settings/environment-variables
   - Verify the variables are actually saved there

## How to Check in Vercel Dashboard

1. Go to: https://vercel.com/stradexais-projects/revenue-agents-hktv/settings/environment-variables
2. Check which environments have variables:
   - Production
   - Preview  
   - Development
3. Make sure variables are set for at least "Development" (for local dev)

## How to Pull from Specific Environment

```bash
# Pull from production
vercel env pull .env.local --environment=production

# Pull from preview
vercel env pull .env.local --environment=preview

# Pull from development (default)
vercel env pull .env.local --environment=development
```

## Alternative: Add Variables via CLI

If variables aren't showing, you can add them via CLI:

```bash
# Add a variable for development environment
vercel env add DATABASE_URL development

# Add for all environments
vercel env add DATABASE_URL production preview development
```

## Manual Check

You can also manually check what's in Vercel by:
1. Opening the dashboard
2. Going to Settings → Environment Variables
3. Taking a screenshot or listing what you see
4. Then we can help add them via CLI or manually to .env.local

