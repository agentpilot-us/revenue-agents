# AE Onboarding Guide — Gap Analysis

This document compares the **AE Onboarding Guide** (March 2026) to the current codebase. It lists **document gaps** (guide says something that doesn’t match the app) and **code gaps** (guide promises behavior the app doesn’t fully support).

---

## 1. My Day (Home Dashboard)

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **URL:** Open at `/dashboard` or click "My Day" | Dashboard is at `/dashboard` ([app/dashboard/page.tsx](app/dashboard/page.tsx)); nav can link there. | None |
| **Section 1: Weekly Stats Bar** — "emails sent, meetings booked, **plays completed** this week vs. last week" | [WeeklyStatsBar](app/components/dashboard/WeeklyStatsBar.tsx) shows: **Emails Sent**, **Replies**, **Contacts Found**, **Page Views**, **Meetings**, **Signals**. There is no "plays completed" metric. Momentum comes from [lib/dashboard/momentum.ts](lib/dashboard/momentum.ts). | **Doc:** Change to match actual metrics (e.g. "Emails Sent, Replies, Contacts Found, Page Views, Meetings, Signals") or add a "plays completed" metric in code if desired. |
| **Section 2: Hot Signals** — "relevance score (1–10). High-relevance (7+) by default; click 'Show more' for 4–6" | [HotSignalsFeed](app/components/dashboard/HotSignalsFeed.tsx) uses `minScore = showAll ? 4 : 7`; API ([app/api/dashboard/my-day/route.ts](app/api/dashboard/my-day/route.ts)) returns signals with `relevanceScore >= 4`. | None |
| **Section 2: "Dismiss"** — "marks the signal as seen" | [HotSignalsFeed](app/components/dashboard/HotSignalsFeed.tsx) calls `PATCH /api/signals/[signalId]/dismiss` with `status: 'seen'` ([app/api/signals/[signalId]/dismiss/route.ts](app/api/signals/[signalId]/dismiss/route.ts)). | None |
| **Section 2: Company Triggers** — "Send to X Accounts" bulk-creates PlayRuns | Triggers show matching accounts; "Send to X Accounts" creates runs. Implemented in HotSignalsFeed. | None |
| **Section 3: Needs Attention** — "Accounts that need action: **overdue play phases**, accounts with **no recent touch**, **at-risk signals**" | [NeedsAttentionCard](app/components/dashboard/NeedsAttentionCard.tsx) uses [api/dashboard/needs-attention](app/api/dashboard/needs-attention/route.ts) → `getNeedsAttentionContacts`. It shows **contact-level** flags: hot_lead, awaiting_reply, follow_up_due, over_emailed, gone_cold. Not account-level "overdue phases" or "at-risk signals." | **Doc:** Reword to "Contacts that need follow-up (e.g. awaiting reply, follow-up due, gone cold)" **or** extend the needs-attention API/UI to include overdue play phases and at-risk signals. |
| **Section 4: Action Queue** — "Work this" opens Play Run; "Skip" skips current action | MyDayDashboard `handleWorkThis` → `/dashboard/companies/${companyId}/plays/run/${runId}`; `handleSkipStep` PATCHes action status to SKIPPED. | None |
| **Section 5: "+ New Play"** — "opens the Play Catalog" | Button goes to `/dashboard/roadmap?play=custom` ([MyDayDashboard](app/components/dashboard/MyDayDashboard.tsx)). With **no** `companyId`, user sees the **company picker** first; after selecting a company, the roadmap page shows that account’s SAP with Plays tab and catalog/add-play mode. | **Doc:** Clarify flow: e.g. "Opens Strategic Account Plans; pick an account, then use the Plays tab to browse the Play Catalog and start a play." |
| **Section 5: "Start Campaign"** | CreateCampaignModal exists and is wired. | None |

---

## 2. Play Run Page

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **URL:** `/dashboard/companies/{companyId}/plays/run/{runId}` | Implemented in [app/dashboard/companies/[id]/plays/run/[runId]/page.tsx](app/dashboard/companies/[id]/plays/run/[runId]/page.tsx) and [PlayRunExecuteClient.tsx](app/dashboard/companies/[id]/plays/run/[runId]/PlayRunExecuteClient.tsx). | None |
| **Layout:** Play name, account name, status; "My Day" link; collapsible phases with actions | Client shows header with back link to company, play name, account, status, and "My Day" link to `/dashboard`. Phases are sections with actions; no collapsible UI (all visible). | **Minor doc:** "Collapsible" could be relaxed to "each phase is a section" if we don’t add collapse. |
| **Action cards:** Title, contact info, **cooldown warning (yellow)**, **alternate contact**, generated content preview, Generate / Send / Skip | All present. Cooldown uses amber styling; `cooldownWarning` and `alternateContact` from [lib/plays/cooldown-check.ts](lib/plays/cooldown-check.ts) applied in [app/api/play-runs/[runId]/route.ts](app/api/play-runs/[runId]/route.ts). | None |
| **"Edit if needed — the content is a draft... Your edits are saved."** | PATCH [app/api/play-runs/[runId]/actions/[actionId]/route.ts](app/api/play-runs/[runId]/actions/[actionId]/route.ts) supports `editedContent` and `editedSubject`. **PlayRunExecuteClient has no edit UI** — only a read-only preview (first 300 chars) and Generate / Send / Skip. | **Code:** Add inline edit (e.g. subject + body fields) and PATCH on blur or Save so the guide’s "edit and save" is deliverable. |
| **Generate → Review → Send flow** | Generate (POST generate), display preview, Send (POST execute), Skip (PATCH status). Execute creates Activity and ContactTouch ([lib/plays/execute-action.ts](lib/plays/execute-action.ts)). | None |

