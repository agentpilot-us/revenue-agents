

**AgentPilot**  
Target Company

Tab Consolidation

10 Tabs → 6 Tabs: Redesign for the Adaptive Roadmap

Production Spec 2 of 4  |  February 2026  |  Confidential

# **Why Consolidation Is Necessary**

The Target Company page currently has 10 tabs: Overview, Buying Groups, Contacts, Sales Page, Engagement, Activity, Messaging, Content, Expansion, Account Map. When the Adaptive Roadmap is active, at least four of these tabs are redundant because the Roadmap already organizes the same information by division and objective.

The redundancy creates three problems:

1. **Confusion:** The AE doesn’t know whether to go to Content, Messaging, or Sales Page to create an email. All three tabs can generate content.

1. **Fragmentation:** Engagement data lives in two places (Engagement tab for metrics, Activity tab for timeline). Signals live in Activity but should live alongside Plans.

1. **Legacy conflict:** The Expansion tab duplicates what the Overview should already show with Roadmap division cards. The Account Map tab duplicates the Contacts tab with a different layout.

| Design Principle Each tab should answer ONE question for the AE. If two tabs answer the same question from different angles, merge them into one tab with a view toggle. |
| :---- |

# **The Consolidation Map: 10 → 6**

| New Tab | Absorbs | What It Answers | Division Filter |
| :---- | :---- | :---- | :---- |
| **Overview** | Overview \+ Expansion | "Where does this account stand across all divisions?" Division cards with stages, coverage, signals, objective progress. Chat Agent stays. | All divisions shown. Click a card to filter other tabs to that division. |
| **Buying Groups** | Buying Groups (enhanced) | "What’s our strategy for each division?" Segmentation strategy, value proposition, use case, and estimated opportunity per division. Reads from Roadmap Target intelligence. | Yes — filter by division. |
| **Contacts** | Contacts \+ Account Map | "Who are the people in each buying group?" Contacts grouped by division with roles, enrichment, engagement. Toggle between list view and visual map view. | Yes — filter by division. |
| **Content** | Content \+ Sales Page \+ Messaging | "What content exists and what do I need to create?" All content types in one hub: sales pages, emails, LinkedIn, briefings. Generation form with signal context pre-loading. | Yes — filter by division and content type. |
| **Engagement** | Engagement \+ Activity (events) | "What’s happening with this account?" Metrics table (emails, views, replies per division) plus chronological activity timeline. All engagement in one view. | Yes — filter by division and event type. |
| **Signals** | NEW (from Activity signals) | "What external signals has the system detected?" Signal cards with division tags, Plan status, match info. Transparency into the intelligence layer. | Yes — filter by division. |

## **Tabs Removed**

| Removed Tab | Why | Where Its Content Goes |
| :---- | :---- | :---- |
| **Expansion** | The "Expansion Canvas" shows microsegments with "Identified / Live & engaged / High-potential" columns. This IS the Overview when division cards are the primary view. The Expansion tab duplicates the Overview’s division card layout. | Overview tab. Division cards with stages (Expansion Target, Active Program, etc.) replace the Expansion Canvas entirely. |
| **Account Map** | Shows the same contacts as the Contacts tab but in a visual card layout per division. Same data, different rendering. | Contacts tab: add a \[List View | Map View\] toggle. Map View renders the current Account Map layout. Default is List View. |
| **Sales Page** | Sales pages are a content type, not a separate category. The current tab shows per-division pages with URLs and engagement stats. This fits naturally in the Content tab. | Content tab: a "Sales Pages" section or filter (contentFilter=sales-page) shows all division pages with URLs, status (placeholder/live), and engagement previews. |
| **Messaging** | Email and LinkedIn message generation per buying group. This is content generation — it belongs in the Content tab with division \+ type selectors. | Content tab: select division \+ content type (email, LinkedIn). The generation form is the same, just unified under one tab. |
| **Activity (partial)** | Currently shows two things: engagement events (page views, emails) and external signals (product announcements, job postings). These serve different purposes and should be separated. | Engagement tab absorbs engagement events (timeline). Signals tab absorbs external signal cards. |

