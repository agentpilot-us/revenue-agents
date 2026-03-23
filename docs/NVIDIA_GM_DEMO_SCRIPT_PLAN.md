# NVIDIA/GM Demo Script Readiness Plan

This plan gets the **3-act AgentPilot demo script** (AE Maturity Progression: Day-One to Autonomous Execution, March 2026) working in the **NVIDIA/GM demo account** (demo-techinfra@agentpilot.us). The script has three acts; each has scene-level requirements and known gaps.

**Demo script reference:** `agentpilot-demo-script.docx.md` (AgentPilot Demo Script: AE Maturity Progression — From Day-One AE to Autonomous Execution).

---

## Current state (what already works)

| Item | Status | Notes |
|------|--------|--------|
| GM account, 5 buying groups, 75 contacts | Seeded | `prisma/seed-nvidia-gm-demo.ts` |
| 3 GM signals (exec_hire, competitor_detected, earnings_beat) | Seeded | Shelly Chaka exec hire (from Cruise), Qualcomm, Q4 earnings |
| NVIDIA products (Thor, Orin, Hyperion, Sim, Omniverse, etc.) | Seeded | With descriptions and relationships |
| Automotive OEM playbook, Content Library, Messaging | Seeded | Departments, landmines, buying committee |
| GM Strategic Account Plan (AdaptiveRoadmap) | Seeded | Created in seed step 11 |
| PlayTemplates (3 minimal) + SignalPlayMapping + AccountPlayActivation | Seeded | executive-intro → New C-Suite Executive, etc. |
| Autonomous play demo (Act 3 scene 3.2) | Built | `/dashboard/demo/autonomous-play` — pre-written 7-step flow |
| "Work This" flow (POST start-play → redirect to run page) | Implemented | HotSignalsFeed, matchSignalToPlayRun |

---

## Gaps (from demo script)

1. **Act 1 blocker:** "Work This" can return 404 if no match. Seed already creates mappings and activations, and **RoadmapTarget + RoadmapContact** link AV Engineering to the exec hire contact (Shelly Chaka) so the run has contact-filled actions.
2. **Act 1:** New C-Suite Executive in seed is **minimal (1 phase, 1 step)**; script expects **7 steps**. Either expand the seeded template to 7 steps or accept 2-step from seed-plays (Executive Intro has 2 phases, 2 content templates).
3. **Act 1:** **contentGenerationType** on action steps is not wired for "congratulations email" — add the field and one prompt template or inject signal context into existing generation.
4. **Act 2:** Play Catalog shows **0 plays** — catalog needs plays activated for the account (AccountPlayActivation) and optionally targeting metadata so GM sees the right templates.
5. **Act 2:** My Day needs **mid-progress PlayRuns** (e.g. one from Act 1 in progress, one renewal) — not seeded today.
6. **Act 2:** **Urgency grouping** (Overdue / Today / This Week) on My Day — "NOT YET BUILT"; can narrate or build.
7. **Act 2:** **Custom Play → Suggest a Plan with AI** — objective→play resolution endpoint not implemented; demo can skip or use a pre-built run.
8. **Act 3:** **PlayRun.status = 'proposed'** and yellow-bordered "Review Plan" card — not built; demo can narrate or mock.
9. **HotSignalCard:** Preview API returns `template.phases`; card may expect `steps` — verify preview-play vs HotSignalCard contract so signal cards don’t break.

---

## Phase 0: Unblock Act 1 (1–2 days)

**Goal:** "Work This" on the exec_hire signal creates a PlayRun and redirects to the run page with at least one step; run has a contact so Step 2 (email) is personalized.

### 1. Seed: RoadmapTarget + RoadmapContact for GM

