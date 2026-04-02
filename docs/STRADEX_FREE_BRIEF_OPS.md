# Stradex free brief — operations (service user)

**Audience:** Interns or operators handling Stradex marketing leads inside AgentPilot.

This guide is **self-contained for day-to-day workflow**. Use **[STRADEX_LEAD_BRIEF.md](./STRADEX_LEAD_BRIEF.md)** when you need API details, environment flags, `agentContext` schema, or escalation-level behavior.

---

## One login, two different “companies”

You sign in as the **Stradex service user** (the account that owns all free-brief target companies). **My Company** in the nav is **Stradex’s** profile (house defaults, templates, your internal catalog). It is **not** the company each submitter works for.

Each **lead** is a **target account** row (`Company`): the prospect they want a brief *about*. The person who should sound like the sender is stored on that row:

- **`demoNote`** first line: `Stradex free brief — selling: [SellerCo] — web intake (service user)` — use this as the **fast visual cue** for who the outreach voice is.
- **`agentContext.stradexSellerProfile`** — full processed seller voice used by draft generation (see technical doc).

---

## Quality check (use as a checklist)

1. Open the **target account** company, not My Company.
2. Confirm **`demoNote`** lists the expected **selling** company name.
3. **Drafts should sound like they’re coming from `stradexSellerProfile.companyName`, not from StradexAI.** If drafts reference StradexAI’s products or positioning, the pipeline pulled from **My Company** (or another global tenant path) instead of the **seller profile** — **flag for engineering fix.**
4. If enrichment was thin / manual review, follow your existing ops flow for `agentContext.stradexBriefNeedsManualReview`.

---

## Correcting bad form data

- **Seller name / tone / website:** Use **`POST /api/companies/[companyId]/agent-memory`** with a session for the service user. Body:

  ```json
  {
    "stradexSellerProfile": {
      "companyName": "Fixed Name LLC",
      "website": "https://seller.example",
      "toneOrPositioningNotes": "Short note for the model"
    }
  }
  ```

  This only works for companies that have **`agentContext.stradexLead`** (Stradex intake). The first line of **`demoNote`** updates to match `companyName`.

- **If the API is unavailable:** Use database or internal admin tooling on `Company.agentContext` and **`demoNote`** per [STRADEX_LEAD_BRIEF.md](./STRADEX_LEAD_BRIEF.md).

---

## Dedup caveat

Two different submitters targeting the **same target account domain** hit **duplicate domain** handling: no second enrichment/pipeline run for that domain under the service user. This is a product constraint, not fixed by seller profiles alone.
