

**AgentPilot**  
User Workflow &

Navigation Architecture

Where Every Dashboard Link Goes

Production Spec 1 of 4  |  February 2026  |  Confidential

# **Core Principle: No Blank Forms, No Dead Ends**

Every clickable element on the Dashboard must route the AE to a specific location in the app with context already loaded. The Roadmap tells the AE what to do; the destination page is where they do it. If an AE clicks a button and lands on a blank form wondering "what do I do here?", the navigation has failed.

| The Three Rules of Dashboard Navigation Rule 1: Every CTA deep-links to a specific tab on the Target Company page, pre-filtered to the correct division.Rule 2: Signal-triggered CTAs pre-load signal context into content generation forms so the AE never starts from scratch.Rule 3: Action-triggered CTAs auto-open the relevant modal or form (e.g., Find Contacts, Create Sales Page) so the AE doesn’t have to navigate once they arrive. |
| :---- |

# **The AE’s Morning Workflow (5 Minutes)**

This is the complete user journey for a Monday morning. The AE opens AgentPilot, and within 5 minutes has reviewed signals, taken action on two recommendations, and knows exactly what to do for the rest of the day.

## **Step 1: Land on Dashboard — See the Objective**

**What the AE sees:** The Objective Bar at the top: "Land 2 new NVIDIA use cases at GM | 0 of 2 landed | ADAS: Active | Manufacturing: Expansion Target." Below that, the stats bar: "5 divisions tracked | 7 of 15 contacts found | 5 signals this week."

**What the AE does:** Scans the numbers. Immediately knows where they stand. No clicking required.

**URL:** /dashboard

## **Step 2: Scan Hot Signals — Know What Happened**

**What the AE sees:** Left column shows 5 signal cards, each tagged to a division:

* "Mary Barra mentioned $2B AV investment in earnings call" — Autonomous Driving & ADAS

* "GM posted 3 AI/ML Engineer roles in Manufacturing" — Manufacturing & Supply Chain

* "mark.haener@gm.com viewed IT Infrastructure page (3rd time)" — IT Infrastructure

* "VP of Simulation posted about digital twin initiatives" — Vehicle Engineering

* "GM announces partnership with Qualcomm for cockpits" — Software-Defined Vehicle

**What the AE does:** Reads the signals. Notes the earnings call is relevant to ADAS (expansion target). Notes the job postings validate Manufacturing investment. Moves to the recommendations.

## **Step 3: Review \#1 Recommended Plan — Take Action**

**What the AE sees:** Center column, first card: "Autonomous Driving & ADAS — Active Program. 2 contacts identified but no executive-level content. Recent earnings signal mentions $2B AV investment. Recommended: Draft an executive briefing for the ADAS buying group. Advances objective: Land 2 new NVIDIA use cases at GM."

**What the AE clicks:** \[Draft Executive Briefing\]

| Where This Links To Destination: /dashboard/companies/\[gmId\]?tab=content\&division=\[adasDivId\]\&type=executive-briefing\&signal=\[earningsSignalId\]What loads: The Target Company page opens to the Content tab. Division dropdown is pre-set to "Autonomous Driving & ADAS." Content type selector is pre-set to "Executive Briefing." The signal context area shows: "Generating based on signal: Q4 Earnings — Mary Barra referenced $2B autonomous vehicle investment as top-3 corporate priority." The AE reviews the pre-loaded context, optionally selects target contacts (David Richardson, Maria Lopez), and clicks Generate. |
| :---- |

## **Step 4: Content Generated — Return to Dashboard**

**What happens:** The system generates an executive briefing using the Roadmap’s Content Strategy (tone: executive\_consultative\_technical, format: executive\_briefing). The Plan status updates from "pending" to "executed." The AE can review, edit, and send directly, or return to the Dashboard.

**How the AE returns:** "Back to Dashboard" link in the breadcrumb, or browser back. The Dashboard reflects the update: the ADAS Plan card now shows a checkmark and "Executed — Executive briefing generated."