| Backward Compatibility The tab consolidation ONLY applies when the AE has a configured Adaptive Roadmap. If no Roadmap exists, render the original 10-tab layout. Feature flag: if (user.hasAdaptiveRoadmap) show 6 tabs, else show 10 tabs. |
| :---- |

# **Tab 1: Overview — Division-Centric Home**

## **Current State (From Screenshots)**

Company header with name (General Motors Company), domain (gm.com), industry (automotive manufacturing), 27 contacts, AI Researched badge. ARR metrics: Current $0, Expansion Opportunity $45M, Target ARR $45M. Stage: Engagement. Below that, "Suggested plays" section with four cards: Event Invite (GTC coming up — 2 contacts to invite, Run play →), Open New Buying Group (Autonomous Driving & ADAS has no sales page yet, Run play →), Open New Buying Group (IT Infrastructure has no sales page, Run play →), Event Invite (GTC — 1 contact, Run play →). Chat Agent panel on the right with Account Research (AI Generated).

## **Required State**

### **Company Header (keep, enhance)**

Keep: company name, domain, industry, contact count, AI Researched badge, Chat Agent panel.

Enhance: replace the single "Stage: Engagement" with the Roadmap Objective Bar:

| Objective: Land 2 new NVIDIA use cases at GM Landed: 0/2  |  Active: 2  |  Monitoring: 3 \[====\>                                \] 0% |
| :---- |

Keep ARR metrics as-is for now. Future enhancement: break down by division.

### **Division Cards (replaces Suggested Plays \+ Expansion Canvas)**

Below the header, show the five division cards matching the Dashboard Radar layout. Each card shows:

* **Division name** (full, never truncated)

* **Stage badge** (● Active Program, ○ Expansion Target, ★ Strategic Platform, ◦ Emerging)

* **Contacts:** X of Y personas found

* **Coverage bar** (green \>60%, yellow 30-60%, red \<30%)

* **Sales page status** (LIVE / PLACEHOLDER / Not started)

* **Latest signal** (one-liner with timestamp)

* **Primary CTA** (context-dependent: View Division, Create Page, Research Division)

**Clicking a division card:** Sets the division filter for all other tabs. The tab bar shows a division badge: "Contacts (ADAS)" or "Content (Manufacturing)" so the AE knows the filter is active. Clicking "All Divisions" in the filter dropdown clears it.

### **Recent Signals Panel (replaces Suggested Plays)**

Below the division cards, show the 3-5 most recent signals for this account, tagged by division. Same card format as the Dashboard Hot Signals. This replaces the "Suggested plays" section entirely.

| Remove: Suggested Plays Section The four play cards (Event Invite, Open New Buying Group) with "Run play →" CTAs must be removed when Roadmap is active. These are the most visible legacy elements on the page. The division cards and recent signals panel provide Roadmap-aware alternatives for every action the Suggested Plays offered. |
| :---- |

### **Chat Agent (keep, enhance prompts)**

Keep the Chat Agent panel. Enhance the "Try asking" suggestions to be Roadmap-aware:

**Current suggestions:** 

* "Find contacts at \[company\]"

* "Research \[company\] recent news"

* "Send a test email to \[address\]"

**Required suggestions (Roadmap-aware):** 

* "Research the Manufacturing buying group"

* "Draft an ADAS executive briefing based on the earnings signal"

* "What signals has the system detected for Vehicle Engineering?"

* "Show me contact gaps across all divisions"

The suggestions should reference the AE’s actual divisions and recent signals, not generic templates.

### **Data Sources for Overview Tab**

| Element | Data Source | API Call |
| :---- | :---- | :---- |
| **Company header** | Existing Company model (name, domain, industry) | GET /api/companies/\[id\] (existing) |
| **Objective Bar** | AdaptiveRoadmap.objective (JSON) | GET /api/roadmap/config (new) |
| **Division cards** | Target (targetType=division, parentTargetId=company) \+ Contact counts \+ Content status | GET /api/roadmap/targets?companyId=\[id\] (new) |
| **Recent signals** | AccountSignal matched to Targets via SignalMatch | GET /api/signals?companyId=\[id\]\&limit=5 (enhanced) |
| **Chat Agent prompts** | Generated from Roadmap Targets \+ recent signals | Client-side: build suggestions from Roadmap config data already loaded |

