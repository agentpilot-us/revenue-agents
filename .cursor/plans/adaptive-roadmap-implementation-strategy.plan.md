# Adaptive Roadmap: Plan Comparison and Best Implementation Strategy

This document compares the **codebase-gap implementation plan** (built from the repo) with the **solution architects' spec** (product/UX view) and recommends a single implementation strategy that works in the app.

---

## 1. Plan Comparison

### 1.1 Phase structure

| Aspect | Solution architects' plan | Codebase-gap plan | Verdict |
|--------|---------------------------|-------------------|---------|
| **Phase 1** | Roadmap Foundation (Weeks 1–4): Your Roadmap section, six components, conversational setup, Account Radar by target type, Hot Signals + Roadmap context, Next Best Action → Plans | Same scope; adds explicit schema (Roadmap + Plan models), file touch points (DashboardNav, hot-signals.ts, next-best-actions.ts, AccountRadar*, page.tsx) | Aligned. Codebase plan adds *how* (models, APIs, which files). |
| **Phase 2** | Signal Engine (Weeks 5–8): Configurable signal monitoring, signal→Plan engine, Conditions & Modifiers, AI-suggested edits, autonomy levels | Same; adds “match-only vs configurable ingest” option, Plan creation pipeline, Condition check before output | Aligned. Codebase plan clarifies: keep current Exa ingest first, add *matching* to Roadmap config; configurable sources can follow. |
| **Phase 3** | Content Intelligence (Weeks 9–12): Content Strategy–driven generation, Plan-aware content library, Analytics, multi-Map, Roadmap sharing | Same; adds wiring into execute-play, run-content, campaign generate-draft; analytics = new queries + dashboard | Aligned. |

**Conclusion:** The two plans describe the same product in the same phases. The codebase plan adds data model, APIs, and file-level work; the architects’ plan adds success metrics and UX detail. No material conflict.

---

### 1.2 Where the codebase plan adds specificity

- **Data:** Roadmap (six components) and Plan (signal + roadmap logic + preview + status) as first-class models; target type (company | division | partner) for radar; optional normalized vs JSON blob for Roadmap.
- **Signals:** Today signals are fixed Exa + LLM; suggested approach: keep ingest, add *Signal Configuration* in Roadmap and *match* events to it, then create Plans. Configurable ingest (AE-defined sources) can be Phase 2b.
- **Backward compatibility:** When user has no Roadmap or no match, keep existing “Run play” from Hot Signals / NBA so current behavior still works.
- **Templates:** Spec says “Roadmap templates as starting points” (e.g. Channel Influence, Enterprise Expansion). Codebase plan calls out: seed or UI to clone a template into a new Roadmap.

---

### 1.3 Where the architects’ plan adds clarity

- **Success metrics:** Roadmap completion rate, signal-to-Plan rate, content approval rate, Roadmap edit frequency, AI-suggested edit adoption, time to first Plan, pipeline influenced by Plans. These should drive instrumentation and analytics in Phase 3 (and some in Phase 1 for “time to first Plan”).
- **No black boxes:** Every Plan shows (1) triggering signal, (2) Roadmap logic, (3) preview. This is a UX constraint that the Plan model and UI must support from Phase 1.
- **Conversational setup:** Six-step AI-guided flow (Objective → Targets → Signals → Actions → Content → Conditions). Codebase plan notes onboarding is currently minimal; this is net-new and can be form-first then conversational.
- **Sidebar:** “Your Roadmap” + rename “Your company data” to align with “Company Data” in spec; “Target companies” → “Target Accounts” (spec). Small naming alignment.

---

## 2. Recommended Implementation Strategy

### 2.1 Principles

1. **Ship a thin “map-driven” path first.** Get one Roadmap and one Plan type working end-to-end (e.g. one objective, company target type only, one signal→action, Draft & Review only) before expanding to divisions/partners, full signal config, and autonomy.
2. **Preserve current behavior.** No Roadmap or no Plan match ⇒ keep existing Hot Signals and “Run X play” / NBA. New behavior lives behind “has active Roadmap.”
3. **Schema first, then dashboard.** Define Roadmap + Plan in Prisma and a minimal API (create/read/update Roadmap; create/list/approve/dismiss Plan) so the dashboard can consume Plans and show “Your Roadmap” without blocking on full conversational flow.
4. **Defer heavy UX until core works.** Conversational Roadmap setup and AI-suggested edits are high value but can follow a form-based or hybrid “edit six components” UI so Phase 1 can land without a full chat-based wizard.

---

### 2.2 Phase 1: Roadmap foundation — best sequence

**Order of work (recommended):**