**URL on return:** /dashboard

## **Step 5: Review \#2 Recommended Plan — Research**

**What the AE sees:** Second card: "Manufacturing & Supply Chain — Expansion Target. 1 of 3 buying group contacts identified. Recent signal: 3 AI/ML jobs posted. Recommended: Research the buying group to identify VP of AI/ML, LOB Owner, and IT Architecture Lead before outreach. Advances objective: Land 2 new NVIDIA use cases at GM."

**What the AE clicks:** \[Research Buying Group\]

| Where This Links To Destination: /dashboard/companies/\[gmId\]?tab=contacts\&division=\[mfgDivId\]\&action=findWhat loads: The Target Company page opens to the Contacts tab. Division filter is pre-set to "Manufacturing & Supply Chain." Because action=find is in the URL, the "Find Contacts" button is auto-triggered or highlighted. The AE sees the current 1 contact (e.g., "Manufacturing Ops Director") and a prompt: "Your Roadmap needs 3 personas for this division: VP of AI/ML, LOB Owner, IT Architecture Lead. 1 of 3 found." The AE uses Find Contacts to search for and add the missing personas. |
| :---- |

## **Step 6: Contacts Added — Return to Dashboard**

**What happens:** AE finds and adds 2 new contacts to the Manufacturing division. The Contact model updates: coverage goes from 33% to 100%. The Plan status for the Research task updates to "executed."

**Dashboard reflects changes:** Manufacturing Radar card updates from "1 identified, 33%" to "3 identified, 100%." The NBA for Manufacturing changes from "Research buying group" to "Create a division-specific sales page — buying group is mapped." Today’s Tasks reprioritizes.

## **Step 7: Continue Through Today’s Tasks**

**What the AE sees:** Today’s Tasks in the bottom section, ordered by priority:

1. **"Follow up with mark.haener@gm.com"** — IT Infrastructure — Viewed page 3 times this week — Maintain strategic platform relationship

1. **"Draft LinkedIn connection request to VP of Simulation"** — Vehicle Engineering — Posted about digital twin platforms — Expansion target, NVIDIA Omniverse fit

1. **"Create competitive brief for SDV division"** — Software-Defined Vehicle — Qualcomm partnership announced — Monitor emerging competitive threat

**Each task click:** Routes to the specific tab and division, pre-loaded with context. No blank forms.

# **Complete Link Map: Every Dashboard CTA**

This table maps every clickable element on the Dashboard to its exact destination in the app. Dev team should use these URL patterns for all routing.

## **Hot Signals → Destinations**

