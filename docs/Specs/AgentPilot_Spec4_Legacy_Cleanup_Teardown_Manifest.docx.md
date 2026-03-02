

**AgentPilot**  
Legacy Cleanup

Teardown Manifest

Everything That Gets Removed, Renamed, or Replaced

Production Spec 4 of 4  |  February 2026  |  Confidential

# **Context: Clean Slate**

AgentPilot has zero production users. There is no installed base to protect, no backward compatibility requirement, no feature flags, and no dual-mode rendering. Every legacy element identified in this document should be deleted outright, not hidden behind a conditional. The Adaptive Roadmap is the product. The old play-based architecture is scaffolding that served its purpose and now gets torn down.

| No Feature Flags. No Legacy Mode. No Dual Rendering. Previous specs (1-3) mentioned backward compatibility as a precaution. Disregard all backward compatibility notes in those documents. There is no "if user has Roadmap, show 6 tabs; else show 10 tabs." There are 6 tabs. There is no "Suggested plays section hidden when Roadmap active." There is no Suggested plays section. Delete the code. Delete the components. Delete the API routes that only served the old architecture. If a database table is only used by the play system and has no Roadmap equivalent, drop it from the schema. |
| :---- |

This document is organized into five categories: vocabulary (words that must change), UI elements (components that must be removed), tabs (pages that must be deleted), API routes (endpoints that must be retired), and database (tables/columns that can be dropped). Each item has a verdict: DELETE, RENAME, or REPLACE.

# **Category 1: Vocabulary Teardown**

The word "play" and its derivatives must be eliminated from the entire codebase, UI, API, and database. This is not cosmetic — the vocabulary signals the architecture. If a prospect sees "Run play" anywhere, the Adaptive Sales Map story collapses.

| Old Term | New Term | Where It Appears | Verdict |
| :---- | :---- | :---- | :---- |
| **Play** | Plan | CTAs, cards, code, API, DB | RENAME everywhere |
| **Run play →** | \[context-specific CTA\] | Every play card on every page | DELETE the generic CTA. Replace with Draft Follow-Up, Research Buying Group, etc. |
| **Suggested plays** | (removed entirely) | Target Company Overview tab | DELETE. Replaced by Division Cards \+ Recent Signals. |
| **Run Feature Release play** | \[View Plan\] or \[Draft Response\] | Activity tab signal cards | DELETE. Signals tab handles this now. |
| **Run Re-Engagement play** | \[Draft Follow-Up\] | Activity tab signal cards | DELETE. Engagement timeline \+ Signals tab handle this. |
| **Open New Buying Group** | \[Research Buying Group\] or \[Create Sales Page\] | Overview Suggested plays section | DELETE. NBA engine recommends this contextually. |
| **Event Invite** | (removed as play type) | Overview Suggested plays section | DELETE. Events handled by Conditions & Modifiers in the Roadmap. |
| **Play configuration** | Roadmap configuration | Settings, code comments | RENAME in code and any settings UI |
| **Play health** | Roadmap Health | Any analytics or dashboard | RENAME |
| **Plays Library** | (removed entirely) | If it exists anywhere | DELETE. The Roadmap IS the library. There is no template catalog. |
| **Department** | Division | Buying Groups tab, Contacts, Engagement | RENAME in UI labels. Data model keeps CompanyDepartment for now but UI shows "Division." |
| **Microsegment** | Division | Expansion Canvas | RENAME. "5 microsegments" becomes "5 divisions." |
| **Segment page** | Sales page | Expansion Canvas CTAs | RENAME. "Create segment page" becomes part of Content tab. |
| **Drive engagement** | \[context-specific CTA\] | Expansion Canvas cards | DELETE. Replaced by NBA-driven CTAs. |

## **Grep Audit**

Run these searches across the entire codebase. Every match must be addressed:

| \# Find all play references in UI-facing code grep \-rni 'play' \--include='\*.tsx' \--include='\*.ts' \\   \--include='\*.jsx' \--include='\*.js' \\   src/ app/ components/ lib/ | grep \-vi 'display\\|replay'   \# Find all "Run" CTAs grep \-rni 'Run.\*play\\|run.\*play' \\   \--include='\*.tsx' \--include='\*.ts' src/ app/   \# Find all microsegment references grep \-rni 'microsegment\\|micro.segment' \\   \--include='\*.tsx' \--include='\*.ts' src/ app/   \# Find "Drive engagement" CTAs grep \-rni 'drive.\*engagement\\|Drive.\*engagement' \\   \--include='\*.tsx' \--include='\*.ts' src/ app/   \# Find "segment page" references grep \-rni 'segment.\*page\\|Segment.\*page' \\   \--include='\*.tsx' \--include='\*.ts' src/ app/   \# Expected result after cleanup: ZERO matches \# for all of the above |
| :---- |

# **Category 2: UI Elements to Delete**

These are specific visual components and sections that must be removed from the application.

| Element | Location | Replacement | Action |
| :---- | :---- | :---- | :---- |
| **"Suggested plays" section (4 play cards: Event Invite x2, Open New Buying Group x2)** | Target Company → Overview tab | Division Cards (from Spec 2\) \+ Recent Signals panel | DELETE entire section. Delete the SuggestedPlays component. |
| **"Run play →" button component** | Used on every play card | Context-specific CTAs per Spec 1 link map | DELETE the RunPlayButton component entirely. |
| **Play card component (dark background card with play name, description, Run play CTA)** | Overview tab, possibly Dashboard | NBA Plan cards (from Spec 3\) | DELETE the PlayCard component. Create PlanCard component. |
| **"Run Feature Release play" button** | Activity tab signal cards | \[View Plan\] or \[Draft Response\] | DELETE. Replace with Plan-aware CTA in Signals tab. |
| **"Run Re-Engagement play" button** | Activity tab signal cards | \[Draft Follow-Up\] | DELETE. Replace with Plan-aware CTA in Engagement timeline. |
| **"View research" button on strategic signals** | Activity tab | \[View Signal\] in Signals tab | REPLACE. Keep the action concept but route to Signals tab with match info. |
| **Expansion Canvas (3-column: Identified / Live & engaged / High-potential)** | Target Company → Expansion tab | Division Cards on Overview tab | DELETE the entire ExpansionCanvas component. The Overview’s division cards with stage badges serve the same purpose. |
| **"Create segment page" button** | Expansion Canvas cards | \[Create Sales Page\] in Content tab | DELETE. Content tab handles all page creation. |
| **"Drive engagement" button** | Expansion Canvas cards | NBA-driven CTAs on division cards | DELETE. |
| **"EXPANSION TARGET" badge (uniform for all divisions)** | Buying Groups tab | Stage-specific badges: Expansion Target, Active Program, Strategic Platform, Emerging | REPLACE with Roadmap stage badge from Target.stage. |
| **Generic stats bar ("ACCOUNTS TRACKED: 1, CONTACTS: 27")** | Dashboard top | Roadmap-aware stats: Divisions Tracked, Buying Groups Mapped, Signals This Week, etc. | REPLACE entire stats bar with Roadmap stats (see Spec 3 reference UI). |
| **Chat Agent "Try asking" generic prompts** | Target Company Overview, Chat Agent panel | Roadmap-aware prompts: "Research Manufacturing buying group", "Draft ADAS briefing" | REPLACE. Generate from Roadmap Targets \+ recent signals. |
| **"Find & enrich all segments" button** | Buying Groups tab | "Research all divisions" with progress indicator | RENAME and enhance. Show "3 of 5 divisions researched" progress. |

# **Category 3: Tabs to Delete**

Per Spec 2, the Target Company page goes from 10 tabs to 6\. With no backward compatibility requirement, the 4 removed tabs should be deleted entirely, not hidden.

| Tab to Delete | Content Absorbed By | Component File(s) | Action |
| :---- | :---- | :---- | :---- |
| **Expansion** | Overview tab (division cards with stages \= the expansion view) | ExpansionTab.tsx, ExpansionCanvas.tsx, and any child components | DELETE all files. Remove from tab bar config. Remove route. |
| **Account Map** | Contacts tab (Map View toggle) | AccountMapTab.tsx and child components | MOVE rendering logic into ContactsTab.tsx as a view mode. DELETE the standalone tab file. Remove from tab bar. |
| **Sales Page** | Content tab (Sales Pages sub-tab) | SalesPageTab.tsx and child components | MOVE page management UI into ContentTab.tsx as a sub-tab. DELETE the standalone tab file. Remove from tab bar. |
| **Messaging** | Content tab (Create Content sub-tab) | MessagingTab.tsx and child components | MOVE generation form into ContentTab.tsx as part of the Create Content sub-tab. DELETE the standalone tab file. Remove from tab bar. |
| **Activity (full tab)** | Split: engagement events → Engagement tab timeline. Signals → new Signals tab. | ActivityTab.tsx and child components | DELETE the tab. Create new SignalsTab.tsx for signal cards. Move engagement events into EngagementTab.tsx timeline section. |