# **Tab 2: Buying Groups — Strategy per Division**

## **Current State**

Shows "Segmentation Strategy" (Strategy: HYBRID, Rationale explaining GM’s complex business segments). Below that, "Departments" section with "Track expansion opportunities by department." Each department shows: name, EXPANSION TARGET badge, empty VALUE PROPOSITION, empty USE CASE, empty ESTIMATED OPPORTUNITY. Buttons: "Find & enrich all segments" and "Discover More."

## **Required State**

This tab stays but reads from Roadmap configuration instead of standalone fields:

| Current Element | Change | Data Source |
| :---- | :---- | :---- |
| **Segmentation Strategy** | Keep. Enhance: show roadmapType classification and how the AI determined the segmentation. "Your Roadmap classified this as enterprise\_expansion with a HYBRID segmentation approach." | AdaptiveRoadmap.roadmapType \+ existing segmentation logic |
| **Departments → Divisions** | Rename section from "Departments" to "Divisions" when Roadmap is active. Each division shows its Roadmap Target configuration. | Target model (where targetType=division) |
| **Value Proposition** | Keep as editable field. Pre-populate from Target.intelligence if available. This is where the AE articulates WHY NVIDIA matters for this specific division. | Target.intelligence.value\_proposition (new field) |
| **Use Case** | Keep as editable field. Pre-populate from Roadmap Target intelligence. "NVIDIA Omniverse for manufacturing digital twins." | Target.intelligence.use\_cases (new field) |
| **Estimated Opportunity** | Keep as editable field. Consider auto-populating from pipeline data if CRM is connected. | Target.intelligence.estimated\_opportunity (new field) or CRM data |
| **EXPANSION TARGET badge** | Replace with the full stage badge from the Roadmap (Expansion Target, Active Program, Strategic Platform, Emerging). The current badge only shows "EXPANSION TARGET" for all divisions, which is incorrect. | Target.stage |
| **"Find & enrich all segments"** | Keep but enhance: should trigger research for all divisions that have empty intelligence. Show progress: "3 of 5 divisions researched." | Batch operation on Target.intelligence |

**Division filter:** When arriving with ?tab=buying-groups\&division=\[divId\], scroll to and highlight the specific division section. Useful when AE clicks a Buying Groups link from the dashboard.

# **Tab 3: Contacts — People \+ Map View**

## **Current State**

Contacts tab: "Contacts by Buying Group — 27 total contacts — Manage Contacts." Groups: Vehicle Engineering & Simulation (Alex Nguyen VP Vehicle Engineering, Priya Srinivasan Director Simulation & Digital Twins, both "Not enriched"), Autonomous Driving & ADAS (Maria Lopez Director ADAS & Safety Systems, David Richardson VP Autonomous Vehicle Engineering, both "Not enriched"). Each group has "Find Contacts" button. Account Map tab (separate): Same contacts in visual card layout per division, with engagement status and LinkedIn/activity buttons.

## **Required State: Merged with View Toggle**

### **Top Bar**

| Contacts                                         27 total contacts   \[All Divisions v\]   \[List View | Map View\]   \[Manage Contacts\]   Buying group coverage: ADAS: 2/3 (67%)  |  Mfg: 1/3 (33%)  |  IT: 2/3 (67%) |  VE\&S: 2/3 (67%)  |  SDV: 0/3 (0%) |
| :---- |

**Division filter dropdown:** "All Divisions" (default), or any of the five divisions. Pre-selected from URL query param. When a division is selected, only contacts in that division are shown.

**View toggle:** \[List View | Map View\]. List View shows the current grouped list layout. Map View shows the current Account Map visual card layout. Same data, different rendering. The toggle is a preference — it persists for the session.

**Coverage summary:** One-line showing buying group coverage per division. Color-coded: green ≥67%, yellow 34-66%, red ≤33%. This line tells the AE at a glance where the contact gaps are.

