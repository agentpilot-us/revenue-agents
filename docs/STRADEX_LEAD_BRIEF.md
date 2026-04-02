# Stradex free account brief — API & manual checks

Public intake: `POST /api/stradex/lead-brief` and optional `POST /api/stradex/lead-brief/supplement`.

Operational state for automation (thin enrichment, manual review) lives under **`Company.agentContext`** (e.g. `stradexBriefNeedsManualReview`). **`demoNote`** is for human-readable ops hints only.

## Seller voice vs My Company (service user)

Leads are owned by a **single service user** (`STRADEX_LEAD_BRIEF_USER_*`). That user has one **My Company** profile in AgentPilot (Stradex house defaults, internal tooling). **Per-lead seller voice** — who the outreach is supposed to sound like — is **not** My Company. It lives on each **target-account** `Company` row as:

- **`Company.dealObjective`** / **`Company.researchGoal`** — raw persisted form inputs (supplement **appends** to `dealObjective` with ` · `).
- **`agentContext.stradexSellerProfile`** — **processed snapshot** rebuilt on create, supplement, and ops patch. **Draft generation reads seller messaging from this object**, not from My Company.

See **[STRADEX_FREE_BRIEF_OPS.md](./STRADEX_FREE_BRIEF_OPS.md)** for intern workflow and QA.

### `agentContext.stradexSellerProfile` (schema version 1)

| Field | Meaning |
| ----- | ------- |
| `schemaVersion` | `1` — for forward-compatible migrations |
| `companyName` | Submitter’s employer (form `company`); kept in sync with `stradexLead.sellerCompany` |
| `website` | Optional; ops or future form |
| `oneLiner` | Derived: compact join of motion + goal from columns |
| `motionSummary` | Derived from current **`dealObjective`** |
| `challengeOrGoal` | Derived from **`researchGoal`** |
| `toneOrPositioningNotes` | Optional ops-only; preserved across rebuilds |
| `lastUpdatedAt` | ISO timestamp |

**Rebuild rules:** On every create, supplement, or `stradexSellerProfile` API patch, derived fields are **recomputed** from the latest columns (overwrite, not accumulate inside JSON). **`toneOrPositioningNotes`** and **`website`** persist across rebuilds unless the patch sets them.

### Supplement behavior

The **`dealObjective`** column still **appends** supplement text (`previous · new`). **`stradexSellerProfile`** is then **fully rebuilt** from the updated `dealObjective` / `researchGoal` and existing `stradexLead*` keys so `motionSummary` / `oneLiner` **replace** — they do not stack duplicate paragraphs when `product_focus` changes.

### Dedup caveat

Companies dedupe by **service `userId` + target account domain**. Two different sellers requesting a brief for the **same target domain** reuse one row (`duplicate: true`) and **do not** run enrichment/pipeline again. This is independent of seller profiles; document for support.

### `STRADEX_BRIEF_RUN_BUYING_GROUPS`

Default for **multi-seller** Stradex intake: keep **`false`**. The research pipeline uses the **service user’s** User profile, **catalog**, and **content library** — not `stradexSellerProfile`.

**Enable only when** that service user’s catalog and content library represent **a single product/offering that applies to every lead** (e.g. managed briefs exclusively for one client’s product).

**Phase B (not implemented):** A `sellerOverride` path in [`lib/research/run-research-pipeline.ts`](../lib/research/run-research-pipeline.ts) / discover–enrich could read `stradexSellerProfile` and synthetic product text so buying groups work per submitter without a user per seller.

### `demoNote` refresh (seller name corrections)

When `stradexSellerProfile` is rebuilt (supplement, pipeline backfill, or `agent-memory` patch), the first line of **`demoNote`** is updated **only if** the existing first line still matches the Stradex template (starts with `Stradex free brief`, case-insensitive). If an operator replaced that line with custom text, **`demoNote` is left unchanged** so nothing is prepended or overwritten by mistake. Operational filtering should continue to use **`agentContext.stradexBriefNeedsManualReview`**, not string parsing of `demoNote`.

### Ops correction API

Authenticated owners may patch seller fields via **`POST /api/companies/[companyId]/agent-memory`** with JSON:

```json
{
  "stradexSellerProfile": {
    "companyName": "Corrected Legal Name Inc",
    "website": "https://example.com",
    "toneOrPositioningNotes": "Consultative; avoid aggressive CTAs"
  }
}
```

Only companies with **`agentContext.stradexLead`** accept this block (Stradex-created rows). Other fields on the same request (`conversationSummary`, `decisions`, `contactInteractionSummary`) still merge as before. **`demoNote`**’s first line is refreshed to match `companyName` when the profile is patched.

## Environment (minimum)

- `STRADEX_LEAD_BRIEF_USER_EMAIL` or `STRADEX_LEAD_BRIEF_USER_ID` — service user who owns created companies
- `DATABASE_URL`, Resend for confirmation mail: `RESEND_API_KEY`, `RESEND_FROM`
- Local: `NEXTAUTH_URL=http://localhost:3000` (origin check when no `STRADEX_LEAD_BRIEF_SECRET`)

## curl — initial lead (same origin / dev)

```bash
BASE=http://localhost:3000
curl -sS -X POST "$BASE/api/stradex/lead-brief" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d '{
    "name": "Test User",
    "email": "you@example.com",
    "company": "Your Co",
    "target_account": "Example Corp",
    "target_domain": "example.com",
    "target_industry": "Software",
    "challenge": "Expand within IT"
  }'
```

Expect `200` with `companyId` and `duplicate: false` on first submit; `duplicate: true` if the same normalized domain already exists for the service user.

## curl — with shared secret (no browser Origin)

```bash
curl -sS -X POST "$BASE/api/stradex/lead-brief" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STRADEX_LEAD_BRIEF_SECRET" \
  -d '{ ... same body ... }'
```

## curl — honeypot should 400

Include non-empty `"website": "http://spam"` → expect `400` with `Bad request`.

## curl — supplement (after success; email must match `agentContext.stradexLead.submitterEmail`)

```bash
CID="<companyId from first response>"
curl -sS -X POST "$BASE/api/stradex/lead-brief/supplement" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d "{
    \"companyId\": \"$CID\",
    \"email\": \"you@example.com\",
    \"product_focus\": \"Renewal motion\",
    \"priority_buyer\": \"CIO office\"
  }"
```

Wrong email → `400` with `Email does not match this request.` Unknown `companyId` → `404`.

## Confirmation email

- New company: full “brief in queue” message.
- Duplicate domain: shorter “interest in [account]” message (no other submitter or enrichment details).
- Disable all: `STRADEX_LEAD_SEND_CONFIRMATION_EMAIL=false`.

## Shared briefing link

Opt-in: `STRADEX_BRIEF_CREATE_SHARE_LINK=true`. Verify token expiry (`BRIEFING_LINK_EXPIRY_HOURS`) and `/go/briefing/[token]` access controls before enabling in production.