1. **Schema and API (Week 1)**  
   - Add `AdaptiveRoadmap` (e.g. `userId`, `objective`, `targetMap`, `signalConfig`, `actionPlaybook`, `contentStrategy`, `conditionsModifiers` as JSON or normalized tables).  
   - Add `Plan` (e.g. `userId`, `roadmapId`, `accountSignalId?`, `companyId?`, `status`, `triggeringSignalSummary`, `roadmapLogicSummary`, `previewPayload` (JSON), `autonomyLevel`, `createdAt`).  
   - Migrations; seed one default Roadmap per user (optional) or “empty” so UI can assume one Roadmap per user.  
   - APIs: `GET/PUT /api/roadmap` (current user’s Roadmap), `GET /api/plans` (list pending Plans), `POST /api/plans/[id]/approve`, `POST /api/plans/[id]/dismiss`.  
   - This unblocks all dashboard work.

2. **“Your Roadmap” in sidebar and page (Week 1–2)**  
   - Add “Your Roadmap” to `DashboardNav`, route to `/dashboard/roadmap`.  
   - Page: load Roadmap; show six sections (Objective, Target Map, Signal Config, Action Playbook, Content Strategy, Conditions).  
   - Start with **form-based edit** (one form or accordion per component). Save to `AdaptiveRoadmap`.  
   - No conversational flow yet; goal is “AE can view and edit the six components.”

3. **Signal → Plan pipeline (minimal) (Week 2–3)**  
   - Keep existing Exa/LLM signal ingest; when storing `AccountSignal`, **if** user has a Roadmap with at least one Signal Configuration category and one Action Playbook entry:  
     - Match signal type/summary to Roadmap’s signal config (e.g. by category or keyword).  
     - Look up Action Playbook for that category → action type (e.g. alert, auto-draft).  
     - Create a **Plan** with: link to `AccountSignal`, summary of “why this matches” (Roadmap logic), and a **preview** (e.g. “Draft email re: [signal title]” or placeholder).  
   - Default autonomy: **Draft & Review** (no auto-execute in Phase 1).  
   - This yields “Plans” that show up in a new “Plans” list (or replace/enhance Next Best Action).

4. **Dashboard: Plans and map-driven Hot Signals (Week 3–4)**  
   - **Hot Signals:** If a signal has an associated Plan, show the Plan card instead of (or in addition to) “Run X play”: “Your Roadmap identified a Plan: [trigger] → [action]. [Preview] [Approve] [Dismiss].” If no Plan, keep current “Run Feature Release play” etc.  
   - **Next Best Action:** Source from `getPlansForUser()` (pending Plans) first; if none, fall back to current `getNextBestActions()`. Plan card shows: signal, Roadmap logic, preview, Approve / Dismiss.  
   - **Approve Plan:** Calls `POST /api/plans/[id]/approve`; backend runs the action (e.g. open run-content flow with context, or create draft and queue). Dismiss marks Plan dismissed.

5. **Account Radar by target type (Week 4)**  
   - Read `roadmap.targetMap.targetType` (company | division | partner).  
   - **Company:** Current behavior (company cards + departments).  
   - **Division:** One card per division (e.g. GM Manufacturing, GM IT); reuse `CompanyDepartment`; may need to aggregate “last signal” per department.  
   - **Partner:** Defer to Phase 2 if “partner” entity (e.g. SF AE as card) is not yet modeled; otherwise add minimal Partner or use Contact with type “partner” and show partner cards.  
   - Recommendation: Ship **company** and **division** in Phase 1; **partner** in Phase 2 when partner model/source exists.

6. **Roadmap templates (Phase 1 tail or Phase 2)**  
   - Add 2–3 seed Roadmaps (e.g. “Channel Influence”, “Enterprise Expansion”, “Value-of-Data”) as JSON or DB rows.  
   - “Your Roadmap” page: “Start from template” → clone one into user’s Roadmap.  
   - Enables demo accounts (Sercante, NVIDIA/GM, Revenue Vessel) to start from a template.

**Phase 1 MVP vs full:**  
- **MVP:** Schema + API, “Your Roadmap” form-based edit, minimal signal→Plan (e.g. one category “product_announcement” → “auto-draft”), Plans in dashboard (replace or augment NBA), Approve/Dismiss, Account Radar company + division.  
- **Full Phase 1 (spec):** Plus conversational setup flow (can be Phase 1b or early Phase 2).

---

### 2.3 Phase 2: Signal engine — best sequence

1. **Signal Configuration and matching (Weeks 5–6)**  
   - Roadmap stores `signalConfig`: categories, sources (labels), priority weights.  
   - Ingest unchanged; after creating `AccountSignal`, match to Roadmap’s categories (and optionally to targets: which company/division/partner this relates to).  
   - Only create Plan when match found; store priority on Plan for ordering.

2. **Action Playbook and full signal→Plan (Week 6)**  
   - Roadmap stores `actionPlaybook`: list of { signalCategory, actionType, contentHint?, autonomyLevel }.  
   - Pipeline: match signal → get action from playbook → generate preview (e.g. call existing content gen with Roadmap context) → create Plan.  
   - Support all three autonomy levels: Notify Only (Plan with no preview, alert only), Draft & Review (current), Auto-Execute (create Plan, run action, then mark executed and notify).

