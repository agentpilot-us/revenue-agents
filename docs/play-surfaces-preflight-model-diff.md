# Play Surfaces Cleanup — Pre-flight: PlaybookTemplate vs PlayTemplate Model Diff

**Purpose:** Before committing to Phase 1 Option A (My Company → PlayTemplate as single source), document what migrates cleanly vs what needs new columns or deferral to Phase 5.

**Lean architecture (locked):** We are **not** adding the six targeting columns to `PlayTemplate` until **Play Marketplace (Phase 6)**. Explicit `SignalPlayMapping` + small catalogs make scoring optional. See [agent-pilot-lean-architecture.md](./agent-pilot-lean-architecture.md).

---

## Field-by-field comparison

| PlaybookTemplate field | PlayTemplate has? | Action |
|------------------------|-------------------|--------|
| id | Yes (id) | Same |
| userId | Yes | Same |
| name | Yes | Migrate cleanly |
| description | Yes | Migrate cleanly |
| isBuiltIn | No | Add to PlayTemplate or derive from slug/seed list |
| triggerType | Yes (triggerType, enum PlayTriggerType) | Migrate; map string → enum |
| isDefault | No | Optional: add or drop (used for "default" playbook) |
| **targetDepartmentTypes** | **No** | **Add column (Json?) or defer to Phase 5** |
| **targetIndustries** | **No** | **Add column (Json?) or defer to Phase 5** |
| **targetPersonas** | **No** | **Add column (Json?) or defer to Phase 5** |
| **timingConfig** | No (PlayTemplate has anchorField, anchorOffsetDays) | Partial: anchor covers some timing; add timingConfig Json? if needed |
| **expectedOutcome** | No | Add String? @db.Text or defer |
| **priority** | **No** | **Add Int @default(0) for resolution scoring** |
| createdAt, updatedAt | Yes | Same |

**PlayTemplate-only fields (no reverse migration needed):** slug, scope, category, status, anchorField, anchorOffsetDays, signalTypes, contactCooldownDays, maxTouchesPerWeek, phases (PlayPhaseTemplate).

---

## Resolution usage (resolve-template.ts)

- **resolveTemplateForContext** uses **PlaybookTemplate** and **PlaybookActivation** (legacy).
- Scoring uses: **priority**, **targetIndustries**, **targetDepartmentTypes**, **targetPersonas** (see `TEMPLATE_SCORING_SELECT`, `scoreTemplate()`, `pickBest()`).
- Steps 0–5 all query `prisma.playbookTemplate` or `playbookActivation.template`. No PlayTemplate usage today.

**Conclusion:** If we want Option A (single source = PlayTemplate), we must either:
1. **Add to PlayTemplate:** `targetDepartmentTypes`, `targetIndustries`, `targetPersonas`, `priority`, and optionally `expectedOutcome`, `timingConfig` (Json). Then Phase 5 migrates resolve-template to use PlayTemplate + AccountPlayActivation and these fields; or
2. **Defer:** Keep My Company Playbooks tab on PlaybookTemplate for now; Phase 1 only adds governance UI (signal rules, default autonomy) to the *existing* PlayTemplate surfaces (e.g. roadmap). Phase 5 does full PlaybookTemplate → PlayTemplate migration and resolve-template switch.

**Earlier recommendation (aggressive schema):** Add targeting columns for Option A + `resolveTemplateForContext` on PlayTemplate. **Superseded for near-term delivery** by the lean path: defer those columns to Marketplace; see [agent-pilot-lean-architecture.md](./agent-pilot-lean-architecture.md).

---

## Deliverable summary

| PlaybookTemplate field | PlayTemplate: migrate / add column / defer |
|------------------------|--------------------------------------------|
| name, description, triggerType | Migrate cleanly (triggerType → enum) |
| targetDepartmentTypes, targetIndustries, targetPersonas, priority | **Add column** (Json? or Int) for Option A + resolution in Phase 5 |
| timingConfig, expectedOutcome | Add column (Json?, String?) or defer |
| isBuiltIn, isDefault | Add or derive; low priority |
