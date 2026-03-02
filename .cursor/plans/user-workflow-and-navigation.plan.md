---
name: ""
overview: ""
todos: []
isProject: false
---

# User Workflow and Navigation — Consolidated Target Company (6 Tabs)

## Core principle

**No Blank Forms, No Dead Ends.** Every dashboard CTA deep-links to the Target Company page with tab, division, and context (type, signal, action) already set. The Roadmap tells the AE what to do; the destination tab is where they do it.

**Design principle for tabs:** Each tab answers ONE question. If two tabs answer the same question from different angles, merge them into one tab with a view toggle.

---

## Spec documents and overall strategy

**Location:** Specs live in **docs/Specs/** as Markdown. Reference these files during implementation:

- **Spec 1** — [docs/Specs/AgentPilot_Spec1_User_Workflow_Navigation_Architecture.md](docs/Specs/AgentPilot_Spec1_User_Workflow_Navigation_Architecture.md) — where every link goes, URL params, breadcrumb, dashboard refresh, edge cases
- **Spec 2** — [docs/Specs/AgentPilot_Spec2_Target_Company_Tab_Consolidation.md](docs/Specs/AgentPilot_Spec2_Target_Company_Tab_Consolidation.md) — 10 → 6 tabs, per-tab required state, division filter, data sources
- **Spec 3** — [docs/Specs/AgentPilot_Spec3_Five_Dashboard_Gaps_Production.docx.md](docs/Specs/AgentPilot_Spec3_Five_Dashboard_Gaps_Production.docx.md) — signals at division level, NBA decision tree, Objective Bar, contextual tasks, Radar + Roadmap Health
- **Spec 4** — [docs/Specs/AgentPilot_Spec4_Legacy_Cleanup_Teardown_Manifest.docx.md](docs/Specs/AgentPilot_Spec4_Legacy_Cleanup_Teardown_Manifest.docx.md) — vocabulary, UI/tabs/API/DB to delete or rename; no feature flags, no legacy mode

**Strategy:** Spec 1 defines navigation and URL contract. Spec 2 defines the 6-tab Target Company page and what each tab shows. Spec 3 defines Dashboard data, APIs, and component behavior. Spec 4 says: with zero production users, **delete** legacy elements outright — no dual rendering, no "if Roadmap then 6 tabs else 10." The Adaptive Roadmap is the product.

---

## Spec digest: key details (don’t miss)

Use this as a verification checklist during implementation. Full detail is in the spec .md files above; these are the details that are easy to miss or hard to troubleshoot later.

### Spec 1 (Workflow & navigation)

- **Link map:** Full CTA → URL tables for Hot Signals (by signal type), NBA (by action type), Account Radar, Today’s Tasks. Every CTA has an exact URL pattern and "What Pre-Loads." Implement against those tables; no ad-hoc URLs.
- **Breadcrumb:** Format is **Dashboard > [Company Name] > [Tab Label] > [Division Name when filtered]**. First segment always links to `/dashboard`. Company links to Overview; tab and division are current view / filter.
- **Dashboard on return:** Plan status, Radar counts, and NBA must refresh when AE returns (visibility/focus revalidation). Stale data after an action = failed requirement.
- **Edge cases:** Unknown division → link to `?tab=overview` with no division param. Deleted division → toast + fallback to all divisions. No signal context → show "No signal context loaded…" + link to Signals tab. Multiple signals → primary signal (e.g. highest confidence or most recent). No Roadmap → per Spec 4 legacy mode is removed; handle as reduced state (no objective bar), not 10-tab fallback.

### Spec 2 (Tab consolidation)

- **Content tab structure:** Three sub-tabs: (1) **Content Library** — grid of all content with division, type, status, signal; (2) **Create Content** — generation form with division + type, Signal Context box (from URL `signal=`), target contacts, Roadmap Content Strategy auto-applied; (3) **Sales Pages** — per-division pages, URLs, status, engagement preview, Create sales page. When `contentFilter=sales-page` + division in URL, Sales Pages sub-tab is active and filtered.
- **Overview data sources:** Company header = existing Company API. Objective Bar = AdaptiveRoadmap.objective (e.g. GET /api/roadmap/config). Division cards = Targets (targetType=division) + contact counts + content status (e.g. GET /api/roadmap/targets?companyId=). Recent signals = AccountSignal matched to Targets (e.g. GET /api/signals?companyId=&limit=5 enhanced). Chat Agent "Try asking" = Roadmap-aware prompts from Targets + recent signals.
- **Division filter:** State at page level; sync to URL when changed (replaceState) so bookmarking works. When a division is selected, tab label shows badge ("Contacts (ADAS)") so AE knows filter is active.
- **Buying Groups tab:** Section renamed "Divisions" (not "Departments") when Roadmap active. Value Proposition, Use Case, Estimated Opportunity pre-populate from Target.intelligence. Stage badge from Target.stage.

### Spec 3 (Five dashboard gaps)

- **Division resolution pipeline (Gap 1):** Order: (1) Contact lookup (contactEmail/contactName → Contact in Roadmap → contact’s target); (2) CompanyDepartment mapping (signal.departmentId → Department → Target); (3) Keyword match (signal title+summary vs division name + intelligence keywords); (4) Fallback = division null. Return division + method + confidence.
- **GET /api/dashboard/signals (enhanced):** Per signal include: division (id, name, stage, isExpansionTarget), resolutionMethod, resolutionConfidence, plan (id, status, actionType, previewPayload), primaryCTA and secondaryCTA (label + url).
- **GET /api/signals/[signalId]:** Returns single signal for Content tab: summary, source, confidence, matched division (id + name).
- **NBA decision tree (Gap 2):** 0 contacts → research only; contacts + recent signal + expansion → outreach; live page + repeat engagement → nurture; contacts < needed + no page → content; full contacts + no page → content; placeholder → View Placeholder; live + contacts < needed → Find More Contacts; else View Division. **Never recommend outreach when contacts = 0.** Sort: urgency×10 + stage_priority×5 + signal_recency×2.
- **Objective Bar (Gap 3):** Progress from division stages: landed = Closed-Won/Deployed; active = Active Program, Expansion Target, PoC with lastSignalAt; monitoring = rest. Progress bar = landed / targetCount.
- **Tasks (Gap 4):** title, division, divisionStage, type, priority, signalContext, signalId, objectiveContext, destination URL. Sort like NBA. Click → destination.
- **Radar + Health (Gap 5):** Division cards show "Latest signal" one-liner when present; if no signals, omit block (no "Last signal: None"). Roadmap Health panel: signal→Plan rate, coverage, content readiness, engagement velocity; color-coded.

### Spec 4 (Legacy cleanup)

- **No feature flags.** Six tabs only. Delete Suggested Plays, Expansion Canvas, RunPlayButton, play cards, play API routes, Play/PlayExecution/PlaySuggestion tables.
- **Vocabulary:** Play → Plan. "Run play →" → context-specific CTA. Department → Division in UI. Microsegment → Division. Segment page → Sales page. Grep to zero matches (excluding display/replay).
- **APIs:** DELETE /api/plays/*, suggested-plays, companies/[id]/expansion. REPLACE activity → engagement + signals; enhance dashboard/signals. NEW: roadmap/config, roadmap/targets, roadmap/plans, plan execute/dismiss, companies/[id]/signals, companies/[id]/engagement, roadmap/health, targets/[id]/sales-page.
- **DB:** Drop Play, PlayExecution, PlaySuggestion. Drop playId, suggestedPlayType from AccountSignal; playId, playType from Content. Add planId, targetId, contentType as needed.
- **File deletion order:** Phase 1 Play system; Phase 2 redundant tabs after content moved; Phase 3 vocabulary + sidebar ("Your Roadmap" → "Your Sales Map", "Target companies" → "Target Accounts").
- **Zero-Legacy Test:** No "play" in UI/API; exactly 6 tabs; no "Run [X] play"; Overview = Division Cards; deleted tabs gone; sidebar updated; no Play tables; grep zero.

---

## Part 1: Tab consolidation (10 → 6)

The Target Company page today has 10 tabs. When the Adaptive Roadmap is active, several are redundant. Consolidation removes confusion (e.g. Content vs Messaging vs Sales Page for creating email) and fragmentation (engagement in two places, signals buried in Activity).

### New tab set (6 tabs)


| Tab ID          | Label         | Absorbs                                  | One question                                          |
| --------------- | ------------- | ---------------------------------------- | ----------------------------------------------------- |
| `overview`      | Overview      | Overview + **Expansion**                 | "Where does this account stand across all divisions?" |
| `buying-groups` | Buying Groups | Buying Groups (enhanced)                 | "What's our strategy for each division?"              |
| `contacts`      | Contacts      | Contacts + **Account Map**               | "Who are the people in each buying group?"            |
| `content`       | Content       | Content + **Sales Page** + **Messaging** | "What content exists and what do I need to create?"   |
| `engagement`    | Engagement    | Engagement + **Activity** (events)       | "What's happening with this account?"                 |
| `signals`       | Signals       | **NEW** (from Activity signals)          | "What external signals has the system detected?"      |


**Division filter:** All six tabs support a shared division filter. When a division is selected, the tab bar can show a badge, e.g. "Contacts (ADAS)". "All Divisions" clears the filter.

### Tabs removed and where content goes


| Removed                    | Reason                                                                                | Destination                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expansion**              | Expansion Canvas duplicates division-stage view. Overview should be division-centric. | **Overview**: Division cards with stages (Active Program, Expansion Target, etc.) replace the Expansion Canvas.                                                                                                                                                |
| **Account Map**            | Same data as Contacts, different layout.                                              | **Contacts**: Add [List View                                                                                                                                                                                                                                   |
| **Sales Page** (campaigns) | Sales pages are a content type.                                                       | **Content**: Section/filter `contentFilter=sales-page` — division pages, URLs, status (placeholder/live), engagement previews.                                                                                                                                 |
| **Messaging**              | Email/LinkedIn generation is content generation.                                      | **Content**: Division + content type (email, LinkedIn, briefing, one-pager). Same generation form, unified under Content.                                                                                                                                      |
| **Activity** (as tab)      | Mixed engagement events and external signals.                                         | **Engagement**: Timeline of events (views, emails, replies). **Signals**: New tab — build it; do not patch the Activity tab. Activity tab is deleted. External signal cards (earnings, jobs, news) with division tags and Plan status move to the Signals tab. |


**URL param `tab`:** Only these six values: `overview`, `buying-groups`, `contacts`, `content`, `engagement`, `signals`. No aliases. The word "departments" is legacy (Spec 4 renames to "Divisions" in the UI; the tab label is "Buying Groups"). Clean rename everywhere: tab id = `buying-groups`; do not support `departments` as a tab id or alias.

---

## Part 2: Overview tab — required state

Overview is the division-centric home for the account. It replaces the current Overview + Suggested Plays + Expansion Canvas.

### Company header (keep, enhance)

- Keep: company name, domain, industry, contact count, AI Researched badge, Chat Agent panel.
- **Enhance:** Replace single "Stage: Engagement" with the **Roadmap Objective Bar** when Adaptive Roadmap is active:
  - **Objective:** e.g. "Land 2 new NVIDIA use cases at GM"
  - **Landed: 0/2 | Active: 2 | Monitoring: 3**
  - Progress bar (e.g. 0%)
- Keep ARR metrics for now (future: break down by division).

### Division cards (replaces Suggested Plays + Expansion Canvas)

Below the header, show division cards matching the Dashboard Radar layout. Each card:

- Division name (full, not truncated)
- Stage badge (e.g. ● Active Program, ○ Expansion Target, ★ Strategic Platform, ◦ Emerging)
- Contacts: X of Y personas found
- Coverage bar (green >60%, yellow 30–60%, red <30%)
- Sales page status: LIVE / PLACEHOLDER / Not started
- Latest signal (one line + timestamp)
- Primary CTA (context-dependent): View Division, Create Page, Research Division

**Clicking a division card:** Sets the shared division filter for all tabs. Tab bar shows division badge, e.g. "Contacts (ADAS)". A filter dropdown or "All Divisions" clears the filter.

### Recent signals panel (replaces Suggested Plays)

Below division cards, show 3–5 most recent signals for this account, tagged by division. Same card format as Dashboard Hot Signals. Replaces the "Suggested plays" section.

---

## Part 3: Navigation and URL params (against 6 tabs only)

All dashboard CTAs and internal links use the **6-tab** set. No deep-links to removed tabs.

### Query parameter spec


| Param           | Type / values                                                               | Behavior                                                                                                  |
| --------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tab`           | `overview`, `buying-groups`, `contacts`, `content`, `engagement`, `signals` | Active tab. Only these six.                                                                               |
| `division`      | UUID (CompanyDepartment id or RoadmapTarget id for division)                | Pre-select division in all tabs. Shared across tabs.                                                      |
| `type`          | `email`, `linkedin`, `executive-briefing`, `one-pager`, `sales-page`        | Content tab: pre-select content type.                                                                     |
| `signal`        | UUID (AccountSignal id)                                                     | Content tab: load signal and show as context for generation.                                              |
| `contact`       | UUID (Contact id)                                                           | Content tab: pre-select contact (email/LinkedIn).                                                         |
| `action`        | `find`, `add`, `create`                                                     | find → open Find Contacts modal; add → open Add Contact modal; create → start Create flow in Content tab. |
| `contactName`   | string (URL-encoded)                                                        | With `action=add`: pre-fill name in Add Contact.                                                          |
| `contentFilter` | `sales-page`, `email`, `linkedin`, `briefing`, `all`                        | Content tab: filter library/section.                                                                      |


### Dashboard CTA → destination (6-tab URLs)

- **Hot Signals:** e.g. Draft Follow-Up → `?tab=content&division=&type=email&signal=`; View in Division → `?tab=overview&division=`; Draft Executive Briefing → `?tab=content&division=&type=executive-briefing&signal=`; etc.
- **NBA:** Research Buying Group / Find More Contacts → `?tab=contacts&division=&action=find`; Create Sales Page → `?tab=content&division=&contentFilter=sales-page&action=create`; Draft Outreach/Briefing/Follow-Up → `?tab=content&division=&type=&signal=`; View Division → `?tab=overview&division=`; View Contacts → `?tab=contacts&division=`.
- **Radar:** View Division → `?tab=overview&division=`; Create Page → `?tab=content&division=&contentFilter=sales-page&action=create`; Research Division → `?tab=contacts&division=&action=find`; View Page → external `/go/[slug]`.
- **Today's Tasks:** Same patterns (tab + division + type + signal + action as needed).

---

## Part 4: Implementation order

Because there are no production users, we do **consolidation and navigation together**: implement the 6-tab structure first, then wire every CTA to the new tabs. We do **not** build deep-link infrastructure for the current 10 tabs.

### Phase 1: Consolidate to 6 tabs

- **1.1** Change [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx) (or equivalent) to define exactly six tabs: `overview`, `buying-groups`, `contacts`, `content`, `engagement`, `signals`. Remove tab entries for `campaigns`, `activity`, `messaging`, `expansion`, `map`.
- **1.2** **Overview:** Build the new Overview content: Roadmap Objective Bar (when roadmap active), Division Cards (stages, coverage, sales page status, latest signal, CTAs), Recent Signals panel. Remove Suggested Plays and Expansion Canvas from this page. Ensure clicking a division card sets the shared division filter and that the tab bar shows the division badge when filter is active.
- **1.3** **Content:** Merge in Sales Page and Messaging. Content tab shows: (1) content library filtered by division and content type (email, LinkedIn, briefing, one-pager, **sales pages**); (2) generation form with division + type selector; (3) sales page section when `contentFilter=sales-page` (URL or filter). Remove or redirect old Sales Page and Messaging tab content into this single tab.
- **1.4** **Contacts:** Add Map View toggle; Map View renders the current Account Map layout. Default List View. Remove standalone Account Map tab.
- **1.5** **Engagement:** Merge in the event/timeline content from Activity tab. Single view: metrics table (emails, views, replies per division) + chronological activity timeline. Filter by division and event type. Remove Activity tab.
- **1.6** **Signals:** New tab. Show external signal cards (AccountSignal, etc.) for this account, tagged by division, with Plan status. Filter by division. Data currently shown in Activity tab under "signals" moves here.
- **1.7** **Buying Groups:** Keep and enhance; ensure it reads from Roadmap Target intelligence (segmentation, value prop, use case, estimated opportunity per division). Division filter applies.
- **1.8** Company page server component: only accept `tab` in `validTabs` for these six ids. Remove routes or redirects that assume the old tab set.

### Phase 2: URL params and shared state (on 6-tab structure)

- **2.1** Company page [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx): Read from `searchParams` — `tab`, `division`, `type`, `signal`, `contact`, `action`, `contactName`, `contentFilter`. Validate `tab` against the six ids only. Pass all to layout/tabs and children.
- **2.2** Shared division state from URL: On load, set selected division from `division` param; pass to all six tabs. When user changes tab or division, update URL (e.g. `router.replace`) so the current tab and division are in the URL.
- **2.3** Content tab: When `type` or `contentFilter` or `signal` present, set initial type/filter and load signal context. When `signal` param is set, fetch signal via **GET /api/signals/[signalId]** (see Signal context fetch below). Show "Generating based on signal: …" when signal is loaded; handle "no signal context" state when fetch fails or signal is missing. When `action=create` with `contentFilter=sales-page`, auto-start the create flow **inline** on the Content tab (Sales Pages section); do not redirect to a separate page. Entry point from Dashboard is always `?tab=content&contentFilter=sales-page&action=create`; the existing create-content page may remain as implementation detail behind the scenes, but the AE lands on the Content tab with create flow started.
- **2.4** Contacts tab: When `action=find`, auto-open Find Contacts modal; when `action=add`, open **Add Contact modal** on the company page (with `contactName` if provided). **Decision: modal, not separate page.** A separate Add Contact page breaks the flow (AE leaves Target Company context, adds contact, then has to navigate back). The modal keeps the AE in context with division pre-set.

### Phase 3: Dashboard CTAs use 6-tab URLs only

- **3.1** [lib/dashboard/hot-signals.ts](lib/dashboard/hot-signals.ts): Build every CTA href with `tab=` one of the six (e.g. `content`, `overview`), plus `division`, `type`, `signal`, `contact` as needed. No links to `campaigns`, `messaging`, `activity`, `expansion`, `map`.
- **3.2** [lib/dashboard/next-best-actions.ts](lib/dashboard/next-best-actions.ts): Same — all hrefs use `tab=overview|buying-groups|contacts|content|engagement|signals` and appropriate `division`, `action`, `type`, `signal`.
- **3.3** [app/components/dashboard/DivisionRadarCard.tsx](app/components/dashboard/DivisionRadarCard.tsx) and any other dashboard components: View Division → `tab=overview&division=`; Create Page → `tab=content&...&contentFilter=sales-page&action=create`; Research → `tab=contacts&division=&action=find`.
- **3.4** Today's Tasks in [app/dashboard/page.tsx](app/dashboard/page.tsx): Build task hrefs with the six tab ids and full context (division, type, signal, action).

### Phase 4: Signal context API and division resolution

- **4.1** **GET /api/signals/[signalId]:** New endpoint. Returns signal data for Content tab context: summary, source, confidence (or relevance), and matched division (resolved division id and display name). Used when `?signal=` is in the URL so the Content tab can show "Generating based on signal: …" and pass context into the generate request. Add to files to touch.
- **4.2** **Division resolution pipeline (Spec 3 Gap 1):** Build or integrate the division resolution function so every signal has a resolved division when possible. Pipeline: contact lookup → department mapping → keyword match → fallback. Without it, signals without an existing departmentId show "division unknown." This is core to making CTAs and deep-links useful (e.g. Draft Executive Briefing needs a division for the URL).

### Phase 5: Objective Bar, breadcrumb, dashboard refresh, cleanup

- **5.1** Dashboard: Add Objective Bar when roadmap is enterprise_expansion (goal text, landed/target, division states). Optional: "signals this week" and "X of Y contacts found" in StatusBar.
- **5.2** Company page breadcrumb: Full format per Spec 1 — **Dashboard > [Company Name] > [Tab Label] > [Division Name when filtered]** (e.g. "Dashboard > General Motors > Content > Autonomous Driving & ADAS"). Each segment clickable (Dashboard → `/dashboard`, Company → company overview, Tab → current tab, Division → clear or keep filter). This orients the AE and supports back-navigation.
- **5.3** **Dashboard state refresh on return:** When the AE returns to the Dashboard after taking action (e.g. from Content or Contacts tab), the Dashboard must reflect updates: Plan status, Radar card counts, NBA recomputation. Add revalidation on window focus or a `visibilitychange` listener so stale data is refetched (e.g. SWR `revalidateOnFocus` or React Query refetchOnWindowFocus, or explicit refetch when document becomes visible).
- **5.4** Remove or redirect any remaining links to deleted tabs; ensure no dead ends.

---

## Part 5: Edge cases (Spec 1)

The implementation must handle at least the following:

1. **Signal with unknown division:** Division resolution pipeline may not resolve a division for every signal. Fallback: show signal in Content tab with "division unknown" or "All divisions"; allow AE to pick division manually; do not break the page.
2. **Deleted division target:** If a URL references a division (RoadmapTarget or CompanyDepartment) that was deleted, show a clear state ("Division no longer available") and offer "All divisions" or company overview; do not 500 or blank screen.
3. **Content tab without signal context:** When `signal=` is in the URL but the fetch fails (e.g. invalid id, deleted signal): show a "no signal context" state; generation form still works without pre-filled context; do not block the AE.
4. **Multiple signals for same division:** When building CTAs or showing recent signals, if multiple signals apply to one division, use the most relevant or most recent; document rule (e.g. "latest by publishedAt").
5. **AE with no Roadmap:** When user has no Adaptive Roadmap, Overview may show a reduced state (no objective bar, no division cards from roadmap). Tabs still work; division filter can fall back to company departments only.

**Minimum for first ship:** Handle (1) "division unknown" fallback in signal CTAs and Content tab, and (3) "no signal context" state when GET /api/signals/[signalId] fails or signal is missing.

### Edge cases — implemented


| #   | Edge case                          | Where handled                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Signal with unknown division       | **ContentTab:** When signal context (or error) is present and URL had no valid `division`, show "Division unknown — select a buying group below"; AE picks via dropdown. Hot-signals/CTAs use `division` in URL only when resolution returns one; otherwise link without division (overview/content). |
| 2   | Deleted division target            | **Company page:** If `?division=` is set but not in company's departments, show banner "The division referenced by this link is no longer available" with links "Show all divisions" and "Overview". Pass sanitized `urlContext` (no division) to tabs so no 500.                                     |
| 3   | Content tab without signal context | **ContentTab:** When `signal=` in URL but GET /api/signals/[signalId] fails, show "No signal context loaded. You can add context manually or browse recent signals for this account." with link to `?tab=signals`. Form remains usable.                                                               |
| 4   | Multiple signals per division      | **hot-signals.ts:** Sort by date descending; comment documents rule: "when multiple signals apply to the same division, we show the most recent first (latest by publishedAt); each CTA uses one signal per card."                                                                                    |
| 5   | AE with no Roadmap                 | **Dashboard:** Objective bar and division radar only when `roadmap?.roadmapType === 'enterprise_expansion'` and divisionRadarData has divisions; otherwise StatusBar + company cards. **Company page:** Division filter uses company departments; tabs work without roadmap.                          |


---

## Files to touch (summary)

- [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx) — read all searchParams; validate tab against 6 ids; pass to tabs.
- [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx) — six tabs only; URL sync on tab/division change; pass division/type/signal/action/contentFilter to Content and Contacts.
- [app/components/company/ContentTab.tsx](app/components/company/ContentTab.tsx) — type, signalId, contentFilter, autoCreate; call GET /api/signals/[signalId] for context; "no signal context" state; inline create flow when action=create + contentFilter=sales-page.
- [app/components/company/ContactsByBuyingGroup.tsx](app/components/company/ContactsByBuyingGroup.tsx) (or parent) — open Find Contacts when autoFind; **Add Contact modal** (not separate page) when action=add with contactName.
- **New: app/api/signals/[signalId]/route.ts** — GET returns signal summary, source, confidence, matched division (for Content tab context).
- Division resolution: new or existing lib (e.g. `lib/signals/division-resolution.ts` or equivalent) — pipeline: contact lookup → department mapping → keyword match → fallback; used by dashboard signal CTAs and GET /api/signals/[signalId] if needed.
- [lib/dashboard/hot-signals.ts](lib/dashboard/hot-signals.ts) — build all CTA hrefs with 6 tab ids, division, type, signal; use division resolution so each signal has resolved division when possible.
- [lib/dashboard/next-best-actions.ts](lib/dashboard/next-best-actions.ts) — same; 6 tab ids only.
- [app/components/dashboard/DivisionRadarCard.tsx](app/components/dashboard/DivisionRadarCard.tsx), [app/components/dashboard/AccountRadarGrid.tsx](app/components/dashboard/AccountRadarGrid.tsx) — CTAs use 6-tab URL patterns.
- [app/dashboard/page.tsx](app/dashboard/page.tsx) — Today's Tasks hrefs; Objective Bar; **revalidate on focus/visibility** so Dashboard refetches when AE returns.
- Company page: breadcrumb component — "Dashboard > [Company] > [Tab] > [Division]" with clickable segments.
- New: Objective Bar component (or extend StatusBar).

---

## Summary

- **Consolidate first:** 10 tabs → 6 tabs; Overview = division cards + objective bar + recent signals; Content = content + sales pages + messaging; Contacts = list + map toggle; Engagement = metrics + timeline; **Signals = new tab** (build it; Activity tab deleted); Buying Groups = enhanced. **Tab id = buying-groups everywhere; no departments alias.**
- **URL and navigation:** Only `tab` = `overview` | `buying-groups` | `contacts` | `content` | `engagement` | `signals`. All deep-links and dashboard CTAs use this set and the same param spec (`division`, `type`, `signal`, `contact`, `action`, `contactName`, `contentFilter`).
- **Decisions:** Create Sales Page = inline on Content tab (entry `?tab=content&contentFilter=sales-page&action=create`). Add Contact = modal on company page. Signal context = GET /api/signals/[signalId]. Division resolution pipeline required for signals. Dashboard refetches on return (focus/visibility). Breadcrumb = Dashboard > Company > Tab > Division.
- **Edge cases:** Division unknown fallback; no signal context state; deleted division; multiple signals; no Roadmap. Minimum: (1) and (3).
- **No work** on deep-linking or URL handling for the old tabs (departments, campaigns, activity, messaging, expansion, map); they are removed or merged.

**When troubleshooting:** Use the **Spec digest** section above as the checklist (APIs, resolution pipeline, NBA tiers, task shape, deletion order). For full CTA tables, breadcrumb, and edge-case wording, read the spec files in **docs/Specs/** (Spec 1–4 .md).