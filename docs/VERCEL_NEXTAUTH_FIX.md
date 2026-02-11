# Fix NextAuth 404 on Vercel

## The Problem

NextAuth is rejecting requests because:
- `NEXTAUTH_URL` is set to: `https://revenue-agents.vercel.app/`
- But Vercel preview URLs are: `revenue-agents-fhz2ccy59-stradexais-projects.vercel.app`
- These don't match, causing 404 errors

## The Solution

We have `trustHost: true` in `auth.ts`, which should fix this. But you also need to:

### Option 1: Remove NEXTAUTH_URL (Recommended)

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. **Delete** `NEXTAUTH_URL` (or leave it unset)
3. NextAuth will auto-detect from `VERCEL_URL` system variable

### Option 2: Set NEXTAUTH_URL Dynamically

If you need to keep it, set it to:
```
https://revenue-agents.vercel.app
```
(Without trailing slash, and only for production)

For preview deployments, NextAuth will use `trustHost: true` to auto-detect.

## Current Configuration

✅ `trustHost: true` is set in `auth.ts`
✅ This allows NextAuth to work with Vercel's preview URLs
✅ NextAuth will trust the `x-forwarded-host` header from Vercel

## After Fixing

1. Remove or update `NEXTAUTH_URL` in Vercel
2. Redeploy (or wait for next push)
3. The app should load correctly on both production and preview URLs
