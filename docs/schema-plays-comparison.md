# Schema Comparison: Proposed Play System vs Existing

This document compares the attached **schema-plays.prisma** (proposed) with the current **prisma/schema.prisma** (existing) in revenue-agents. It highlights overlaps, gaps, and migration considerations.

---

## 1. Naming and Tenant Model

| Proposed | Existing | Notes |
|----------|----------|--------|
| **Account** = target account (where plays run) | **Company** = target account (same concept; name avoids NextAuth `Account` clash) | No gap; naming only. |
| **PlayTemplate.companyId** = tenant (seller’s org) | **PlaybookTemplate.userId** = tenant (single user) | **Gap:** Proposed assumes tenant isolation by `companyId`. Current app is user-scoped (no “seller company” table). If you add multi-tenant (multiple teams under one org), you’d need a Tenant/Org model and template ownership by org. |

---

## 2. Template Layer

### PlayTemplate (proposed) vs PlaybookTemplate (existing)

| Concept | Proposed | Existing | Gap? |
|--------|----------|----------|------|
| **Scope** | `scope: PlayScope` (COMPANY \| ACCOUNT) | — | **Yes.** No notion of “company-wide vs account-level” play. |
| **Category** | `category: PlayCategory` (RENEWAL, ENGAGEMENT, LAUNCH, etc.) | — | **Yes.** Only free-form `triggerType` string. |
| **Trigger** | `triggerType`: TIMELINE \| MANUAL \| SIGNAL | `triggerType` string (renewal, new_logo, event, manual, signal, …) | **Partial.** Same idea; proposed is enum. |
| **Timeline anchor** | `anchorField`, `anchorOffsetDays` | `timingConfig Json?` | **Partial.** Existing can store equivalent in JSON; proposed is explicit and queryable. |
| **Signal types** | `signalTypes String[]` on template | Signal matching via RoadmapSignalRule + RoadmapActionMapping (templateId) | **Different.** Existing ties signals to roadmap rules, not a template-level array. |
| **Status** | `status: PlayTemplateStatus` (DRAFT, ACTIVE, ARCHIVED) | `isBuiltIn`, `isDefault` | **Yes.** No DRAFT/ACTIVE/ARCHIVED; different semantics. |
| **Governance** | `governedBy` (userId of PMM) | — | **Yes.** No explicit owner. |
| **Contact guardrails** | `contactCooldownDays`, `maxTouchesPerWeek` | — | **Yes.** No cooldown or touch limits on template. |
| **Targeting** | — | `targetDepartmentTypes`, `targetIndustries`, `targetPersonas`, `priority` | Existing has richer targeting JSON; proposed doesn’t in this snippet. |

**Summary:** Proposed adds scope, category, lifecycle status, timeline anchor, per-template cooldown, and governance. Existing has stronger targeting and is wired to roadmap/signal rules.

---

## 3. Phase and Step Layer

### PlayPhaseTemplate (proposed) vs PlaybookTemplateStep (existing)

| Concept | Proposed | Existing | Gap? |
|--------|----------|----------|------|
| **Order** | `orderIndex` | `order` | Same idea. |
| **Timing** | `offsetDays` (relative to play anchor) | `dayOffset` | Same idea. |
| **Content** | Child **ContentTemplate[]** (see below) | Inline: `assetTypes`, `channel`, `playId`, `promptHint` | **Yes.** Proposed has first-class content templates per phase. |
| **Gate** | `gateType` (MANUAL, CRM_FIELD, CONTENT_SENT, AUTO), `gateConfig` | — | **Yes.** No “what must be true to advance” in current schema. |
| **Target persona** | On ContentTemplate | `targetPersona` on step | Existing has it on step. |

### ContentTemplate (proposed) — no existing equivalent

Proposed: **ContentTemplate** per phase — `name`, `contentType` (EMAIL, DECK, BRIEF, …), `modelTier`, `promptTemplate`, `governanceRules`, `contextSources`, `targetPersona`.

Existing: No such model. Content type and prompts are implied by **PlaybookTemplateStep** (`assetTypes`, `channel`, `promptHint`) and by app code (`generateOneContent`, `build-content-context`). Governance is not in the schema.

**Gap:** No first-class content templates or phase-level governance rules. Adding them would enable PMM-defined content blueprints and reuse.

---

## 4. Run / Instance Layer (Important Divergence)

### Proposed: single run hierarchy

- **PlayRun** → account, template, owner, status, anchorDate, currentPhaseIndex  
- **PlayPhaseRun** → per-phase progress, targetDate, gateCompleted, **PlayAction[]**  
- **PlayAction** → the “card” (title, actionType, generatedContent, targetContact, status, etc.)

One tree: Run → PhaseRuns → Actions.

### Existing: two run concepts

1. **PlaybookRun** (+ **PlaybookRunStep**)  
   - Used by: company playbooks UI, step complete/skip APIs.  
   - Tracks: currentStep, stepCompletedAt, triggerContext.  
   - Lighter weight; no link to signals or roadmap.

2. **ActionWorkflow** (+ **ActionWorkflowStep**)  
   - Used by: My Day, signal-driven flow, roadmap, assembleWorkflow.  
   - Tracks: templateId, companyId, userId, roadmapPlanId, accountSignalId, targetDivisionId, targetContactId, status, steps with content and Activity.  
   - This is the primary “running play” the AE sees.

So today:

- **PlaybookRun** = legacy/simpler run for company playbooks.  
- **ActionWorkflow** = main run for signal- and roadmap-driven plays.

Proposed schema **unifies** into PlayRun → PlayPhaseRun → PlayAction (with phases and gates). Existing has **no phase level** and has two run models.

