# Duplicate-looking play cards on My Day

## What you might see

Two **Action Queue** cards with the same **play template name** and **company** (e.g. two “Expansion: DGX to DRIVE Thor” rows for NVIDIA).

## This is usually not a bug

`GET /api/dashboard/my-day` returns every `PlayRun` for the user with `status` in `ACTIVE` or `PROPOSED` (up to 50, ordered by `activatedAt` desc). **Starting the same template twice on the same account creates two runs** — both appear in the queue.

Legitimate reasons for multiple runs:

- Different **roadmap / division** targets (`roadmapTargetId`) for the same motion.
- User (or automation) clicked **Start** twice.
- **Signal** and **manual catalog** start both created a run.

## UI clarification

`PlayRunCard` shows **Division: …** when `roadmapTarget` is set so you can tell runs apart.

## If you need deduplication

Product options (not implemented by default):

- Before `POST /api/play-runs`, check for an existing open run with the same `companyId`, `playTemplateId`, and optional `roadmapTargetId`, and return or extend that run instead of creating another.
- Collapse the queue visually when template + company match (risky if divisions differ).

## Related code

- `app/api/dashboard/my-day/route.ts` — `playRuns` query.
- `app/api/play-runs/route.ts` — run creation.
- `lib/plays/match-signal-to-play.ts` — signal-triggered runs.