## **Tab Bar Configuration**

| // BEFORE: 10 tabs const LEGACY\_TABS \= \[   'Overview', 'Buying Groups', 'Contacts',   'Sales Page', 'Engagement', 'Activity',   'Messaging', 'Content', 'Expansion', 'Account Map' \];   // AFTER: 6 tabs (DELETE the old config entirely) const TABS \= \[   { key: 'overview',       label: 'Overview' },   { key: 'buying-groups',  label: 'Buying Groups' },   { key: 'contacts',       label: 'Contacts' },   { key: 'content',        label: 'Content' },   { key: 'engagement',     label: 'Engagement' },   { key: 'signals',        label: 'Signals' }, \];   // No conditional. No feature flag. // This IS the tab configuration. |
| :---- |

# **Category 4: API Routes to Retire or Replace**

Any API endpoint that only served the play-based architecture should be deleted. Endpoints that serve both old and new architectures should be refactored to serve the Roadmap only.

| Endpoint | Verdict | Reason | Replacement (if any) |
| :---- | :---- | :---- | :---- |
| **GET /api/plays** | DELETE | Returns play templates. No longer used. | None. Plans are generated by the engine, not fetched from a template library. |
| **GET /api/plays/\[playId\]** | DELETE | Returns a single play config. | None. |
| **POST /api/plays/\[playId\]/run** | DELETE | "Run play" execution endpoint. | POST /api/roadmap/plans/\[planId\]/execute — Plan execution replaces play running. |
| **GET /api/plays/suggestions?companyId=** | DELETE | Returns suggested plays for Overview tab. | GET /api/roadmap/plans?companyId= — NBA engine generates Plans. |
| **GET /api/companies/\[id\]/activity** | REPLACE | Returns mixed engagement events \+ signals. Needs to be split. | GET /api/companies/\[id\]/engagement (events only) \+ GET /api/companies/\[id\]/signals (signals with Plan status). |
| **GET /api/companies/\[id\]/expansion** | DELETE | Returns Expansion Canvas data. Replaced by division cards. | GET /api/roadmap/targets?companyId=\[id\] returns division Targets with stages. |
| **GET /api/dashboard/suggested-plays** | DELETE | Dashboard play suggestions. | GET /api/dashboard/plans — NBA Plans from the engine. |
| **GET /api/dashboard/signals (current)** | REPLACE | Returns signals without division context. | Enhance per Spec 3 Gap 1: add division resolution, Plan status, CTA mapping to response. |

## **New API Routes Required**

These endpoints must be created to support the Roadmap architecture:

| New Endpoint | Purpose |
| :---- | :---- |
| **GET /api/roadmap/config** | Returns the AE’s Roadmap configuration: objective, content strategy, persona template, conditions. Used by Dashboard Objective Bar and Content tab. |
| **GET /api/roadmap/targets?companyId=** | Returns all division Targets for a company with: stage, contacts count, coverage, sales page status, latest signal. Powers division cards on both Dashboard and Overview tab. |
| **GET /api/roadmap/plans?companyId=** | Returns NBA Plans for a company, computed by the decision tree in Spec 3 Gap 2\. Includes action type, urgency, recommendation text, primary CTA with destination URL. |
| **POST /api/roadmap/plans/\[planId\]/execute** | Marks a Plan as executed. Logs what action was taken (content generated, contacts added, etc.). Triggers NBA recomputation for the affected division. |
| **POST /api/roadmap/plans/\[planId\]/dismiss** | Dismisses a Plan. Captures reason (not\_relevant, bad\_timing, wrong\_target, duplicate, already\_handled, other). Feeds the feedback loop. |
| **GET /api/companies/\[id\]/signals** | Returns signals for a company with division tags, Plan status, match info. Powers the new Signals tab on the Target Company page. |
| **GET /api/companies/\[id\]/engagement** | Returns engagement events only (page views, email opens, replies, meetings) grouped by division. Powers the Engagement tab. |
| **GET /api/roadmap/health** | Returns computed Roadmap Health metrics: signal-to-Plan rate, buying group coverage, content readiness, engagement velocity. Powers the Health panel. |
| **POST /api/roadmap/targets/\[targetId\]/sales-page** | Creates a sales page placeholder for a division. Generates URL slug, creates Content record with status=placeholder. Returns the placeholder URL. |