| Signal Type | CTA | URL Pattern | What Pre-Loads |
| :---- | :---- | :---- | :---- |
| **Page View** | \[Draft Follow-Up\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=email\&signal=\[sigId\] | Content tab, division pre-selected, email type, signal context loaded |
| **Page View** | \[View in Division\] | /companies/\[id\]?tab=overview\&division=\[divId\] | Overview tab scrolled to the division card |
| **New Contact** | \[Add to Buying Group\] | /companies/\[id\]?tab=contacts\&division=\[divId\]\&action=add\&contactName=\[name\] | Contacts tab, division filtered, add contact modal open with name pre-filled |
| **New Contact** | \[View Profile\] | External: LinkedIn profile URL from signal data | Opens LinkedIn in new tab |
| **Job Posting** | \[View Plan\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=email\&signal=\[sigId\] | Content tab with signal context: job posting details pre-loaded into outreach prompt |
| **Job Posting** | \[View Jobs\] | External: source URL from signal.sourceUrl | Opens job listing page in new tab |
| **Earnings Call** | \[Draft Executive Briefing\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=executive-briefing\&signal=\[sigId\] | Content tab, division pre-selected, executive briefing type, earnings context loaded |
| **Earnings Call** | \[Read Transcript\] | External: earnings transcript URL from signal.sourceUrl | Opens transcript in new tab |
| **LinkedIn Activity** | \[Draft Connection Request\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=linkedin\&signal=\[sigId\]\&contact=\[contactId\] | Content tab, LinkedIn message type, contact pre-selected, signal context as prompt seed |
| **News** | \[Create Competitive Brief\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=one-pager\&signal=\[sigId\] | Content tab, one-pager type, signal context loaded for competitive positioning |
| **Any Signal** | \[Dismiss\] | No navigation — inline action | Updates signal card to dismissed state. Stores dismissReason if captured. |

## **Recommended Plans (NBA) → Destinations**

| NBA Action Type | CTA | URL Pattern | What Pre-Loads |
| :---- | :---- | :---- | :---- |
| **Outreach** | \[Draft Outreach\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=email\&signal=\[sigId\] | Content tab. Division filtered. Email type. Signal context in prompt. Contact selector shows division contacts. |
| **Outreach** | \[Draft Executive Briefing\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=executive-briefing\&signal=\[sigId\] | Content tab. Division filtered. Briefing type. Signal context in prompt. |
| **Research** | \[Research Buying Group\] | /companies/\[id\]?tab=contacts\&division=\[divId\]\&action=find | Contacts tab. Division filtered. Find Contacts auto-triggered. Missing personas highlighted. |
| **Content** | \[Create Sales Page\] | /companies/\[id\]?tab=content\&division=\[divId\]\&contentFilter=sales-page\&action=create | Content tab. Sales page section. Division filtered. Create placeholder flow initiated. |
| **Nurture** | \[Draft Follow-Up\] | /companies/\[id\]?tab=content\&division=\[divId\]\&type=email\&signal=\[sigId\] | Content tab. Division filtered. Email type. Engagement signal context pre-loaded. |
| **Nurture** | \[Find More Contacts\] | /companies/\[id\]?tab=contacts\&division=\[divId\]\&action=find | Contacts tab. Division filtered. Find Contacts triggered. Coverage gap shown. |
| **Any NBA** | \[View Contacts\] | /companies/\[id\]?tab=contacts\&division=\[divId\] | Contacts tab. Division filtered. No action auto-triggered (browse mode). |

## **Account Radar Cards → Destinations**

| Card State | CTA | URL Pattern | What Pre-Loads |
| :---- | :---- | :---- | :---- |
| **Any division card** | \[View Division\] | /companies/\[id\]?tab=overview\&division=\[divId\] | Overview tab. Division card highlighted/expanded. |
| **Division with contacts, no page** | \[Create Page\] | /companies/\[id\]?tab=content\&division=\[divId\]\&contentFilter=sales-page\&action=create | Content tab. Sales page section. Division filtered. Create flow started. |
| **Division with 0 contacts** | \[Research Division\] | /companies/\[id\]?tab=contacts\&division=\[divId\]\&action=find | Contacts tab. Division filtered. Find Contacts auto-triggered. |
| **Division with live page** | \[View Page\] | External: Content.payload.url (the hosted sales page) | Opens the live sales page in new tab. |

## **Today’s Tasks → Destinations**

| Task Type | CTA | URL Pattern | What Pre-Loads |
| :---- | :---- | :---- | :---- |
| **Content task (draft email, briefing)** | Click task row | /companies/\[id\]?tab=content\&division=\[divId\]\&type=\[contentType\]\&signal=\[sigId\] | Content tab with full context from the Plan that generated this task. |
| **Research task (find contacts)** | Click task row | /companies/\[id\]?tab=contacts\&division=\[divId\]\&action=find | Contacts tab with Find Contacts auto-triggered. |
| **Sales page task (create page)** | Click task row | /companies/\[id\]?tab=content\&division=\[divId\]\&contentFilter=sales-page\&action=create | Content tab, sales page section, create flow started. |
| **Follow-up task (nurture contact)** | Click task row | /companies/\[id\]?tab=content\&division=\[divId\]\&type=email\&contact=\[contactId\]\&signal=\[sigId\] | Content tab with contact pre-selected and engagement context loaded. |

# **URL Query Parameter Specification**

All deep links from the Dashboard to the Target Company page use query parameters to pre-load context. The Target Company page component must read these params on mount and configure the UI accordingly.

## **Parameter Reference**

| Param | Type & Values | Behavior | Example |
| :---- | :---- | :---- | :---- |
| **tab** | String: overview, buying-groups, contacts, content, engagement, signals | Activates the specified tab on page load | ?tab=content |
| **division** | UUID: Target ID (where targetType \= division) | Pre-selects division in any tab’s division filter dropdown | \&division=abc-123 |
| **type** | String: email, linkedin, executive-briefing, sales-page, one-pager | Pre-selects content type in Content tab’s type selector | \&type=executive-briefing |
| **signal** | UUID: AccountSignal ID | Loads signal summary into Content tab’s context area as prompt seed | \&signal=def-456 |
| **contact** | UUID: Contact ID | Pre-selects a specific contact in email/LinkedIn generation | \&contact=ghi-789 |
| **action** | String: find, add, create | Auto-triggers a specific action on page load: find \= open Find Contacts modal, add \= open Add Contact modal, create \= start Create flow | \&action=find |
| **contactName** | String: URL-encoded name | Pre-fills name field in Add Contact modal (used with action=add) | \&contactName=Dr.%20Sarah%20Kim |
| **contentFilter** | String: sales-page, email, linkedin, briefing, all | Filters Content tab’s library view to a specific content type | \&contentFilter=sales-page |

## **Implementation: Target Company Page Mount**

| // Target Company page component (simplified) // File: app/dashboard/companies/\[companyId\]/page.tsx   export default function CompanyPage({ params, searchParams }) {   const { companyId } \= params;   const {     tab \= 'overview',     division,      // Target ID for division filter     type,          // Content type pre-selection     signal,        // Signal ID for context loading     contact,       // Contact ID for pre-selection     action,        // Auto-trigger action (find, add, create)     contactName,   // Pre-fill name for Add Contact     contentFilter, // Content library filter   } \= searchParams;     // 1\. Set active tab from URL   const \[activeTab, setActiveTab\] \= useState(tab);     // 2\. If division param exists, set the division filter   //    This filter is shared across ALL tabs   const \[selectedDivision, setSelectedDivision\] \=     useState(division || 'all');     // 3\. If signal param exists, load signal data   //    for context in content generation   const signalContext \= signal     ? useSignalById(signal)     : null;     // 4\. If action param exists, auto-trigger on mount   useEffect(() \=\> {     if (action \=== 'find') openFindContactsModal();     if (action \=== 'add') openAddContactModal(       { name: contactName }     );     if (action \=== 'create') openCreateContentFlow();   }, \[action\]);     // 5\. Pass context to child tab components   return (     \<CompanyLayout\>       \<TabBar active={activeTab} /\>       {activeTab \=== 'content' && (         \<ContentTab           division={selectedDivision}           contentType={type}           signalContext={signalContext}           contact={contact}           contentFilter={contentFilter}           autoCreate={action \=== 'create'}         /\>       )}       {activeTab \=== 'contacts' && (         \<ContactsTab           division={selectedDivision}           autoFind={action \=== 'find'}           autoAdd={action \=== 'add'}           contactName={contactName}         /\>       )}       {/\* ... other tabs \*/}     \</CompanyLayout\>   ); } |
| :---- |

# **Breadcrumb & Return Navigation**

When the AE navigates from the Dashboard to a Target Company page, they need a clear path back. The breadcrumb and back navigation must preserve dashboard context.

## **Breadcrumb Format**

When arriving from a Dashboard CTA, the breadcrumb shows the full navigation path:

| Dashboard \> General Motors \> Content \> Autonomous Driving & ADAS            ^click: /dashboard  ^click: /companies/\[id\]?tab=overview |
| :---- |

The first breadcrumb segment ("Dashboard") always links back to /dashboard. The company name links to the Overview tab. The tab name is the current view. The division name (if filtered) shows which division is active.

## **Back Button Behavior**

Browser back should work naturally because all deep links use URL query params (not client-side state). When the AE presses back after completing an action on the Target Company page, they return to the Dashboard at the same scroll position.

## **Dashboard State Updates on Return**

When the AE returns to the Dashboard after taking action (generating content, adding contacts, creating a sales page), the Dashboard must reflect the changes:

* **Plan status:** If a Plan was executed, the Plan card shows "Executed" with a checkmark and summary of what was done.

* **Radar card updates:** Contact count, coverage %, and sales page status refresh from server data.

* **NBA recomputation:** The recommendation engine re-runs for the affected division. A division that just had contacts added may get a new recommendation ("Create sales page" instead of "Research buying group").

* **Task completion:** Completed tasks move to a "Done" state and are deprioritized or hidden.

**Implementation:** Dashboard page should refetch data on focus/visibility change (visibilitychange event) or use SWR/React Query with a short revalidation interval. This avoids showing stale data after a return from the Target Company page.

# **Edge Cases & Fallback Behavior**

## **Signal with Unknown Division**

If the division resolution function cannot determine which division a signal belongs to (contact not in system, no keyword match), the signal card shows "General Motors (division unknown)" and the CTA links to the company-level Overview tab without a division filter:

| /companies/\[gmId\]?tab=overview // No division param — Overview shows all divisions |
| :---- |

## **Deep Link to Division That No Longer Exists**

If a saved task or bookmark references a division Target ID that has been deleted or reassigned, the Target Company page should gracefully fall back to the "all divisions" view with a toast notification: "The division referenced by this link is no longer available. Showing all divisions."

## **Content Tab Without Signal Context**

If the AE navigates to the Content tab without a signal query param (e.g., from the sidebar or Radar card \[View Division\] link), the content generation form shows without signal context. The AE can still generate content manually by selecting a division, content type, and contacts. The signal context area shows: "No signal context loaded. You can add context manually or browse recent signals for this division." with a link to the Signals tab.

## **Multiple Signals for Same Division**

If a Plan was triggered by multiple signals (e.g., both a job posting and an earnings call reference Manufacturing), the signal query param should reference the PRIMARY signal (highest confidence or most recent). The content generation form can show "Additional signals for this division" as expandable context below the primary signal.

## **AE Has No Roadmap Configured**

If the AE has no active Adaptive Roadmap, all deep link query params are ignored and the Target Company page renders in legacy mode (10 tabs, no division filter). The Dashboard shows the legacy view with a "Set up your Adaptive Sales Map" CTA. No Plans, no division cards, no Roadmap-aware CTAs.

# **Summary: Navigation Rules for Dev Team**

| The Five Rules 1\. Every Dashboard CTA deep-links to a tab \+ division \+ context. No blank forms. No dead ends.2\. Signal context travels via URL query params. The signal ID loads the signal’s summary into the content generation prompt. The AE sees WHY they’re generating this content.3\. Action params auto-trigger modals and flows. action=find opens Find Contacts. action=create starts the Create Sales Page flow. The AE doesn’t hunt for buttons.4\. Division filter is shared across all tabs. When the AE arrives at the Contacts tab filtered to Manufacturing, switching to the Content tab keeps the Manufacturing filter. Context is persistent.5\. Dashboard refreshes on return. When the AE completes an action and returns, the Dashboard reflects the changes: updated coverage, executed Plans, recomputed NBAs. |
| :---- |

**Next specs in this series:** (2) Target Company Tab Consolidation, (3) Five Dashboard Gaps Production Spec, (4) Legacy Cleanup. Each will reference the URL patterns and navigation rules defined in this document.