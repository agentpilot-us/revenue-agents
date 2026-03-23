---
name: ""
overview: ""
todos: []
isProject: false
---

# Play Surfaces Cleanup: One Job Per Surface, One Engine

**Status:** Revised after feedback. Incorporates: Phase 1 pre-flight (model diff), Phase 2.1 (progress list + CTA), autonomy override hierarchy, no PlayRun→ActionWorkflow rename.

---

## Current state (what the codebase actually has)

- **Two template systems**: PlaybookTemplate (My Company Playbooks tab, `/api/playbooks/templates`) vs PlayTemplate (Play Catalog, Roadmap activations, `/api/play-templates`). Separate Prisma models and APIs.
- **Governance location**: Customize / Remove / autonomy toggles live on the **Roadmap** (ActivePlaybooksPanel), which uses **PlayTemplate** + **AccountPlayActivation**. My Company → Playbooks tab only has Edit/Delete on **PlaybookTemplate** (no autonomy, no signal rules).
- **Two launch entry points**: (1) Standalone Play Catalog and (2) SAP → Plays tab → "Play Execution" → AccountPlaysTab → "Start from Catalog". Same flow, two doors.
- **Execution engine**: My Day already uses only **PlayRun** (my-day route returns `workflows: []`, builds cards from `playRuns` and `followUpStepsFromPlayRuns`). Legacy ActionWorkflow is deprecated for creation.
- **ContentTabV2**: Five **content intents** (introduction, competitive_displacement, event_invite, follow_up, value_reinforcement) with suggestion chips — not plays. Does not use PlaybookTemplate or PlayTemplate.

---

## Target architecture

- **My Company**: Governance only — define/edit PlayTemplates, signal-to-play rules, contact cooldowns, **default autonomy**. No run here.
- **Play Catalog**: Only place for manual play execution. Browse → configure account/division/contact → Start → PlayRun → My Day.
- **SAP**: Read + activate only. List of approved plays (AccountPlayActivation) with **progress** (active PlayRuns for this account) + per-account Customize/Remove/autonomy. **No** embedded launch; single CTA to Play Catalog with `?companyId=`.
- **One engine**: All runs are PlayRun. My Day sorts by urgencyScore.

**Autonomy override hierarchy (must be wired):**

1. **My Company** sets the **default** autonomy for a template (org-wide).
2. **SAP activation** can **override** per-account (AccountPlayActivation.customConfig.autonomyLevel).
3. **PlayRun** inherits from the activation at creation time (signal path and manual path both resolve activation when present).

If this hierarchy is not implemented yet, it is a Phase 1 sub-task so governance actually flows through.

---

## Phase 1: Single template source and move governance to My Company

### Pre-flight (before committing to Option A)

**Model diff — required before Phase 1.1:**

- Run a **field-by-field diff** of PlaybookTemplate vs PlayTemplate and document:
  - What migrates cleanly (name, description, triggerType, etc.).
  - What exists on PlaybookTemplate but **not** on PlayTemplate and is used for resolution/targeting:
    - PlaybookTemplate: `targetDepartmentTypes`, `targetIndustries`, `targetPersonas`, `timingConfig`, `expectedOutcome`, `priority` (and any 6-layer scoring in resolveTemplateForContext / resolve-template).
  - If any of the 138 PlaybookTemplates rely on that targeting metadata for the scoring cascade, **Option A is not a simple API swap** — you need new columns (or JSON) on PlayTemplate and a migration path, or you keep PlaybookTemplate for resolution until Phase 5.
- **Deliverable:** A short doc or table: "PlaybookTemplate fields → PlayTemplate: migrate / add column / defer to Phase 5."

### 1.1 Decide template consolidation strategy

- **Option A** (only after pre-flight): Treat PlayTemplate as single source. My Company Playbooks tab lists/manages PlayTemplate. Add governance UI (signal rules, **default autonomy**, cooldown). If pre-flight shows missing targeting fields, add them to PlayTemplate or document that resolution stays on PlaybookTemplate until Phase 5.
- **Option B**: Keep PlaybookTemplate for playbooks and map to PlayTemplate for execution (dual-write, more migration).

### 1.2 My Company Playbooks tab

- Replace PlaybooksTab data source from `/api/playbooks/templates` to `/api/play-templates` **only if** pre-flight supports it. Show templates with governance-only actions: Edit, Configure signal rules, **Set default autonomy**, cooldown. No Run/Start.
- **Sub-task — autonomy hierarchy:** Ensure a clear rule and implementation:
  - My Company sets **default** autonomy (e.g. on PlayTemplate or in a new org-level config).
  - SAP AccountPlayActivation.customConfig.autonomyLevel overrides per-account.
  - When creating a PlayRun (createPlayRunFromTemplate or matchSignalToPlayRun), **inherit autonomy** from the activation when present (e.g. pass through to run or to step-level behavior). If not wired yet, add this so governance flows end-to-end.