### **List View (Enhanced)**

Keep the current grouped layout. Add per-group enhancements:

* **Persona gap indicator:** Below the division name, show which persona roles are found and which are missing. "Found: VP Vehicle Engineering, Director Simulation. Missing: IT Architecture Lead." The missing roles come from the Roadmap’s persona template for this roadmapType.

* **Enrichment priority:** Contacts in expansion target divisions show a priority badge. "Not enriched" contacts in expansion targets should show a more urgent enrichment prompt.

* **Find Contacts (enhanced):** When action=find arrives in URL, the Find Contacts modal auto-opens for the specified division. The modal should show the missing persona roles as search suggestions: "Search for VP of AI/ML at General Motors Manufacturing."

### **Map View (Absorbed from Account Map tab)**

Same layout as the current Account Map tab. Each division is a card containing its contacts with: name, title, Decision maker / Influencer / Technical tags, engagement status ("No engagement yet" / "3 page views" / "Email replied"), LinkedIn and View activity buttons. The division filter applies here too.

**Enhancement:** Add the division stage badge (Active Program, Expansion Target, etc.) to each division card header in Map View. This connects the contact view to the Roadmap context.

### **Data Sources**

* **Contact list:** Contact model (new, Roadmap-scoped) OR existing CompanyContact with mapping to division Target via CompanyDepartment

* **Persona template:** AdaptiveRoadmap.personaTemplate (defines which roles are expected per division for this roadmapType)

* **Coverage:** Computed: COUNT(contacts per division) / personaTemplate.length

* **Enrichment:** Existing enrichment status from contact records

# **Tab 4: Content — Unified Content Hub**

This is the most significant merge. Three current tabs (Content, Sales Page, Messaging) become one.

## **Current State (From Screenshots)**

**Content tab:** "Content Generation" with a Buying Group dropdown (defaulting to SDV), Email Copy section ("No email copy generated yet" \+ Generate Email Copy button), LinkedIn Message section (Generate button).

**Sales Page tab:** "AI-Powered Custom Sales Pages" with per-division pages. Vehicle Engineering & Simulation page: URL (localhost:3000/go/general-motors-company-vehicle-nvidia), engagement preview (Visits: 0, Unique Visitors: 0, Chat Interactions: 0, CTA Clicks: 0). GM Demo page with some engagement (4 visits, 3 unique, 1 CTA click). "Create sales page" button.

**Messaging tab:** Per-contact email and LinkedIn generation (not shown in screenshots but exists).

## **Required State: Three Sections in One Tab**

| Content                                          \[All Divisions v\]   \[ Content Library | Create Content | Sales Pages \]   ^sub-tabs within the Content tab |
| :---- |

### **Sub-tab 1: Content Library**

Grid or list of ALL generated content for this account. Each item shows:

* Title (e.g., "ADAS Executive Briefing — AV Investment Signal")

* Division (e.g., "Autonomous Driving & ADAS")

* Type (email, LinkedIn, executive briefing, sales page, one-pager)

* Status (draft, sent, live, placeholder)

* Target contact(s) (who it was generated for)

* Triggering signal (if Plan-generated: "Based on: Q4 earnings call")

* Created date and engagement metrics (opens, clicks, replies)

**Filters:** Division dropdown \+ content type filter \+ status filter. All pre-selectable via URL query params.

### **Sub-tab 2: Create Content**

This is the content generation form. It merges the current Content tab’s generation UI with the Messaging tab’s per-contact generation. When arriving from a Dashboard CTA with signal context, the form is pre-filled.

| Create Content   Division:   \[Autonomous Driving & ADAS    v\]  \<-- pre-selected Type:       \[Executive Briefing           v\]  \<-- pre-selected   ┌────────────────────────────────────────────────────────┐ │  ⚡ Signal Context (auto-loaded from Dashboard)        │ │                                                        │ │  Q4 Earnings Call: Mary Barra referenced $2B           │ │  autonomous vehicle investment as top-3 corporate      │ │  priority. Directly relevant to ADAS division.         │ │                                                        │ │  Source: earnings\_call  |  Confidence: 0.92            │ └────────────────────────────────────────────────────────┘   Target contacts:  \[✓\] David Richardson (VP AV Engineering)                   \[✓\] Maria Lopez (Dir ADAS & Safety)   Roadmap Content Strategy (auto-applied):   Tone: executive\_consultative\_technical   Format: executive\_briefing   Personalization: high (division-specific)     \[Generate\]   \[Save as Draft\]   \[Cancel\] |
| :---- |

