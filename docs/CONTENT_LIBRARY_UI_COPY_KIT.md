# Content Library — UI copy kit (StradexAI / AgentPilot)

## Two different UIs in the repo

| Where | Framework fields |
|--------|------------------|
| **My Company → Content Library tab** (`ContentLibraryTab`) | See table below — fields match the standalone forms’ `content` JSON (e.g. Framework: `description` + `methodology`; Use Case: `description` + `benefits[]`). **Industry / Department / Persona** are top-level API tags. |
| **`/dashboard/content-library/new?type=…`** | Same JSON shapes; some types also send **Source URL** at the top level. |

**My Company tab — content keys by type**

| Type | Content Fields (under *Content Fields*) |
|------|----------------------------------------|
| **Use Case** | Description · Benefits (one per line → stored as `benefits` array) |
| **Success Story** | Headline · One-Liner · Full Summary · Key metrics (one per line) · When to Use |
| **Event** | Date · Event Type · Location · Description · Registration URL |
| **Feature Release** | Description · Release Date · Benefits (one per line) |
| **Framework** | Description · Methodology |
| **Battlecard / Persona / Email Template** | Single **Content** field → `content.body` |

Legacy tab rows that used old keys (`headline`/`body`/`keyMetrics` for Use Case or Feature Release) are **mapped when you open Edit** into the new fields where possible. Re-save to persist the new shape.

Paste each block below into the UI you use. Field names match either the **tab** or the **standalone** forms (`UseCaseForm`, `SuccessStoryForm`, etc.).

**Voice:** Managed **AI-powered growth marketing and account execution**. StradexAI operates intelligence, signals, plays, and governed content; **AgentPilot** is the delivery engine. Default: AEs get **briefings and drafts** via **email / Salesforce / Slack**—no mandatory new rep tool unless approved.

**Placeholders:** Replace `https://agentpilot.us/...` with your live URLs when you have them. For **Resource Link**, the form requires a valid URL—use your homepage temporarily if a PDF is not uploaded yet.

---

## Framework

Create **one library item per framework** (6 suggested).  
**Fields:** Framework Name * · Description · Methodology · Source URL (optional)

### F1 — Managed execution vs. software rollout

| Field | Copy |
|--------|------|
| **Framework Name** | Managed execution vs. software rollout |
| **Description** | How StradexAI delivers outcomes without requiring strategic AEs to adopt another daily application. Clarifies what clients buy (capacity, speed, governance) versus a traditional SaaS rollout. |
| **Methodology** | (1) **Discovery:** account priorities, stakeholders, systems of record (CRM), and approval paths for outbound. (2) **Intelligence layer:** we operate signal monitoring, buying-group mapping, contact enrichment, and play configuration on AgentPilot. (3) **Delivery:** weekly account briefings, signal triage within 48 hours, and pre-drafted content for each play step—delivered through the client’s chosen channels (email, Slack, Salesforce artifacts). (4) **Human-in-the-loop:** default autonomy is Draft + Review; AEs edit and send. (5) **Optional deployment:** deeper technical integration only when security and procurement approve. |

### F2 — The 70/30 intelligence vs. judgment model

| Field | Copy |
|--------|------|
| **Framework Name** | The 70/30 model: intelligence vs. judgment |
| **Description** | Splits work so AEs reclaim time for relationships and deal strategy while we absorb research, triage, mapping, and first-draft content. |
| **Methodology** | **~70% (we operate):** account and division research; signal detection and prioritization; buying-committee and contact mapping updates; play selection and step execution; personalized draft emails, LinkedIn, briefings, and talk tracks under governance (brand voice, claims, cadence, cooldowns). **~30% (AE owns):** relationship strategy, executive positioning, competitive deal judgment, final send decisions, and context we cannot infer (private conversations, political nuance). Success is measured by signal response time, portfolio coverage, content acceptance, and hours returned to selling. |

### F3 — Signal-to-play operating model