### 1.3 Roadmap (SAP) Plays tab — keep activations only

- ActivePlaybooksPanel keeps Customize / Remove / autonomy (per-account override). Optionally add a "Progress" section listing PlayRuns for this company so SAP is read + activate + progress.

---

## Phase 2: One door for manual launch — remove launch from SAP

### 2.1 Replace "Play Execution" with progress + CTA (not just a link)

- **Remove** the block that renders AccountPlaysTab from ActivePlaybooksPanel (the duplicate "Start from Catalog" door).
- **Replace with:**
  1. **List of PlayRuns for this account** — read-only status dashboard with step progress (e.g. progress bars or step counts). Data: `/api/companies/[companyId]/play-runs` filtered to **status IN (ACTIVE, PROPOSED, PAUSED)**. Use muted styling for PAUSED so the AE sees snoozed/paused plays and doesn't start a duplicate. This is "what's running" for this account.
  2. **Single CTA button:** "Start a play for [Account Name]" linking to `/dashboard/plays?companyId={companyId}` so Play Catalog opens with account pre-selected.
- Outcome: AE sees both "what's running" and "start something new" without the duplicate launch flow.

### 2.2 Play Catalog as sole manual entry

- Ensure PlayCatalog and PlayDetailDrawer support `companyId` (and optionally `divisionId`) from query for deep links. No change to POST /api/play-runs flow.

### 2.3 AccountPlaysTab — one PR, one pattern

- **Decision:** If the company detail Plays tab exists and uses AccountPlaysTab, **convert it to the same read-only + CTA pattern in the same PR as Phase 2.1.** Do not defer: one PR, one pattern, no leftover launch surfaces. Replace "Start from Catalog" / "Custom Play" with the progress list (ACTIVE, PROPOSED, PAUSED) + "Start a play for [Account Name]" CTA to `/dashboard/plays?companyId=`. After this, AccountPlaysTab as a launch surface is removed everywhere.

---

## Phase 3: ContentTabV2

- **No mandatory change.** Content intents stay ad-hoc; no play list. Optional later: map play categories to intents for "generate content for this play" (separate PR).

---

## Phase 4: One engine (PlayRun) and My Day

- My Day already uses only PlayRuns; urgencyScore and "Work This" are correct.
- **Do not** rename PlayRun to ActionWorkflow in user-facing strings for this project. Keep internal and UI naming consistent with the code (PlayRun). A cosmetic naming pass can be a single PR later if product wants a different user-facing term.
- Ensure all entry paths use createPlayRunFromTemplate; no new ActionWorkflow creation.

---

## Phase 5: PlaybookTemplate and legacy activation cleanup (optional, follow-up)

- Migrate remaining PlaybookTemplate / PlaybookActivation / ActionWorkflow usage to PlayTemplate / AccountPlayActivation / PlayRun after surfaces cleanup is stable. Separate effort; schema and signal-engine touches.

---

## File-level summary


| Area              | Files to change                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-flight        | New: script or doc that diffs PlaybookTemplate vs PlayTemplate fields and resolution usage (resolve-template, etc.).                                                                                     |
| My Company        | PlaybooksTab — switch to PlayTemplate API only after pre-flight; add governance (signal rules, **default autonomy**). Wire autonomy default → activation override → PlayRun inherit.                     |
| SAP               | ActivePlaybooksPanel — remove AccountPlaysTab; add **PlayRuns list** (status IN ACTIVE, PROPOSED, PAUSED; muted for PAUSED) + **CTA "Start a play for [Account Name]"** → `/dashboard/plays?companyId=`. |
| Company Plays tab | Same PR as Phase 2.1: if it uses AccountPlaysTab, convert to same pattern (progress list + CTA); no leftover launch surfaces.                                                                            |
| Play Catalog      | plays/page.tsx, PlayCatalog — read companyId (and optionally divisionId) from query; pass to PlayDetailDrawer.                                                                                           |
| Naming            | No PlayRun→ActionWorkflow rename in this work.                                                                                                                                                           |


---

## Risks and dependencies

- **Data:** Pre-flight must confirm whether PlaybookTemplate-only targeting data exists and how it’s used; Phase 1.1 depends on it.
- **Autonomy:** Phase 1 sub-task to implement default → activation override → PlayRun inheritance so governance flows end-to-end.
- **Nav:** Play Catalog remains prominent; SAP CTA is the only "start a play" from the account context.

