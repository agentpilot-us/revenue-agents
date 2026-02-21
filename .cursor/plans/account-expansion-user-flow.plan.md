---
name: Account Expansion User Flow
overview: "Guided user flow from company to shareable sales page: Account Intelligence page (research with real status, inline buying-group review, messaging), persistent Next Step bar (forward + complete + backwards), tab deep-linking, Content auto-generate, Sales Page live-on-create with undo, empty state, and error recovery per step."
todos: []
isProject: false
---

# Account Expansion User Flow (revised)

## Goal

Clear, linear path from **company name** to **shareable sales page URL**. Steps 1–4 on Account Intelligence; steps 5–8 on company tabs; a **Continue** bar connects them and handles forward progression, completion, and backwards navigation (user already ahead).

## Architecture

- **Steps 1–4**: One Account Intelligence page — research (with real status), inline review of buying groups, then generate messaging.
- **Steps 5–8**: Company page tabs — Find Contacts, Content, Sales Page, Share URL. Deep-link via `?tab=contacts`, `?tab=content`, `?tab=campaigns`.
- **Next Step bar**: Derived from data (no DB field). Shows next step when incomplete; shows "Your page is live" + Copy URL / View Analytics when done; shows current status (not forward prompt) when user is on a tab they’ve already completed.

---

## 1. Research: real status (not generic spinner)

**Problem**: Research takes 60–90s with two sequential calls (Perplexity then Claude). A generic spinner for 90s feels broken.

**Change**: Surface two real states from the existing sequential code:

- **"Researching [company name]..."** — when Perplexity is running.
- **"Analyzing buying groups..."** — when Claude is structuring the output.

**Where**: [ResearchButton.tsx](app/components/company/ResearchButton.tsx), one-click path in [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx). If the research API is a single POST today, split into two calls from the client (Perplexity first, then pass result to Claude) or add a lightweight status endpoint so the client can poll/subscribe. Prefer exposing existing sequence over a single black-box POST so the UI can show both states.

**Effort**: ~1 hour; significant UX improvement.

---

## 2. Inline review panel (replace modal for step 2)

**Problem**: ResearchReviewModal as the review surface creates a flow break — modal on top of a linear flow feels like an interruption. For one-click path, user doesn’t know if the modal is required or optional.

**Change**:

- **After research completes**: Show an **inline review panel** below the research area on the Intelligence page. List buying groups in place; user can edit inline (names, use cases, etc.) and clicks **"Looks good → Generate messaging"** (no modal).
- **Keep the modal** only as a "Re-open research" / "Review research again" option for users who want to revisit later (e.g. from Overview or a link on the Intelligence page).

**Where**: [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx) (new inline panel, state from research response), [ResearchReviewModal.tsx](app/components/company/ResearchReviewModal.tsx) (keep for re-open flow). Apply/save logic stays; trigger it from the inline "Looks good" CTA instead of modal Save.

---

## 3. Next Step bar: forward, complete, and backwards

**Problem**: Spec only defined forward progression. Users jump around (e.g. Sales Page before finding contacts, or regenerate messaging after a campaign is live). Bar must handle "you’re ahead of this step" and "all done."

**Change**:

- **Forward**: Next incomplete step — "Next: Find contacts" / "Next: Content" / "Next: Sales page" with **Continue →** to the right tab.
- **Complete**: When all steps are done (research, departments, messaging, at least one contact, content for at least one dept, at least one live campaign), bar becomes **"Your page is live"** with two CTAs: **Copy URL** and **View Analytics** (no forward prompt).
- **Backwards**: When user is on a tab they’ve already completed (e.g. on Contacts after launching a page), bar shows **current status** (e.g. "Contacts added", "Content ready") rather than pushing them to the next step. Optionally still show a small "Next: …" for the next step if there is one, but primary message is status.

**Where**: New component e.g. `NextStepBar.tsx` under [app/components/company/](app/components/company/). Company page passes derived flags: hasResearch, hasDepartments, hasMessaging, hasContacts, hasContent, hasCampaign; bar also receives current tab so it can choose "status" vs "next" vs "complete."

---

## 4. Tab URL support

**Change**: Support `?tab=contacts` and `?tab=content` in addition to `?tab=messaging` and `?tab=campaigns`. Enables deep linking, Continue buttons, and browser history.

**Where**: [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx) (set `initialTab` from `tabParam`), [CompanyTabs.tsx](app/components/company/CompanyTabs.tsx) (sync `activeTab` when these are passed).

---

## 5. Content: auto-generate on first open (Option B)

**Problem**: "Show a clear Generate email button" (Option A) is not materially different from today. Flow goal is reducing friction.

**Change**: When user has messaging and departments but **no content generated yet** for a department, on first open of Content tab (or when landing with `?tab=content`), **auto-generate email** for the first department and populate state. "Ensure generated once" logic: check if content rows exist for that department before triggering; if none, call content/generate for email, then load into state so copy is ready when they arrive.

**Where**: [ContentTab.tsx](app/components/company/ContentTab.tsx), [app/api/companies/[companyId]/content/route.ts](app/api/companies/[companyId]/content/route.ts) (GET already; use to decide whether to auto-generate). Optional: small API or client check "has any content for company" to avoid unnecessary generate calls.

---

## 6. Sales Page: live URL immediately, edit-after (opt-out approval)

**Problem**: generate-draft → approve-draft is two steps. If copy is already good (grounded in buying group messaging), required approval adds friction. Target: "URL is in my clipboard" at 7:00, not "I see the copy, then I confirm."

