# Testing Guide for Revenue Agents Integration

## Prerequisites

1. **Environment Variables** ✅
   - All GitHub team variables are set in `.env.local`
   - Stripe keys should be configured

2. **Stripe CLI** (for webhook testing)
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

## Step 1: Test GitHub Invitation Manually

Test if GitHub invitations work:

```bash
# Test with your GitHub username
node test-github-invite.js YOUR_GITHUB_USERNAME
```

Expected output:
- ✅ Success! User invited to team.
- Or ❌ Error with details

## Step 2: Start Development Server

```bash
npm run dev
```

Server will start at: http://localhost:3000

## Step 3: Test Stripe Webhook (Option A - Stripe CLI)

In a **new terminal**, start Stripe webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Show webhook events in real-time
- Forward test events to your local server
- Display webhook signing secret (use this for `STRIPE_WEBHOOK_SECRET` in `.env.local`)

## Step 4: Test Checkout Flow

1. Visit: http://localhost:3000/pricing
2. Fill in:
   - Email: your-email@example.com
   - GitHub Username: your-github-username
3. Click "Start 14-Day Free Trial"
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

## Step 5: Verify Webhook Processing

Watch the terminal running `stripe listen` for:
- `checkout.session.completed` event
- Check your server logs for:
  - ✅ User created/updated
  - ✅ Purchase record created
  - ✅ GitHub invitation sent

## Step 6: Verify Database

Check that records were created:

```bash
# If you have a database client or can run Prisma Studio
npx prisma studio
```

Look for:
- New user record with email
- New purchase record with productCategory
- Purchase record should have `githubTeamAdded` field populated

## Step 7: Verify GitHub Invitation

1. Check your GitHub email for invitation
2. Or check the organization: https://github.com/orgs/agentpilot-pro/people
3. User should be invited to the appropriate team

## Troubleshooting

### GitHub Invitation Fails
- Check `GITHUB_TOKEN` has `admin:org` scope
- Verify team slug exists in GitHub org
- Check organization name matches `GITHUB_ORG`

### Webhook Not Receiving Events
- Make sure Stripe CLI is running: `stripe listen`
- Check webhook URL is correct: `localhost:3000/api/stripe/webhook`
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen`

### Database Errors
- Run `npx prisma generate` to ensure Prisma Client is up to date
- Check database connection string in `.env.local`
- Verify database is accessible

### Checkout Not Working
- Verify Stripe keys are test keys (start with `pk_test_` and `sk_test_`)
- Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set

## Test Cards

Stripe provides test cards for different scenarios:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

## Next Steps After Testing

1. ✅ Verify GitHub invitations work
2. ✅ Verify purchase records are created
3. ✅ Verify users are added to correct teams
4. Deploy to Vercel
5. Set up production Stripe webhook
6. Test with real Stripe account