3. **Conditions & Modifiers (Week 7)**  
   - Store in Roadmap `conditionsModifiers`: e.g. “Dreamforce in September” → shift to event content; “Product X launch” → add hook.  
   - Before generating Plan or content: check active conditions (e.g. date range, product launch flag); if active, append modifier to prompt or switch content strategy.  
   - No new entities required if conditions are JSON; execution is a “condition check” step in the pipeline.

4. **AI-suggested Roadmap edits (Week 8)**  
   - New: `RoadmapSuggestion` (or JSON on Roadmap: `suggestedEdits[]`) with type (new_signal, action_optimization, target_expansion, condition_alert), payload, status.  
   - Background or on-demand job: e.g. “signals that don’t match any category,” “engagement stats suggest LinkedIn > email” → suggest action change; “new accounts in news” → suggest target expansion.  
   - “Your Roadmap” page: section “Suggested edits” with Accept / Dismiss; on Accept, apply edit to Roadmap.

---

### 2.4 Phase 3: Content and analytics — best sequence

1. **Content Strategy in Roadmap (Week 9)**  
   - Roadmap has `contentStrategy`: tone, format, personalization depth, channel.  
   - Thread into all Plan/content generation: `execute-play`, `run-content`, campaign generate-draft. Pass Roadmap (or its contentStrategy) into prompts so generated copy follows the strategy.

2. **Plan-aware content library (Week 10)**  
   - When a Plan is approved and content is generated, tag `SegmentCampaign` (or new Content artifact) with `planId`.  
   - Content library / dashboard: filter or group by Plan and by account; show “Generated from Plan: [signal title].”

3. **Analytics and success metrics (Weeks 10–11)**  
   - Instrument: Roadmap completion (six components non-empty), Plan created/approved/dismissed, content approval rate, Roadmap edit events, AI-suggestion accept/dismiss, time to first Plan.  
   - Dashboard: “Map health” or Analytics page with signal→Plan rate, content engagement, objective progress (if objectives are structured).  
   - Pipeline influenced by Plans: attribute `CompanyProduct` or opportunity to a Plan when user approved a Plan that led to that outcome (e.g. link Plan to company/department and later to opportunity).

4. **Multi-Map and sharing (Week 12)**  
   - Optional: allow multiple Roadmaps per user (e.g. “GM expansion” vs “New logos”) and “active” Roadmap for dashboard.  
   - Sharing: “Copy from template” or “Copy from teammate’s Roadmap” (if org/team model exists).  
   - Can be deprioritized if single-Roadmap-per-user is enough for launch.

---

## 3. Dependency and risk summary

- **Critical path:** Schema + Plan API → signal→Plan pipeline → dashboard consuming Plans. Without Plan creation, “Plans” in the UI are empty.  
- **Risks:**  
  - Conversational setup in Phase 1 can slip; recommend form-based “edit six components” first.  
  - Partner target type (SF AE as card) may need new data source (e.g. LinkedIn, Salesforce); division view is lower risk (reuse CompanyDepartment).  
  - AI-suggested edits need clear rules (when to suggest what) to avoid noise; start with 1–2 suggestion types (e.g. “new signal category”, “add target”).

---

## 4. Suggested implementation checklist (unified)

Use this as the single checklist for implementation:

**Phase 1**  
- [ ] Prisma: `AdaptiveRoadmap`, `Plan`; migrations.  
- [ ] API: GET/PUT roadmap, GET plans, approve/dismiss Plan.  
- [ ] Sidebar: “Your Roadmap” → `/dashboard/roadmap`.  
- [ ] Roadmap page: form-based edit of six components; save.  
- [ ] Signal→Plan: match existing AccountSignals to Roadmap config; create Plan with signal + logic + preview; default Draft & Review.  
- [ ] Hot Signals: show Plan when present (Preview / Approve / Dismiss); else keep “Run X play”.  
- [ ] Next Best Action: list Plans first; fallback to current NBA.  
- [ ] Account Radar: target type company + division from Roadmap.  
- [ ] (Optional) Roadmap templates: 2–3 seeds; “Start from template” on Roadmap page.  
- [ ] (Optional) Conversational setup: 6-step flow or Phase 1b.

**Phase 2**  
- [ ] Signal config: categories, priorities; match on ingest.  
- [ ] Action Playbook: signal→action + autonomy (Notify / Draft & Review / Auto-Execute).  
- [ ] Conditions & Modifiers: store and evaluate before Plan/content.  
- [ ] AI-suggested Roadmap edits: model + job + UI Accept/Dismiss.  

**Phase 3**  
- [ ] Content Strategy in Roadmap; wire into all content gen.  
- [ ] Plan-aware content library (tag by Plan, filter by account/Plan).  
- [ ] Analytics: Map health, signal→Plan rate, content approval, objective progress; success-metric instrumentation.  
- [ ] (Optional) Multi-Map and Roadmap sharing.

This strategy keeps the architects’ vision and phases intact while grounding execution in the current codebase and a thin end-to-end path first.
