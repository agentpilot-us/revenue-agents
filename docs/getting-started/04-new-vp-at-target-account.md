# Chapter 4: A New VP Just Joined My Target Account

*You open AgentPilot on Monday morning. A notification catches your eye: "New VP of Marketing hired at Kohl's." This person didn't exist in your CRM last week. They have fresh budget, fresh mandate, and zero vendor loyalty. You have about two weeks before every competitor reaches out. Here's how to be first.*

## The goal

By the end of this chapter, you'll understand how signals work, how they connect to plays, and how to turn a single signal into a personalized email, LinkedIn message, and talking points — all referencing the VP hire and tailored to Kohl's situation.

## Prerequisites

You've completed [Chapter 1](./01-setting-up-your-command-center.md). Kohl's is in your account list with an existing stack and buying groups identified (Chapter 2 or Chapter 3).

---

## Step 1: See the signal

Open Kohl's company page and click the **Signals** tab.

The signals tab shows recent events detected at the account. AgentPilot monitors your target accounts using web intelligence — scanning news, financial filings, press releases, and job postings.

You'll see a signal card:

> **Executive Hire**
> "Kohl's Appoints Sarah Chen as VP of Marketing"
> *Source: BusinessWire — Published 3 days ago*
> Relevance: 9/10
> Suggested play: New Buying Group

[Screenshot: Signals tab showing the VP hire signal with relevance score]

### Signal types the system detects:

| Signal Type | What it captures |
|---|---|
| **Executive hire** | New leadership joins the company |
| **Executive departure** | Leadership leaves — budget may shift |
| **Earnings call** | Quarterly results — reveals priorities and pain |
| **Product announcement** | Company launches something new — potential tech shift |
| **Funding round** | Fresh capital — new budget available |
| **Acquisition** | M&A activity — tech consolidation likely |
| **Industry news** | Relevant market shifts |
| **Job posting** | Hiring patterns that reveal strategic direction |

Each signal gets a **relevance score** (1-10) based on how relevant it is to what you sell. Only signals scoring above the threshold are saved. The system also suggests the most appropriate **play** to run.

---

## Step 2: Run a play from the signal

The signal card has a **Run Play** button. Click it.

This routes you to the play execution flow. Because the signal is an executive hire and Kohl's Marketing is a buying group, the system suggests the **New Buying Group** play.

### What happens next:

The play engine loads context:
- Kohl's company overview and key initiatives
- The Marketing department's buying group profile
- Products matched to Marketing (from product fit)
- Kohl's existing stack and product framing
- Active objections for the account
- The signal itself (VP hire details)

Then it generates three assets in one pass:

[Screenshot: Play execution screen showing generated email, LinkedIn message, and talking points]

---

## Step 3: Review the email

The generated email:

- **Opens with the signal** — congratulates Sarah Chen on the new role
- **Bridges to relevance** — references Kohl's existing MCE stack and the opportunity to modernize
- **Uses the right framing** — upgrade narrative (MCE → MC Next), not a cold pitch
- **Includes proof** — pulls a retail case study from your content library
- **Ends with a soft CTA** — "Would it make sense to grab 15 minutes next week to walk through how [similar retailer] made the transition?"

The email isn't generic. It references the hire, the company's stack, and a relevant case study — because all of that context was loaded before generation.

Review the draft. Adjust anything — the opening line, the CTA, the tone. You know this account better than the AI does.

[Screenshot: Generated email with VP hire reference and upgrade framing]

---

## Step 4: Review the LinkedIn message

The LinkedIn outreach is shorter and more casual:

- **Connection request context** — mentions a shared interest or the role transition
- **Value hint** — one sentence on what you help companies like Kohl's achieve
- **No hard sell** — the goal is to get a response, not close a deal

[Screenshot: Generated LinkedIn message for Sarah Chen]

---

## Step 5: Review the talking points