---

## 3. Play Catalog

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **Location:** "/dashboard/roadmap?play=custom or via '+ New Play'" | "+ New Play" → roadmap?play=custom; catalog is shown in the Plays tab **after** selecting a company (roadmap?companyId=xxx&play=custom). [PlayCatalog](app/components/plays/PlayCatalog.tsx) used in Plays tab / drawer. | Doc note above (Section 5) covers this. |
| **Filter by category:** Signal Response, Event, Expansion, Renewal, New Logo, Manual | [PlayCatalog](app/components/plays/PlayCatalog.tsx) categories: All, Signal Response, Event, Expansion, Renewal, New Logo, Manual, Other. | None |
| **Category table includes "Competitive"** | No separate "Competitive" category. Competitive displacement maps to `signal` or `other` in `resolveCategory`. | **Doc:** Either add a Competitive category in the app or change the table to "Competitive (e.g. Competitive Displacement) — under Signal Response or Other." |
| **Detail drawer:** "Click a play card to open the detail drawer... start the play on a specific account" | PlayDetailDrawer and start-on-account flow exist. | None |

---

## 4. Strategic Account Plan (SAP)

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **URL:** "/dashboard/roadmap?companyId={id}" | [app/dashboard/roadmap/page.tsx](app/dashboard/roadmap/page.tsx) uses `companyId` and `play` query params; shows company picker when no companyId. | None |
| **Account Story Bar:** objective, health score, phase progress, contacts engaged, actions completed, days since last touch | [AccountStoryBar](app/components/roadmap/AccountStoryBar.tsx) receives objective, healthScore, phase info, contactsEngaged/contactsTotal, actionsCompleted/actionsTotal, daysSinceLastTouch. | None |
| **Setup Health Bar** | [SetupHealthBar](app/components/roadmap/SetupHealthBar.tsx) used on roadmap page. | None |
| **Coverage Dashboard** | [CoverageDashboard](app/components/roadmap/CoverageDashboard.tsx) used. | None |
| **Three tabs: Intelligence, Plays, Configuration** | [SAPTabs](app/components/roadmap/SAPTabs.tsx): order is **Plays**, **Account Intelligence**, **Configuration**. | **Doc:** Use "Plays, Account Intelligence, Configuration" and note tab order if you want to match the UI exactly. |

---

## 5. Chat Agent

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **Available on every account page; full context (products, messaging, content library, account research, contacts, objections, agent memory)** | [app/api/chat/route.ts](app/api/chat/route.ts) loads account research, agent memory, messaging, content, products, etc. | None |
| **Research company (Exa), draft emails, run plays, find contacts, enrich (Apollo), send emails, Cal.com, record memory, expansion plans, bulk event invites** | Chat uses tools for research, draft_email, find_contacts, enrich, createPlayRunFromTemplate, etc. Demo mode restricts external tools. | None |
| **Demo accounts: external tools (research, enrichment, Exa) disabled; chat uses only existing account data** | Demo branch in chat route sets a restricted system prompt and avoids external tools. | None |

---

## 6. Cooldowns and Contact Warnings

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **ContactTouch logged on send** | [executePlayAction](lib/plays/execute-action.ts) creates ContactTouch. | None |
| **Check touch log vs governance (e.g. 7-day cooldown, max 2/contact/week, max 5/account/week)** | [lib/plays/cooldown-check.ts](lib/plays/cooldown-check.ts): `getCooldownLimits` (template + PlayGovernance), `getTouchCounts`, `buildCooldownWarning`, `findAlternateContact`; applied in `applyCooldownToPlayRun`. | None |
| **Yellow warning on action card + alternate contact suggestion** | PlayRunExecuteClient shows cooldown in amber box and "Alternate: {alternateContact}". Alternate is "Name (email)" or "Name" from `findAlternateContact`. | None |
| **Example wording:** "Sarah Chen contacted 3 days ago via Quarterly Check-In (re: Q1 value summary)" / "Consider reaching David Park (CTO) instead" | App uses generic text like "Contact touched X time(s) this week (max 2). Consider waiting 7 days or choosing another contact." Alternate has no role/title. | **Doc (optional):** Adjust example to match generic message + "Alternate: [Name] (email)" or add richer messaging in code. |
| **Limits set in PlayGovernance** | PlayGovernance and template-level overrides used in cooldown-check. | None |

