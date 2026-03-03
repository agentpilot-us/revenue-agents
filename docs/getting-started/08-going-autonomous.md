# Chapter 8: Going Autonomous

*You've been using AgentPilot for a month. You've launched a product, built a territory plan, responded to signals, prepped for meetings, run event invites, and re-engaged stalling deals. You know the system's voice. You trust the output. Now you want it to run while you sleep.*

## The goal

By the end of this chapter, you'll have signal monitoring running automatically, action mappings that trigger plays from signals, autonomous plan execution via the chat, outreach sequences with timed follow-ups, and an approval queue for emails that need your sign-off.

## Prerequisites

You've worked through Chapters 1-7. This chapter ties everything together.

---

## The manual → autonomous map

Everything you did manually in Chapters 2-7 has an autonomous counterpart:

| What you did manually | Autonomous version |
|---|---|
| Checked the Signals tab for news | Signal monitoring cron runs every 6 hours + Exa Websets |
| Clicked "Run Play" from a signal | Action mappings auto-trigger plays from signal types |
| Generated content, reviewed, and sent | `execute_expansion_plan` in chat runs the full workflow |
| Scheduled follow-up emails by hand | Outreach sequences advance automatically |
| Remembered to follow up in 3 days | `ScheduledAction` model processes deferred tasks every 15 minutes |

The shift isn't all-or-nothing. You choose the autonomy level for each action. Some emails go out automatically. Some queue for your approval. You're in control of where the line is.

---

## Step 1: Signal monitoring (already running)

You don't have to set this up — it's on by default.

AgentPilot runs a signal detection cron job every 6 hours across all your target accounts. It uses Exa to scan for:

- Executive hires and departures
- Earnings calls and financial filings
- Product announcements
- Funding rounds
- Acquisitions
- Industry news
- Job postings

Each signal is scored for relevance and stored. High-relevance signals surface in your Next Best Actions dashboard and on the account's Signals tab.

### Custom signal sources

On the **Sales Map** page, scroll to the **Signal Configuration** section. Here you can:

- View the built-in signal rules (executive moves, financial events, product news)
- Add custom signal sources — specific Exa queries tailored to your market

For example: "Retail companies announcing marketing technology RFPs" or "CDP vendor mentions in earnings calls."

[Screenshot: Signal Configuration panel showing built-in rules and custom sources]

---

## Step 2: Create action mappings

Action mappings are the bridge between detection and response. They answer: *"When this signal type appears, what should happen?"*

On the **Sales Map** page, open the **Action Playbook** section.

Create a mapping:

| Field | Example |
|---|---|
| **Signal type** | Executive hire |
| **Action** | Run new_buying_group play |
| **Autonomy level** | Queue for approval |

### Autonomy levels

Each mapping has an autonomy setting:

- **Notify only** — Surface the signal in Next Best Actions and Signals tab. You decide what to do.
- **Queue for approval** — Generate the content (email, sales page) automatically, but hold it for your review before sending.
- **Fully autonomous** — Generate and send without waiting for approval.

Start with "Queue for approval" for everything. Once you've reviewed 10-20 auto-generated emails and are consistently hitting "Approve" without edits, move specific mappings to "Fully autonomous."

[Screenshot: Action Mapping editor showing signal type → play → autonomy level configuration]

### Example mappings to start with

| Signal type | Play | Autonomy level | Reasoning |
|---|---|---|---|
| Executive hire | New buying group | Queue for approval | High-stakes first impression — review the tone |
| Earnings call | Re-engagement | Notify only | Need to read the signal context before acting |
| Product announcement | Feature release | Queue for approval | Good for auto-generation, worth a quick review |
| Funding round | New buying group | Queue for approval | Fresh budget = good timing, but personalize the angle |
| Job posting | Notify only | Notify only | Useful intel, rarely worth direct outreach |

---

## Step 3: Run plans from the chat