- In `prisma/seed-nvidia-gm-demo.ts` (after creating the GM roadmap), add at least one **RoadmapTarget** for GM (e.g. `targetType: 'division'`, `name: 'AV Engineering'`, `companyDepartmentId` = GM’s AV Engineering department id).
- Add a **RoadmapContact** linking that target to a **Contact** that represents the exec hire (e.g. Shelly Chaka, Director AV Software Platform, in AV Engineering). This ensures `matchSignalToPlayRun` gets `targetContact` and `roadmapTargetId` so the created PlayRun has contact-filled actions.
- **Verify:** After seed, "Work This" on exec_hire signal creates a run; run page shows steps with the exec hire contact (e.g. Shelly Chaka) where applicable.

### 2. Seed: New C-Suite Executive with 7 steps (optional but recommended for script)

- **Option A:** In the NVIDIA seed, replace the minimal "executive-intro" template with a **7-phase or 7-content-template** structure mirroring the autonomous demo (research contact, congratulations email, executive briefing, LinkedIn note, meeting agenda, ROI email, early win email). Use existing ContentTemplate types and `contentGenerationType` where defined in `lib/plays/content-generation-types.ts`.
- **Option B:** Run **seed-plays** after seed-nvidia-gm so executive-intro is upgraded to 2-phase / 2-step; accept 2 steps for Act 1 and use the autonomous demo for the "7 steps" story in Act 3.
- Document seed order in `docs/OFFICIAL_DEMO_SETUP.md`: e.g. `cleanup:official-demo` → `seed:nvidia-gm` → (optional) `seed-plays` for fuller templates.

### 3. Fix 404 / preview behavior

- Ensure when no play matches, the UI handles it (already: 404 from start-play shows toast + "Open Configuration"). If preview-play returns no match, HotSignalCard should not assume `template.steps` exists — confirm HotSignalCard uses the actual preview shape (`template.phases` vs `steps`); align API or component so signal cards render without errors when matched and when unmatched.

### 4. Smoke test Act 1

- Log in as demo-techinfra@agentpilot.us, open My Day, click "Work This" on "GM Promotes Shelly Chaka to VP AV Engineering (ex-Cruise CSO)". Expect: redirect to play run page, steps visible, contact Shelly Chaka on actions. Generate (if content step exists) and confirm no hard errors.

---

## Phase 1: Act 2 readiness (2–3 days)

**Goal:** Play Catalog shows plays for GM; My Day shows in-progress plays; at least one email step uses contentGenerationType so "Generate → Review → Send" is convincing.

### 1. contentGenerationType on action steps

- Ensure **ContentTemplate** supports `contentGenerationType` in schema and seed (e.g. `congratulations_email` for the congrats email step). `lib/plays/content-generation-types.ts` already defines prompts; `lib/plays/generate-action-content.ts` uses it when set. Add or backfill `contentGenerationType` on the relevant content templates for the New C-Suite Executive (and optionally Budget Cycle / Competitive Response) so "Generate" uses the right prompt and signal/contact context.
- **Verify:** On the run page, Step 2 (email) "Generate" produces a draft that references the exec hire contact / GM / DRIVE Thor (or signal context).

### 2. Play Catalog for GM

- Play Catalog should list plays **activated for the account’s roadmap** (AccountPlayActivation). Confirm the catalog query filters by roadmapId or companyId and returns the 3 (or more) activated templates. If the catalog currently shows 0, fix the filter/query so it uses AccountPlayActivation for the current company’s roadmap. Optionally add **targeting metadata** (e.g. industries, departmentTypes on PlayTemplate or activation) so "Start from Catalog" shows only relevant plays for GM.
- **Verify:** SAP → GM → Plays → Start from Catalog shows at least New C-Suite Executive, Budget Cycle Expansion, Competitive Response.

### 3. Seed: mid-progress PlayRuns for Act 2

- Add a seed step (or a small script) that creates 1–2 **PlayRuns** for GM in ACTIVE status with some steps completed and some pending (e.g. one run at "Step 4 of 7" so My Day shows "Step 4: LinkedIn Connect — Shelly Chaka"). Use the same template and contact so the story is consistent.
- **Verify:** My Day shows action cards from these runs alongside signals.

### 4. Urgency grouping (optional)