---

## 7. The 6 Starter Plays

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **Contract Renewal** — T-90, T-30, T-0; contract dates | Timeline cron ([app/api/cron/play-timeline-triggers/route.ts](app/api/cron/play-timeline-triggers/route.ts)) uses PlayTemplate anchorField + anchorOffsetDays and CompanyProduct contractRenewalDate/contractEnd/contractStart. | None (assumes templates and product dates are configured). |
| **Quarterly Business Value Check-In** — every 90 days from contract start | Same timeline mechanism with anchorField/contractStart and offset. | None |
| **New Product / Feature Launch** — product_launch signal | Signal-to-play mapping and match-signal-to-play create runs. | None |
| **Executive Intro, Competitive Displacement, Expansion** — manual or signal-triggered | createPlayRunFromTemplate used from catalog, chat, and signals. | None |

---

## 8. First Session Steps & Quick Reference

| Guide claim | App reality | Gap type |
|-------------|-------------|----------|
| **Step 2: "Go to Strategic Account Plans (/dashboard/roadmap)"** | No companyId → company picker. Correct. | None |
| **Step 5: "Select 'Executive Intro'"** | Depends on play templates (e.g. seed); catalog lists templates from API. | None |
| **Quick Reference: "Check my weekly momentum" → "My Day → Weekly Stats Bar"** | Stats bar is on My Day; no "plays completed" as noted above. | Doc: align metric list. |
| **First Week Checklist: "5+ ContactTouches logged (visible in your weekly stats)"** | Weekly stats show "Emails Sent" from Activity (EMAIL_SENT); play execution creates both Activity and ContactTouch, so counts align for play-sent emails. | None |

---

## Summary: Recommended Changes

### Document

1. **Weekly Stats Bar:** Describe actual metrics (Emails Sent, Replies, Contacts Found, Page Views, Meetings, Signals) or explicitly add "plays completed" as a future metric.
2. **Needs Attention:** Either describe contact-level follow-up flags as today’s behavior, or add a note that account-level overdue phases / at-risk signals are roadmap items.
3. **"+ New Play" / Play Catalog:** Clarify that user goes to roadmap, picks an account, then uses the Plays tab for the catalog.
4. **Play Run:** Either remove "Edit if needed... Your edits are saved" or add a short note that editing is coming soon, until the UI is implemented.
5. **SAP tabs:** Name them "Plays, Account Intelligence, Configuration" and match order to the app.
6. **Play Catalog categories:** Either add Competitive or describe Competitive Displacement under Signal Response/Other.
7. **Cooldown example (optional):** Align example text with the generic warning + alternate format the app shows.

### Code

1. **Play Run edit UI:** Add editable subject/body (and persistence via existing PATCH) so "edit and save" in the guide is supported.
2. **Plays completed (optional):** If the product wants "plays completed" in the stats bar, add it to momentum and WeeklyStatsBar.

---

## File reference

- My Day: [app/components/dashboard/MyDayDashboard.tsx](app/components/dashboard/MyDayDashboard.tsx), [app/api/dashboard/my-day/route.ts](app/api/dashboard/my-day/route.ts)
- Play Run: [app/dashboard/companies/[id]/plays/run/[runId]/PlayRunExecuteClient.tsx](app/dashboard/companies/[id]/plays/run/[runId]/PlayRunExecuteClient.tsx), [app/api/play-runs/[runId]/route.ts](app/api/play-runs/[runId]/route.ts)
- Play execution: [lib/plays/generate-action-content.ts](lib/plays/generate-action-content.ts), [lib/plays/cooldown-check.ts](lib/plays/cooldown-check.ts), [lib/plays/execute-action.ts](lib/plays/execute-action.ts), [lib/plays/create-play-run.ts](lib/plays/create-play-run.ts)
- Cooldown: [lib/plays/cooldown-check.ts](lib/plays/cooldown-check.ts); apply on run load: [app/api/play-runs/[runId]/route.ts](app/api/play-runs/[runId]/route.ts)
- SAP: [app/dashboard/roadmap/page.tsx](app/dashboard/roadmap/page.tsx), [app/components/roadmap/SAPTabs.tsx](app/components/roadmap/SAPTabs.tsx)
- Play Catalog: [app/components/plays/PlayCatalog.tsx](app/components/plays/PlayCatalog.tsx)
- Needs Attention: [app/components/dashboard/NeedsAttentionCard.tsx](app/components/dashboard/NeedsAttentionCard.tsx), [app/api/dashboard/needs-attention/route.ts](app/api/dashboard/needs-attention/route.ts)
