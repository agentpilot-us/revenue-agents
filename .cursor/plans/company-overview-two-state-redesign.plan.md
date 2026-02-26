---
name: ""
overview: ""
todos: []
isProject: false
---

# Company Overview page: two-state redesign and cleanup

## Goals

- **Remove** from Overview: Nightly Crawl Status, standalone "Research with AI" card, Quick Actions (Open Messaging, Build contact list) when account is not set up.
- **State 1 (not set up):** Single focused "Get started" card with checklist and one CTA to Account Intelligence. Nothing else.
- **State 2 (set up):** Summary view only: Company Snapshot, buying group coverage, research-last-updated line, last signal (optional), suggested next action (optional).
- **Default tab:** Overview for new/unset accounts; avoid landing on Expansion Canvas with empty data.
- **Tabs:** When not set up, show only Overview or mute/lock other tabs so the rep is funneled into setup.

---

## Clarifications (pre-developer)

### Intelligence is a separate page, not a tab

**/dashboard/companies/[companyId]/intelligence** is its own route (see `app/dashboard/companies/[id]/intelligence/page.tsx`). It is **not** `?tab=intelligence`. So when we filter the company page to "Overview only" (hide other tabs), the rep can still click "Research with AI →" or "Complete account setup →" and **navigate to the Intelligence page** — they leave the company page and land on a full page. The tab filter does **not** block that flow. No change needed to the plan for this.

### Setup condition (single definition)

Use **one** definition everywhere to avoid drift:

- **setupIncomplete** = `!hasResearch || departments.length === 0 || company.contacts.length === 0`
- **setupComplete** = `hasResearch && departments.length > 0 && company.contacts.length > 0`

Use **company.contacts.length > 0** (any contacts on the account), **not** "every department has contacts." Otherwise an account with 3 departments and 10 contacts all in one department would stay in State 1 and feel broken. Do **not** use "count departments where contacts.length > 0" for the setup gate; that stricter rule is only for **display** (e.g. "X of Y groups have contacts" in State 2).

### What "Research with AI →" does in the Get started card

**Behavior:** "Research with AI →" should **navigate to the Intelligence page** (`/dashboard/companies/[companyId]/intelligence`), not run research inline. The rep completes research there (step 1 of setup), then returns to the company page. When they come back, the server re-evaluates `hasResearch` on page load, so the Get started card will show item 1 checked (or, if they’re now setup complete, they’ll see State 2). No need for inline ResearchWithAIButton in the card — use a link. This keeps the mental model "setup lives in the wizard" and avoids duplicate behavior.

### State 2: research last updated

In State 2, add one line of context so the rep knows if intelligence is fresh or stale: **"Research updated [date]."** Use **Company.accountIntelligenceCompletedAt** (Prisma: `accountIntelligenceCompletedAt DateTime?`). If null, show nothing or "Research not run yet." Format e.g. "Research updated Feb 18, 2026" or "Research updated Feb 18." This is already on the Company model; no new field. Include this in the State 2 section below.

---

## 1. Default tab and setup condition

**File:** [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx)

- **Current:** `initialTab = tabParam ?? 'expansion'` (line 49).
- **Change:** Default to Overview when no `tab` in URL: `initialTab = tabParam ?? 'overview'`.
- **Setup condition (already in use):**  
`setupIncomplete = !hasResearch || departments.length === 0 || company.contacts.length === 0`  
Use this **exact** condition everywhere (see Clarifications above). Do not use "each department has contacts."

---

## 2. Remove Nightly Crawl Status from Overview

**File:** [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx)

- Delete the **Crawl Status** block from the Overview tab (the block that renders `<CrawlStatus ... />`).
- Remove the `CrawlStatus` import if it is only used there.

**Move to Settings (optional):**  
[app/dashboard/settings/page.tsx](app/dashboard/settings/page.tsx) already has "Nightly Crawl Settings." The current `CrawlStatus` uses **company-level** fields. If you have user-level or global crawl run data, add a short status line there; otherwise do not show crawl status anywhere after removing it from Overview.

---

## 3. Overview: State 1 — single "Get started" card (setup incomplete)

**File:** [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx)

When `setupIncomplete` is true, the **entire** Overview tab content (below the tab bar) should be **only** this one card:

- **Title:** "Get started with {companyName}"
- **Body:** "To use AgentPilot on this account you need:"
- **Checklist (three items):**
  - Account research — **[Research with AI →]** (links to `/dashboard/companies/{companyId}/intelligence`; does **not** run research inline).
  - At least one buying group
  - Contacts in each group
- **Primary CTA:** [Complete account setup →] linking to `/dashboard/companies/{companyId}/intelligence`
- **Subtext:** "~5 minutes"

