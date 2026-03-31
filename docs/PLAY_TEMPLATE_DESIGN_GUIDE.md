# Play Template Design Guide

**Audience:** Strategists and consultants who use **Play Template Builder** ([`PlayTemplateBuilder`](../app/components/plays/PlayTemplateBuilder.tsx)) and **`SignalPlayMapping`** to ship plays that AEs actually finish, with strong generated content and measurable outcomes.

**Related docs:** [STRATEGIST_ONBOARDING_GUIDE.md](./STRATEGIST_ONBOARDING_GUIDE.md) (setup order), [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md) (crons, signal pipeline). This guide is **methodology**, not a full system reference.

**Code truth:** Template triggers are `PlayTriggerType` in [`prisma/schema.prisma`](../prisma/schema.prisma) (`MANUAL` | `SIGNAL` | `TIMELINE`). There is **no** `EVENT` template trigger type today; time-based meeting prep uses the separate **`action-workflow-triggers`** cron, not the template’s `triggerType`.

---

## 1. Anatomy of a play (how to think about design)

### Hierarchy

| Level | What it is | Design intent |
|-------|----------------|----------------|
| **PlayTemplate** | Named playbook with slug, category, scope, **trigger**, optional default autonomy | One coherent outcome (e.g. “renewal motion,” “competitive response”) |
| **PlayPhaseTemplate** | Ordered phases with optional **offset days** and a **gate** | Break work into reviewable chunks; control when the next phase unlocks |
| **Step (ContentTemplate)** | **Builder v1** saves **one step per phase**; seeds/API may attach **multiple** `ContentTemplate` rows to the same phase | Each phase should deliver one clear artifact or send (or a tight bundle you treat as one review unit) |
| **Content** | **PlayContentType** (email, brief, deck, …) + **contentGenerationType** (prompt recipe) + optional advanced prompt | Drives channel, placeholders, and default tone |

### Triggers (template-level)

- **MANUAL** — AE or strategist starts the run from the catalog; use when judgment always precedes execution.
- **SIGNAL** — Run creation is driven by **`SignalPlayMapping`** + ingested **`AccountSignal`** (see §3); template `signalTypes` on the model can document intent but **matching uses mappings**.
- **TIMELINE** — Run creation uses **`play-timeline-triggers`** ([`play-timeline-triggers/route.ts`](../app/api/cron/play-timeline-triggers/route.ts)) against **`CompanyProduct`** dates; requires **`anchorField`** + **`anchorOffsetDays`**. **`anchorField` must be one of the mapped strings** (`contractEndDate`, `contractRenewalDate`, `contractEnd`, `contractStartDate`, `contractStart`); an unknown value **falls back to `contractRenewalDate`** in the cron—verify dates exist on the right column.

### Phase gates

`PhaseGateType` in schema: **MANUAL**, **CRM_FIELD**, **CONTENT_SENT**, **AUTO**.

- **MANUAL** — AE explicitly completes the phase when ready (good for “review brief, then send”).
- **CONTENT_SENT** — Auto-advance when outbound actions in the phase are executed/skipped (see [`execute-action`](../lib/plays/execute-action.ts) gate logic).
- **CRM_FIELD** — Cron evaluates cached opportunity JSON on **Company** (`play-crm-field-gates`); **`gateConfig`** must match what the cron reads (often set via seed/API; Builder v1 may not expose all gate JSON in UI—validate after save).
- **AUTO** — Phase completes immediately when activated (use for “instant” research-only phases before outreach).

### Autonomy (`AutonomyLevel`)

Inherited on **`PlayRun`** at creation: activation override → template **`defaultAutonomyLevel`** → **`DRAFT_REVIEW`**.

- **NOTIFY_ONLY** — Surface work; minimal automation.
- **DRAFT_REVIEW** — Default for production maturity; AE reviews before send.
- **AUTO_EXECUTE** — Product path exists; use only when content quality and compliance are proven (see Strategist Guide Step 8).

### Failure modes this guide prevents