**Key behavior:** When the signal query param is present, the Signal Context box appears at the top of the form with the signal summary. This context is injected into the generation prompt alongside the Roadmap’s Content Strategy settings. When no signal param is present, the Signal Context box shows: "No signal context loaded. Browse recent signals for this division?" with a link to the Signals tab.

### **Sub-tab 3: Sales Pages**

Absorbed from the current Sales Page tab. Shows all sales pages for this account, grouped by division:

* Division name \+ page URL \+ status (LIVE / PLACEHOLDER / Not started)

* Engagement preview: Visits, Unique Visitors, Chat Interactions, CTA Clicks

* Actions: Launch/Open, QR Codes, Copy URL, Delete

* "Create sales page" button — creates a placeholder (reserves URL, shows Coming Soon shell) until HTML is provided

**The division filter applies here too.** When arriving with ?contentFilter=sales-page\&division=\[divId\], the Sales Pages sub-tab activates with the division pre-filtered.

# **Tab 5: Engagement — Unified Timeline**

## **Current State**

**Engagement tab:** "Engagement by buying group" table showing per-division metrics: Contacts, New (30d), Emails sent, Meetings, Replies, Invites accepted. Most values are 0 or low. Vehicle Engineering & Simulation shows 2 contacts, 2 new, 2 meetings.

**Activity tab:** "This week at General Motors Company — Key signals and activity updates." Shows two categories: "High-impact buying signals" (Product announcement Score 8: GM expanding Super Cruise — Run Feature Release play) and "Strategic company changes" (Account research updated, Product announcement Score 6: GMC Hummer EV Carbon Edition — Run Re-Engagement play).

## **Required State: Metrics \+ Timeline**

Merge into two sections:

### **Section 1: Division Engagement Summary**

Same table as current Engagement tab, but with division filter and enhanced columns:

| Division               Contacts  Emails  Page Views  Replies  Meetings ─────────────────────────────────────────────────────────────────────── Vehicle Eng & Sim      2         2       3           0        2 ADAS (incl. Cruise)    2         0       1           0        0 IT Infrastructure      1         0       4           0        0 Manufacturing          1         0       0           0        0 Software-Defined       1         0       0           0        0 |
| :---- |

Add columns: Page Views (from sales page analytics), Signals (count of signals detected per division). Remove: "Invites accepted" (move to event tracking when Conditions engine is built).

### **Section 2: Activity Timeline**

Chronological feed of all engagement and outreach events for this account. Each event shows: type icon, description, division tag, contact (if applicable), timestamp.

* Page view: "👁 mark.haener@gm.com viewed IT Infrastructure page (3rd time) — IT Infrastructure — Today"

* Email sent: "✉️ Executive briefing sent to David Richardson — ADAS — 2 days ago"

* Content generated: "📄 Sales page placeholder created — Vehicle Engineering — 3 days ago"

* Contact added: "👤 Maria Lopez added to ADAS buying group — ADAS — 1 week ago"

**This section does NOT include external signals** (job postings, earnings calls, news). Those live in the Signals tab. The Engagement timeline only shows actions taken by the AE or engagement from contacts (page views, email opens, replies, meetings).

| Remove from Activity The current Activity tab’s signal cards with "Run Feature Release play" and "Run Re-Engagement play" CTAs are removed. External signals move to the new Signals tab. Engagement events move to the timeline here. Nothing in this tab should say "Run \[X\] play." |
| :---- |

# **Tab 6: Signals — Intelligence Layer Transparency**

This is a NEW tab. It absorbs the signal portion of the current Activity tab and adds Roadmap intelligence context: Plan status, match info, and signal-to-Plan conversion metrics.

## **What It Shows**

