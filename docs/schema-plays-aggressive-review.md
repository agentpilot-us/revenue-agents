# Aggressive Play Schema — Review & Implementation Plan

You're building clean while there are no active customers. This review endorses the aggressive schema and spells out exactly what to change in your codebase and what to add so the cutover is safe and complete.

---

## 1. What the aggressive build gives you

- **Single run model:** PlayRun → PlayPhaseRun → PlayAction replaces both PlaybookRun and ActionWorkflow. One place for "what the AE does next."
- **Content as a first-class entity:** ContentTemplate with promptTemplate, governanceRules, contextSources, and performance fields (timesGenerated, timesEdited, avgEditDistance). Enables PMM governance and reuse across plays.
- **Phases with gates:** PlayPhaseTemplate has gateType (MANUAL, CRM_FIELD, CONTENT_SENT, AUTO) and gateConfig. Supports renewal-style flows (e.g. "Phase 1 done when content sent").
- **ContactTouch from day one:** Dedicated touch log for cooldown and "last contacted X days ago" warnings. No over-contact.
- **PlayGovernance:** One row per user (tenant): discount caps, cooldown defaults, competitive rules, value narrative, expansion SKUs, brand voice. Governance is in the schema, not only in code.
- **User-scoped tenancy:** PlayTemplate.userId (and ContentTemplate.userId, SignalPlayMapping.userId) matches your current model. No Org table until you need it.
- **SignalPlayMapping:** Simple signal → play wiring (signalType, playTemplateId, autoActivate, priority). Replaces the current RoadmapSignalRule + RoadmapActionMapping for the signal→play path.

The aggressive schema is consistent and shippable. Below is what you need to adapt and what to migrate.

---

## 2. Critical adaptation: Account → Company

The aggressive schema uses **Account** for the target account (where plays run). In your app, the target account is **Company** (to avoid clashing with NextAuth `Account`).

**Do this:**

- In the Prisma schema you add, rename every **Account** reference to **Company** in the play system:
  - `PlayRun.accountId` → `companyId`, relation `company Company @relation(...)`
  - `ContactTouch.accountId` → `companyId`, relation `company Company`
- In the "UPDATED ACCOUNT MODEL" comment block, treat it as **Company**: add `playRuns PlayRun[]`, `contactTouches ContactTouch[]`, and any optional fields (contractEndDate, contractStartDate, arr, accountTier, etc.) to **Company**.
- Ensure **User** has the relation needed for PlayTemplate, PlayGovernance, SignalPlayMapping (e.g. `playTemplates PlayTemplate[]`).

No new "Account" model. Company stays the target account.

---

## 3. Gap: Strategist “activation” (account-level play enablement)

Today, **PlaybookActivation** lets a strategist say: "For this account (roadmap), these templates are active." So the AE only sees or auto-runs plays that are activated for that account.

The aggressive schema has:

- **PlayTemplate.scope:** COMPANY vs ACCOUNT (who can run it).
- **SignalPlayMapping:** When a signal fires, which play to run (and autoActivate).

It does **not** have: "Play X is enabled for account Y by the strategist." So either:

- **Option A — No activation table:** Every ACCOUNT-scope template is available for every account; signal→play is global per user (SignalPlayMapping). Strategist doesn’t "pre-enable" plays per account; they only configure SignalPlayMapping. Simpler, but you lose "only these 5 plays for Kohl’s."
- **Option B — Add an activation table (recommended):** Keep the strategist workflow. Add something like:

```prisma
model AccountPlayActivation {
  id             String   @id @default(cuid())
  roadmapId      String   // or companyId + userId if you prefer
  roadmap        AdaptiveRoadmap @relation(fields: [roadmapId], references: [id], onDelete: Cascade)
  playTemplateId String
  playTemplate   PlayTemplate @relation(fields: [playTemplateId], references: [id], onDelete: Cascade)
  isActive       Boolean  @default(true)
  customConfig   Json?    // step overrides, target contacts (same idea as current PlaybookActivation)
  activatedAt   DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([roadmapId, playTemplateId])
  @@index([roadmapId])
  @@index([playTemplateId])
}
```