**Gaps / considerations:**

- **Phase-level progress and gates:** Not in current schema. Adding them would require either (a) extending ActionWorkflow (e.g. phase grouping, phase status, gate fields) or (b) introducing a PhaseRun-like layer and migrating.
- **Single vs dual run model:** Adopting the proposed model would require deciding how to migrate or map PlaybookRun and ActionWorkflow (e.g. one becomes the source of truth, the other deprecated or synced).
- **PlayAction vs ActionWorkflowStep:** Proposed has explicit actionType enum, priority, contentTemplateId, model/tokens, and link to ContactTouch. Existing has stepType, contentType, channel, and link to Activity. Conceptually similar; proposed is more structured and tied to governance/touch.

---

## 5. Contact Touch and Cooldown

### Proposed: ContactTouch

- Dedicated table: accountId, contactName, contactEmail, playActionId, playRunId, playTemplateName, channel, touchDate, subject.  
- Purpose: “When did we last touch this contact, in which play?” for cooldown and “last contacted X days ago” warnings.

### Existing

- **Activity** — type, companyId, contactId, userId, subject, body, etc. General timeline and send tracking; not play-specific.  
- **SequenceTouch** — per ContactSequenceEnrollment (email sequences); not play-driven.

**Gap:** No play-scoped touch log. Cooldown logic would today require querying Activity (and possibly filtering by metadata). Adding a **ContactTouch** (or equivalent) would give:

- Clear play/run linkage.  
- Denormalized contact/play names for fast, play-aware cooldown and warnings.

---

## 6. Governance

### Proposed: PlayGovernance

- One row per company (tenant): maxDiscountPct, cooldown defaults, maxWeeklyTouches, maxAccountWeeklyTouches, competitiveRules, expansionSkus, valueNarrative, renewalMessaging.

### Existing

- **AdaptiveRoadmap.operationalLimits** — JSON (e.g. maxEmailsPerDay, maxLinkedInPerDay). Per-roadmap, not global.  
- No play-level or tenant-level governance table.

**Gap:** No PlayGovernance. To support PMM-level guardrails (discount caps, competitive rules, approved SKUs, narratives), you’d add this table or equivalent (e.g. tenant-level config JSON).

---

## 7. What Exists and Aligns Well

These already exist and are close in spirit to the proposed design:

- **PlaybookTemplate** ≈ PlayTemplate (without scope, category, status, cooldown).  
- **PlaybookTemplateStep** ≈ PlayPhaseTemplate (without gates and without ContentTemplate children).  
- **PlaybookActivation** — account-level “this template is active for this roadmap”; no direct equivalent in proposed (they use PlayRun status / scope).  
- **RoadmapSignalRule** + **RoadmapActionMapping** — “when signal category X, run template Y”; proposed uses template-level `signalTypes` instead.  
- **ActionWorkflow** + **ActionWorkflowStep** — the main “run” the AE works; proposed would replace with PlayRun → PlayPhaseRun → PlayAction.  
- **Activity** — tracks sends; proposed adds ContactTouch for play-specific touch tracking.  
- **Company** = target account; **Contact**; **User** — all present.

---

## 8. Summary: Gaps to Consider

| Area | Gap | Recommendation |
|------|-----|----------------|
| **Tenant** | Proposed uses companyId for tenant; current uses userId | Keep user-scoped unless you add a Tenant/Org model. |
| **Template** | Scope, category, status, cooldown, governedBy | Add incrementally (e.g. category enum, status, cooldown) if you want PMM governance. |
| **Timeline trigger** | anchorField, anchorOffsetDays | Optional; keep timingConfig JSON or add columns if you need query/filter by anchor. |
| **Phases and gates** | PlayPhaseTemplate + gateType/gateConfig | Add if you want “phase 2 starts when phase 1 gate passes”; otherwise keep flat steps. |
| **ContentTemplate** | First-class content templates per phase | Add if you want reusable, governed content blueprints; else keep inline step config. |
| **Run model** | Single PlayRun → PlayPhaseRun → PlayAction | Decide: migrate ActionWorkflow + PlaybookRun into one model, or keep both and document when to use which. |
| **ContactTouch** | Play-scoped touch log for cooldown | Add if you need reliable cooldown and “last contacted” per play; else rely on Activity. |
| **PlayGovernance** | Tenant-level guardrails | Add when you need discount caps, competitive rules, approved SKUs, or global narratives. |

---

## 9. Suggested Approach

- **Short term:** Don’t replace the existing schema. Keep **PlaybookTemplate**, **PlaybookActivation**, **ActionWorkflow**, **RoadmapActionMapping**, and **Company** as the source of truth.
- **Add optionally:**  
  - **ContactTouch** (or a small “play touch” table) if you implement cooldown.  
  - **PlayGovernance** (or a single tenant-level config) when you need PMM guardrails.  
  - **Category / status** on PlaybookTemplate if you want better filtering and lifecycle.
- **Phases and gates:** Only add **PlayPhaseRun** and gate fields if you’re committed to phase-based flows and gates; otherwise keep flat **ActionWorkflowStep**.
- **ContentTemplate:** Add only if you want PMM-defined, reusable content blueprints; otherwise keep driving generation from **PlaybookTemplateStep** + code.
- **Unified run model:** Treat as a larger product decision: either (a) evolve ActionWorkflow toward phases/gates and deprecate PlaybookRun, or (b) keep both and clearly separate “company playbook runs” vs “signal/roadmap-driven workflows.”

This keeps the current engine intact while allowing you to adopt pieces of the proposed schema (touch log, governance, template metadata) where they add the most value.