| Signals                                  \[All Divisions v\]   This month: 12 signals | 8 Plans generated | 5 approved | 2 executed ─────────────────────────────────────────────────────────────────   ┌───────────────────────────────────────────────────────────────┐ │  📊 EARNINGS CALL  |  HIGH-IMPACT  |  3 hours ago         │ │  Mary Barra mentioned $2B AV investment                    │ │  Division: Autonomous Driving & ADAS                       │ │                                                             │ │  Plan: Executive briefing drafted ✔ EXECUTED                │ │  Matched rule: earnings\_call \+ "autonomous" \+ "investment"  │ │  Confidence: 0.92                                          │ │                                                             │ │  \[View Briefing\]   \[View Transcript\]                       │ └───────────────────────────────────────────────────────────────┘   ┌───────────────────────────────────────────────────────────────┐ │  💼 JOB POSTING  |  STRATEGIC  |  2 days ago               │ │  GM posted 3 AI/ML Engineer roles in Manufacturing         │ │  Division: Manufacturing & Supply Chain                     │ │                                                             │ │  Plan: Research buying group ⏳ PENDING                     │ │  (downgraded from outreach — only 1 of 3 contacts found)  │ │  Matched rule: job\_posting \+ "AI" \+ "manufacturing"        │ │  Confidence: 0.85                                          │ │                                                             │ │  \[Approve Plan\]   \[View Jobs\]   \[Dismiss\]                  │ └───────────────────────────────────────────────────────────────┘ |
| :---- |

Each signal card shows:

* **Signal type \+ priority:** Icon \+ badge (HIGH-IMPACT, STRATEGIC, ROUTINE) \+ timestamp

* **Signal summary:** Human-readable description of what the system detected

* **Division tag:** Which division this signal was matched to

* **Plan status:** What the Roadmap did with this signal: EXECUTED (✔), PENDING (⏳), DISMISSED (✖), or NO PLAN (with reason: "No matching SignalRule" or "Context insufficient")

* **If Plan was downgraded:** Show why: "Downgraded from outreach to research — only 1 of 3 contacts found." This is the no-generic-fallback rule made visible.

* **Match transparency:** Matched rule name, matched keywords, confidence score. The AE can see exactly why the system flagged this signal.

* **CTAs:** Plan-aware: \[Approve Plan\], \[View Briefing\], \[Draft Response\] — never "Run \[X\] play."

## **Data Sources**

* **Signal cards:** AccountSignal \+ SignalMatch (linking signal to Target via matching rules)

* **Plan status:** Plan model (FK to signal, target, action mapping). Status enum: pending, approved, dismissed, executed

* **Match info:** Plan.matchInfo JSON (matched rule, keywords, confidence, match type)

* **Conversion metrics:** Computed from Plan data: signals with Plans / total signals per time period

# **Shared Division Filter: Cross-Tab Persistence**

All six tabs share a division filter. When the AE selects a division (from a card on Overview, or from the dropdown on any tab), that filter persists across tab switches. This is the single most important UX detail for the Roadmap experience.

## **How It Works**

1. **AE clicks a division card on Overview (e.g., ADAS).** The division filter is set to ADAS.

1. **AE switches to the Contacts tab.** The Contacts tab shows only ADAS contacts. The tab label shows "Contacts (ADAS)" or a filter badge.

1. **AE switches to the Content tab.** The Content tab shows only ADAS content. The division dropdown is pre-set to ADAS.

1. **AE clicks "All Divisions" in the dropdown.** The filter clears. All tabs return to showing all divisions.

## **Implementation**

| // Division filter state lives at the page level, // shared across all tab components   const \[selectedDivision, setSelectedDivision\] \=   useState(searchParams.division || 'all');   // Update URL when filter changes (for bookmarking) useEffect(() \=\> {   const params \= new URLSearchParams(window.location.search);   if (selectedDivision \=== 'all') {     params.delete('division');   } else {     params.set('division', selectedDivision);   }   window.history.replaceState({}, '', \`?${params}\`); }, \[selectedDivision\]);   // Pass to all tab components \<ContentTab division={selectedDivision} ... /\> \<ContactsTab division={selectedDivision} ... /\> \<EngagementTab division={selectedDivision} ... /\> \<SignalsTab division={selectedDivision} ... /\> |
| :---- |

