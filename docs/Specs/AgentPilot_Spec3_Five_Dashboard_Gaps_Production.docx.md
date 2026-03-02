

**AgentPilot**  
Five Dashboard Gaps

Production Specification

Data Sources, APIs, Components, and Acceptance Criteria

Production Spec 3 of 4  |  February 2026  |  Confidential

# **The Five Gaps at a Glance**

These are the five gaps between the current dashboard and the production experience. Each gap is specified with: the problem, the data source, the component behavior, the API requirements, link destinations (per Spec 1), and testable acceptance criteria.

| \# | Gap | Current State | Required State |
| :---- | :---- | :---- | :---- |
| **1** | **Signals at Division Level** | Hot Signals panel is empty or shows legacy signals without division context | Division-tagged signal cards with context-specific CTAs, expansion target indicators, and signal detail |
| **2** | Rich NBA Recommendations | All NBAs are "Create Sales Page Placeholder" — one action type | Four action types (outreach, research, content, nurture) based on decision tree. Sorted by objective priority. |
| **3** | **Objective Progress Visible** | No visible tracking of Roadmap objective progress | Objective Bar: goal text, landed/active/monitoring counts, progress bar |
| **4** | Contextual Tasks | Tasks show bare "Create sales page for GM → Division" with no why | Each task shows: title, division, triggering signal, objective relevance |
| **5** | **Signal Activity on Radar Cards** | Radar cards show "Last signal: None" for most divisions | Each card includes latest signal one-liner. Roadmap Health panel on sidebar. |

# **Gap 1: Signals at the Division Level**

## **Problem**

The Hot Signals panel on the Dashboard is either empty or shows legacy signal cards like "Page view — Visit from mark.haener@gm.com — General Motors Company — Run Re-Engagement play →." There is no division context, no signal detail, and the CTA is a legacy play template.

## **Data Source**

Signals come from the existing AccountSignal model (populated by Exa-based ingestion). The new requirement is division resolution: each signal must be tagged to a division Target from the AE’s Roadmap.

### **Division Resolution Pipeline**

| // Executed for each AccountSignal when displaying on Dashboard // Priority order: most reliable method first   async function resolveDivision(signal, roadmap) {     // 1\. Contact lookup (highest confidence)   //    If signal has a contact email, find them in   //    the Roadmap's Contacts   if (signal.contactEmail || signal.contactName) {     const contact \= await Contact.findFirst({       where: {         OR: \[           { email: signal.contactEmail },           { name: signal.contactName }         \],         target: { roadmapId: roadmap.id }       },       include: { target: true }     });     if (contact) return {       division: contact.target,       method: 'contact\_lookup',       confidence: 1.0     };   }     // 2\. CompanyDepartment mapping (high confidence)   //    If signal references a department, map it   //    to the corresponding division Target   if (signal.departmentId) {     const dept \= await CompanyDepartment.findUnique({       where: { id: signal.departmentId }     });     if (dept) {       const target \= await Target.findFirst({         where: {           roadmapId: roadmap.id,           targetType: 'division',           name: { contains: dept.name.split(' ')\[0\] }         }       });       if (target) return {         division: target,         method: 'department\_mapping',         confidence: 0.8       };     }   }     // 3\. Keyword matching (medium confidence)   //    Match signal text against division names   //    and keywords from division intelligence   const divisions \= await Target.findMany({     where: {       roadmapId: roadmap.id,       targetType: 'division'     }   });   for (const div of divisions) {     const keywords \= extractKeywords(div.name);     // Add intelligence keywords if available     if (div.intelligence?.initiatives) {       keywords.push(         ...div.intelligence.initiatives       );     }     const text \= \`${signal.title} ${signal.summary}\`;     const overlap \= keywords.filter(       k \=\> text.toLowerCase().includes(         k.toLowerCase()       )     );     if (overlap.length \> 0\) return {       division: div,       method: 'keyword\_match',       confidence: Math.min(         0.3 \+ overlap.length \* 0.15, 0.75       ),       matchedKeywords: overlap     };   }     // 4\. Fallback: division unknown   return {     division: null,     method: 'unresolved',     confidence: 0   }; } |
| :---- |

## **API Requirements**

**Existing endpoint to enhance:** The current signal fetch for the Dashboard needs to include division resolution data.

