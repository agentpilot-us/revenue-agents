# Landing Page: Demo & “See How It Works” Plan

## Current behavior

| Element | Current target | Notes |
|--------|----------------|-------|
| **Book a Demo** (nav) | `#cta` | Scrolls to bottom CTA section |
| **Book a 15-Min Demo →** (hero) | `#cta` | Same |
| **See How It Works** (hero) | `#how` | Scrolls to “How It Works” 4-step section ✓ |
| **Book a 15-Min Demo** (bottom CTA) | `#cta` | Self-link (no external URL) |

---

## 1. Where and how to put the demo

### Option A (recommended): External booking URL (Cal.com / Calendly / etc.)

- **Where:** Use your existing Cal.com (or similar) “book a meeting” page.
- **How:**
  - Set **`NEXT_PUBLIC_DEMO_BOOKING_URL`** in `.env.local` (and in Vercel/hosting env) to your public booking page, e.g.  
    `https://cal.com/your-username/15min` or `https://calendly.com/your-team/demo`.
  - The marketing page (client component) reads this and uses it for every “Book a Demo” / “Book a 15-Min Demo” link.
- **Fallback:** If the env var is not set, keep current behavior: link to `#cta` so users scroll to the bottom CTA (you can later add a form or another CTA there).

**Code:** In `app/page.tsx`, set:

```ts
const demoUrl = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL || process.env.NEXT_PUBLIC_CAL_BOOKING_URL || '#cta';
```

Use `demoUrl` for all “Book a Demo” / “Book a 15-Min Demo” buttons (nav, hero, bottom CTA).  
Optional: add `NEXT_PUBLIC_DEMO_BOOKING_URL` to `.env.example` with a short comment.

### Option B: In-app demo page

- **Where:** e.g. `/demo` or `/book-demo`.
- **How:** Create a page that embeds Cal.com/Calendly iframe or a simple form that submits to your CRM/sales team. Then set `demoUrl` to `/demo` (or `/book-demo`).
- **Use when:** You want a branded wrapper, extra copy, or a form instead of redirecting straight to Cal/Calendly.

### Option C: Keep scroll-only (no external demo yet)

- Leave `demoUrl = '#cta'`. All demo buttons scroll to the bottom section.
- Later you can add a real booking link or form in the CTA section and point the buttons there or to an external URL.

---

## 2. What “See How It Works” should go to

**Recommendation: keep `#how`** (current behavior).

- **`#how`** = “How It Works” section on the same page (4 steps: AI learns your product → 1-click research → personalized pages & chat → analytics & alerts). This is the clearest “how it works” story.
- **Alternatives** (if you prefer):
  - **`#use-cases`** – “In Practice” / use-case tabs (Enterprise AE vs Mid-Market AE).
  - **`#platform`** – Platform capabilities section.
  - A separate page (e.g. `/how-it-works`) if you want a long-form page; then use `href="/how-it-works"` instead of `#how`.

No code change needed for “See How It Works” unless you switch to one of the alternatives above.

---

## 3. Summary

| Item | Recommendation |
|------|----------------|
| **Demo** | Use **Option A**: env-based booking URL (`NEXT_PUBLIC_DEMO_BOOKING_URL` or `NEXT_PUBLIC_CAL_BOOKING_URL`), fallback `#cta`. |
| **See How It Works** | Keep linking to **`#how`** (same-page “How It Works” section). |

After setting the env var and updating `demoUrl` in `app/page.tsx`, all “Book a Demo” / “Book a 15-Min Demo” links will open your real booking page when the var is set, and still scroll to `#cta` when it is not.