- Script says Overdue / Today / This Week is "NOT YET BUILT". Either implement grouping in the My Day action queue or leave as-is and narrate priority during the demo.

---

## Phase 2: Act 3 polish (2–3 days, optional)

**Goal:** Proposed plays with "Review Plan" (yellow card) and/or objective-driven play creation, so the full script can be followed.

### 1. PlayRun.status = 'proposed'

- Add **proposed** (or equivalent) status to PlayRun; when the system proposes a play from a signal (e.g. overnight job), create the run in this status. My Day (or a dedicated section) shows **proposed** runs with a yellow/amber border and "Review Plan" CTA. On Approve → set status to ACTIVE; on Dismiss → set status to DISMISSED.
- This requires a proposal path (cron or on-demand) that creates runs in proposed state instead of active; then the UI and PATCH endpoint to approve/dismiss.

### 2. Objective → play resolution (Suggest a Plan with AI)

- Implement or stub the endpoint used by "Build a Play for General Motors" → "Suggest a Plan with AI" (e.g. `app/api/play-runs/suggest-from-objective/route.ts`). Return a proposed play (template + steps or a synthetic run) so the UI can show "6 steps tailored to the objective". For demo-only, can pre-build a PlayRun that looks AI-generated and have the button open it.

### 3. Governed mode (optional)

- Script mentions hiding "+ New Play" and "Start from Catalog" in governed mode. If product has an AccountPlayActivation or user-level "governed" flag, gate these CTAs so Act 1 narration ("Sarah can’t freestyle") holds. Otherwise, avoid clicking them during the demo.

---

## Demo account runbook (NVIDIA/GM)

Use this sequence to prepare the account and run the script:

1. **Reset (optional)**  
   `npm run cleanup:official-demo`

2. **Seed**  
   `npm run seed:nvidia-gm`  
   (Then optionally `npx dotenv -e .env.local -- tsx prisma/seed-plays.ts` with `SEED_USER_ID` set to demo user id if you want fuller 2-step Executive Intro.)

3. **Live mode**  
   `npm run official-demo:set-live`  
   (If companies were not created by seed or need to be forced live.)

4. **Log in** as demo-techinfra@agentpilot.us.

5. **Act 1:** My Day → Work This on exec_hire → Play run page → Generate/Review on email step.  
   **Act 2:** SAP → GM → Plays → Start from Catalog (pick play, buying group, product) → Run page. My Day shows in-progress runs.  
   **Act 3:** Autonomous demo at `/dashboard/demo/autonomous-play` (preset or type command; 7 steps, ~25 sec).

6. **Doc**  
   Update `docs/OFFICIAL_DEMO_SETUP.md` with: (a) seed order and RoadmapTarget/RoadmapContact note, (b) link to this runbook and the demo script reference, (c) known limitations (e.g. 7-step template optional, proposed status optional).

---

## Part 2: Upsell play (Expansion: DGX to DRIVE Thor)

For an account that has been working in the system, run the **second part of the demo**: an upsell play (GM uses DGX → upsell to DRIVE Thor).

**Play name:** Expansion: DGX to DRIVE Thor  
**Trigger:** MANUAL (start from catalog; no signal).  
**Steps:**

1. **Contact sweep: buying group** — Internal task to identify and prioritize contacts in the AV Engineering group; pre-seeded body references Frank Morrison (Champion), Shelly Chaka (Decision Maker), Sarah Williams (Technical Evaluator), and next steps (webinar invite, champion brief).
2. **Send webinar invite** — Email referencing **Content Library → CompanyEvent:** "NVIDIA GTC 2026 — Automotive AI Summit" (May 18, San Jose); pre-seeded subject and body.
3. **Send DRIVE Thor spec to champion** (Day +3) — Email to Frank Morrison with executive brief; pre-seeded body references DRIVE Thor architecture, GM ROI, safety certification, execution roadmap. **Champion brief:** Open `/demo/nvidia-gm-executive-brief.html` to show "what Frank forwards to his team" (Stitch-generated executive brief; app-hosted).