**Tab label enhancement:** When a division filter is active, each tab label should show an indicator. Options: "Contacts • ADAS" or a small colored dot matching the division’s stage color. This prevents the AE from forgetting a filter is active.

# **Migration Plan: Files to Change**

This section maps the tab consolidation to the existing codebase. Each change is scoped to minimize risk while delivering the full consolidation.

| File / Component | Change | Risk |
| :---- | :---- | :---- |
| **CompanyTabBar.tsx** | Conditionally render 6 tabs (if Roadmap active) or 10 tabs (legacy). Read user.hasAdaptiveRoadmap flag. | Low — conditional rendering only |
| **OverviewTab.tsx** | Add Objective Bar \+ Division Cards. Remove Suggested Plays section. Add Recent Signals panel. Enhance Chat Agent prompts. | Medium — significant UI changes but existing data sources |
| **ContactsTab.tsx** | Add division filter dropdown \+ view toggle (List/Map). Add coverage summary bar. Add persona gap indicators. Import Account Map rendering as Map View. | Medium — merging two existing views |
| **ContentTab.tsx** | Add sub-tabs (Library, Create, Sales Pages). Move Sales Page management into Sales Pages sub-tab. Move Messaging generation into Create sub-tab. Add signal context loading from URL params. Add Content Strategy auto-application. | High — largest merge, most component changes |
| **EngagementTab.tsx** | Add Activity Timeline section below existing metrics table. Import engagement events from Activity tab. Add division filter. Remove signal cards (move to Signals tab). | Medium — merging two data sources |
| **NEW: SignalsTab.tsx** | New component. Signal cards with Plan status, match info, division tags. Conversion metrics bar. Division filter. Plan-aware CTAs. | Medium — new component but data sources exist |
| **ExpansionTab.tsx** | Hide when Roadmap active (its content is in Overview). Keep for legacy mode. | Low — conditional hide |
| **AccountMapTab.tsx** | Hide when Roadmap active (its content is in Contacts Map View). Keep for legacy mode. | Low — conditional hide |
| **SalesPageTab.tsx** | Hide when Roadmap active (its content is in Content → Sales Pages). Keep for legacy mode. | Low — conditional hide |
| **MessagingTab.tsx** | Hide when Roadmap active (its content is in Content → Create). Keep for legacy mode. | Low — conditional hide |
| **CompanyPage.tsx (parent)** | Add shared division filter state. Read URL query params (tab, division, type, signal, action). Pass to child tab components. See Spec 1 for full param spec. | Medium — state management change at page level |

# **Summary**

| \# | New Tab | Absorbs | Key Enhancement | Biggest Change |
| :---- | :---- | :---- | :---- | :---- |
| **1** | **Overview** | \+ Expansion | Division cards replace Suggested Plays | Remove all "Run play" CTAs. Add Objective Bar. |
| **2** | Buying Groups | (enhanced) | Reads from Roadmap Targets | Stage badges from Roadmap. Value prop fields. |
| **3** | **Contacts** | \+ Account Map | List/Map view toggle. Coverage gaps. | Persona gap indicators. Find Contacts auto-trigger. |
| **4** | Content | \+ Sales Page \+ Messaging | Signal context pre-loading. Content library. | Three sub-tabs. Signal-driven generation. |
| **5** | **Engagement** | \+ Activity (events) | Metrics \+ timeline in one view. | Remove signal cards. No "Run play" CTAs. |
| **6** | Signals | NEW (from Activity signals) | Plan status, match transparency. | Entirely new tab. Intelligence layer visible. |

| Cross-Reference This spec references the URL query parameters and deep link patterns from Spec 1 (User Workflow & Navigation Architecture). The Content tab’s signal context pre-loading, the Contacts tab’s auto-find behavior, and the division filter persistence all depend on the URL param spec defined there. Next: Spec 3 (Five Dashboard Gaps) and Spec 4 (Legacy Cleanup). |
| :---- |