Then:

- **Signal path:** When a signal fires, resolve play by (1) AccountPlayActivation for that account (roadmap’s company) if you want "only activated plays for this account," or (2) SignalPlayMapping only (global). Recommend: check activation when autoActivate is true (only create PlayRun if that template is activated for this account).
- **Catalog "Run on account":** Show templates that are either COMPANY scope or ACCOUNT scope and (if you use activation) activated for this account. Creating a PlayRun is allowed if the template is active for that company (or always for COMPANY scope).

So: keep **AdaptiveRoadmap** (and optionally RoadmapTarget, etc.) for the Strategic Account Plan UI; add **AccountPlayActivation** (or keep the name PlaybookActivation and point it at PlayTemplate) so strategists can still enable plays per account.

---

## 4. Roadmap and signal path

- **Keep:** AdaptiveRoadmap, RoadmapTarget, RoadmapContact, RoadmapCondition (and optionally RoadmapPlan if you want a "plan" record when a signal fires before creating the PlayRun). These power the SAP page and targeting.
- **Replace for signal→play:** RoadmapSignalRule + RoadmapActionMapping are replaced by **SignalPlayMapping** for the logic "when signal type X, run play Y (and optionally auto-create PlayRun)."
- **Migration of config:** Write a one-off script that, for each RoadmapActionMapping (or each RoadmapSignalRule + its mappings), creates a SignalPlayMapping: signalType from rule category or mapping’s signalCategory, playTemplateId from the new PlayTemplate that corresponds to the old PlaybookTemplate (you’ll need a mapping by name or a manual mapping table), autoActivate from autonomyLevel === 'auto_execute', priority from priorityWeight.

You can keep the roadmap tables and drop only the rule/mapping tables after migration, or keep one "legacy" mapping table that points at PlayTemplate for a transition period. Recommendation: go full SignalPlayMapping and remove RoadmapSignalRule and RoadmapActionMapping once migration is done.

---

## 5. Tables to add (aggressive schema)

Add these to your Prisma schema (with Account → Company and User/Company relations as above):

| Table | Purpose |
|-------|--------|
| PlayTemplate | Blueprint (scope, category, status, trigger, anchor, signalTypes, cooldown overrides) |
| PlayPhaseTemplate | Phases with gateType, gateConfig, orderIndex, offsetDays |
| ContentTemplate | First-class content (contentType, promptTemplate, governance, contextSources, optional phaseTemplateId) |
| PlayRun | Single run instance (companyId, playTemplateId, userId, status, anchorDate, currentPhaseIdx) |
| PlayPhaseRun | Per-phase progress (targetDate, gateCompleted, status) |
| PlayAction | My Day card (phaseRunId, contentTemplateId, title, actionType, generatedContent, contact*, status, cooldownWarning, etc.) |
| ContactTouch | Touch log (companyId, contact*, playActionId, playRunId, playName, phaseName, channel, touchDate, subject) |
| PlayGovernance | One per user: discount caps, cooldown defaults, competitive rules, value narrative, expansion SKUs, brand voice |
| SignalPlayMapping | signalType → playTemplateId, autoActivate, priority, conditions |
| ContentGenerationLog | Audit/cost per generation (playActionId, contentTemplateId, model, tokens, cost, status) |
| AccountPlayActivation (recommended) | roadmapId + playTemplateId + customConfig for strategist per-account enablement |

Enums: PlayScope, PlayCategory, PlayTriggerType, PlayTemplateStatus, PhaseGateType, ContentType, ContentChannel, ModelTier, PlayRunStatus, PhaseRunStatus, ActionType, ActionPriority, ActionStatus, ContactRole, TouchChannel, GenerationStatus.

---

## 6. Tables to drop (after migration and code cutover)

| Table | Replaced by |
|-------|-------------|
| PlaybookTemplate | PlayTemplate |
| PlaybookTemplateStep | PlayPhaseTemplate + ContentTemplate |
| PlaybookActivation | AccountPlayActivation (or equivalent) pointing at PlayTemplate |
| PlaybookRun | PlayRun |
| PlaybookRunStep | PlayPhaseRun + PlayAction |
| ActionWorkflow | PlayRun |
| ActionWorkflowStep | PlayAction |
| RoadmapSignalRule | SignalPlayMapping (and roadmap UI can show mappings from SignalPlayMapping) |
| RoadmapActionMapping | SignalPlayMapping |

