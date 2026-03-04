# Chapter 2: We Just Launched a New Product

*Your company just shipped MC Next — the successor to MCE. Slack is full of confetti emojis. Product marketing sent a deck. Now you need to get it in front of every existing MCE customer on your book. Here's how.*

## The goal

By the end of this chapter, you'll have MC Next in your product catalog with a full profile, an upgrade path defined from MCE, a personalized sales page generated for a target account, and a feature announcement email ready to send.

## Prerequisites

You've completed [Chapter 1: Setting Up Your Command Center](./01-setting-up-your-command-center.md). Your company profile, content library, and messaging framework are in place.

---

## Step 1: Add MC Next to the product catalog

Go to **My Company** → **Product Catalog** → **Add Product**.

Fill in:
- **Name:** Marketing Cloud Next
- **Description:** Next-generation marketing automation with AI-native journey orchestration, real-time segment builder, and native CDP integration.
- **Use cases:** journey orchestration, email personalization, real-time segmentation, cross-channel campaigns
- **Target personas:** VP of Marketing, CMO, Marketing Ops Manager, Head of Digital

[Screenshot: CatalogProductForm filled in for MC Next]

---

## Step 2: Build the product profile

Expand **Marketing Cloud Next** → **Edit Product Profile**.

Fill in:
- **One-liner:** "AI-native marketing automation that turns customer data into real-time, personalized journeys."
- **Elevator pitch:** "MC Next combines the best of MCE with a native CDP, real-time segment builder, and AI-powered journey orchestration. It eliminates the data lag that slows down MCE campaigns and lets your team launch hyper-targeted journeys in minutes, not weeks."
- **Value props:**
  - Real-time segments update as customer data changes — no overnight batch jobs
  - AI suggests optimal send times, channels, and content per contact
  - Native CDP integration eliminates third-party data sync overhead
- **Objection handlers:**
  - *"We just invested in MCE last year"* → "MC Next includes a migration path that preserves your existing journeys. Most teams run both in parallel for 90 days and see a 30% improvement in campaign velocity."
  - *"Our team doesn't have bandwidth for a migration"* → "The migration assistant handles 80% of the work. We'll pair you with a launch engineer for the rest."
- **Competitive positioning:** "Unlike [Competitor], MC Next doesn't require a separate CDP purchase. The segment builder and data layer are built in."

[Screenshot: ProductProfileEditor for MC Next with value props filled in]

---

## Step 3: Define the upgrade path

Still on the My Company page, find MC Next in the product list and open the **Relationship Editor**.

Add a relationship:
- **Related product:** MCE (Marketing Cloud Enterprise)
- **Relationship type:** Upgrade Path

This tells the system: *when an account already uses MCE, MC Next should be positioned as an upgrade — not a net-new sale.*

[Screenshot: ProductRelationshipEditor showing MCE → MC Next upgrade_path]

---

## Step 4: Open a target account

Navigate to a target account — let's use Kohl's. Click into the company page.

### What you see on the Overview tab:

- **Company snapshot** — industry, size, key initiatives
- **Existing stack** — products Kohl's already owns

If Kohl's has MCE in their existing stack, you'll see it listed with status **Active**.

