# AgentPilot — Lean Play Architecture (source of truth)

**Status:** Locked product direction. Supersedes “add six targeting columns now” for small-catalog customers.

## Decision summary

| Topic | Decision |
|-------|----------|
| Template source of truth | **PlayTemplate** (richer governance: scope, category, cooldowns, signalTypes, phases). |
| Six targeting fields on PlaybookTemplate | **Deferred to Phase 6 (Play Marketplace)** — not needed when customers run 4–10 custom plays; AEs pick plays manually or rules are explicit. |
| Scoring cascade (`resolveTemplateForContext`) | **Preserved in codebase, not called** on the lean signal path. Reactivate in Marketplace when large shared libraries need fallback ranking. |
| Signal → play | **Explicit:** `SignalPlayMapping` (My Company / seeds) + optional `AccountPlayActivation` gates → `matchSignalToPlayRun` → `createPlayRunFromTemplate`. |
| Autonomy | **Three levels:** template default → SAP activation `customConfig.autonomyLevel` override → **frozen** on `PlayRun` at creation. |
| Execution engine | **PlayRun** only for new work; legacy **ActionWorkflow** removed in Phase 5 cleanup. |
| Play Marketplace (Phase 6) | Future: targeting columns on `PlayTemplate`, scoring as fallback, install/update flows — **not in scope** for lean delivery. |

## Lean signal path (no scoring)

1. Signal ingested → `matchSignalToPlayMapping` (formerly `matchSignalToRoadmapRules` wrapper) → `matchSignalToPlayRun`.
2. Load `SignalPlayMapping` rows for `userId` + signal type; respect `conditions`, `autoActivate`, template `ACTIVE`, activation if enforced.
3. Resolve autonomy: activation JSON `autonomyLevel` (legacy string keys) ↔ `AutonomyLevel` enum on template/run.
4. `createPlayRunFromTemplate` → My Day.

## Phase 5 (this repo)

- Remove **ActionWorkflow** HTTP surface and workflow-only UI; all execution UX goes through Play Run routes.
- Remove **PlaybookTemplate** HTTP surface; roadmap/My Company use **PlayTemplate** + **signal-play-mappings**.
- Drop legacy Prisma models/tables once no callers remain (separate migration).

## Phase 6 (product — not implemented here)

- Marketplace installs, `source` / `marketplaceMetadata`, targeting columns, scoring fallback when explicit mapping missing.

## Related docs

- [play-surfaces-preflight-model-diff.md](./play-surfaces-preflight-model-diff.md) — field diff; **lean path defers** adding targeting columns until Marketplace.
