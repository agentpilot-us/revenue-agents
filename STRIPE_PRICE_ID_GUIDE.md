# Stripe Price ID Format Guide

## Format

Stripe Price IDs follow this format:
```
price_<alphanumeric_string>
```

**Examples:**
- `price_1AbCdEfGhIjKlMnOpQrStUvW` (test mode)
- `price_1234567890abcdefghijklmn` (live mode)

## Where to Get Price IDs

1. **Stripe Dashboard** → **Products**
2. Click on your product (e.g., "Revenue Agents Pro - Monthly")
3. Under "Pricing", you'll see the Price ID
4. Click the copy icon to copy it

## How to Set in Your Project

### In `.env.local` (Local Development):
```bash
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_1AbCdEfGhIjKlMnOpQrStUvW
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL=price_1XyZaBcDeFgHiJkLmNoPqRsTu
```

### In Vercel (Production):
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY` = `price_...` (your monthly price ID)
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL` = `price_...` (your annual price ID)

## Important Notes

1. **Test vs Live Mode:**
   - Test mode IDs start with `price_` and work with test API keys
   - Live mode IDs also start with `price_` but work with live API keys
   - Make sure your Stripe keys match the mode (test keys for test prices, live keys for live prices)

2. **No Formatting Needed:**
   - Just copy the ID directly from Stripe
   - No need to add quotes or modify it
   - Use it exactly as Stripe provides it

3. **In Your Code:**
   ```typescript
   // In create-checkout/route.ts
   const session = await stripe.checkout.sessions.create({
     line_items: [
       {
         price: priceId, // Just pass the ID directly
         quantity: 1,
       },
     ],
   });
   ```

## Current Usage in Your Code

Your code uses price IDs in:
- `components/PricingPage.tsx` - Gets price IDs from env vars
- `app/api/stripe/create-checkout/route.ts` - Uses price ID to create checkout session
- `app/api/stripe/webhook/route.ts` - Stores price ID in purchase records

## Example Setup

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_1AbCdEfGhIjKlMnOpQrStUvW
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL=price_1XyZaBcDeFgHiJkLmNoPqRsTu
```

That's it! No special formatting needed - just use the ID exactly as Stripe provides it.