[Screenshot: Company Overview tab showing Kohl's with MCE listed as Active in existing stack]

### Manage the existing stack

If MCE isn't in the stack yet, click **Edit Existing Stack** (the Existing Stack Editor). Add:
- **Product:** MCE
- **Status:** Active
- **Deployed since:** 2023
- **Usage notes:** "Primary email platform, ~2M sends/month"

The existing stack is critical. It's how the system knows what framing to use.

[Screenshot: ExistingStackEditor showing MCE as Active for Kohl's]

---

## Step 5: Watch the framing kick in

Here's where the setup from Steps 1-4 pays off.

When the system generates content for MC Next targeting Kohl's, it runs through the **product framing engine**. The logic works like this:

1. Is MC Next already active at Kohl's? → **expansion** framing ("deepen usage, expand to more teams")
2. Does MC Next have an upgrade_path from an active product? → **upgrade** framing ("build on your existing MCE investment")
3. Does MC Next have a prerequisite that's active? → **prerequisite_met** framing ("unlock additional capabilities")
4. None of the above? → **net_new** framing ("introducing a new solution")

Since Kohl's has MCE active and MC Next has an upgrade_path from MCE, the system selects **upgrade** framing. Every email, sales page, and talking point will reference their existing MCE investment and position MC Next as the natural next step.

You didn't have to configure this. It happened because you set up the product relationship in Step 3 and the existing stack in Step 4.

---

## Step 6: Generate a feature announcement email

Go to the **Content** tab on the Kohl's company page.

Select the **Email** channel → choose the **Marketing** buying group → select **Feature Release** as the play type.

The AI generates an email that:
- References Kohl's existing MCE usage
- Leads with the upgrade narrative (not a cold pitch)
- Highlights the value props from your MC Next product profile
- Handles anticipated objections with the counters you wrote
- Includes a CTA to a personalized sales page (you'll create that next)

Review the draft. Edit anything that needs your voice. Save it.

[Screenshot: Generated feature announcement email for Kohl's with upgrade framing]

---

## Step 7: Create a sales page

Go to the **Content** tab on the Kohl's company page.

Select the **Sales Page** channel. You'll see options:

- **Scope:** Company-wide or per buying group (department)
- **Page type:** Account intro, feature announcement, event invite, or case study

Select:
- **Scope:** Company
- **Page type:** Feature Announcement

Click **Generate**. The system builds a full sales page with typed sections:

- **Hero** — Headline and subheadline personalized to Kohl's
- **Value Props** — Grid of key benefits, pulled from your MC Next profile
- **How It Works** — Step-by-step explanation of the migration path
- **Comparison** — MCE vs. MC Next side-by-side
- **Case Study** — Relevant success story from your content library (auto-matched by industry)
- **Social Proof** — Customer logos and results
- **FAQ** — Answers to common objections
- **CTA** — "Schedule a migration assessment" with booking link

The page auto-approves after a 30-second undo window. A `SegmentCampaign` record is created with a unique slug.

[Screenshot: Content tab showing generated sales page sections in preview]

---

## Step 8: Preview the live page

Your sales page is now live at:

```
https://yourdomain.com/go/kohls-marketing-cloud-next
```

Open it. You'll see a polished, responsive page with:
- Your company branding (logo, colors)
- The headline and subheadline from the generation
- Each section rendered as a distinct visual block — value props as a grid, comparison as a table, FAQ as an accordion
- A sticky CTA button

This is the link you'll include in your outreach email. When Kohl's clicks through, AgentPilot tracks the visit.

[Screenshot: Live sales page at /go/kohls-marketing-cloud-next]

---

## What just happened

You took a brand-new product from zero to launch-ready in about 15 minutes:

1. **Product catalog** — MC Next is registered with a full profile
2. **Relationship** — The upgrade path from MCE is defined
3. **Existing stack** — Kohl's MCE usage is recorded
4. **Framing** — The system auto-detected the upgrade narrative
5. **Content** — A feature announcement email was generated with upgrade framing
6. **Sales page** — A personalized landing page is live and trackable

The AI didn't guess at any of this. It used the product profile you wrote, the relationship you defined, the stack you documented, and the messaging framework from Chapter 1. The quality of the output is directly proportional to the quality of the setup.

---

## Vocabulary box

Terms introduced in this chapter:

- **CatalogProduct** — A product in your company's catalog, stored in AgentPilot with name, description, use cases, and target personas
- **ProductProfile** — The deep context layer for a product: elevator pitch, value props, objection handlers, competitive positioning
- **Product framing** — How the system positions a product relative to the account's existing stack: expansion, upgrade, prerequisite_met, or net_new
- **Existing stack** — The products an account already owns, with status (Active, Trial, Churned) and deployment details
- **Content tab** — The hub for generating outreach on a target account. Supports seven channels: Email, LinkedIn InMail, LinkedIn Post, Slack DM, Text / SMS, Sales Page, and Presentation. All content is generated using the account's full context — research, signals, product fit, existing stack, active objections, and your messaging framework.
- **Sales page** — A personalized landing page generated for a specific account, hosted at `/go/{slug}`. Created from the Content tab by selecting the Sales Page channel. Includes typed sections (hero, value props, comparison, case study, FAQ, CTA) and an embedded AI chat.
- **SegmentCampaign** — The database record for a sales page: headline, sections, CTA, slug, and tracking data

---

## Next up

Your product launch play is running. But one account isn't enough — in [Chapter 3: I Need to Bump My Sales 35%](./03-boost-sales-35-percent.md), you'll scale this across your entire territory using the Sales Map.
