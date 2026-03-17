# Strategist Onboarding Guide — New Client Configuration Playbook

Step-by-step guide for configuring AgentPilot before AE onboarding. Covers My Company setup, play governance, content templates, signal wiring, and validation.

**Audience:** Internal strategist / admin configuring a new client instance  
**Version:** 1.0 | March 2026

---

## Overview

This guide walks you through configuring AgentPilot for a new client, from initial company setup through validated play execution. The goal is to have a fully working instance where AEs can log in, see their My Day dashboard populated with active plays, and execute AI-generated content that reflects the client's brand, products, and strategic priorities.

Configuration happens primarily in **My Company**, which has six tabs: Profile, Products, Content Library, Playbooks, Messaging, and Intelligence. You'll work through these roughly in order, though some steps overlap.

---

## Step 1: Company Profile

Navigate to **My Company → Profile** tab. This is the foundation — everything the AI generates references these fields.

### Fields to Configure

Set **company name**, **industry**, **website**, and **primary industry you sell to**. Add **key initiatives** so the AI can align outreach to strategic priorities.

**Account Health Check**  
The Profile tab also shows account health metrics: number of accounts, contacts, roadmaps, products, and signals. At initial setup, these will all be zero. After importing target accounts (Step 11 in AE onboarding), verify these numbers increase.

---

## Step 2: Product Catalog

Navigate to **My Company → Products** tab. The product catalog is what the AI uses to recommend expansion SKUs, generate product-specific content, and match plays to accounts.

Two paths to populate (Path A — AI Discovery; Path B — Manual Entry), product profiles, and **Product Relationships**: If the client has 2+ products, define relationships in the Products tab (e.g. upgrade_path, complementary, prerequisite, replacement) using the product relationship editor per product. These inform expansion play recommendations.

---

## Step 3: Content Library

Navigate to **My Company → Content Library** tab. This is the raw material the AI uses to personalize outreach. When you create or update an item (in this tab or via upload/scrape), it is chunked and embedded for RAG and wired into buildContentContext() and play content generation. There may be a short processing delay before new items appear in AI-generated content. There is no separate "internal documents" store.

**Note:** Content can also be imported during initial company setup via the Smart Import flow at `/dashboard/company-setup`. The My Company → Content Library tab is the primary management interface for ongoing edits.

**Where to put company intelligence**  
Use Content Library and related areas so the AI can use it:

| If you have… | Add it as… |
|--------------|------------|
| Battle cards, competitive claims | Content Library → type **Battlecard** |
| Pricing guides / discount policies | **PlayGovernance** (maxDiscountPct, etc.) + **Messaging** framework for approved pricing language |
| Brand guidelines / tone | **PlayGovernance.brandVoice** + **Messaging** framework for tone guidelines |
| Sales decks, pitch materials | Content Library → type **Framework** or **Persona** |
| Customer success stories (including internal metrics) | Content Library → type **Success Story**; put metrics in the content fields |

**Content types**  
Use Case, Success Story, Event, Feature Release, Framework, Battlecard, Email Template, Persona. Use the industry and department fields for targeting; content without targeting is used generically. Success stories should include quantified metrics. Events must have dates so the AI can time outreach.

---

## Step 4: Messaging Frameworks

Navigate to **My Company → Messaging** tab. Messaging frameworks define the tone, positioning, and key messages that the AI uses across all generated content.

**PlayGovernance** constraints are enforced during play execution (content generation within PlayRuns and contact cooldown checks). Messaging frameworks are used more broadly across all AI-generated content including chat and ad-hoc generation.

Recommended frameworks (Core Value Proposition, Enterprise Outreach Tone, Competitive Positioning, Renewal Messaging, Expansion Messaging) — stored in MessagingFramework and injected into buildContentContext().

---

## Step 5: Industry Playbooks

Navigate to **My Company → Playbooks** tab. This tab contains **Industry Playbooks** — selling guides for specific verticals.

For each target industry, create a playbook with: Overview, Buying Committee, Department → Product Mapping, Value Props by Department, and Landmines. Industry playbooks also appear at `/dashboard/content-library/industry-playbooks/` for browsing; the primary creation and editing interface is My Company → Playbooks.

Play templates (the 6 starter plays and signal-to-play mappings) are configured in **Step 8** and **Step 9** using the PlayTemplate system only.

---

## Step 6: Intelligence & Signal Monitoring

Navigate to **My Company → Intelligence** tab. Configure what signals AgentPilot monitors and activate product/event triggers. Default Monitoring Rules (Signal Config Panel) and Product & Event Activation as in original guide.

---

## Step 7: Play Governance

Play Governance is configured in the PlayGovernance model (one row per user/tenant). Configure via the **API** at `GET/PUT /api/play-governance` (or via seed script / direct database update until a governance settings UI is built).

Settings to configure: discount caps, cooldown defaults, competitive rules, value narrative, expansion SKUs, brand voice. PlayGovernance feeds into play-run content generation and cooldown checks (see Step 4 for scope).

---

## Step 8: Configure the 6 Starter Play Templates

Play templates are stored in PlayTemplate with phases in PlayPhaseTemplate and content blueprints in ContentTemplate. Configure via seed script or API.

**Renewal and timeline plays** anchor to **product-level contract dates**, not account-level. Use **CompanyProduct.contractEnd** or **CompanyProduct.contractRenewalDate** when setting up test accounts or validating renewal plays. A company can have multiple products with different renewal dates.

Company Plays (Contract Renewal — trigger TIMELINE, anchored to **CompanyProduct.contractEnd** / contractRenewalDate; Quarterly Check-In; New Product / Feature Launch) and Account Plays (Executive Intro, Competitive Displacement, Expansion) as in original guide.

---

## Step 9: Signal-to-Play Mappings

**Signal-to-play mappings are configured per account in the Strategic Account Plan (SAP) via the Play Rules panel.** Navigate to the account's roadmap and use the Play Rules tab to wire signal types to play templates.

Signal Play Mappings (SignalPlayMapping) connect a signal type to a play template, with optional auto-activation. The `conditions` field (e.g. accountTier, arr_gt, arr_lt) is supported: matching evaluates conditions and only creates runs when the account matches. Use it to scope mappings by account tier or ARR.

---

## Step 10: Validation Smoke Test

Before inviting AEs, walk through the flow end-to-end.

**Test 1: Signal → PlayRun → My Day** — Trigger a test signal; verify SignalPlayMapping fires and creates a PlayRun; open My Day and run page.

**Test 2: Content Generation Quality** — Generate content on the play run page; verify account context, governance rules, product profile data, and ContactTouch on send.

**Test 3: Contact Cooldown** — Second play targeting same contact; verify cooldown warning and alternate contact suggestion.

**Test 4: Renewal Play Timeline**  
Create a test **CompanyProduct** with **contractRenewalDate** (or **contractEnd**) 85 days from today. Verify the Contract Renewal play auto-activates (T-90 phase should be active) via the timeline cron. Verify Health Check & EBR content and phase gates. Renewal plays anchor to **CompanyProduct** contract dates, not account-level fields.

If any test fails, check: PlayTemplate status ACTIVE; SignalPlayMapping exists; PlayGovernance populated; **CompanyProduct** has the required contract date field; buildContentContext() and timeline cron resolution.

---

## Post-Setup Checklist

Before handing off to AE onboarding, confirm: Profile, Products, Content Library, Messaging, Playbooks, Intelligence, Play Governance (API or seed), Play Templates, Signal-to-Play Mappings (in SAP Play Rules), and validation tests complete.

Once this checklist is complete, proceed to AE Onboarding Guide.