This is the most powerful feature in AgentPilot. Open the **Chat** and type:

> "Run an MC Next expansion plan for Kohl's Marketing"

The chat agent activates the `execute_expansion_plan` tool. Here's what happens in sequence:

### Step 3a: Context loading

The system loads everything it needs:
- Kohl's company data, research, and signals
- Marketing buying group profile and contacts
- MC Next product profile and framing (upgrade from MCE)
- Your messaging framework
- Active objections
- Relevant case studies and events

### Step 3b: Sales page generation

Using all that context, the system runs the appropriate play (expand_existing, since Kohl's has MCE) and generates a sales page with typed sections — hero, value props, comparison, case study, CTA.

### Step 3c: Page publishing

The page goes live at `/go/kohls-marketing-mc-next` with a unique slug.

### Step 3d: Email generation

An outreach email is drafted, personalized to the primary contact in the Marketing buying group. It references the sales page, the upgrade path, and relevant signals.

### Step 3e: Email handling

Based on your autonomy settings:
- **Autonomous mode** — The email sends immediately through your email provider
- **Approval mode** — The email queues as a `PendingAction` for you to review

### Step 3f: Briefing creation

For expansion and re-engagement plans, the system creates a briefing you can share with partners or SEs — same code-protected format from Chapter 5.

### Step 3g: Activity logging

Every step is logged as an activity on the account: page created, email sent (or queued), briefing generated.

### Watch it happen in real time

As the plan executes, you see a **Plan Execution Card** in the chat that streams progress step by step:

```
✓ Context loaded — Kohl's Marketing, MC Next (upgrade framing)
✓ Sales page generated — 7 sections, hero + value props + comparison + case study + FAQ + social proof + CTA
✓ Page published — /go/kohls-marketing-mc-next
✓ Email generated — Subject: "Sarah — MC Next migration path for Kohl's"
⏳ Email queued for approval
✓ Briefing created — shareable link ready
✓ Activity logged
```

One sentence in the chat. Seven steps executed. Full context used.

[Screenshot: Chat showing the execute_expansion_plan command with Plan Execution Card streaming progress]

---

## Step 4: Available plan types

The chat supports five plan types:

| Plan type | When to use | What it generates |
|---|---|---|
| **expand_existing** | Account uses your product; expand to more teams or deepen usage | Sales page + email + briefing |
| **new_buying_group** | New department identified as a potential buyer | Sales page + email |
| **event_invite** | Upcoming event relevant to the account | Event sales page + invite email |
| **re_engagement** | Deal went quiet; use a fresh signal as a hook | Sales page + email + briefing |
| **champion_enablement** | Champion needs executive-ready content to sell internally | Executive-framed page + email + briefing |

Examples:

- *"Run a new buying group plan for Target E-commerce with Data Cloud"*
- *"Run an event invite plan for Macy's Marketing for Dreamforce"*
- *"Run a re-engagement plan for Kohl's Marketing with MC Next"*
- *"Run a champion enablement plan for Kohl's Marketing with MC Next"*

---

## Step 5: Set up outreach sequences

For multi-touch outreach, use **sequences** — automated cadences with timed steps.

A sequence defines:
- **Touches** — Individual outreach steps (email, LinkedIn, call task)
- **Timing** — Days between each touch (e.g., Day 0, Day 3, Day 7, Day 14)
- **Channel** — Email, LinkedIn, or phone

When you enroll a contact in a sequence:
1. The first touch sends immediately (or at a scheduled time)
2. The `advance-sequences` cron runs hourly and checks for contacts due for the next touch
3. When a touch is due, the system generates personalized content using the AI (not a static template)
4. The email is created as a `ScheduledAction` and processed by the scheduled actions cron
5. After sending, the enrollment advances to the next touch

Each follow-up email is generated fresh — it references the previous email, any new signals, and the contact's engagement (did they open the last email? visit the page?).

[Screenshot: Sequence setup showing a 4-touch cadence with email and LinkedIn steps]

---

## Step 6: Review the approval queue

If you set action mappings to "Queue for approval" (recommended for starters), you'll have emails waiting for your review.

Check your **Pending Actions** — these are emails and other actions generated automatically that need your sign-off:

- **View the email** — Full content with context about why it was generated
- **Approve** — Send it as-is
- **Edit and approve** — Make changes, then send
- **Dismiss** — Don't send it

Over time, you'll notice a pattern: most emails need zero or minor edits. That's when you know it's safe to move those action mappings to "Fully autonomous."

[Screenshot: Approval queue showing pending emails with approve/edit/dismiss options]

---

## Step 7: Monitor scheduled actions

Behind the scenes, a **Scheduled Actions** system handles deferred work:

- Emails scheduled for future delivery (e.g., "send Monday at 9 AM")
- Sequence touches due at specific times
- Follow-up actions from plan executions

The scheduled actions cron runs every 15 minutes. It processes pending actions, sends emails, advances sequences, and logs activity. If an action fails, it retries with backoff.

You don't manage this directly — it runs in the background. But you can see the result: activities appearing on account engagement tabs, emails sending at the right times, sequences advancing on schedule.

---

## What just happened

You crossed the line from manual operator to orchestrator:

1. **Signal monitoring** — The system watches your accounts 24/7 and surfaces what matters
2. **Action mappings** — Signals automatically trigger the right play at the right autonomy level
3. **Chat-driven execution** — One sentence runs a multi-step plan: research, generate, publish, send, brief, log
4. **Plan Execution Card** — You see every step in real time as the system works
5. **Sequences** — Multi-touch outreach runs on autopilot with AI-generated follow-ups
6. **Approval queue** — You stay in control of what goes out, until you're ready to let go
7. **Scheduled actions** — Deferred work processes reliably in the background

The system doesn't replace your judgment. It extends it. You taught it your products, your messaging, your competitive angles, and your account context across Chapters 1-7. Now it applies that judgment at scale.

---

## Vocabulary box

Terms introduced in this chapter:

- **Action mapping** — A rule connecting a signal type to an automatic response: which play to run and at what autonomy level (notify, queue, or fully autonomous)
- **Autonomy level** — How much control you keep over auto-generated actions: notify only, queue for approval, or fully autonomous
- **`execute_expansion_plan`** — The chat command that runs a complete plan: context loading, page generation, publishing, email generation, briefing creation, and activity logging — all in one step
- **Plan Execution Card** — The real-time UI in chat that shows each step of an autonomous plan as it executes
- **Scheduled actions** — Deferred tasks (email sends, sequence advances) stored in the database and processed by a cron job every 15 minutes
- **Outreach sequence** — A multi-step cadence with timed follow-ups. Each touch is generated fresh by the AI based on the latest account context.
- **Approval queue** — Pending actions generated by autonomous workflows that require your review before sending

---

## What's next

You've completed the full arc:

| Phase | Chapters | What you learned |
|---|---|---|
| **Foundation** | [1](./01-setting-up-your-command-center.md) | Set up your company, products, content, and messaging |
| **Territory** | [2](./02-new-product-launch.md), [3](./03-boost-sales-35-percent.md) | Add accounts, research companies, build your Sales Map |
| **Craft** | [4](./04-new-vp-at-target-account.md), [5](./05-prep-for-tomorrows-meeting.md), [6](./06-event-season.md), [7](./07-deal-is-stalling.md) | Respond to signals, prep for meetings, run events, re-engage deals |
| **Scale** | [8](./08-going-autonomous.md) | Automate signal detection, plan execution, sequences, and approvals |

The system gets smarter as you use it. Every objection you log, every product profile you refine, every messaging framework you update — it all feeds into the AI's context. The more you teach it, the less you have to review.

Start manual. Build trust. Then let it run.
