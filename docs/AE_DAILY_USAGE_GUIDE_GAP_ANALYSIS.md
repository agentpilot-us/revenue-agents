# AE Daily Usage Guide — Gap Analysis

This document compares the **AE Daily Usage Guide** (March 2026) to the current codebase. It lists **false or misleading claims** in the document and **gaps in the code** (promised behavior that is missing or only partially implemented).

---

## 1. Morning Triage (Section 1)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Weekly Stats Bar lists Emails Sent, Replies, Contacts Found, Page Views, Meetings, Signals, **Plays Completed** | Implemented (Plays Completed added in momentum + WeeklyStatsBar). | **OK** |
| Hot Signals 7+ are hot; Dismiss marks as seen; Work this creates PlayRun | Implemented. | **OK** |
| Needs Attention: overdue phases (red), at-risk plays (amber), contacts | Implemented (overdue phases + AT_RISK + contacts in needs-attention API and card). | **OK** |
| Action Queue = active PlayRun cards; pick top 2–3 | Play run cards and queue exist. | **OK** |
| Recommended Plays: "score 70+" | Next-best-plays returns a `score`; the guide’s "70+" may refer to a different scale (e.g. health score 70). Recommend clarifying in doc whether recommended play score uses 0–100 or another range. | **Doc:** Clarify score scale for recommended plays. |

---

## 2. Working a Signal-Triggered Play (Section 2)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Work this → PlayRun created → Play Run page; Generate → Review → Edit → Send/Skip | Implemented (including edit UI). | **OK** |
| **"When all actions in Phase 1 are done, the phase gate evaluates. If it’s a MANUAL gate, click complete. If it’s CONTENT_SENT, it auto-advances when all content is sent. If it’s AUTO, Phase 2 activates immediately."** | In [lib/plays/execute-action.ts](lib/plays/execute-action.ts), `checkPhaseGateAndAdvance` **does not check `gateType`**. It advances the phase whenever **all** actions in the phase are EXECUTED or SKIPPED. There is **no "click complete"** for MANUAL gates and no different behavior for AUTO vs CONTENT_SENT. All gates behave like "advance when all actions done." | **False claim / Code gap:** Doc describes MANUAL = user clicks complete; code has no manual complete button and no gateType branch. Either add gateType-aware logic (and MANUAL = explicit complete UI) or change doc to "Phase advances when all actions in the phase are executed or skipped." |
| Signal types table (exec_hire, earnings_beat, product_launch, etc.) and typical plays | Descriptive; play templates and SignalPlayMapping drive behavior. | **OK** |

---

## 3. Working a Renewal Play (Section 3)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Contract Renewal auto-activates T-90; three phases (Health Check, Negotiate & Close, Post-Close) | Timeline cron and play templates support this; phase names/order depend on seed/config. | **OK** |
| Phase 1: Health Check & EBR — Account Health Scorecard, EBR Deck, Renewal Proposal Email; "mark the phase complete (MANUAL gate)" | As above: no MANUAL gate handling; phase completes when all actions are done. | **Same gap as Section 2.** |
| Phase 2: Negotiate & Close — objection brief, close email; governance (maxDiscountPct, etc.) | Governance and content generation exist; exact phase content depends on ContentTemplates. | **OK** |
| **Phase 3: Post-Close — "Auto-advances when the CRM opportunity stage is Closed Won (CRM_FIELD gate)."** | [lib/plays/execute-action.ts](lib/plays/execute-action.ts) never reads `gateType` or `gateConfig`. CRM_FIELD (e.g. "stage = Closed Won") is **not evaluated**. Phase 3 advances when its actions are done, not when a CRM field is updated. | **False claim / Code gap:** Either implement CRM_FIELD gate evaluation (e.g. cron or webhook that checks CRM and advances phase) or remove "Auto-advances when CRM…" from the doc. |
| Renewal anchors to CompanyProduct.contractEnd / contractRenewalDate | Timeline triggers use these fields. | **OK** |

---

## 4. Starting a Manual Play (Section 4)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| From My Day: "+ New Play" → SAP picker → Plays tab → Catalog → Start on account | Flow exists (roadmap?play=custom → pick company → Plays tab with catalog). | **OK** |
| From Chat: "Run the executive intro play for [segment]" → PlayRun created | createPlayRunFromTemplate used from chat. | **OK** |
| Executive Intro / Competitive Displacement / Expansion phase descriptions (Research, Intel, Build the Case, Outreach) | Matches seed phases and gate types in seed; behavior is "advance when actions done" (no MANUAL click). | **OK** |
| Competitive rules in PlayGovernance | PlayGovernance and competitive constraints exist. | **OK** |

---

## 5. Bulk Event & Product Triggers (Section 5)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Trigger card → modal with matching accounts → select/deselect → "Send to X Accounts" → PlayRuns created | HotSignalsFeed has trigger cards, account selection, and bulk PlayRun creation. | **OK** |
| Bulk trigger creates PlayRuns; you review and send each | No direct send; creates runs. | **OK** |

---