| Failure | Typical cause |
|---------|----------------|
| AE abandonment | Too many phases/steps, unclear “done,” weak gates |
| Never starts | Wrong trigger, missing mapping, TIMELINE without **CompanyProduct** dates |
| Always rewritten | Weak **Content Library** / industry playbook, wrong **contentGenerationType**, generic **promptHint** |
| Overlap / fatigue | Same signal maps to multiple plays, no **priority**, no cooldown awareness, multiple concurrent runs on one contact |

---

## 2. Design principles

### Size and shape

- Target **2–4 phases** per template; **2–4 total outbound moments** across the whole play unless the motion truly needs more.
- **Builder v1:** one step per phase—if you need three emails in a row, either **three phases** (with offsets) or split into **two plays** (e.g. “Event invite” vs “Event follow-up”).
- Each phase should answer: **What artifact exists when this phase is done?** and **Who approves?**

### Triggers and intent

- Every template should have **one primary start story**: manual, this signal family, or this timeline anchor—not “everything at once.”
- Prefer **explicit MANUAL** for high-stakes or ambiguous motions; use **SIGNAL** when the detection pipeline is reliable.

### Content and library

- Pick **contentGenerationType** first for email/LinkedIn/meeting patterns ([`content-generation-types.ts`](../lib/plays/content-generation-types.ts)); use **`custom_content`** only when you need a fully custom instruction and will maintain it.
- Align **contextSources** (when editing templates via API/seed) with what you actually have: e.g. don’t rely on **`usage_data`** if telemetry is empty.

### Gates

- Use **CONTENT_SENT** when the phase’s job is “send (or skip) these touches, then move on.”
- Use **MANUAL** when the AE must interpret research before the next phase.
- Use **CRM_FIELD** only when opportunity stage in **Salesforce sync** is trustworthy and refreshed.

### Anti-patterns

- **Kitchen-sink plays** — one template trying to cover every motion; split by trigger and buyer stage.
- **Duplicate mappings** — two **`SignalPlayMapping`** rows with the same **`signalType`** and overlapping **conditions**; tie-break is **priority** only (see §3).
- **Orphan TIMELINE** — renewal play with no populated **`contractRenewalDate`** / **`contractEnd`** on products (silent no-op; see Technical Guide §2 callout).

---

## 3. Trigger design

### MANUAL vs SIGNAL vs TIMELINE

| Use | When |
|-----|------|
| **MANUAL** | Discretionary plays, complex politics, or “run when AE decides” (Executive intro, expansion pitch). |
| **SIGNAL** | Clear external or ingested events (**`AccountSignal.type`** stable). |
| **TIMELINE** | Contract/renewal (or start) dates on **`CompanyProduct`**; offsets match commercial cadence. |

**“Event” plays (meetings, Cal.com):** Not a fourth enum. Meeting-driven **PlayRun** creation today is largely **`action-workflow-triggers`** (Meeting Prep), not `PlayTriggerType.EVENT`. Design either a **MANUAL** play the AE starts after a meeting, or invest in automation outside the template enum.

### SignalPlayMapping: making matches work

- Mappings are **per tenant** (`userId`); see Strategist Guide Step 9.
- **Type matching** ([`match-signal-to-play.ts`](../lib/plays/match-signal-to-play.ts)): `signalType` and ingested `type` are **trimmed and lowercased**, then matched if **equal** or one **contains** the other. **Case alone is not the usual trap**—the trap is **different slugs** (e.g. `exec_hire` vs `executive_hire`) that never substring-match. **Align strings with what ingestion/classification stores** (see Technical Implementation Guide).
- **Tie-break:** Among matching mappings, **`pickCandidate`** sorts by **`priority`** (`URGENT` → `HIGH` → `MEDIUM` → `LOW`). Use **distinct priorities** when two templates could both match.
- **AccountPlayActivation** (roadmap): If the account has a roadmap, activations **filter** which templates may run; if none match, the code **falls back** to any matching mapping—don’t rely on activations alone to suppress duplicates; fix mappings and priorities.

### Avoiding trigger overlap

- **One mapping per signal type per priority band** where possible; use **`conditions`** (`accountTier`, `arr_gt`, `arr_lt`) to separate enterprise vs mid-market templates ([`signal-mapping-conditions.ts`](../lib/plays/signal-mapping-conditions.ts)).
- **Cooldown / touches:** [`cooldown-check`](../lib/plays/cooldown-check.ts) and **PlayGovernance** weekly touch caps reduce “same contact hammered”—design plays that target **different roles** or **different phases** of the journey.
- **Dry-run:** Use **`resolveSignalToPlayCandidate`** / preview APIs in product to test mapping + activation before going live.