| GET /api/dashboard/signals   Response (enhanced): {   signals: \[     {       id: UUID,       type: "page\_view" | "job\_posting" | ...,       title: "mark.haener@gm.com viewed IT page",       summary: "3rd page view this week...",       sourceUrl: "https://...",       timestamp: ISO,       contactEmail: "mark.haener@gm.com",         // NEW: division resolution       division: {         id: UUID,         name: "IT Infrastructure & AI Platform",         stage: "Strategic Platform",         isExpansionTarget: false       } | null,       resolutionMethod: "contact\_lookup",       resolutionConfidence: 1.0,         // NEW: Plan status (if signal triggered a Plan)       plan: {         id: UUID,         status: "pending",         actionType: "generate\_email",         previewPayload: { subject: "...", snippet: "..." }       } | null,         // NEW: CTA mapping       primaryCTA: {         label: "Draft Follow-Up",         url: "/companies/\[id\]?tab=content&..."       },       secondaryCTA: {         label: "View in Division",         url: "/companies/\[id\]?tab=overview&..."       }     }   \] } |
| :---- |

## **Component: HotSignals.tsx**

The component renders signal cards with the following structure per card:

* **Signal type badge:** Icon \+ type label (PAGE VIEW, JOB POSTING, EARNINGS CALL, etc.) \+ color coding \+ timestamp

* **Signal title:** Bold, primary text from signal.title

* **Division name:** Second line with colored dot matching stage color. If division is null: "General Motors (division unknown)"

* **Signal detail:** 1-2 sentence explanation from signal.summary. Why this matters.

* **Expansion target indicator:** If division.isExpansionTarget: show "↗ Expansion target for your objective" in amber text

* **Primary CTA:** Button linking to destination per Spec 1 CTA mapping table. Context-specific: \[Draft Follow-Up\], \[Draft Executive Briefing\], \[Add to Buying Group\], \[View Plan\]

* **Secondary CTA \+ Dismiss:** \[View in Division\] or \[View Jobs\] \+ \[Dismiss\] link

## **Acceptance Criteria**

1. Every signal card displays a division name (or "division unknown" fallback)

1. Zero instances of "Run \[X\] play" CTAs in the Hot Signals panel

1. Signals for expansion target divisions show the objective relevance line

1. Each CTA routes to the correct Target Company tab with division \+ signal context pre-loaded (per Spec 1 URL params)

1. Dismiss action hides the card and stores the dismissal (for future feedback loop)

1. Signals are sorted by recency (most recent first) with expansion target signals boosted

# **Gap 2: Rich NBA Recommendations**

## **Problem**

Every NBA recommendation is "Create Sales Page Placeholder" — one action type applied uniformly to all divisions. The AE has no reason to trust the system because every recommendation looks the same regardless of division state, contact coverage, signal activity, or objective alignment.

## **The Four Action Types**

| Action Type | When to Recommend | Primary CTA | Destination (Spec 1\) |
| :---- | :---- | :---- | :---- |
| **Outreach** | Contacts found AND recent signal activity AND sales page exists or not needed | \[Draft Outreach\] or \[Draft Executive Briefing\] | Content tab: division \+ type \+ signal pre-loaded |
| **Research** | 0 contacts OR contacts \< personasNeeded with no signal momentum | \[Research Buying Group\] | Contacts tab: division \+ action=find |
| **Content** | Contacts found but no sales page AND no urgent signal driving outreach | \[Create Sales Page\] or \[View Placeholder\] | Content tab: division \+ contentFilter=sales-page \+ action=create |
| **Nurture** | Page is live AND contact is showing repeat engagement (page views, email opens) | \[Draft Follow-Up\] or \[Find More Contacts\] | Content tab with engagement signal context, or Contacts tab |

## **Decision Tree (Complete)**

| function generateNBA(division, roadmap) {   const contacts \= getContactCount(division.id);   const needed \= roadmap.personaTemplate.length;   const salesPage \= getSalesPageStatus(division.id);   const recentSignal \= getMostRecentSignal(division.id);   const signalAge \= recentSignal     ? daysSince(recentSignal.timestamp) : Infinity;   const isExpansion \= division.isExpansionTarget;     // TIER 1: No contacts at all   if (contacts \=== 0\) {     return {       actionType: 'research',       urgency: isExpansion ? 'high' : 'low',       recommendation: \`No contacts identified. Research\`,         \+ \` the buying group to find \`         \+ \`${needed} key personas before any outreach.\`,       primaryCTA: 'Research Buying Group',       // NO content or outreach options     };   }     // TIER 2: Has contacts \+ recent signal \+ expansion   //         \= OUTREACH (highest value action)   if (contacts \> 0 && signalAge \<= 7 && isExpansion) {     return {       actionType: 'outreach',       urgency: 'high',       recommendation: \`${contacts} contacts identified.\`         \+ \` Recent signal activity suggests momentum.\`         \+ \` Draft outreach referencing the signal.\`,       primaryCTA: recentSignal.type \=== 'earnings\_call'         ? 'Draft Executive Briefing'         : 'Draft Outreach',       signal: recentSignal,     };   }     // TIER 3: Live page \+ repeat engagement \= NURTURE   if (salesPage \=== 'live' && signalAge \<= 3\) {     const engagingContact \=       getRepeatEngagement(division.id);     if (engagingContact) {       return {         actionType: 'nurture',         urgency: 'high',         recommendation: \`${engagingContact.name}\`           \+ \` has viewed your page\`           \+ \` ${engagingContact.viewCount} times.\`           \+ \` Draft a personalized follow-up.\`,         primaryCTA: 'Draft Follow-Up',         contact: engagingContact,       };     }   }     // TIER 4: Contacts but incomplete \+ no page   if (contacts \< needed && \!salesPage) {     return {       actionType: 'content',       urgency: isExpansion ? 'medium' : 'low',       recommendation: \`${contacts} of ${needed}\`         \+ \` buying group contacts identified.\`         \+ \` Build a sales page to share\`         \+ \` with the buying group.\`,       primaryCTA: 'Create Sales Page',     };   }     // TIER 5: Full contacts but no page   if (contacts \>= needed && \!salesPage) {     return {       actionType: 'content',       urgency: 'medium',       recommendation: \`Buying group is mapped\`         \+ \` (${contacts}/${needed}). Build a sales\`         \+ \` page to begin structured engagement.\`,       primaryCTA: 'Create Sales Page',     };   }     // TIER 6: Placeholder page exists   if (salesPage \=== 'placeholder') {     return {       actionType: 'content',       urgency: 'low',       recommendation: \`Sales page placeholder created.\`         \+ \` Waiting for HTML content.\`,       primaryCTA: 'View Placeholder',     };   }     // TIER 7: Live page, contacts ok, no urgent signals   if (salesPage \=== 'live' && contacts \< needed) {     return {       actionType: 'nurture',       urgency: 'low',       recommendation: \`Page is live. Expand the\`         \+ \` buying group (${contacts}/${needed}).\`,       primaryCTA: 'Find More Contacts',     };   }     // TIER 8: Everything in place, monitor   return {     actionType: 'nurture',     urgency: 'low',     recommendation: \`Division is well-covered.\`       \+ \` Monitor for signals and engagement.\`,     primaryCTA: 'View Division',   }; } |
| :---- |

## **Sort Order**

NBA cards are sorted by a composite score:

1. **Urgency weight:** high \= 3, medium \= 2, low \= 1

1. **Stage priority:** Expansion Target \= 4, Active Program \= 3, Strategic Platform \= 2, Emerging \= 1

1. **Signal recency:** Signal in last 24h \= 3, last 7d \= 2, older \= 1, none \= 0

**Score \= urgency\_weight \* 10 \+ stage\_priority \* 5 \+ signal\_recency \* 2\.** Highest score first. Ties broken by division name alphabetically.

## **Acceptance Criteria**

1. At least 3 different action types visible across the 5 division NBAs (not all "Create Sales Page")

1. Expansion target divisions rank above non-expansion divisions

1. Each NBA card shows: stage badge, division name, situation summary, recommendation, objective line (for expansion targets), and context-appropriate CTA

1. The decision tree never recommends outreach when contacts \= 0 (no-generic-fallback rule)

1. \[Create Sales Page\] creates a placeholder record, not generated HTML content

1. After taking action (adding contacts, generating content), returning to Dashboard shows updated NBA for that division

# **Gap 3: Objective Progress Visible**

## **Problem**

The AE’s Roadmap has a clear objective: "Land 2 new divisional NVIDIA use cases at GM this year." Nowhere on the Dashboard does it show progress toward this goal. The AE has to mentally reconstruct progress by scanning division cards.

## **Component: ObjectiveBar**

A persistent bar at the top of the Dashboard, below the nav but above all other content.

| ┌───────────────────────────────────────────────────────────────────┐ │  🎯 ROADMAP OBJECTIVE                                              │ │  Land 2 new NVIDIA use cases at GM                                 │ │                                                                     │ │  Landed: 0/2    Active: 2    Monitoring: 3    \[=====\>        \] 0%  │ └───────────────────────────────────────────────────────────────────┘ |
| :---- |

## **Data Source**

| // From AdaptiveRoadmap.objective {   goalText: "Land 2 new divisional NVIDIA use cases...",   metric: { type: "new\_divisional\_use\_cases",             targetCount: 2, timeHorizon: "this\_year" } }   // Progress is COMPUTED from division stages: const divisions \= await Target.findMany({   where: { roadmapId, targetType: 'division' } });   const progress \= {   landed: divisions.filter(     d \=\> d.stage \=== 'Closed-Won' ||          d.stage \=== 'Deployed'   ).length,   active: divisions.filter(     d \=\> \['Active Program', 'Expansion Target',          'Proof of Concept'\].includes(d.stage) &&          d.lastSignalAt \!== null  // has signal activity   ).length,   monitoring: divisions.filter(     d \=\> \!\['Closed-Won', 'Deployed'\].includes(d.stage)          && d.lastSignalAt \=== null   ).length }; |
| :---- |

## **API**

**Endpoint:** GET /api/roadmap/config (already exists from AR-102). Add a computed progress field to the response that includes landed/active/monitoring counts.

## **Acceptance Criteria**

1. Objective Bar is visible on Dashboard as the first element below the top nav

1. Goal text matches AdaptiveRoadmap.objective.goalText exactly

1. Landed / Active / Monitoring counts are computed from division stages, not manually entered

1. Progress bar shows landed / targetCount as a percentage

1. When a division stage changes (e.g., "Expansion Target" → "Active Program"), the counts update

# **Gap 4: Contextual Tasks**

## **Problem**

Current tasks show bare labels: "Create sales page for General Motors Company → Vehicle Engineering & Simulation." No signal context. No objective relevance. No explanation of why this task matters or how it advances the AE’s goal.

## **Required Task Structure**

| // Each task in Today’s Tasks must include: {   title: "Draft executive briefing for ADAS division",   division: "Autonomous Driving & ADAS",   divisionStage: "Active Program",   type: "outreach",  // outreach | research | content | nurture   priority: "high",  // high | medium | low     // Context from the triggering signal   signalContext: "Earnings call: $2B AV investment mentioned",   signalId: UUID,     // Context from the Roadmap objective   objectiveContext: "Advances objective: Land 2 new NVIDIA use cases",     // Link destination (per Spec 1\)   destination: "/companies/\[id\]?tab=content\&division=...",     // Source: which Plan generated this task   planId: UUID | null } |
| :---- |

## **Data Source**

Tasks come from two sources:

1. **Plan-derived tasks:** Generated by the Plan engine when a Plan is created. The Plan carries signalInstanceId, targetId, actionMappingId, and the Roadmap objective. All context is available.

1. **Legacy tasks:** Existing task records (e.g., from expansion plays). These should be enhanced to include division context by looking up the CompanyDepartment → Target mapping. Signal and objective context will be empty for legacy tasks — show "No signal context" and generic objective text.

## **Component: TodaysTasks.tsx**

Each task renders as a clickable row with:

* **Type icon:** ✉️ outreach, 🔍 research, 📄 content, 🤝 nurture

* **Priority indicator:** Red border \= high, amber \= medium, gray \= low

* **Title:** Bold, primary text

* **Division \+ signal line:** "Autonomous Driving & ADAS · Earnings call: $2B AV investment mentioned"

* **Objective line:** "Advances objective: Land 2 new NVIDIA use cases" — amber for expansion targets, gray for non-expansion

**Sort order:** Same composite score as NBAs: urgency \* 10 \+ stage\_priority \* 5 \+ signal\_recency \* 2\.

**Click behavior:** Routes to the destination URL per Spec 1 task routing table.

## **Acceptance Criteria**

1. Every task shows a division name (not "General Motors Company → Division")

1. Plan-derived tasks show signal context and objective relevance

1. Legacy tasks show division context even without signal/objective data (graceful degradation)

1. Tasks are sorted by impact priority, not creation date

1. Clicking a task routes to the correct tab with context pre-loaded

1. Completed tasks (Plan status \= executed) show a checkmark and move to bottom of list or a "Done" section

# **Gap 5: Signal Activity on Radar Cards \+ Roadmap Health**

## **Problem**

Most division Radar cards show "Last signal: None." The cards feel static — no pulse, no indication of which divisions have momentum. There is also no aggregate view of Roadmap health (is the intelligence layer working?).

## **Part A: Latest Signal on Division Cards**

Each division Radar card must include a "Latest signal" section:

| // Inside each division card, after the sales page status   ┌───────────────────────────────────────┐ │  Latest signal                       │ │  VP of AV Engineering viewed your     │ │  ADAS sales page • 2 hours ago        │ └───────────────────────────────────────┘   // If no signals: show nothing (not "None") // The absence of the block IS the signal. |
| :---- |

**Data source:** Most recent AccountSignal where division resolution maps to this Target. Store as Target.lastSignalAt \+ a denormalized signal summary field, or query at render time with a limit of 1\.

## **Part B: Roadmap Health Panel**

A panel in the right sidebar of the Dashboard (below "This Week" stats) showing aggregate health metrics for the Roadmap:

| Metric | Computation | Display |
| :---- | :---- | :---- |
| **Signal → Plan rate** | Plans created / signals matched (this month). Measures whether the matching engine is generating actionable Plans. | Percentage. Green ≥60%, yellow 30-59%, red \<30%. |
| **Buying group coverage** | Average across all divisions: (contacts found / personas needed). Measures contact completeness. | Percentage. Green ≥67%, yellow 34-66%, red ≤33%. |
| **Content readiness** | Divisions with live or placeholder sales pages / total divisions. Measures content infrastructure. | Percentage. Green ≥60%, yellow 20-59%, red \<20%. |
| **Engagement velocity** | Engagement events this week vs. last week (page views \+ email opens \+ replies). Measures momentum. | "Growing" (green), "Stable" (yellow), "Declining" (red), or "No data" (gray). |

**Purpose:** The AE should be able to glance at Roadmap Health and know: "My signal engine is working (80% conversion), my contacts are incomplete (47% coverage), my content isn’t ready (20%), but engagement is growing." This tells them where to invest time.

## **Acceptance Criteria**

1. Divisions with recent signals show a "Latest signal" one-liner inside the Radar card

1. Divisions without signals do NOT show "Last signal: None" — the section is simply absent

1. Roadmap Health panel is visible in the right sidebar

1. All four health metrics are computed from live data, not hardcoded

1. Color coding is consistent: green \= healthy, yellow \= needs attention, red \= critical

# **Summary: Five Gaps, One Intelligence Layer**

These five gaps, taken together, are the difference between a dashboard with a Roadmap sidebar and a dashboard powered by an intelligence engine. Each gap addresses a specific failure mode:

| \# | Gap | Failure Without It | Success With It |
| :---- | :---- | :---- | :---- |
| **1** | **Division Signals** | AE doesn’t know what’s happening. Dashboard has no pulse. | AE sees 5 signals tagged to divisions with specific actions. The market is alive. |
| **2** | Rich NBAs | Every recommendation looks the same. AE stops trusting the system. | 4 action types. AE sees the system thinks differently about each division. |
| **3** | **Objective Tracker** | AE has no north star. Actions feel disconnected from the goal. | AE sees 0/2 landed and knows exactly what’s at stake. |
| **4** | Contextual Tasks | Tasks are bare to-do items. AE has to figure out WHY each task matters. | Every task shows the signal, the division, and the objective. The WHY is built in. |
| **5** | **Signal Activity \+ Health** | Division cards feel static. No way to know if the system is working. | Cards show latest signals. Health panel shows engine performance. The system is transparent. |

| Cross-Reference This spec depends on Spec 1 (User Workflow & Navigation Architecture) for all link destinations and URL query parameters. It depends on Spec 2 (Tab Consolidation) for the Content tab’s signal context pre-loading and the Contacts tab’s auto-find behavior. Next: Spec 4 (Legacy Cleanup) will catalog every "Run Play" instance and Suggested Plays section that must be removed or replaced. |
| :---- |

