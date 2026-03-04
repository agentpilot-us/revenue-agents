# Getting Started with AgentPilot

A day-in-the-life guide for sales reps and their managers. Each chapter drops you into a real scenario and walks you through the product — no abstract feature tours, no marketing fluff.

## How to use this guide

Start with Chapter 1 to set up your environment. Then pick whichever scenario matches your week. The chapters are ordered by complexity — early chapters cover manual workflows, later chapters build toward full automation. By Chapter 8, the system runs plays for you.

## The learning arc

```
Foundation          Territory           Craft                  Scale
(set up)       →    (learn)        →    (create)          →    (automate)
─────────────       ─────────────       ──────────────────     ─────────────────
Company profile     Add accounts        Generate content       Signal monitoring
Product catalog     Research companies  Create sales pages     Action mappings
Content library     Discover groups     Run plays              Autonomous plans
Activity catalog    Find contacts       Send multi-channel     Sequences
Messaging           Understand signals  Prep for meetings      Scheduled actions
Salesforce          Track engagement    Share briefings        Approval queues
```

You build judgment in the middle two phases. You see how the AI reasons about your accounts. You learn the vocabulary — buying groups, signals, plays, activities, content channels, framing. Only after that does automation feel safe.

## Chapters

| # | Title | Scenario | POV |
|---|-------|----------|-----|
| 1 | [Setting Up Your Command Center](./01-setting-up-your-command-center.md) | First day on the platform | Admin |
| 2 | [We Just Launched a New Product](./02-new-product-launch.md) | Feature release play | User |
| 3 | [I Need to Bump My Sales 35%](./03-boost-sales-35-percent.md) | Expansion plan + roadmap | User |
| 4 | [A New VP Just Joined My Target Account](./04-new-vp-at-target-account.md) | Signal-driven outreach | User |
| 5 | [I Have a Meeting Tomorrow](./05-prep-for-tomorrows-meeting.md) | Prep Me + briefings | User |
| 6 | [Dreamforce is Next Month](./06-event-season.md) | Event invite plan | User |
| 7 | [This Deal is Stalling](./07-deal-is-stalling.md) | Re-engagement + champion | User |
| 8 | [Going Autonomous](./08-going-autonomous.md) | Full automation | User + Admin |

## Vocabulary quick reference

These terms come up throughout the guide. Each chapter introduces them in context, but here's the cheat sheet.

### Core concepts

- **Buying group** — A department or team within a target account that makes purchasing decisions together (e.g., "Marketing Ops at Kohl's").
- **Signal** — A detected event at a target account — executive hire, earnings call, product announcement, funding round, job posting, acquisition, or industry news. Signals trigger plays.
- **Framing** — How the system positions your product relative to what the account already owns: expansion, upgrade, prerequisite met, or net new. Applied automatically based on product relationships and the account's existing stack.

### Sales Map

- **Sales Map** — Your strategic command center (sidebar: **Your Sales Map**). Defines which accounts to target, which products to push, and what actions to take — organized into phased plans with urgency scoring. Includes your roadmap objective, target map, signal configuration, and action playbook.
- **Roadmap target** — An account added to your Sales Map for strategic tracking, with stage (Active Program, Expansion Target, Emerging, etc.) and associated contacts.
- **Phased plans** — AI-generated action sequences grouped by priority: quick wins first, then pipeline building, then long-term plays.

### Plays and activities

- **Play** — A tactical outreach motion. Five play types: **Open New Buying Group**, **Event Invite**, **Feature Release**, **Re-Engagement**, and **Champion Enablement**. Each play generates a sales page + personalized email using full account context. Plays can be triggered manually, from signals, or autonomously via action mappings.
- **Activity catalog** — A library of ~50 structured sales activities across six categories: Product & Platform, Events & Experiences, Content & Assets, Gifts & Personal Touches, Customer Programs, and Deal Plays & Motions. Each activity defines ordered AE steps, target segments, engagement targets, expected outcomes, and timing. Activities are linked to plays and power the Recommended Plays on the dashboard.
- **AE steps** — The ordered steps an account executive follows when running a play or activity (e.g., "Build target list → Send product brief → Offer briefing → Host webinar → Follow up with ROI"). Shown on the Recommended Plays cards and play execution screens.

### Content

- **Content tab** — The hub for generating outreach on a target account. Pick a channel, select a buying group, and the AI generates personalized content using the account's full context — research, signals, product fit, existing stack, active objections, and your messaging framework.
- **Content channels** — Seven output formats: **Email** (subject + body), **LinkedIn InMail** (hook + body), **LinkedIn Post** (conversational), **Slack DM** (short), **Text / SMS** (brief), **Sales Page** (full landing page with typed sections), and **Presentation** (slide outline with speaker notes).
- **Sales page** — A personalized landing page generated for a specific account and buying group, hosted at `/go/{slug}`. Created from the Content tab by selecting the Sales Page channel. Includes typed sections (hero, value props, comparison, case study, FAQ, CTA, etc.) and an embedded AI chat.

### Contacts

- **Contacts tab** — People organized by buying group. Each contact has a role, title, email, LinkedIn, enrichment status, buying role (economic buyer, technical evaluator, champion, influencer), and engagement status (not enriched → enriched → contacted → engaged). Contacts can be discovered via **Find Contacts**, enriched with data, and targeted for outreach.
- **Warm indicator** — Shows which contacts have recently engaged (opened emails, visited pages, replied). Helps you prioritize who to reach out to next.

### Engagement and activities

- **Engagement tab** — Metrics per buying group: contact count, new contacts (30-day), emails sent, meetings, replies, and invites accepted. Tracks outreach momentum across each buying group.
- **Activity feed** — A chronological log on the dashboard of every action across your territory: emails sent, pages created, research completed, plays run, signals detected. Grouped by day.
- **Active objections** — Known objections on an account, tracked with severity, status, and counter-narratives. Fed into all content generation and Prep Me sessions.

### Meeting prep

- **Prep Me** — AI-generated meeting preparation: structured talking points with opening options, pain probes, value props matched to the contact's role, objection counters (known + inferred), a proof point, and a suggested next step.
- **Briefing** — A shareable, code-protected page with meeting prep and account context. No login required for the recipient. Expires after 48 hours.

### Automation

- **Action mapping** — A rule that connects a signal type to an automatic response (e.g., "When a new VP is hired, run the Open New Buying Group play"). Each mapping has an autonomy level: notify only, queue for approval, or fully autonomous.
- **Sequence** — A multi-step outreach cadence with timed follow-ups across email, LinkedIn, and call tasks. Each follow-up is generated fresh by the AI using the latest account context — not a static template.
- **Scheduled actions** — Deferred tasks (email sends, sequence advances, follow-ups) stored in the database and processed by a cron every 15 minutes.