---

## 4. Content type selection

### Two layers (don’t confuse them)

1. **`PlayContentType`** (10 values) — UI/category for the step: `EMAIL`, `LINKEDIN_MSG`, `DECK`, `BRIEF`, `PROPOSAL`, `BATTLE_CARD`, `INTERNAL_NOTE`, `SLACK_MSG`, `CHAMPION_ENABLEMENT`, `EBR_DECK`.
2. **`contentGenerationType`** — Key into [`CONTENT_GENERATION_TYPES`](../lib/plays/content-generation-types.ts) (**20** preset recipes + **`custom_content`**). Builder exposes these keys via **`CONTENT_GENERATION_TYPE_KEYS`**.

Presets include: `congratulations_email`, `executive_intro_email`, `value_prop_email`, `roi_assessment_email`, `early_win_email`, `renewal_touchpoint_email`, `competitive_response_email`, `follow_up_email`, `event_invitation_email`, LinkedIn variants, `meeting_talking_points`, `meeting_agenda`, `executive_briefing`, `account_research_brief`, `contact_research`, `calendar_invite`, `phone_call_script`, `custom_content`.

### Matching strengths to the Content Library

Generation pulls from **governance**, **account/division**, **signal**, **contact**, and **RAG** where configured. If output is generic:

- Add **use cases / case studies / industry playbook** in Content Library (see Strategist Steps 3–5).
- Prefer presets that mention **`{{governance.valueNarrative}}`**, **`renewalMessaging`**, **`competitiveRules`** when those frameworks exist.
- For renewal plays, use **`renewal_touchpoint_email`** or explicit **`renewalMessaging`** in prompts.

### PlayContentType quick guide

| PlayContentType | Typical use |
|-----------------|-------------|
| **EMAIL** | Any outbound email step |
| **LINKEDIN_MSG** | Connection note, InMail, social touch |
| **BRIEF** | Research, exec briefing, objection prep |
| **DECK / EBR_DECK** | Slide narrative, QBR storyline |
| **PROPOSAL** | Structured expansion/renewal proposal |
| **BATTLE_CARD** | Competitive positioning one-pager |
| **CHAMPION_ENABLEMENT** | Internal advocate kit |
| **INTERNAL_NOTE** | CS/hand-off, no customer send |
| **SLACK_MSG** | Internal channel snippet |

### Future modalities (video, voice, interactive)

Not first-class in **`PlayContentType`** today. **`GATEWAY_IMAGE_MODEL` / `GATEWAY_VIDEO_MODEL`** (see External Services) support media generation elsewhere; for plays, stay on **EMAIL / BRIEF / DECK** until product adds explicit step types—use **`custom_content`** + links to assets if piloting.

---

## 5. Phase gate design

### Decision framework: gate vs split play

| Question | If “yes” … |
|----------|------------|
| Does the AE need to **decide** whether to continue after reading research? | **MANUAL** gate or separate **MANUAL** play for the send. |
| Is success purely “we sent the touches”? | **CONTENT_SENT**. |
| Should Salesforce **stage** unlock the next phase? | **CRM_FIELD** + reliable **`salesforceOpportunityData`**. |
| Is the “phase” zero-duration prep? | **AUTO** then next phase with real work. |

### CRM_FIELD

- Requires **synced opportunity JSON** on the company and **`play-crm-field-gates`** cron (Technical Guide §4).
- **`gateConfig`** shape must match what [`play-crm-field-gates`](../app/api/cron/play-crm-field-gates/route.ts) expects (e.g. `stage` value).

### “Gate or two plays?”

Split when: (a) **different triggers** (signal vs manual follow-up), (b) **different owners**, (c) **reuse** of middle phases across accounts, or (d) **cooldown** should reset between motions.

---

## 6. Play recipes

Below: **six starters** align with [`prisma/seed-plays.ts`](../prisma/seed-plays.ts) (slugs in parentheses). **Advanced** recipes are spec-level—adapt in Builder; partial seeds exist for some (`champion-development`, `re-engagement`).