# **Category 5: Database Schema Cleanup**

With no production data to migrate, database changes can be made directly. No migration scripts needed for preserving existing records.

| Table / Column | Verdict | Reason | Notes |
| :---- | :---- | :---- | :---- |
| **Play (table)** | DROP | Play template definitions. Replaced by AdaptiveRoadmap \+ ActionMapping. | Ensure no FK references remain. Check seeders. |
| **PlayExecution (table)** | DROP | Play execution history. Replaced by Plan (with status tracking). | Any analytics that reference PlayExecution should be updated to query Plan. |
| **PlaySuggestion (table)** | DROP | Suggested plays for a company. Replaced by NBA Plan engine. | Delete seeders that populate this table. |
| **AccountSignal.playId (column)** | DROP column | FK to Play table being dropped. | Replace with AccountSignal references via SignalMatch → Plan. |
| **AccountSignal.suggestedPlayType (column)** | DROP column | "Feature Release", "Re-Engagement" etc. Plan engine determines actions now. | Delete the enum type too if it’s defined. |
| **CompanyDepartment (table)** | KEEP for now | Still used for signal division resolution (Step 2 in the pipeline). Will be replaced by Target model long-term. | Add a targetId FK column to map departments to Roadmap Targets. |
| **Content.playId (column)** | DROP column | FK to Play table being dropped. | Replace with Content.planId (FK to Plan) and Content.targetId (FK to division Target). |
| **Content.playType (column)** | DROP column | "event\_invite", "new\_buying\_group", etc. Content types are now determined by the generation form. | Replace with Content.contentType enum: email, linkedin, executive\_briefing, sales\_page, one\_pager. |

## **New Tables Required**

These tables were specified in the Data Model Addendum document. Confirming they must exist:

* **AdaptiveRoadmap** — the AE’s Roadmap configuration (objective, content strategy, persona template, conditions)

* **Target** — company and division targets (stage, intelligence, health score, last signal)

* **Contact** — Roadmap-scoped contacts with persona role and relationship stage

* **SignalRule** — signal matching rules (keywords, conditions, target actions)

* **ActionMapping** — signal → action definitions

* **Plan** — generated recommendations (signal \+ target \+ action \+ status \+ feedback)

* **SignalMatch** — linking AccountSignal to Target via matching (confidence, method, keywords)

# **Category 6: Sidebar Navigation**

The left sidebar navigation must be updated to reflect the new architecture.

| Current Sidebar Item | New Sidebar Item | Notes |
| :---- | :---- | :---- |
| **Dashboard** | Dashboard | KEEP. This is the Roadmap-powered dashboard specified in Specs 1-3. |
| **Your Roadmap** | Your Sales Map | RENAME. This is the Roadmap configuration page where the AE sets up their objective, targets, signals, and content strategy. |
| **Demo setup** | (evaluate) | KEEP for internal use during demo prep. Consider removing or moving to a /settings route for production. |
| **Waitlist** | (evaluate) | Marketing feature. Keep if active. Not related to Roadmap architecture. |
| **Target companies** | Target Accounts | RENAME from "companies" to "accounts" for enterprise sales terminology. The 6-tab Target Company page lives here. |
| **Create content** | (evaluate for removal) | Content creation is now handled within the Target Company → Content tab, contextual to a specific division. A standalone "Create content" page without account context goes against the Roadmap principle. Consider removing and routing to the Content tab of the most recently viewed account. |
| **Your company data** | Your Company Data | KEEP. Company profile data that feeds the Content Strategy in the Roadmap. |
| **Analytics** | Analytics | KEEP. Enhance with Roadmap Health metrics from Spec 3 Gap 5\. |
| **Webhooks** | Webhooks | KEEP. Signal ingestion infrastructure. |
| **Settings** | Settings | KEEP. |
| **Billing** | Billing | KEEP. |