RoadmapPlan: either drop (and have the signal handler create PlayRun directly) or keep for a "plan" record that links signal → PlayRun for audit. Optional.

---

## 7. Code touchpoints (what to rewrite)

These are the main places that assume the current play/action model. Each needs to be switched to the new model.

| Area | Current | New |
|------|--------|-----|
| **Signal → play** | `matchSignalToRoadmapRules` (roadmap, signal rules, action mappings, resolveTemplateForContext, assembleWorkflow) | Look up SignalPlayMapping by signalType (and userId); if autoActivate and (if you use it) AccountPlayActivation for that company, create PlayRun; create PlayPhaseRun(s) and PlayAction(s) from PlayTemplate phases and ContentTemplates. |
| **Assemble “workflow”** | `assembleWorkflow` (template + steps → ActionWorkflow + ActionWorkflowStep) | New `createPlayRunFromTemplate(playTemplateId, companyId, userId, options)` that creates PlayRun, PlayPhaseRun per phase, and PlayAction per ContentTemplate (or per phase content). Optionally apply AccountPlayActivation.customConfig (step overrides, target contacts). |
| **My Day** | Queries ActionWorkflow (+ steps) | Query PlayRun (e.g. by userId, status ACTIVE/PAUSED) and PlayAction (e.g. status PENDING, ordered by suggestedDate/dueDate). |
| **Execute step** | `execute-step` (ActionWorkflowStep → generate content, send, create Activity) | Execute PlayAction: generate from ContentTemplate (and buildContentContext), write ContentGenerationLog; on send, create Activity and ContactTouch. |
| **Play catalog / Run on account** | `from-play` route: assembleWorkflow, redirect to workflow UI | Create PlayRun (and phase/actions) from selected PlayTemplate + company + division/contact; redirect to play run UI (play run detail or My Day). |
| **Content generation** | `generateOneContent`, `build-content-context`, step’s promptHint/assetTypes | ContentTemplate.promptTemplate + systemInstructions + governanceRules; buildContentContext() feeds contextSources; log to ContentGenerationLog. |
| **Cooldown / touch** | Not enforced in schema | Before creating or suggesting a PlayAction that targets a contact, query ContactTouch for that company + contact; if within PlayTemplate.contactCooldownDays (or PlayGovernance.defaultCooldownDays), set PlayAction.cooldownWarning and optionally alternateContact. On send, insert ContactTouch. |
| **Chat agent** | `run_workflow` tool (assembleWorkflow, resolveTemplateForContext) | Same idea: resolve template (from SignalPlayMapping or catalog), then create PlayRun via new helper. |
| **Roadmap / SAP** | Configuration tab: signal rules + action mappings (templateId), Plays tab: PlaybookActivation | Configuration: list/edit SignalPlayMapping (and optionally "which plays are activated for this roadmap" = AccountPlayActivation). Plays tab: list AccountPlayActivation, add/remove, customize (customConfig). |
| **Preview signal** | preview-signal route (roadmap, action mappings, resolve template) | Preview: given signalType, look up SignalPlayMapping, resolve PlayTemplate and show phases/ContentTemplates and would-create PlayRun. |

You can keep the same high-level flows (signal → match → create run; catalog → create run; My Day list; execute step); the implementation switches from ActionWorkflow/ActionWorkflowStep to PlayRun/PlayPhaseRun/PlayAction and from PlaybookTemplate steps to PlayPhaseTemplate + ContentTemplate.

---

## 8. Suggested implementation order

1. **Schema only (no drop yet)**  
   Add all new enums and models (PlayTemplate, PlayPhaseTemplate, ContentTemplate, PlayRun, PlayPhaseRun, PlayAction, ContactTouch, PlayGovernance, SignalPlayMapping, ContentGenerationLog, AccountPlayActivation). Use **Company** and **User**. Add relations on Company (playRuns, contactTouches) and User (playTemplates, playGovernance, signalPlayMappings). Run migration.

