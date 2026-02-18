# QA Plan: User Journey 1 — New User Onboarding

**Scope:** `/login` and Company Setup (see note on routes below)  
**Last updated:** 2025-02-18

---

## Route note

- **Sign In:** `/login` ✅
- **Company Setup:** The app uses **`/dashboard/content-library`** for first-run setup, not a dedicated `/company-setup` page. The route `/dashboard/company-setup` exists but **redirects** to `/dashboard/content-library`. The “wizard” behavior is implemented as:
  - **Content Library page** when `getCompanySetupState()` returns `needs_company_info` or `needs_content` → shows **CompanyBasicInfoForm** (single form that saves company info and starts smart import).
  - A separate **CompanySetupWizard** component (3-step, progress, review) exists in code but is **not used** anywhere; the live flow is the form above.

---

## 2.1 Sign In Page (`/login`)

| # | Requirement | Status | Notes / TODO |
|---|-------------|--------|----------------|
| **What the user sees** |
| 1 | AgentPilot logo and tagline | ✅ Pass | Logo + “AgentPilot” in `app/login/page.tsx`. Tagline: “Sign in to AgentPilot” / “Continue with your Google account…”. |
| 2 | Email + password fields, or SSO option | ⚠️ Partial | **SSO only:** Google sign-in only. No email/password form. **TODO:** Add email/password (or document that auth is Google-only). |
| 3 | “Sign up” link for new accounts | ⚠️ Partial | No explicit “Sign up” — “New to AgentPilot? Book a demo” links to `/#cta`. New users create account via “Continue with Google”. **TODO:** Add a clear “Sign up” link (e.g. to same Google flow with copy “Create account”) or confirm “Book a demo” is intentional. |
| **What must work** |
| 4 | Successful login routes to `/dashboard` (not `/login`) | ✅ Pass | `callbackUrl` defaults to `/dashboard`; Auth.js redirects there after success. Session check on login page redirects to `callbackUrl` or `/dashboard`. |
| 5 | Failed login shows inline error — not a page redirect | ✅ Pass | NextAuth `pages: { error: '/login' }` sends errors to `/login?error=...`. Login page renders `params.error` in an inline red box (no full-page redirect for the error itself). |
| 6 | Magic link option (if enabled) sends email and shows confirmation state | ❌ TODO | No magic link / Email provider in `auth.ts`; only Google. **TODO:** If magic link is required: add Email provider (e.g. NextAuth Email), add “Send magic link” UI and “Check your email” confirmation state. |
| 7 | New account creation routes to Company Setup Wizard, not Dashboard | ✅ Pass | New users: Login → `/dashboard` → dashboard sees `contentLibraryTotal === 0` → redirect to `/dashboard/content-library`, which shows CompanyBasicInfoForm (setup). So new accounts effectively land in “setup” (content-library), not the main dashboard view. |

---

## 2.2 Company Setup Wizard (`/company-setup` → in app: `/dashboard/content-library`)

Current implementation: **Content Library** page with **CompanyBasicInfoForm** when state is `needs_company_info` or `needs_content`. No dedicated “1 of 3” wizard in the live flow.

| # | Requirement | Status | Notes / TODO |
|---|-------------|--------|----------------|
| **What the user sees** |
| 1 | Step 1 — Company basics: Company name, website URL, industry | ✅ Pass | CompanyBasicInfoForm: company name, website, your industry, primary industry you sell to, refresh schedule. |
| 2 | Step 2 — Load content: Scrape URL, scrape full site, or upload file (PDF, DOCX) | ⚠️ Partial | One path: “Save & Start Smart Import” (scrape site from company website). Links “Upload Files”, “Add Specific URLs”, “Enter Text” go to content-library but don’t complete “Step 2” in a linear wizard. **TODO:** Either expose a clear Step 2 with: scrape single URL / scrape full site / upload file, or document current “smart import only” as intended. |
| 3 | Step 3 — Confirm: Summary of what was imported, CTA to go to Dashboard | ⚠️ Partial | No dedicated “Step 3” summary. After submit, `startSmartImport()` runs in background; `router.refresh()` shows Content Library. CompanySetupWizard (unused) has a proper “Setup complete!” + summary + CTA. **TODO:** Add a post-import “Step 3” summary (e.g. “X items imported”) and explicit CTA to Dashboard / first target company. |
| **What must work** |
| 4 | Progress indicator shows current step (1 of 3) | ❌ TODO | No step indicator in CompanyBasicInfoForm. **TODO:** Add a progress indicator (e.g. “Step 1 of 3”) and, if restoring a multi-step flow, show step 2 and 3. |
| 5 | Scraping a URL triggers Firecrawl and shows a loading state — not a blank screen | ⚠️ Partial | Smart import runs in background via `executeImportInBackground`. Form shows “Saving…” then refresh; no in-page “Scraping…” or progress bar. **TODO:** After “Save & Start Smart Import”, show a loading state (e.g. “Importing content from your site…”) and optionally poll `getImportProgress(importId)` until done, then show review or success. |
| 6 | Scraped content appears in a review panel before the user confirms | ❌ TODO | CompanyBasicInfoForm does not show a review step. CompanySetupWizard has a review step but is unused. **TODO:** After import completes, show a review panel (list of scraped items with select/deselect) and “Confirm” / “Add to library” before marking setup complete. |
| 7 | User can skip Step 2 and add content later | ❌ TODO | Form has no “Skip” for content. Submit always runs smart import. **TODO:** Add “Skip for now” / “Add content later” that saves company info only and lands user on Dashboard or Content Library with empty state. |
| 8 | On completion, user lands on Dashboard with a prompt to add their first target company | ⚠️ Partial | After refresh, user stays on content-library (ContentLibraryView). Dashboard has “add first target” CTA when no companies. **TODO:** Optionally redirect to `/dashboard` after setup completion so user sees “add first target company” immediately; or add that prompt on content-library success state. |
| 9 | Returning users never see this wizard — it should not appear after setup is complete | ✅ Pass | `getCompanySetupState()` returns `ready` when user has company info and content; content-library then renders ContentLibraryView only. Returning users do not see CompanyBasicInfoForm. |

---

## Summary: TODOs

1. **Login**
   - Add or document email/password vs Google-only.
   - Clarify or add “Sign up” link for new accounts.
   - If magic link is required: add Email provider and “Send magic link” + confirmation state.

2. **Company Setup (content-library flow)**
   - Add progress indicator (e.g. “Step 1 of 3”) and optional Steps 2–3 UI.
   - Expose clear Step 2 options: scrape URL / full site / upload file (or document smart import only).
   - After scrape: show loading state (and optionally progress) instead of only “Saving…” + refresh.
   - Add review panel for scraped content before confirming.
   - Add “Skip Step 2 / Add content later” so user can save company info only.
   - Add post-completion summary and CTA to Dashboard / first target company (or redirect to dashboard).

3. **Optional**
   - Consider restoring a dedicated `/company-setup` (or `/dashboard/company-setup`) that uses **CompanySetupWizard** (3 steps, progress, review) for a clearer first-run journey, and keep content-library for “add more content” and settings.

---

## How to run QA

- **Login:** Open `/login`, test Google sign-in (success → `/dashboard` or callbackUrl), trigger error (e.g. OAuthAccountNotLinked) and confirm inline error on same page.
- **New user flow:** Use a new Google account (or clear content for test user), sign in, confirm redirect to `/dashboard/content-library` and CompanyBasicInfoForm; complete form and confirm behavior vs table above.
- **Returning user:** With existing user that has company info + content, open `/dashboard/content-library` and confirm ContentLibraryView only (no setup form).