### Starters (from seed)

1. **Contract Renewal** (`contract-renewal`) — **TIMELINE**, `anchorField` **`contractEndDate`** (cron maps this to **`CompanyProduct.contractRenewalDate`**), **T-90**; phases **MANUAL** (health scorecard + EBR + renewal email) → **MANUAL** (objection brief + close email) → **CRM_FIELD** post-close (`stage` = Closed Won) + **INTERNAL_NOTE**. Seed uses **multiple content templates per phase**; in Builder v1 you typically model one outbound moment per phase or use API/seed for bundles.
2. **Quarterly Business Value Check-In** (`quarterly-value-checkin`) — **TIMELINE** on contract start +90d; single phase **CONTENT_SENT**; champion **EMAIL** with usage/case context.
3. **New Product / Feature Launch** (`feature-launch`) — **SIGNAL** `product_launch`; **CONTENT_SENT**; launch **EMAIL** tied to signal context.
4. **Executive Intro / New Stakeholder** (`executive-intro`) — **MANUAL**; **AUTO** research phase → **CONTENT_SENT** outreach; **BRIEF** + **EMAIL**.
5. **Competitive Displacement** (`competitive-displacement`) — **MANUAL** (optional `competitor_detected` in seed metadata); **AUTO** intel → **CONTENT_SENT**; **BATTLE_CARD** + **BRIEF** + **EMAIL**.
6. **Expansion / Cross-Sell** (`expansion-cross-sell`) — **MANUAL**; **MANUAL** build case → **CONTENT_SENT**; **PROPOSAL** + **CHAMPION_ENABLEMENT** + **EMAIL**.

### Advanced (design targets)

7. **Partner Enablement** — **MANUAL** or **SIGNAL** (`strategic_partnership` / custom type); phases: **INTERNAL_NOTE** (deal reg / rules) → **CHAMPION_ENABLEMENT** → **EMAIL** partner manager; conditions: `accountType` / segment.
8. **Event Follow-Up** — **MANUAL** (post-event) or signal if you ingest **`event_webinar_registration`**; phase 1 **event_invitation_email**-style recap; phase 2 **`follow_up_email`**; gate **MANUAL** between “attended vs no-show.”
9. **Champion Nurture** — Lightweight ongoing touch: single phase or two with **MANUAL** gate; **`value_prop_email`** or **`early_win_email`**; align with seed **`champion-development`** if present.
10. **Win-Back / Re-engagement** — **SIGNAL** `re_engagement` or similar; one **EMAIL** with clear CTA; **MANUAL** gate before second touch; see seed **`re-engagement`**.

---

## 7. Testing and iteration

### Before activating for all accounts

1. **DRAFT** template → run through Builder validation (phase names, step names, prompt hints).
2. **Preview signal match** (if SIGNAL): use Play Rules preview / API so **`signalType`** and **conditions** resolve to the intended template.
3. **Pilot** on one company: **AccountPlayActivation** + run from catalog or wait for cron; review **generated** vs **edited** ratio in first five runs.
4. **TIMELINE:** Confirm **`CompanyProduct`** dates for a test SKU and a single **`play-timeline-triggers`** invocation (Technical Guide §9).

### Content quality loop

- Track which steps get **heavy edits**; tighten **promptHint**, switch **contentGenerationType**, or add **Content Library** assets.
- Revisit **PlayGovernance** **`brandVoice`** (short guardrails) vs long-form **Messaging** frameworks.

### Retire or modify

- **ARCHIVE** templates that overlap with a newer design; remove or lower **priority** on old **SignalPlayMapping** rows.
- Version via **slug** (e.g. `competitive-displacement-v2`) if AEs need history vs clean catalog.

---

## Appendix: Builder v1 constraints

From [`PlayTemplateBuilder`](../app/components/plays/PlayTemplateBuilder.tsx): **one step per phase**; **simple** mode requires **promptHint**; **advanced** requires **rawPromptTemplate**; **TIMELINE** requires **anchorField** and **anchorOffsetDays**. **`gateConfig`** for CRM_FIELD may need follow-up via API/seed after publish—verify in DB or play detail if gates don’t fire.
