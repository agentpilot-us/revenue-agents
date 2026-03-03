# Chapter 1: Setting Up Your Command Center

*Your VP of Sales just bought AgentPilot. The team Slack is buzzing. You open the app for the first time. Here's how to make it yours.*

## The goal

By the end of this chapter, your company profile, product catalog, content library, and messaging framework are loaded. The system knows what you sell, who you sell to, and how you talk about it. Everything that follows — research, plays, sales pages, automation — builds on this foundation.

## Who does this?

This is an **admin** workflow. Typically the RevOps lead or sales enablement manager handles initial setup. Individual reps pick up from Chapter 2 onward.

---

## Step 1: Complete the Setup Wizard

When you first log in, AgentPilot drops you into the Company Setup Wizard — a three-step flow that gets the basics in place.

### Step 1a: Company basics

Fill in four fields:

- **Company name** — Your company as it appears in outreach
- **Company website** — Used to auto-import content
- **Industry** — Your industry (e.g., "Marketing Technology")
- **Primary industry you sell to** — The vertical your reps target (e.g., "Retail")

[Screenshot: Company Setup Wizard — Step 1 basics form]

### Step 1b: Import content

The wizard offers a **Smart Import** (recommended). It crawls your website and pulls in case studies, use cases, feature releases, events, and resource links automatically.

You can also:
- Add specific URLs manually
- Upload PDFs, DOCX, or TXT files (up to 4 MB each)
- Import content for multiple industries

[Screenshot: Smart Import progress screen showing discovered content items]

### Step 1c: Keep content fresh

Set how often AgentPilot recrawls your site for new content:

- **Refresh frequency** — Daily, weekly, or monthly
- **Notifications** — Get alerted when new content is found, existing content is updated, or pages are removed

[Screenshot: Content refresh frequency settings]

Hit **Finish** and you're through the wizard.

---

## Step 2: Build your product catalog

Navigate to **My Company** (left sidebar). Scroll to the **Product Catalog** section.

### Add a product

Click **Add Product** and fill in:

- **Name** — The product name (e.g., "Marketing Cloud Next")
- **Description** — One paragraph on what it does
- **Use cases** — Tags for how customers use it (e.g., "email personalization", "journey orchestration")
- **Target personas** — Who buys it (e.g., "VP of Marketing", "CMO", "Marketing Ops Manager")

[Screenshot: CatalogProductForm with fields filled in]

### Create the product profile

After adding a product, expand its **Product Profile** section. This is the deep context the AI uses when generating content:

- **One-liner** — A single sentence that captures what the product does
- **Elevator pitch** — 2-3 sentences for a quick explanation
- **Value props** — The top reasons a buyer should care
- **Pain points** — Problems the product solves
- **Objection handlers** — Common pushback and how to respond (objection + counter-narrative pairs)
- **Competitive positioning** — How you stack up against alternatives
- **Price range** and **Sales cycle** — Helps the AI tailor urgency

[Screenshot: ProductProfileEditor showing value props and objection handlers]

### Define product relationships

Still on the My Company page, open the **Product Relationship Editor** for each product. Relationships tell the system how your products connect:

| Relationship | Meaning | Example |
|---|---|---|
| **Upgrade path** | Product A is the next step from Product B | MCE → MC Next |
| **Complementary** | Products work well together | Data Cloud + MC Next |
| **Prerequisite** | Product A requires Product B first | Personalization → Data Cloud |
| **Replacement** | Product A replaces Product B entirely | MC Next replaces MCE |

These relationships power **product framing** — the system automatically adjusts messaging based on what an account already owns. More on that in Chapter 2.

[Screenshot: ProductRelationshipEditor showing upgrade_path from MCE to MC Next]

---

## Step 3: Stock your content library

Go to **Content Library** (left sidebar). The Smart Import from Step 1 gave you a head start. Now fill in gaps.

The system recognizes seven content types:

| Type | What it is | Example |
|---|---|---|
| **Success Story** | Case study with named customer | "How Nordstrom increased email revenue 40%" |
| **Use Case** | Product use case writeup | "Real-time journey orchestration" |
| **Company Event** | Upcoming event or session | "Dreamforce 2026 — Booth #412" |
| **Framework** | Sales methodology or positioning | "The Value Selling Framework" |
| **Feature Release** | New feature or product launch | "MC Next: Smart Segments GA" |
| **Resource Link** | Blog post, whitepaper, webinar | "2026 State of Marketing AI Report" |
| **Uploaded Document** | Internally uploaded file | "Q1 Competitive Battlecard.pdf" |

To add content manually, click the **+ Create new** button next to any content type.

To add from a URL, use the **Add URL** option — the system scrapes the page, extracts structured data, and lets you review before saving.

To bulk import, use **Full site** mode — paste a site URL, the system discovers all links, and you select which ones to import.

[Screenshot: Content Library showing imported items grouped by type]

---

## Step 4: Set up your messaging framework

Navigate to **Messaging** (left sidebar). Click **New Framework**.

A messaging framework is your sales playbook in text form. It tells the AI:

- Your value props and positioning
- Key messages per persona
- Do's and don'ts for tone and language
- Competitive talking points

You can type it in directly or **upload a PDF** of your existing playbook. The system ingests and structures it.

[Screenshot: New Messaging Framework form with framework content textarea]

Every piece of content the AI generates — emails, sales pages, talking points — is filtered through your messaging framework. Get this right and the output sounds like your team, not a generic AI.

---

## Step 5: Connect Salesforce (optional)

Go to **Settings** → **Integrations** → **CRM**.

Click **Connect Salesforce**. This triggers a standard OAuth flow — you'll log into Salesforce and authorize AgentPilot.

Once connected:
- Import accounts directly from Salesforce
- Sync contact data
- Pull deal stage information into Next Best Actions

This step is optional. You can manually add accounts and contacts without Salesforce.

[Screenshot: Salesforce integration settings showing "Connected" status]

---

## What just happened

You've built the knowledge base that powers everything else in AgentPilot:

- **Company profile** — The system knows who you are
- **Product catalog + profiles** — It knows what you sell and how to talk about it
- **Product relationships** — It knows which products connect and how to frame upgrades, cross-sells, and prerequisites
- **Content library** — It has your case studies, events, feature releases, and resources to reference in outreach
- **Messaging framework** — It knows your voice, your positioning, and your competitive angles
- **Salesforce** — It can pull live account and contact data (if connected)

---

## Vocabulary box

Terms introduced in this chapter:

- **Product catalog** — The list of products your company sells, stored in AgentPilot
- **Product profile** — Deep context about a single product: elevator pitch, value props, objection handlers, competitive positioning
- **Product relationship** — How two products connect: upgrade path, complementary, prerequisite, or replacement
- **Content library** — Your centralized repository of case studies, events, feature releases, and other sales assets
- **Messaging framework** — Your sales playbook in structured form — value props, positioning, tone, competitive angles
- **Smart Import** — The wizard that crawls your website to auto-populate the content library

---

## Next up

Your foundation is set. In [Chapter 2: We Just Launched a New Product](./02-new-product-launch.md), you'll use everything you just built to run your first product launch play.
