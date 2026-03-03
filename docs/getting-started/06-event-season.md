# Chapter 6: Dreamforce is Next Month

*Your company has five sessions at Dreamforce this year. Marketing sent you the session list and a spreadsheet of registered attendees. Your job: get the right people from your accounts into the right sessions — and use it as cover for a real conversation. Here's how to turn event season into pipeline.*

## The goal

By the end of this chapter, you'll have events loaded into your content library, see how AgentPilot matches events to accounts, and run an event invite play that generates a personalized sales page and invite email for a specific buying group.

## Prerequisites

You've completed [Chapter 1](./01-setting-up-your-command-center.md) and have target accounts with buying groups and contacts (Chapters 2-4).

---

## Step 1: Add events to the content library

Go to **Content Library** → **Company Events** → **+ Create new**.

For each Dreamforce session, add:

- **Title** — "Dreamforce 2026: Real-Time Personalization at Scale"
- **Description** — What the session covers and who it's for
- **Date** — Session date and time
- **URL** — Registration link or agenda page

Add all five sessions. Each one becomes a `CompanyEvent` in your content library.

[Screenshot: Content Library showing five Dreamforce sessions as Company Events]

You can also import events by URL — paste the Dreamforce agenda page and the system extracts session details automatically.

---

## Step 2: See events matched to an account

Open a target account — Kohl's. Go to the **Overview** tab.

Scroll down to the **Events** section. You'll see your Dreamforce sessions listed with relevance context:

> **Dreamforce 2026: Real-Time Personalization at Scale**
> *Relevance: Matches Kohl's active objection "campaign velocity" and existing MCE stack*

> **Dreamforce 2026: CDP Migration Playbook**
> *Relevance: Matches Kohl's Marketing Ops product fit for Data Cloud*

The system scores events against each account using:
- **Active objections** — Does the session address a known objection?
- **Existing products** — Is the session about a product they use or should upgrade to?
- **Buying group needs** — Does the topic match a department's pain points?
- **Product fit** — Does the session cover a product that fits this account?

Not every session is relevant to every account. The matching ensures you're inviting people to sessions they'll actually find valuable.

[Screenshot: Company Overview showing matched Dreamforce sessions with relevance notes]

---

## Step 3: Run the event invite play

Pick the most relevant session for Kohl's Marketing — "Real-Time Personalization at Scale."

You can trigger the event invite play two ways:

### Option A: From the company page
Go to **Content** tab → **Create Content** → select **Event Invite** as the play type → select the event and the Marketing buying group.

### Option B: From the Signals/NBA
If a signal triggered an event match (e.g., the VP hire + Dreamforce attendance), it appears in Next Best Actions with a "Send Event Invite" CTA.

Either way, the play engine runs:

[Screenshot: Event invite play selection with event and buying group chosen]

---

## Step 4: Review the event-specific sales page

The event invite play generates a full sales page — but themed around the event. The sections include:

- **Hero** — "Join us at Dreamforce: See how leading retailers are personalizing in real time"
- **Event details** — Session name, date, time, location, speakers
- **Value props** — Why this session matters to Kohl's specifically (references their MCE stack and modernization goals)
- **Case study** — A retail customer success story matched to the session topic
- **Social proof** — Other companies attending or speaking
- **CTA** — "Register for the session" or "Request a 1:1 meeting at Dreamforce"

The page is created as a `SegmentCampaign` with page type `event_invite` and a slug like `kohls-dreamforce-personalization`.

[Screenshot: Generated event invite sales page with Dreamforce branding]

---

## Step 5: Review the invite email

The play also generates an email invite tailored to the buying group:

- **Subject:** "Sarah — Real-Time Personalization session at Dreamforce (your MCE upgrade path)"
- **Body:**
  - References Sarah's role and the marketing team's challenges
  - Explains why this specific session is relevant to Kohl's
  - Mentions the case study that'll be presented
  - Links to the personalized event sales page
  - Proposes a side meeting: "While we're both at Dreamforce, I'd love to grab 20 minutes to walk through the MCE → MC Next migration path."

The email isn't a generic "come to our booth" blast. It connects the event to the account's specific situation.

[Screenshot: Event invite email with personalized subject and body]

---

## Step 6: Send invites across the segment

If you have multiple contacts in the Kohl's Marketing buying group, you can send the invite to the full segment:

1. The sales page is shared — one URL for the buying group
2. Each email is personalized to the individual contact (name, title, specific relevance)
3. Visits to the sales page are tracked per contact

For accounts beyond Kohl's, repeat the process. The event invite play adapts the messaging to each account's context — same session, different angle for each company.

[Screenshot: Send options showing segment-level email with individual personalization]

---

## Step 7: Track engagement

After sending, check the **Engagement** tab on the company page:

- Who opened the email
- Who clicked through to the sales page
- Who visited the page directly
- Time spent on the page

This tells you who's warm before Dreamforce even starts. Prioritize your hallway conversations accordingly.

[Screenshot: Engagement tab showing email opens and page visits for the event invite]

---

## What just happened

You turned a conference into a targeted account play:

1. **Events in the library** — Sessions are structured data, not just calendar entries
2. **Account matching** — The system scored which sessions matter to which accounts
3. **Event invite play** — Generated a personalized sales page and email tied to a specific session
4. **Contextual personalization** — The invite references the account's stack, objections, and product fit — not just the event agenda
5. **Segment outreach** — One play covers the entire buying group with individual personalization
6. **Engagement tracking** — You know who's interested before you walk into the venue

Events aren't just logistics. They're pipeline accelerators when paired with account intelligence.

---

## Vocabulary box

Terms introduced in this chapter:

- **Event matching** — The system scores your events against each account's objections, existing products, and buying group needs to determine relevance
- **Event invite play** — A play type that generates an event-themed sales page and personalized invite email for a specific buying group and event
- **CompanyEvent** — An event record in the content library: title, description, date, URL, and relevance metadata
- **Segment** — A buying group (department) within an account targeted for outreach. Event invites and campaigns can be sent to a full segment with per-contact personalization.

---

## Next up

Dreamforce is planned. But back at the office, one of your deals has gone quiet — in [Chapter 7: This Deal is Stalling](./07-deal-is-stalling.md), you'll learn how to re-engage and arm your champion.
