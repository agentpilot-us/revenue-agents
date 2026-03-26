# Official demo account (demo-techinfra@agentpilot.us)

## Behavior

- **Nav:** When logged in as any official demo user (e.g. `demo-techinfra@agentpilot.us`), the sidebar does **not** show "Demo setup" or "Waitlist". Those links are only visible when `ALLOW_DEMO_SETUP=true` and the current user is **not** an official demo user.
- **Demo emails** (see `lib/demo/context.ts`): `demo-techinfra@agentpilot.us`, `demo-saas@agentpilot.us`, `demo-services@agentpilot.us`.
- **Live demo:** The official demo account uses **live** mode by default: `isDemoAccount = false` so you can show real content and use API/LLM (no frozen/scripted demo). New companies created by this user are created with `isDemoAccount: false`. To force existing companies to live, run `npm run official-demo:set-live`.

## Wiping demo data before a fresh upload

1. Ensure the user **demo-techinfra@agentpilot.us** exists in the database and has `accountStatus = 'active'` (so they can log in and are not redirected to waitlist-pending). Set this in the dashboard admin or directly in the DB if needed.

2. From the project root, run:
   ```bash
   npm run cleanup:official-demo
   ```
   Or:
   ```bash
   npx dotenv -e .env.local -- tsx prisma/cleanup-official-demo.ts
   ```

3. This deletes **all** data for that user (companies, contacts, content library, products, campaigns, plays, etc.). The **User** record is kept so they can still sign in.

4. **Seed the NVIDIA/GM demo** (or upload your own data):
   ```bash
   npm run seed:nvidia-gm
   ```
   The seed **removes** any legacy target company whose name contains **Revenue Vessel** for `demo-techinfra@agentpilot.us` (leftover from older demos). To delete only that account without re-running the full seed: `npm run demo:remove-revenue-vessel`.

   This creates GM as target account, 5 buying groups, 76 contacts, 8 NVIDIA products, content library, messaging frameworks, industry playbook, PlayGovernance, 3 pre-seeded signals, **RoadmapTarget + RoadmapContact** (AV Engineering + Shelly Chaka, IT Infrastructure + Frank Morrison; Sarah Williams → AV Engineering), **Champion personas** (Frank = Champion, Shelly = Decision Maker, Sarah = Technical Evaluator), **4 plays** (New C-Suite Executive, Budget Cycle Expansion, Competitive Response, **Expansion: DGX to DRIVE Thor**), SignalPlayMapping, AccountPlayActivation, and one **mid-progress PlayRun** (3 steps executed) for Act 2 My Day. The GM **Strategic Account Plan** is seeded with the objective **"14 new use cases across 5 buying groups"** (goalText, metric, timeHorizon). The seed also adds **"months of usage" analytics data**: backdated contact creation over 12–16 weeks, email Activity (sent/opens/clicks) over the last 90 days, Contact engagement aggregates, 2–3 historical PlayRuns (completed or in progress), and optionally one SegmentCampaign plus CampaignVisits for landing page performance. After seed, the **Analytics** page shows meaningful engagement, play activity, and warm contacts for the demo account. The GM company is created with `isDemoAccount: false` (live demo).
   - Optional: run `npx dotenv -e .env.local -- tsx prisma/seed-plays.ts` with `SEED_USER_ID=<demo-user-id>` to add more play templates (e.g. Contract Renewal, Feature Launch). The NVIDIA seed already creates the 3 signal-linked plays; seed-plays can extend the catalog.

5. **Set demo to live** (if you didn’t use the seed and created companies another way) (so the demo uses real content and APIs, not frozen/scripted mode):
   ```bash
   npm run official-demo:set-live
   ```
   This sets `isDemoAccount = false` (and clears demo lock fields) for all companies belonging to `demo-techinfra@agentpilot.us`. Run after creating/uploading your demo company so the account is live.

## Autonomous play demo

- **URL:** `/dashboard/demo/autonomous-play` (when `ALLOW_DEMO_SETUP=true`, the sidebar shows an "Autonomous demo" link).
- Pre-written, self-contained demo: no API or LLM. Click a preset command or type your own to watch the agent execute all 7 steps of the New C-Suite Executive play (NVIDIA/GM scenario) with thinking messages and result cards. Safe for live audiences.

## 3-act demo runbook (NVIDIA/GM)

For the full AE Maturity Progression demo script (Act 1: Governed, Act 2: Self-serve, Act 3: Autonomous), see **docs/NVIDIA_GM_DEMO_SCRIPT_PLAN.md**. Quick runbook:

1. **Reset (optional):** `npm run cleanup:official-demo`
2. **Seed:** `npm run seed:nvidia-gm`
3. **Live (if needed):** `npm run official-demo:set-live`
4. **Log in** as demo-techinfra@agentpilot.us.
5. **Act 1:** My Day → click "Work This" on the exec_hire signal (Shelly Chaka) → redirects to play run page with 7 steps and Shelly Chaka as contact. Generate/Review on the congratulations email step.
6. **Act 2:** Strategic Account Plan → GM → Plays → "Start from Catalog" shows the 4 activated plays (New C-Suite Executive, Budget Cycle Expansion, Competitive Response, **Expansion: DGX to DRIVE Thor**). My Day shows the mid-progress run (e.g. Step 4 of 7).
7. **Act 3:** `/dashboard/demo/autonomous-play` — preset or type a command; 7 steps run with pre-written content (~25 sec).

### Part 2: Upsell play (Expansion: DGX to DRIVE Thor)

After the 3-act flow, run the **upsell** demo for an account already in the system (GM uses DGX → upsell to DRIVE Thor).

- **Start:** SAP → GM → Plays → Start from Catalog → **Expansion: DGX to DRIVE Thor** → pick buying group (e.g. AV Engineering).
- **Steps:** (1) Contact sweep of buying group (internal task), (2) Send webinar invite (GTC 2026), (3) Send DRIVE Thor spec to champion (Day +3). Pre-seeded content is applied so each step shows the right body.
- **Champion brief:** Open `/demo/nvidia-gm-executive-brief.html` after step 3 to show the executive brief "Frank forwards to his team."
- **Contacts:** Frank Morrison = Champion, Shelly Chaka = Decision Maker, Sarah Williams = Technical Evaluator (Role column in Build Contact List).

## Scripts

- `prisma/cleanup-official-demo.ts` — delete all data for `demo-techinfra@agentpilot.us` (user record kept).
- `prisma/set-official-demo-live.ts` — set all that user’s companies to live mode (`isDemoAccount = false`).
- `prisma/seed-nvidia-gm-demo.ts` — seed NVIDIA/GM demo (GM company, 5 buying groups, 75 contacts, 8 products, content library, messaging frameworks, industry playbook, PlayGovernance, 3 signals, roadmap objective "14 new use cases across 5 buying groups", and months-of-usage analytics data). Run after cleanup for a fresh demo.
