---
name: ""
overview: ""
todos: []
isProject: false
---

# Authentication, demo orgs, waitlist, and invite-only access

---

## Decision: Option A (separate Gmail accounts)

- **Use separate Gmail accounts per demo vertical** (e.g. `agentpilot.demo.nvidia@gmail.com`, `agentpilot.demo.pharma@gmail.com`) — real accounts, not plus-aliases.
- **Add each as a Test user** in Google Cloud Console (OAuth consent screen) while the app is in Testing mode.
- **Zero code changes.** Each account gets a separate User and completely isolated data.

Gmail plus-addresses (`you+nvidia@gmail.com`) do **not** create separate Google accounts; Google returns the same `providerAccountId` for all aliases. So plus-addresses cannot be used for isolated demo environments on a single Gmail.

---

## Google Testing mode: 100-user lifetime cap

- The **100-user cap in Testing mode is lifetime** — not per month and not reset.
- If prospects log in to try the product, you burn through that cap quickly.
- **Sequence:** Add privacy policy → **publish the app** → then use as many Google accounts as needed with no cap. Do not build the demo workflow around staying in Testing mode.

---

## Roadmap: Option B (Workspace model)

- **Do not build the Workspace layer now.** It’s a medium-to-large change (schema migration, backfill, every route/findMany, auth/session). Save it for after you have paying customers.
- **Roadmap item:** Workspace model → enables team accounts, multiple demo orgs per user (e.g. “Demo: NVIDIA”, “Demo: Jazz Pharma” from one login), and eventually multi-seat access for enterprise. Right feature, wrong time.

---

## Current situation: Testing mode vs published

- **Testing mode:** Only emails you add as test users can log in — the most restrictive. Nobody signs up without your approval.
- **Once you publish the OAuth app:** Anyone with a Google account can sign in and create a free account with no billing gates. That creates two problems.

---

## Two problems to solve

**Problem 1: Non-Google users.** Some prospects use Microsoft/Outlook; some want email/password. Enterprise buyers often cannot use personal Google accounts for SaaS tools.

**Problem 2: Ungated access.** After publish, anyone can sign up and use the product without paying, without you knowing, and without usage controls.

---

## Solution: Waitlist + invite-only access

Do not open signup to everyone. Add a **gate between "can authenticate" and "can use the app."**

**Flow:**

1. Someone visits agentpilot.us → clicks **Request access** → submits email + company name → lands on **You're on the waitlist**.
2. You review and send an invite.
3. They click the invite link → create account (Google or email) → complete onboarding → they're in.

This solves both problems: auth provider does not matter because nobody gets past the waitlist without approval, and you get a natural conversation about pricing before they touch the product.

---

## What to build

### Step 1: Add email/magic-link auth alongside Google

- Use **Resend magic link** (Resend is already configured). Better than password for B2B: user enters email, gets a link, clicks it, done. No password to manage.
- In [auth.ts](auth.ts), add Resend provider alongside Google. NextAuth has a Resend provider or you use CredentialsProvider with a custom magic-link flow; if no official Resend provider, implement magic link via Resend API and verify token in CredentialsProvider.
- Result: Anyone with any email can sign in via magic link (non-Google solved).

### Step 2: Add account status and invite fields to User

```prisma
model User {
  accountStatus  String    @default("waitlist")  // waitlist | invited | active | suspended
  inviteToken    String?   @unique
  invitedAt      DateTime?
  activatedAt    DateTime?
  // ... existing fields
}
```

### Step 3: Gate the app on accountStatus

- In middleware or root/dashboard layout, after auth check:
  - `accountStatus === 'waitlist'` → redirect to `/waitlist-pending` (friendly "Thanks for your interest — we'll be in touch").
  - `accountStatus === 'invited'` → redirect to `/onboarding` (collect company info, confirm plan).
  - Only `active` (and optionally `suspended` with a different message) can access the dashboard.
- New signups (Google or magic link) land in `waitlist` and cannot access the app until you flip them.

### Step 4: Admin page to approve users

- At `/dashboard/admin/users` (behind same gate as demo setup, e.g. `ALLOW_DEMO_SETUP` or a dedicated `ALLOW_USER_ADMIN` env):
  - List waitlisted users (email, company name, requested at).
  - **Approve** button: send magic-link invite (or invite email with link containing `inviteToken`), set status to `invited`.
  - When they click the link and complete onboarding, set status to `active`, set `activatedAt`.

### Billing gates

- Do not build full billing before you have customers. Use **manual approval** as the gate: you approve → email/call → agree on terms → flip status to `active`. That is the billing process until you have enough customers for Stripe.
- When you add Stripe later, `accountStatus` is the hook: `active` can require an active subscription; the same middleware/layout check already exists.

---

## Build order (estimates)


| Step | Task                                                                                                                                  | Est.   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Add magic-link provider to NextAuth (Resend or custom with Resend API)                                                                | 30 min |
| 2    | Add `accountStatus`, `inviteToken`, `invitedAt`, `activatedAt` to User; migration                                                     | 10 min |
| 3    | Middleware or layout gate: redirect waitlist → `/waitlist-pending`, invited → `/onboarding`                                           | 20 min |
| 4    | Waitlist landing page at `/waitlist-pending`                                                                                          | 30 min |
| 5    | Replace login CTA for new users: "Request access" (→ waitlist form) instead of "Continue with Google"; keep Google for existing users | 30 min |
| 6    | Admin user-approval page at `/dashboard/admin/users` (list waitlisted, Approve → send invite, set invited)                            | 1 hr   |


**Total:** ~3.5 hours.

---

## Summary


| Item                      | Action                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Demo verticals today      | Create real Gmail accounts per vertical; add as Test users. No code change.                                  |
| Before demos to prospects | Publish app (privacy policy in place) so the 100-user cap does not apply.                                    |
| Waitlist + invite-only    | Add magic link auth, User.accountStatus, gate app, waitlist page, "Request access" CTA, admin approval page. |
| Billing                   | Manual approval until Stripe; accountStatus is the hook for future subscription check.                       |
| Later                     | Workspace model on roadmap for team accounts, multi-demo orgs, multi-seat.                                   |


