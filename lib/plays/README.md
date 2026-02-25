# Play systems in this codebase

There are **three** distinct “play” concepts. Signals and suggestions use only the **tactical plays** system.

## 1. Tactical plays (this folder: `lib/plays/`)

- **What:** The five plays: Open New Buying Group, Event Invite, Feature Release, Re-Engagement, Champion Enablement.
- **Source of truth:** `plays-config.ts` (`PlayId`, `PLAYS`).
- **Flow:** `engine.ts` → `getSuggestedPlays(company)` → suggestions; execution via **POST** `/api/companies/[companyId]/plays/execute` (creates SegmentCampaign + draft).
- **No Prisma model** for “a run” of a tactical play; execution is fire-and-forget (campaign + draft created).
- **Signals:** `AccountSignal.suggestedPlay` uses these `PlayId` values. Hot Signals “Run X play” and company signals API “Run X play” refer to this system. When wiring or changing signals, use these play IDs only.

## 2. Use Case Exploration (`UseCaseExplorationPlay`)

- **What:** A single guided play: 4-step wizard (company → department → steps 1–4), stored in Prisma.
- **API:** **PATCH** `/api/plays/use-case-exploration/[playId]`; UI: `/dashboard/plays/use-case-exploration/[playId]`.
- **Separate from tactical plays.** Signals do **not** trigger or reference Use Case Exploration. Do not use `suggestedPlay` for this flow.

## 3. Expansion play tracking (`ExpansionPlay`)

- **What:** Tracks an expansion opportunity by company + department + product (e.g. research phase → outreach) with status and `nextActionDue`.
- **Dashboard:** “Today’s tasks” includes **ExpansionPlay** rows that need action (e.g. “Company X — Dept Y” linking to the department page). This is **not** the same as “run a tactical play”; it’s follow-up on an existing expansion track.

---

**Summary:** For signals and “suggested play” UX, use only the **tactical plays** (PlayIds from `plays-config.ts`). UseCaseExplorationPlay and ExpansionPlay are different systems and should not be mixed with `AccountSignal.suggestedPlay` or the execute-play API.