**Change**: Make the approval step **opt-out**, not required.

- **Generate draft** → create the campaign **live immediately** (or create in "preview" state that is publicly viewable with a slug).
- Show the new page with a **30-second "Undo"** window (e.g. "Undo launch" or "Revert to draft") similar to Notion/Linear. URL exists and can be copied right away.
- User can **edit copy after** launch from the campaign edit UI. No mandatory "approve" click before the URL works.

**Where**: [CampaignsTab.tsx](app/components/company/CampaignsTab.tsx), [app/api/companies/[companyId]/campaigns/generate-draft/route.ts](app/api/companies/[companyId]/campaigns/generate-draft/route.ts) and/or [approve-draft](app/api/companies/[companyId]/campaigns/approve-draft/route.ts). Option A: generate-draft creates the campaign as live and returns URL; add an "undo" that reverts to draft or deletes within 30s. Option B: approve-draft is called automatically after generate-draft with a short undo window in the UI. Ensure Copy URL is prominent and available as soon as the campaign is live.

---

## 7. Empty state on first load (Intelligence page)

**Problem**: Spec covered transitions but not what a brand new user sees on the Intelligence page before doing anything — often a blank or near-blank page with only a Research button.

**Change**: Add a short **guided empty state**:

- Under the company name (or at top of the main card), show **two sentences**: what will happen when they click Research (what to expect), how long it typically takes, and what they’ll have at the end (e.g. "We’ll research [company] and suggest buying groups. This usually takes about 2 minutes. You’ll then review segments and generate messaging.").
- Keeps first impression clear and sets expectations so the Research click feels intentional.

**Where**: [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx) (when `!hasResearch`, show this block above or beside the Research CTA).

---

## 8. Error recovery (new section)

**Problem**: Happy path is well-defined; one timeout or API failure with no recovery path can kill the flow. Each step needs a retry state and a fallback message that doesn’t feel like a crash.

**Change**: Add explicit **error states and retry** per step:


| Step                | Failure case                       | Recovery                                                                                                                             |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Research            | Perplexity fails / timeout         | Show message: "Research didn’t complete. [Retry] or try again in a few minutes." Do not leave a broken spinner.                      |
| Research            | Claude timeout / error             | Same: clear message + Retry. Optionally "Save what we have" if Perplexity data is stored and can be re-run through Claude later.     |
| Find Contacts       | PhantomBuster returns zero results | Message: "No contacts found for this group. Try a different buying group or add contacts manually." Link to manual add. No dead end. |
| Content generate    | API error                          | "Couldn’t generate copy. [Retry]." Keep existing content if any.                                                                     |
| Sales Page / launch | generate-draft or approve fails    | "Couldn’t create page. [Retry]." Preserve draft if created.                                                                          |


**Where**: Same files as each step (ResearchButton / AccountIntelligenceClient, FindContactsModal, ContentTab, CampaignsTab). Ensure every async path has catch + user-visible message + Retry or fallback action. No silent failures.

---

## 9. Visit tracking (verify)

**Where**: [lib/analytics/tracking.ts](lib/analytics/tracking.ts), [app/api/go/[id]/track/route.ts](app/api/go/[id]/track/route.ts), [app/api/analytics/engagement/route.ts](app/api/analytics/engagement/route.ts). Confirm landing page uses track API on load and analytics includes recent `CampaignVisit` (e.g. last 5–15 min). If not, add or fix.

---

## Implementation order (revised)

1. **Tab URL support** — unlocks deep linking and Continue targets.
2. **Real status text during research** — Perplexity state vs Claude state (expose from existing sequence).
3. **Replace research modal with inline review panel** on Intelligence page; keep modal for "re-open research."
4. **Next Step bar** — forward + complete + backwards states; mount on company page (and optionally Intelligence when steps 1–3 done).
5. **Content auto-generate** on first open when messaging exists and no content for department yet.
6. **Sales Page** — live URL immediately with 30s undo; edit-after.
7. **Error states and retry** per step (research, find contacts, content, sales page).
8. **Empty state** on Intelligence page (what to expect, how long, what you’ll have).
9. **Verify** visit tracking and analytics.

---

## File summary


| Area            | New                                       | Modified                                                                                                                                                                                                       |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research status | —                                         | Research flow (split or status API), [ResearchButton.tsx](app/components/company/ResearchButton.tsx), [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx) |
| Inline review   | Inline panel in AccountIntelligenceClient | [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx), [ResearchReviewModal.tsx](app/components/company/ResearchReviewModal.tsx) (re-open only)             |
| Next Step bar   | NextStepBar.tsx                           | [companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx)                                                                                                                                               |
| Tab URL         | —                                         | [CompanyTabs.tsx](app/components/company/CompanyTabs.tsx), [companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx)                                                                                    |
| Content         | —                                         | [ContentTab.tsx](app/components/company/ContentTab.tsx)                                                                                                                                                        |
| Sales Page      | —                                         | [CampaignsTab.tsx](app/components/company/CampaignsTab.tsx), campaigns generate-draft/approve-draft or equivalent                                                                                              |
| Empty state     | —                                         | [AccountIntelligenceClient.tsx](app/dashboard/companies/[id]/intelligence/AccountIntelligenceClient.tsx)                                                                                                       |
| Error recovery  | —                                         | ResearchButton, AccountIntelligenceClient, FindContactsModal, ContentTab, CampaignsTab                                                                                                                         |