# **File Deletion Checklist**

This is the master checklist for the dev team. Every file listed below should be deleted from the repository. Group by category and execute in this order to minimize broken imports.

## **Phase 1: Delete Play System (no dependencies on new code)**

1. Delete Play model/schema definition and all Play-related Prisma schema entries

1. Delete PlayExecution model/schema

1. Delete PlaySuggestion model/schema

1. Delete /api/plays/ route directory and all sub-routes

1. Delete /api/dashboard/suggested-plays route

1. Delete SuggestedPlays.tsx component

1. Delete PlayCard.tsx component

1. Delete RunPlayButton.tsx component

1. Delete any Play-related lib/ utility files (play-engine.ts, play-suggestions.ts, etc.)

1. Delete Play-related seeders and seed data

1. Run Prisma migration to drop Play, PlayExecution, PlaySuggestion tables

1. Drop playId and suggestedPlayType columns from AccountSignal

1. Drop playId and playType columns from Content

## **Phase 2: Delete Redundant Tabs (after new tabs are built)**

1. Delete ExpansionTab.tsx and ExpansionCanvas.tsx and all Expansion child components

1. Delete AccountMapTab.tsx (after Map View is implemented in ContactsTab)

1. Delete SalesPageTab.tsx (after Sales Pages sub-tab is implemented in ContentTab)

1. Delete MessagingTab.tsx (after Create Content sub-tab is implemented in ContentTab)

1. Delete ActivityTab.tsx (after Signals tab and Engagement timeline are built)

1. Update CompanyTabBar.tsx: remove all references to deleted tabs, set the 6-tab config

## **Phase 3: Vocabulary Sweep (after all components are updated)**

1. Run the grep audit commands from Category 1

1. Replace every remaining "play" reference with the correct Roadmap term

1. Replace "microsegment" with "division" in all UI strings

1. Replace "segment page" with "sales page" in all UI strings

1. Replace "Drive engagement" CTAs with Roadmap-aware CTAs

1. Update sidebar navigation labels ("Your Roadmap" → "Your Sales Map", "Target companies" → "Target Accounts")

1. Final grep audit: confirm zero matches for all legacy terms

# **Acceptance: The Zero-Legacy Test**

When the cleanup is complete, the following test must pass. Walk through the entire application and verify:

1. The word "play" does not appear anywhere in the UI (buttons, labels, tooltips, toast messages, error messages, loading states)

1. The word "play" does not appear in any API response payload

1. The Target Company page has exactly 6 tabs: Overview, Buying Groups, Contacts, Content, Engagement, Signals

1. No tab in the application shows "Run \[anything\] play" as a CTA

1. The Overview tab shows Division Cards, not Suggested Plays

1. The Expansion tab does not exist

1. The Account Map tab does not exist (Map View is a toggle inside Contacts)

1. The Activity tab does not exist (split into Engagement timeline \+ Signals tab)

1. The Sales Page tab does not exist (inside Content → Sales Pages sub-tab)

1. The Messaging tab does not exist (inside Content → Create Content sub-tab)

1. "Your Roadmap" sidebar label reads "Your Sales Map"

1. "Target companies" sidebar label reads "Target Accounts"

1. The Database has no Play, PlayExecution, or PlaySuggestion tables

1. grep \-rni 'play' in the codebase returns zero results (excluding node\_modules, .git, and words like "display" or "replay")

| End of Spec Series This completes the 4-spec series:Spec 1: User Workflow & Navigation Architecture — where every link goesSpec 2: Target Company Tab Consolidation — 10 tabs → 6 tabsSpec 3: Five Dashboard Gaps — data sources, APIs, acceptance criteriaSpec 4: Legacy Cleanup (this document) — teardown manifestTogether, these four documents give the dev team everything needed to rebuild the Target Company page and Dashboard around the Adaptive Sales Map architecture. No feature flags. No legacy mode. Ship it. |
| :---- |