If you get a meeting (or bump into Sarah at an event), you need to be ready. The talking points include:

- **Opening options** — 2-3 ways to start the conversation
- **Key pain to probe** — questions about her mandate and what she inherited
- **Value props for this meeting** — matched to Marketing Ops, not generic
- **Likely objections** — what she might push back on, with counter-narratives
- **Proof point** — a specific case study or metric to drop
- **Suggested next step** — what to propose at the end of the conversation

These are the same structured sections that Prep Me generates (more on that in Chapter 5), but pre-loaded with the signal context.

[Screenshot: Talking points generated from the VP hire play]

---

## Step 6: Send from the play UI

You have three options for sending:

1. **Send now** — The email goes out immediately through your configured email provider
2. **Save as draft** — Keep it in the engagement tab for later
3. **Queue for review** — If your team requires approval before outreach

For the LinkedIn message, copy it and paste it directly into LinkedIn (AgentPilot doesn't send LinkedIn messages for you — that's intentional).

[Screenshot: Send options on the play execution screen]

---

## Step 7: Understand the signal → play connection

Here's how the pieces fit together under the hood:

```
Signal detected (web monitoring)
    ↓
Signal classified (type, relevance score, suggested play)
    ↓
Signal appears on company Signals tab + Next Best Actions
    ↓
Rep clicks "Run Play"
    ↓
Play engine loads full account context
    ↓
AI generates email + LinkedIn + talking points
    ↓
Rep reviews, edits, sends
    ↓
Activity logged on the Engagement tab
```

The system also surfaces high-relevance signals in the **Next Best Actions** card on your dashboard. You don't have to check each account's signals tab — the important ones float to the top.

---

## What just happened

A VP hire at a target account turned into personalized outreach in under 5 minutes:

1. **Signal detection** — The system found the news before you did
2. **Relevance scoring** — The system rated it 9/10 because Kohl's Marketing is a target buying group
3. **Play suggestion** — It recommended New Buying Group based on the signal type
4. **Context loading** — It pulled company research, product fit, existing stack, and active objections
5. **Content generation** — One AI call produced an email, LinkedIn message, and talking points — all referencing the hire
6. **Personalization** — The content used upgrade framing because Kohl's has MCE active

You didn't start from a blank page. You started from a fully informed draft and applied your judgment.

---

## Vocabulary box

Terms introduced in this chapter:

- **Signal** — A detected event at a target account: executive hire, earnings call, product announcement, funding round, acquisition, or industry news
- **Signal types** — Categories of signals the system monitors: `executive_hire`, `executive_departure`, `earnings_call`, `product_announcement`, `funding_round`, `acquisition`, `industry_news`, `job_posting_signal`
- **Relevance score** — How relevant a signal is to your products and territory (1-10 scale)
- **Play** — A tactical outreach motion triggered by a signal or account condition. Five play types: Open New Buying Group, Event Invite, Feature Release, Re-Engagement, and Champion Enablement. Each generates a sales page + email using full account context.
- **Activity catalog** — A broader library of ~50 structured sales activities (product launches, executive dinners, competitive battlecards, ROI tools, champion development, etc.) that define ordered AE steps for each play. Activities power the Recommended Plays cards on the dashboard.
- **AE steps** — The ordered actions you follow when running a play (e.g., "Build target list → Send product brief → Offer briefing → Follow up with ROI"). Shown on play execution screens and Recommended Plays cards.
- **Play engine** — The system that loads account context, selects the right play and linked activity, and generates multi-channel content (email + LinkedIn + talking points)
- **Next Best Action** — The prioritized recommendation card on your dashboard that surfaces signals, plays, and actions across your territory. Includes AE step previews so you know exactly what to do next.

---

## Next up

You acted on a signal. But what about the meeting that signal led to? In [Chapter 5: I Have a Meeting Tomorrow](./05-prep-for-tomorrows-meeting.md), you'll use Prep Me to walk in fully prepared.