| Field | Copy |
|--------|------|
| **Framework Name** | Signal-to-play operating model |
| **Description** | How account signals become governed multi-step plays with draft assets—not ad hoc one-off emails. |
| **Methodology** | (1) **Ingest** signals (exec changes, earnings, partnerships, hiring, competitive moves, product news). (2) **Classify** against client rules and priority. (3) **Map** to a play template (e.g. new executive, expansion, competitive response, event follow-up). (4) **Generate** step-level content using account, division, contact, and Content Library context. (5) **Route** to AE with context: what happened, why it matters, recommended next step. (6) **Review** and send; log outcomes for tuning. Autonomy starts at Draft + Review; adjust only with client approval. |

### F4 — Weekly account briefing cadence

| Field | Copy |
|--------|------|
| **Framework Name** | Weekly strategic account briefing |
| **Description** | What AEs receive on a fixed cadence to run a full named-account portfolio—not only hot opportunities. |
| **Methodology** | **Monday (or client-chosen day):** prioritized list across all named accounts—new signals, plays started or waiting for review, drafts ready to send, and “no action” accounts with a one-line health note. **Ongoing:** real-time notifications for high-priority signals (target: triage within 48 hours). **Monthly:** 30-minute review of play volume, content acceptance, signal response metrics, and template adjustments. Briefings reference governance (cooldowns, claim rules) so outreach stays compliant and on-brand. |

### F5 — 90-day pilot structure

| Field | Copy |
|--------|------|
| **Framework Name** | 90-day pilot: setup plus managed execution |
| **Description** | Phase 1 builds the intelligence foundation; Phase 2 runs managed execution with clear capacity and success metrics. |
| **Methodology** | **Weeks 1–4 (setup):** AE discovery; target account import; buying-group mapping; content and messaging library configuration; custom play templates; signal rules and signal-to-play mappings; smoke test on a sample of accounts; align delivery format (email vs. Slack vs. CRM). **Months 2–3 (execution):** weekly briefings, signal triage, draft content per play, contact enrichment updates, monthly strategy review. **Evaluation:** signal response rate, play completion, content acceptance, AE time reclaimed, pipeline influenced, account coverage. **Renewal:** month-to-month after 90 days unless otherwise agreed. |

### F6 — Governance layer (brand, claims, cadence)

| Field | Copy |
|--------|------|
| **Framework Name** | Outreach governance layer |
| **Description** | Non-optional controls so AI-assisted volume does not create brand, legal, or relationship risk. |
| **Methodology** | Configure **brand voice** and **approved value narrative**; **competitive claim rules** (what we never say); **discount or commercial language caps** if applicable; **contact cadence** (cooldowns, max touches per account per period); **content types** allowed per play step. Every generated asset is **draft-first** unless client explicitly upgrades autonomy. Feedback from AEs and RevOps feeds prompt and template updates on a regular cadence. |

---

## Use Case

Create **one library item per use case**.  
**Fields:** Title * · Description · Benefits (+ Add benefit) · Target Department · Industry · Source URL (optional)

### UC1

| Field | Copy |
|--------|------|
| **Title** | Full portfolio coverage without adding headcount |
| **Description** | Strategic AEs often deep-work 3–5 familiar accounts while the rest of the named list goes under-served. We operate the intelligence layer across the full list so every account gets monitoring, periodic plays, and prioritized actions. |
| **Benefits** | Named accounts stop “going dark” by default. Signals and expansion whitespace surface on a schedule, not only when the AE has spare cycles. Leadership sees uniform execution standards across the team. |
| **Target Department** | SALES |
| **Industry** | Enterprise B2B |

### UC2

| Field | Copy |
|--------|------|
| **Title** | High-value signals triaged and drafted within 48 hours |
| **Description** | Executive hires, partnerships, earnings beats, and competitive moves lose value when response takes weeks. We detect, classify, map to a play, and deliver draft outreach plus context for fast AE review. |
| **Benefits** | Faster time-to-first-touch on market-moving events. Consistent quality instead of whoever-is-free drafting. Governance applied before anything is sent. |
| **Target Department** | SALES |
| **Industry** | Enterprise Software |