## 6. The Chat Agent (Section 6)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| **"Research [company name] — Uses Perplexity AI… saves to account research"** | [app/api/chat/route.ts](app/api/chat/route.ts) `research_company` calls Perplexity-backed research and creates an **Activity** (type Research) with the summary. It does **not** update `Company.researchData`, `businessOverview`, or other company fields. [getCompanyResearchPromptBlock](lib/research/company-research-prompt.ts) builds "account research" from Company (researchData, businessOverview, departments, etc.). So the research is logged as Activity but **not** persisted to the structured account research used by the prompt block. | **Misleading:** Either persist research result to Company (e.g. researchData or a dedicated research store) after research_company, or change doc to "Runs research and logs it as an activity; save to account research via the research review flow if available." |
| Draft email, Send (approval in chat), list departments, find contacts, enrich (Apollo), run plays | Tools exist. | **OK** |
| record_decision, record_objection; stored in agentContext / activeObjections | Implemented in chat tools; Company.agentContext and activeObjections. | **OK** |
| "Schedule a meeting with Sarah Chen" — Cal.com | Cal.com tool exists ([lib/tools/cal.ts](lib/tools/cal.ts)). | **OK** |
| Demo accounts: external tools disabled | Demo mode in chat restricts tools. | **OK** |

---

## 7. Strategic Account Plan (Section 7)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| SAP at /dashboard/roadmap?companyId={id}; Account Story Bar, Plays tab, Account Intelligence, Configuration, Coverage Dashboard, Play Rules | Implemented. | **OK** |
| **Account health score: "0–100 based on: plan completion (40%), contact engagement (30%), recency of last touch (30%). If an account drops below 30, it needs immediate attention."** | Formula implemented in [app/dashboard/roadmap/page.tsx](app/dashboard/roadmap/page.tsx) (40/30/30). Score is displayed in AccountStoryBar. There is **no** in-app "needs immediate attention" flag or special UI when score &lt; 30. | **Doc:** Accurate formula; "needs immediate attention" is guidance only — app does not highlight or route low scores. |

---

## 8. Cooldowns & Contact Conflicts (Section 8)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Yellow warning on action card; alternate contact; governance limits (7-day, 2/contact/week, 5/account/week) | Cooldown check and UI implemented; limits from PlayGovernance/template. | **OK** |

---

## 9. Outreach Sequences (Section 9)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| **"When the next touch is due, it shows up in My Day as a follow-up action"** | [app/api/dashboard/my-day/route.ts](app/api/dashboard/my-day/route.ts) returns `followUpSteps: []` and `followUpStepsFromPlayRuns` (from **play run** actions only). Sequence next-touch is **not** queried or surfaced in My Day. [app/api/sequences/next-touch/route.ts](app/api/sequences/next-touch/route.ts) exists for chat ("draft the next sequence email") but My Day does not list sequence follow-ups. | **False claim / Code gap:** Either add sequence-due items to My Day (e.g. from enrollments + next step due date) or change doc to "Draft the next touch via chat" and remove "shows up in My Day." |
| Contact enrolled in sequence; steps with day offset, channel, role; chat can draft next touch; sequence advances when you send | Sequences, enrollments, steps, and draft_next_sequence_touch exist. Advance on send may be in cron or process-scheduled-actions. | **OK** |
| Sequences + plays: cooldown handles conflicts | Cooldown is contact/account-wide. | **OK** |

---

## 10. Campaigns & Landing Pages (Section 10)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Start Campaign → select account → select departments → name and describe | CreateCampaignModal: account, name, motion, templateIds, divisionIds. No separate "describe" field. | **Minor doc:** "Name and describe" could be "name and motion (e.g. Acquisition, Expansion)." |
| Campaigns group PlayRuns; landing pages with tracking; QR codes | Campaigns, landing pages, CampaignVisit, QR codes exist. | **OK** |
| "Show me campaign engagement for [account]" in chat | Chat tools reference campaign engagement. | **OK** |

---

## 11. Recording Decisions & Objections (Section 11)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| record_decision, record_objection; agentContext.decisions; activeObjections; AI uses them in content | Implemented in chat and content context. | **OK** |

---

## 12. Tracking Outcomes & Momentum (Section 12)

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| Weekly Stats Bar: seven metrics including Plays Completed | Implemented. | **OK** |
| **"The AI tracks which ContentTemplates perform well (timesGenerated, timesEdited, timesSent, avgEditDistance)"** | [lib/plays/generate-action-content.ts](lib/plays/generate-action-content.ts) increments `timesGenerated`. [lib/plays/execute-action.ts](lib/plays/execute-action.ts) increments `timesSent`. **timesEdited** and **avgEditDistance** exist on ContentTemplate in [prisma/schema.prisma](prisma/schema.prisma) but are **never updated** in the codebase (no increment on PATCH editedContent, no edit-distance computation). | **False claim / Code gap:** Either implement timesEdited (on save edits) and avgEditDistance (e.g. on send, compare generated vs sent) or change doc to "tracks timesGenerated and timesSent." |
| PlayRun status COMPLETED when all actions done | checkPhaseGateAndAdvance sets run to COMPLETED when last phase completes. | **OK** |
| Needs Attention end-of-day check | Overdue, at-risk, and contacts implemented. | **OK** |