2. **Seed the 6 plays**  
   Implement the seed from the aggressive schema (Contract Renewal, Quarterly Check-In, Feature Launch, Executive Intro, Competitive Displacement, Expansion). Create PlayTemplate + PlayPhaseTemplate + ContentTemplate rows. Optionally seed PlayGovernance defaults per user.

3. **Create PlayRun from template (no signal yet)**  
   Implement `createPlayRunFromTemplate(playTemplateId, companyId, userId, { anchorDate?, targetDivisionId?, targetContactId?, accountSignalId? })`. Create PlayRun, one PlayPhaseRun per phase, and one PlayAction per ContentTemplate in each phase. Do not yet create content; just create the action records. This replaces the core of `assembleWorkflow`.

4. **Content generation for a PlayAction**  
   For a given PlayAction linked to a ContentTemplate, load promptTemplate, systemInstructions, governanceRules, contextSources; call your existing buildContentContext (or equivalent) and generate; write result to PlayAction and log to ContentGenerationLog. Reuse or adapt `generateOneContent` behind a ContentTemplate-driven API.

5. **Execute action (send / complete)**  
   When the AE sends an email (or other channel): create Activity (as today); create ContactTouch (companyId, contact, playActionId, playRunId, playName, phaseName, channel, touchDate, subject). Update PlayAction status to EXECUTED. If gateType is CONTENT_SENT, mark phase gate completed and advance phase if applicable.

6. **Cooldown check**  
   When generating or suggesting actions, query ContactTouch for the target contact and company; apply PlayTemplate or PlayGovernance cooldown; set cooldownWarning and alternateContact on PlayAction if needed.

7. **My Day**  
   Change My Day query from ActionWorkflow (+ steps) to PlayRun + PlayAction (e.g. pending actions for the user, ordered by due/suggested date). UI shows "cards" from PlayAction.

8. **Signal path**  
   Replace matchSignalToRoadmapRules with: on new AccountSignal, find SignalPlayMapping(s) by signalType (and userId); for each with autoActivate, check AccountPlayActivation for that company if you use it; then create PlayRun (and phases/actions) via createPlayRunFromTemplate. Optionally create a RoadmapPlan record for audit or remove RoadmapPlan and rely on PlayRun only.

9. **Play catalog and "Run on account"**  
   Catalog lists PlayTemplate (filter by scope/category/status). "Run on account" calls createPlayRunFromTemplate with selected company (and division/contact). Redirect to play run detail or My Day.

10. **Roadmap / SAP UI**  
    Configuration: manage SignalPlayMapping (signal type → play, autoActivate, priority). Plays tab: manage AccountPlayActivation (activate/customize plays for the roadmap’s account). Reuse existing roadmap page; swap underlying APIs to the new tables.

11. **Drop old tables**  
    After all code paths use the new model, drop PlaybookTemplate, PlaybookTemplateStep, PlaybookActivation, PlaybookRun, PlaybookRunStep, ActionWorkflow, ActionWorkflowStep, RoadmapSignalRule, RoadmapActionMapping (and optionally RoadmapPlan). Run migration. Remove any remaining references in code.

---

## 9. Summary

- **Aggressive schema is sound.** Use it with **Account → Company** and **User**-scoped tenancy.
- **Add AccountPlayActivation** (or equivalent) so strategists can still enable plays per account; wire it into the signal path and catalog.
- **Keep AdaptiveRoadmap** (and related roadmap tables) for the SAP; replace signal→play logic with **SignalPlayMapping** and the new **PlayRun** creation.
- **Single run model** (PlayRun → PlayPhaseRun → PlayAction) and **ContentTemplate** + **ContactTouch** + **PlayGovernance** give you a clean, governable product. Implementing in the order above keeps risk manageable and gets you to a full cutover without carrying two run models long-term.

If you want, next step can be a concrete Prisma schema diff (patch) that adds the aggressive models to your current `schema.prisma` with Company/User and AccountPlayActivation included, and a minimal seed for one play so you can run a migration and one flow end-to-end.