### UC3

| Field | Copy |
|--------|------|
| **Title** | Buying-group mapping as a managed deliverable |
| **Description** | Complex enterprise deals require multi-threading across divisions. We maintain division-level context, roles, and contact enrichment so plays target the right stakeholders with the right message. |
| **Benefits** | Fewer single-threaded deals stuck in one champion. Clearer expansion paths across business units. Less manual org-chart maintenance for AEs. |
| **Target Department** | Revenue Operations |
| **Industry** | Enterprise B2B |

### UC4

| Field | Copy |
|--------|------|
| **Title** | Governed personalization at scale |
| **Description** | Volume without guardrails creates brand and legal risk. We generate division- and contact-aware drafts under fixed rules: voice, claims, cadence, and approval—so marketing and RevOps trust the output. |
| **Benefits** | Personalized outreach without “rogue AI.” Audit-friendly workflow (draft → review → send). Easier enablement: reps spend time on judgment, not formatting. |
| **Target Department** | Sales Enablement |
| **Industry** | Technology |

### UC5

| Field | Copy |
|--------|------|
| **Title** | Single partner for intelligence, plays, and content |
| **Description** | Teams stitch together intent data, sequencing tools, and generic AI chat. We unify signal detection, play orchestration, and content generation in one operating model run by StradexAI on AgentPilot. |
| **Benefits** | Less tool sprawl and fewer handoffs. Clear owner for “what do we do this week on this account?” Accountable SLAs for triage and briefing. |
| **Target Department** | Revenue Operations |
| **Industry** | Enterprise B2B |

### UC6

| Field | Copy |
|--------|------|
| **Title** | Low-footprint delivery for security-conscious enterprises |
| **Description** | Many buyers cannot approve another SaaS AI product immediately. Default delivery is managed: outputs appear in existing email, Slack, and CRM workflows. Optional deeper deployment only after approval. |
| **Benefits** | Progress without waiting for a full security review cycle. Clear data-handling narrative for IT and procurement. Path to stricter deployment when ready. |
| **Target Department** | IT |
| **Industry** | Financial Services Technology |

### UC7

| Field | Copy |
|--------|------|
| **Title** | Post–sales kickoff execution for strategic accounts |
| **Description** | After SKO, priorities and messaging shift quickly. We align play templates and briefings to new themes so the field executes consistently in the first 30–60 days of the year. |
| **Benefits** | SKO themes turn into account-level actions, not slide decks only. Faster alignment between leadership narrative and rep behavior. |
| **Target Department** | SALES |
| **Industry** | Enterprise B2B |

### UC8

| Field | Copy |
|--------|------|
| **Title** | Compare: managed execution vs. hiring another SDR |
| **Description** | SDRs take months to ramp and often focus on top-of-funnel volume. We focus on named-account intelligence, signal response, and governed outreach quality for existing strategic reps. |
| **Benefits** | Predictable commercial model vs. fully loaded hire. Play-based quality and governance built in. Scales by adding supported AEs, not only headcount. |
| **Target Department** | VP Sales |
| **Industry** | Enterprise B2B |

---

## Success Story

Create **one library item per story**. Use **anonymous** customer names unless you have approval.  
**Fields:** Title (internal) · Headline · One-liner (for emails) · Full summary · Key metrics · When to use · Department · Industry · Company (customer name) · Source URL (optional)

### SS1 — Signal to meeting (anonymous)

| Field | Copy |
|--------|------|
| **Title (internal)** | Anonymous — Enterprise SaaS — Signal to meeting |
| **Headline** | New executive signal → qualified meeting in 3 days |
| **One-liner** | We turned a public leadership change into a governed multi-step play and a booked meeting before the account went cold. |
| **Full summary** | A strategic AE at a multi-billion-dollar B2B software company had fifteen named accounts and limited research bandwidth. A target account announced a new division president. StradexAI triaged the signal within hours, mapped the buying committee update, and delivered a short internal brief plus draft outreach for the AE. The AE edited lightly and sent; follow-up steps were pre-drafted. A meeting with economic-buyer level was booked within three business days. |
| **Key metrics** | Signal-to-first-draft: under 24 hours · Meeting booked: 3 business days · Play: single execution (multi-step inside one run) |
| **When to use** | Prospects asking for proof of **speed** on **exec-change** or **news-driven** outreach. Avoid naming the client unless cleared. |
| **Department** | SALES |
| **Industry** | Enterprise Software |
| **Company (customer)** | Anonymous |

