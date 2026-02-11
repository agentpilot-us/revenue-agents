# Quick Setup Guide

## ✅ Project Created Successfully!

Your Revenue Agents subscription platform is ready at:
```
~/devgirl/revenue-agents
```

## 🚀 Next Steps

### 1. Set Up Environment Variables

```bash
cd ~/devgirl/revenue-agents
cp .env.local.example .env.local
```

Then edit `.env.local` and add:
- Your existing Vercel environment variables (AUTH_SECRET, DATABASE_URL, etc.)
- Stripe keys (from Stripe dashboard)
- GitHub token and organization details
- `NEXT_PUBLIC_URL` (your deployment URL)

### 2. Set Up Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Set Up Stripe

1. Go to Stripe Dashboard → Products
2. Create two products:
   - "Revenue Agents Pro - Monthly" ($499/month recurring)
   - "Revenue Agents Pro - Annual" ($4,990/year recurring)
3. Copy the Price IDs to `.env.local` as:
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY`
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL`
4. In Stripe Dashboard → Webhooks, add endpoint:
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
5. Copy webhook secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 4. Set Up GitHub

1. Create organization: `agentpilot-pro`
2. Create private repo: `blueprints`
3. Create team: "Active Subscribers" with read access
4. Generate personal access token with `admin:org` scope
5. Get team ID (from GitHub API or settings)
6. Add to `.env.local`:
   - `GITHUB_TOKEN`
   - `GITHUB_ORG=agentpilot-pro`
   - `GITHUB_TEAM_ID`

### 5. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy!

## 📁 Project Structure

All files have been created:
- ✅ Prisma schema with User model
- ✅ API routes for Stripe checkout and webhook
- ✅ GitHub invitation API
- ✅ Landing page
- ✅ Pricing page with checkout form
- ✅ Customer portal
- ✅ Navbar and Footer components
- ✅ Utility libraries (Stripe, GitHub, DB)

## 🎯 Features Implemented

- Landing page with hero and social proof
- Pricing page with monthly/annual toggle
- Stripe Checkout integration
- Webhook handling for subscriptions
- GitHub organization invitation automation
- Customer portal (basic)
- Responsive Tailwind CSS design

## 📝 Notes

- Authentication is set up but not fully implemented (you can add NextAuth.js later)
- Portal page shows placeholder data (add auth to fetch real user data)
- All environment variables are documented in `.env.local.example`

## 🐛 Troubleshooting

**Database connection issues:**
- Verify `POSTGRES_PRISMA_URL` is correct
- Run `npx prisma generate` after schema changes

**Stripe checkout not working:**
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Check browser console for errors
- Verify Price IDs are correct

**GitHub invitations not sending:**
- Verify `GITHUB_TOKEN` has `admin:org` scope
- Check `GITHUB_ORG` and `GITHUB_TEAM_ID` are correct
- Verify user exists on GitHub

---

**Ready to go!** Follow the steps above to get your subscription platform running. 🚀