**How to start:** Strategic Account Plan → GM → Plays → **Start from Catalog** → choose **"Expansion: DGX to DRIVE Thor"** → select buying group (e.g. AV Engineering) and optionally a contact. The run is created with 3 actions; pre-seeded content is applied so each step shows the content above.

**Champion contact flags (seed):** Frank Morrison (IT Infrastructure) is flagged as **Champion**; Shelly Chaka (AV Engineering) as **Decision Maker**; Sarah Williams (AV Engineering) as **Technical Evaluator**. Contacts list Role column shows these via Persona; RoadmapContact.personaRole is set for roadmap views.

**Stitch brief URL:** `/demo/nvidia-gm-executive-brief.html` (static file in `public/demo/`).

---

## Demo script: enrichment moment (before "Work This")

Step 1 is created **already executed** so the run page shows it done. The enrichment is demoed in **Target Accounts → GM → Build Contact List** (Contacts tab). The seed creates 5 buying groups, 15 contacts each (75 total), all with `@gm-demo.agentpilot.us` placeholder emails and **Enrichment** = "Enrich now" (not yet enriched). Clicking **"Enrich now"** on a row enriches only that contact (Option 1 / live moment).

1. **My Day:** Exec hire signal for Shelly Chaka visible. **Say:** "The system detected that GM promoted Shelly Chaka to VP AV Engineering — she was previously CSO at Cruise. Before we respond to this signal, let me show you what we already know about the GM account."
2. **Navigate:** Target Accounts → General Motors. **Say:** "The strategist has already mapped 5 buying groups at GM — Autonomous Vehicle Engineering, Vehicle Software Platform, Manufacturing, In-Vehicle Experience, and IT Infrastructure. 75 contacts total, 15 per buying group. This was done during account setup."
3. **Click:** AV Engineering (or filter Contacts to AV Engineering). **Say:** "Here's the Autonomous Vehicle Engineering group — the team Shelly Chaka was just promoted to lead. We can see the contacts the strategist identified. But notice — they're all marked 'Not enriched.' We have names and titles from our research, but we don't have verified emails or LinkedIn profiles yet."
4. **Point to Shelly Chaka's row:** "Not enriched" · shellychaka@gm-demo.agentpilot.us. **Say:** "There's Shelly Chaka. VP Autonomous Vehicle Engineering. But that email is a placeholder — we need her real contact info before we can reach out. Watch this."
5. **Click "Enrich now" on Shelly Chaka's row.** **Option A (live):** Let Apollo run (she has a real LinkedIn URL so Apollo can match); real data appears in real time. **Option B (safe):** Pre-enrich Shelly Chaka before the demo; during the demo point to her enriched profile, then click "Enrich now" on another contact for the live moment.
6. **Say:** "One click. Verified email, LinkedIn profile, confirmed title. The system is now ready to personalize outreach to Shelly Chaka. Let's go back to My Day and run the play."
7. **Navigate:** My Day → "Work This" on the exec hire signal → run page loads with step 1 completed, steps 2–7 ready. **Say:** "Step 1 — find and enrich the contact — is already done. Now look at step 2: a personalized congratulations email…"

---

## Summary

| Phase | Focus | Deliverables |
|-------|--------|--------------|
| **Phase 0** | Act 1 unblock | RoadmapTarget + RoadmapContact in seed; optional 7-step New C-Suite Executive; preview/signal card fix; smoke test Work This → run page with contact |
| **Phase 1** | Act 2 readiness | contentGenerationType on steps; Play Catalog shows activated plays for GM; seed mid-progress PlayRuns; optional urgency grouping |
| **Phase 2** | Act 3 polish | PlayRun proposed status + yellow card + Review Plan; optional objective→play endpoint; optional governed-mode gating |

**Total estimate:** 5–8 days for full 3-act fidelity; Phase 0 alone (1–2 days) gets "Work This" and the run page working for the NVIDIA/GM account with a contact and at least 1–2 steps.