### SS2 — Portfolio coverage

| Field | Copy |
|--------|------|
| **Title (internal)** | Anonymous — Coverage across named accounts |
| **Headline** | From 4 “active” accounts to full-list coverage in one quarter |
| **One-liner** | Weekly briefings and play cadence meant every named account had at least one meaningful motion—not only the AE’s favorites. |
| **Full summary** | A strategic team of enterprise AEs habitually worked a subset of their named list. StradexAI introduced weekly portfolio briefings, signal monitoring on all accounts, and a minimum play-activation standard per quarter. RevOps tracked play activations per account. Coverage metrics improved from roughly one-quarter of the list receiving substantive attention to 100% with at least one active or completed play in the pilot period. |
| **Key metrics** | Accounts with ≥1 active/completed play: 100% of named list (pilot cohort) · AE-reported research hours reduced (self-report) |
| **When to use** | Leaders worried about **uneven AE effort** across the portfolio. |
| **Department** | SALES |
| **Industry** | Enterprise B2B |
| **Company (customer)** | Anonymous |

### SS3 — Multi-thread expansion

| Field | Copy |
|--------|------|
| **Title (internal)** | Anonymous — Multi-threaded enterprise opportunity |
| **Headline** | Four decision-makers engaged; multi-threaded opportunity in two weeks |
| **One-liner** | Buying-group mapping plus coordinated plays opened a second division conversation without starting from zero each time. |
| **Full summary** | An AE was strong in one division but stalled expanding sideways. We enriched contacts in two adjacent divisions, aligned messaging to division use cases, and ran parallel play steps with shared governance. Result: four relevant stakeholders engaged with tailored touchpoints; opportunity advanced from single-thread to multi-thread within two weeks. |
| **Key metrics** | New contacts engaged: 4 · Time to multi-thread: 2 weeks |
| **When to use** | **Expansion** and **land-and-expand** conversations. |
| **Department** | SALES |
| **Industry** | Technology |
| **Company (customer)** | Anonymous |

### SS4 — Event-driven pipeline (refresh of classic story)

| Field | Copy |
|--------|------|
| **Title (internal)** | Enterprise tech — Event-driven pipeline |
| **Headline** | Personalized event outreach → measurable meetings |
| **One-liner** | Governed, account-specific event invites and follow-ups replaced generic blasts—without adding AE research hours. |
| **Full summary** | For a major industry event, StradexAI used AgentPilot to generate personalized invitations and follow-ups tied to account context (division, prior engagement, relevant use case). AEs reviewed and sent. The program produced multiple RSVPs and onsite meetings; pipeline influence tracked back to specific play executions. |
| **Key metrics** | RSVPs and onsite meetings (fill in your real numbers when available) |
| **When to use** | **Event** plays, marketing co-sell, or **conference** follow-up. |
| **Department** | SALES |
| **Industry** | Enterprise Software |
| **Company (customer)** | Anonymous |

---

## Company Event (“Event” in UI)

**Fields:** Event Title * · Event Type · Date · Description · Source URL (optional)

### EV1

| Field | Copy |
|--------|------|
| **Event Title** | Webinar: Managed ABX execution in 90 days |
| **Event Type** | Webinar |
| **Date** | *(pick upcoming)* |
| **Description** | Walkthrough of the StradexAI model: Phase 1 setup (accounts, plays, signals, governance) and Phase 2 managed execution—what AEs receive each week, how triage works, and how we measure success. Includes Q&A on security, CRM alignment, and pilot pricing. |
| **Source URL** | https://agentpilot.us *(or registration link)* |