---

## Appendix: Chat Command Reference

| Guide claim | App reality | Verdict |
|-------------|-------------|--------|
| "Research [company name] — Perplexity AI research, saved to account" | As in Section 6: saved as Activity, not to Company account research blob. | **Same as Section 6.** |
| "Send it — sends the last draft (requires approval in chat)" | In-chat approval exists; no separate "Approval queue" page in dashboard. | **OK** (approval is in chat). |
| Other commands (departments, find contacts, enrich, run play, record decision/objection, Cal.com, campaign engagement, etc.) | Tools and flows exist. | **OK** |
| "Approval queue" wording in doc | Doc says "Approve in the Approval queue" and "queued for approval." There is no dedicated **Approval queue** UI page; approval happens in chat or in campaign approve-draft flow. | **Doc:** Clarify that approval is in-chat (or in campaign flow), not a separate queue page, unless you add one. |

---

## Summary: False Claims and Code Gaps

### False or misleading claims in the document

1. **Phase gates (Sections 2, 3):** Doc says MANUAL = "click complete," CONTENT_SENT = auto-advance when content sent, AUTO = immediate. **Reality:** All phases auto-advance when all actions are EXECUTED or SKIPPED; gateType is not used; there is no "mark phase complete" button.
2. **Phase 3 Renewal (CRM_FIELD):** Doc says "Auto-advances when the CRM opportunity stage is Closed Won." **Reality:** CRM_FIELD is not evaluated anywhere; phase advances only when actions are done.
3. **Research "saves to account research":** Doc implies research is written to account research. **Reality:** research_company only creates an Activity; it does not update Company.researchData or businessOverview used by getCompanyResearchPromptBlock.
4. **Sequence follow-ups in My Day:** Doc says when the next touch is due it "shows up in My Day as a follow-up action." **Reality:** My Day only shows play-run follow-ups; sequence next-touch is not in My Day.
5. **ContentTemplate metrics:** Doc says AI tracks timesGenerated, timesEdited, timesSent, avgEditDistance. **Reality:** Only timesGenerated and timesSent are updated; timesEdited and avgEditDistance are never set.

### Code gaps (doc promises not implemented)

1. **Phase gate behavior:** Implement gateType in phase advance (MANUAL = require explicit complete UI; CONTENT_SENT = advance when all actions done; AUTO = advance immediately when phase activates; CRM_FIELD = advance when gateConfig condition is met, e.g. CRM sync).
2. **CRM_FIELD gate:** Evaluate CRM field (e.g. opportunity stage) and advance phase when condition is met (cron or webhook).
3. **Sequence follow-ups in My Day:** Query sequence enrollments with next step due in the next N days and merge into followUpSteps (or a separate section) so they appear on My Day.
4. **Research → account research:** After research_company, optionally or always write summary to Company.researchData (or a dedicated research store) so getCompanyResearchPromptBlock includes it.
5. **ContentTemplate timesEdited and avgEditDistance:** On PATCH editedContent, increment timesEdited; on execute, compute edit distance (e.g. generated vs sent) and update avgEditDistance.

### Doc fix wording (apply to AE Daily Usage Guide)

1. **Recommended play "score 70+"** → Use: "Top-ranked recommended plays based on signal strength, deal stage, and engagement patterns" (do not reference a specific number).
2. **Account health "below 30"** → Use: "If an account's health score drops below 30, prioritize it — this typically means a combination of stale plays and unengaged contacts. The score is visible in the Account Story Bar but there is no automated alert for low scores."
3. **Approval queue** → For direct sends: "approve in the chat." For bulk segment sends: "queued as a pending action for your review."
4. **Campaign "name and describe"** → Use: "Name the campaign and select the motion (Acquisition, Expansion, Retention, or Event)."

---

## File reference

- Phase advance: [lib/plays/execute-action.ts](lib/plays/execute-action.ts) (`checkPhaseGateAndAdvance`)
- My Day: [app/api/dashboard/my-day/route.ts](app/api/dashboard/my-day/route.ts), [app/components/dashboard/MyDayDashboard.tsx](app/components/dashboard/MyDayDashboard.tsx)
- Needs Attention: [app/api/dashboard/needs-attention/route.ts](app/api/dashboard/needs-attention/route.ts), [app/components/dashboard/NeedsAttentionCard.tsx](app/components/dashboard/NeedsAttentionCard.tsx)
- Chat research: [app/api/chat/route.ts](app/api/chat/route.ts) (`research_company`), [lib/research/company-research-prompt.ts](lib/research/company-research-prompt.ts)
- Sequences: [app/api/sequences/next-touch/route.ts](app/api/sequences/next-touch/route.ts), [lib/sequences/get-next-touch-context.ts](lib/sequences/get-next-touch-context.ts)
- ContentTemplate: [prisma/schema.prisma](prisma/schema.prisma), [lib/plays/generate-action-content.ts](lib/plays/generate-action-content.ts), [lib/plays/execute-action.ts](lib/plays/execute-action.ts)
- Roadmap health: [app/dashboard/roadmap/page.tsx](app/dashboard/roadmap/page.tsx)