**Remove in State 1 (when `setupIncomplete`):** Current amber "Complete setup" banner, Company Snapshot, Business Overview & Key Initiatives, Salesforce block, Crawl Status, the whole "Account research" card (heading + ResearchWithAIButton + CompanyResearchDisplay), and the entire "Quick Actions" card.

**Implementation:** In the Overview branch, `if (setupIncomplete) { return <GetStartedCard ... />; }` then render State 2 content below. "Research with AI →" is a **Link** to the Intelligence page; on return, the page re-evaluates `hasResearch` so the checklist can reflect step 1 complete (or transition to State 2).

---

## 4. Overview: State 2 — summary only (setup complete)

When `!setupIncomplete`, Overview shows **only**:

- **Company Snapshot** (existing block): industry, revenue, employees, HQ, website.
- **Research updated [date]:** One line using `Company.accountIntelligenceCompletedAt` (e.g. "Research updated Feb 18, 2026"). If null, omit or show "Research not run yet."
- **Buying group coverage at a glance:** e.g. "X of Y groups have contacts; Z have live pages." Derive from existing `departments` and `campaigns`: count departments with at least one contact, count departments with at least one campaign.
- **Last signal (optional):** If desired, add a fetch for latest AccountSignal for this company and show date + headline. Can be Phase 2.
- **Suggested next action (optional):** e.g. from getSuggestedPlays; can be Phase 2.

**Do not show in State 2:** Crawl Status, standalone Account research card, Quick Actions.

---

## 5. Quick Actions and Research card removal

- **Quick Actions:** Remove the full Quick Actions card from the Overview tab in CompanyTabs. Not shown in either state for this iteration.
- **Standalone "Account research" card:** Remove the card that contains "Account research" heading + ResearchWithAIButton + CompanyResearchDisplay. In State 1, research is a checklist row with a link to Intelligence; in State 2, show only the "Research updated" line.

---

## 6. Tabs: show only Overview when not set up

**File:** [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx)

When `setupIncomplete`, render only the **Overview** tab in the tab list (e.g. `TABS.filter(t => t.id === 'overview')`). Other tabs are hidden until setup is complete. Direct URL to `?tab=expansion` can still work; optionally redirect to `?tab=overview` when `setupIncomplete` and `tab !== 'overview'` so the rep always sees the Get started card first.

---

## 7. Chat widget

Leave the **Account Chat Widget** as-is on the company page. No changes.

---

## 8. Data and props

- **Already available:** `companyName`, `companyId`, `companyData`, `departments`, `campaigns`, `contactCount`, `setupIncomplete`, `hasResearch`. For State 2 "Research updated," pass or derive **accountIntelligenceCompletedAt** from Company (already on the model).
- **Setup gate:** Use `company.contacts.length > 0` (any contacts), not "every department has contacts."
- **Buying group coverage (State 2):** "X of Y groups have contacts" = count departments where `contacts.length > 0` (or `_count.contacts > 0`); "Z have live pages" = count distinct departments that have at least one campaign.

---

## File change summary


| File                                                                             | Change                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx)   | Default `initialTab` to `'overview'`. Pass `accountIntelligenceCompletedAt` (or ensure companyData includes it) for State 2 if needed.                                                                                                                                                                                 |
| [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx) | Overview: two-state content (State 1 = single Get started card with link to Intelligence for "Research with AI →"; State 2 = Snapshot + "Research updated" + coverage + optional signal/action). Remove Crawl Status, standalone Account research card, Quick Actions. When `setupIncomplete`, show only Overview tab. |
| [app/dashboard/settings/page.tsx](app/dashboard/settings/page.tsx)               | Optional: add crawl status under Nightly Crawl Settings only if user-level crawl data exists.                                                                                                                                                                                                                          |
| [app/components/company/CrawlStatus.tsx](app/components/company/CrawlStatus.tsx) | Keep component; remove usage from CompanyTabs.                                                                                                                                                                                                                                                                         |


---

## Order of implementation

1. Default tab to Overview in the company page.
2. Remove Crawl Status and Quick Actions from Overview; remove standalone Account research card.
3. Implement State 1: single Get started card with checklist; "Research with AI →" and "Complete account setup →" both link to `/dashboard/companies/[id]/intelligence`; on return, hasResearch is re-evaluated.
4. Implement State 2: Company Snapshot + "Research updated [date]" (using accountIntelligenceCompletedAt) + buying group coverage (+ optional last signal / suggested action).
5. When `setupIncomplete`, restrict tab list to Overview only (or mute others).

No changes to the Intelligence page or the Chat widget.