### EV2

| Field | Copy |
|--------|------|
| **Event Title** | Strategic Account Leadership Roundtable (invite-only) |
| **Event Type** | Workshop |
| **Date** | *(pick)* |
| **Description** | Small peer discussion for VP Sales and RevOps leaders on portfolio coverage, signal response SLAs, and governance at scale. Not a product demo—a methodology session with examples of weekly briefings and play design. |
| **Source URL** | *(optional)* |

### EV3

| Field | Copy |
|--------|------|
| **Event Title** | Dreamforce / SaaStr / *(your flagship conference)* |
| **Event Type** | Conference |
| **Date** | *(show dates)* |
| **Description** | Meet StradexAI to discuss AI-powered growth marketing and managed account execution. We’ll share how enterprise teams run signal-to-play programs without adding another mandatory rep tool—briefings and drafts through your existing stack. Request a short briefing using your real account list (under NDA). |
| **Source URL** | Official event URL |

### EV4 — Partnership program (if still offered)

| Field | Copy |
|--------|------|
| **Event Title** | StradexAI design partner program — managed execution cohort |
| **Event Type** | Other |
| **Date** | *(ongoing or application deadline)* |
| **Description** | Limited cohort for enterprises with strategic account teams. Partners receive white-glove setup, direct access to the founding team, and joint iteration on play templates and governance—not a generic software trial. Ideal for teams piloting managed ABX execution with strict brand and security requirements. |
| **Source URL** | https://agentpilot.us |

---

## Feature Release

**Fields:** Feature Name * · Release Date · Description · Benefits · Source URL (optional)

### FR1

| Field | Copy |
|--------|------|
| **Feature Name** | Signal-to-play automation |
| **Description** | Account signals can auto-match to the right play template by type and priority, with drafts generated for the first steps under Draft + Review. Reduces manual “which play do I run?” decisions for high-volume portfolios. |
| **Benefits** | Faster consistent response · Less RevOps overhead wiring one-off rules · Clear audit trail from signal to play run |

### FR2

| Field | Copy |
|--------|------|
| **Feature Name** | Buying group intelligence in account briefings |
| **Description** | Briefings surface division-level context, stakeholder roles, and enrichment updates so AEs see who matters and what changed—not only raw news links. |
| **Benefits** | Better multi-threading · Less time in spreadsheets · Stronger first drafts |

### FR3

| Field | Copy |
|--------|------|
| **Feature Name** | Optional local / private LLM deployment |
| **Description** | For approved environments, execution can run on infrastructure the customer controls—supporting data residency and security reviews—while StradexAI still operates the play methodology. |
| **Benefits** | Addresses infosec barriers · Keeps managed service model with stricter technical boundary |

### FR4

| Field | Copy |
|--------|------|
| **Feature Name** | Governance: cadence, cooldowns, and claim rules |
| **Description** | Play-level controls for how often accounts and contacts are touched and which competitive statements are allowed—embedded before content reaches the AE. |
| **Benefits** | Protects relationships and brand · Reduces over-messaging risk |

### FR5

| Field | Copy |
|--------|------|
| **Feature Name** | LinkedIn and email outputs from the same play context |
| **Description** | A single signal or play can produce aligned email and social drafts with shared account context so messaging stays consistent across channels. |
| **Benefits** | Coordinated outreach · Less duplicate research · Faster omnichannel execution |

---

## Resource Link

**Fields:** Resource Title * · URL * · Resource Type · Description

Use real URLs when available. Until then, `https://agentpilot.us` satisfies the required URL field.

### RL1

| Field | Copy |
|--------|------|
| **Resource Title** | StradexAI — Managed growth marketing overview |
| **URL** | https://agentpilot.us |
| **Resource Type** | Guide |
| **Description** | One-page overview of the managed service: what we operate, what AEs receive weekly, default delivery through existing tools, optional deployment, and how to start a 90-day pilot. |

### RL2

| Field | Copy |
|--------|------|
| **Resource Title** | 90-day pilot & pricing overview |
| **URL** | https://agentpilot.us *(replace with PDF or Calendly when live)* |
| **Resource Type** | Pricing |
| **Description** | Phase 1 setup vs. monthly per-AE execution, play capacity, overage model, and evaluation metrics—aligned to how we scope engagements. |

### RL3

| Field | Copy |
|--------|------|
| **Resource Title** | Security & data handling FAQ |
| **URL** | https://agentpilot.us |
| **Resource Type** | Whitepaper |
| **Description** | How data is used for research and generation, default low-footprint delivery, review/approval workflow, and options for stricter deployment. For IT, security, and procurement reviewers. |

### RL4

| Field | Copy |
|--------|------|
| **Resource Title** | ROI: managed execution vs. SDR hire vs. agency |
| **URL** | https://agentpilot.us |
| **Resource Type** | Guide |
| **Description** | Comparison framework: time to value, personalization depth, signal coverage, governance, and scale across AEs—intended for CFO / RevOps / sales leadership. |

### RL5

| Field | Copy |
|--------|------|
| **Resource Title** | Book a scoping call — StradexAI |
| **URL** | *(your scheduling link)* |
| **Resource Type** | Other |
| **Description** | 30-minute call to confirm ICP fit, AE count, CRM stack, and pilot scope. |

### RL6

| Field | Copy |
|--------|------|
| **Resource Title** | AgentPilot — platform capabilities (for approved buyers) |
| **URL** | https://agentpilot.us |
| **Resource Type** | Blog Post |
| **Description** | Technical and workflow capabilities of the platform StradexAI operates: plays, signals, content library, governance. Share when buyers want depth beyond the managed-service summary. |

---

## Persona & Battlecard (no “Add Content” wizard today)

These `ContentType` values exist in the schema but are **not** in the current **+ Add Content** wizard. Use the text below when you add them via **future UI**, **import**, or **API**.

### Persona snippets (paste into notes or future Persona items)

**Economic buyer (CRO / VP Sales)**  
Cares about: pipeline health, cost per opportunity vs. hiring, AE quota attainment, forecast credibility. Fears: another failed tool rollout, rep non-adoption, brand risk from bad outreach. Message: **managed execution**, **time to value**, **governance**, **coverage metrics**.

**Champion (RevOps / Sales Ops)**  
Cares about: CRM hygiene, repeatable workflow, fewer ad-hoc requests from reps, measurable SLAs. Fears: shadow IT and ungoverned AI. Message: **single operating partner**, **Draft + Review**, **play templates**, **signal-to-play audit trail**.

**Technical evaluator (CRM admin / IT)**  
Cares about: integrations, data residency, SOC 2, what is stored where. Message: **default delivery without new rep SaaS**, **optional deployment**, **clear data map**.

**Blocker (Legal / Procurement)**  
Cares about: contract terms, liability, subprocessors, IP. Message: **SOW-based engagement**, **deliverables and exclusions**, **termination and portability** (align to your legal draft).

### Battlecard bullets (future Battlecard items)

**vs. “We’ll use ChatGPT”** — No account-level signal wiring, no play orchestration, no governance layer, no portfolio briefing; creates inconsistent rep behavior and compliance gaps.

**vs. Hire more SDRs** — Ramp time, variable writing quality, top-of-funnel bias; does not automatically fix **named-account** intelligence and **governed** strategic outreach.

**vs. ABM agency** — Strong for campaigns; less suited for **always-on** signal response and **per-AE** weekly execution embedded in CRM rhythm.

**vs. Point intent data tools** — Delivers **signals** but not **draft plays**, **content**, and **cadence governance** end-to-end.

---

## Quick checklist

| Type | Suggested count (start) |
|------|-------------------------|
| Framework | 6 |
| Use Case | 8 |
| Success Story | 4 |
| Company Event | 3–4 |
| Feature Release | 5 |
| Resource Link | 5–6 |

After pasting, open each item in the library and **confirm** if the app offers **Confirm / approve** for extraction—approve so embeddings and health scores stay accurate.
