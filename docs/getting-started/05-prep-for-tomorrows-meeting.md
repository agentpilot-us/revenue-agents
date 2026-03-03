# Chapter 5: I Have a Meeting Tomorrow

*It's 9 PM. You're on the couch, half-watching a show, when your calendar reminder pings: "10 AM — Sarah Chen, VP of Marketing, Kohl's." You haven't prepped. You need talking points, objection counters, and context on what's happening at Kohl's right now. You have 30 minutes before you're too tired to think. Here's how to walk in ready.*

## The goal

By the end of this chapter, you'll have structured meeting prep generated in under a minute, know how to handle active objections, and be able to share a briefing with your SE or partner — no login required on their end.

## Prerequisites

Kohl's is in your account list with company research, a buying group for Marketing, and the VP hire signal from [Chapter 4](./04-new-vp-at-target-account.md).

---

## Step 1: Open Prep Me

Navigate to Kohl's company page. Find **Sarah Chen** in the contacts list under the Marketing buying group.

Click the **Prep Me** button next to her name.

[Screenshot: Contact list showing Sarah Chen with Prep Me button]

---

## Step 2: Review your talking points

Prep Me generates structured meeting preparation in six sections:

### OPENING (2-3 options)

The AI gives you multiple ways to start the conversation — not "how's the weather" openers, but context-aware hooks:

- *"Congrats on the new role — 3 months in, what's surprised you most about the marketing stack you inherited?"*
- *"I saw Kohl's just announced the loyalty program revamp. How is that changing the demands on your team?"*
- *"I know you came from [previous company]. Curious how the data infrastructure compares."*

Each option references something real — the hire signal, a company initiative, or her background.

### KEY PAIN TO PROBE

The questions you should ask to uncover pain:

- "How long does it take your team to build and launch a new campaign today?"
- "Are you able to act on customer signals in real time, or is there a data lag?"
- "What's the biggest bottleneck when you try to personalize at scale?"

These are pulled from the product profile's pain points, matched against Kohl's situation.

### VALUE PROPS FOR THIS MEETING (3 max)

Not your full value prop list — just the three most relevant to Sarah's role and Kohl's context:

1. Real-time segments that update as customer data changes
2. AI-powered send time optimization across channels
3. Native CDP integration that eliminates the third-party data sync

### LIKELY OBJECTIONS (with counter-narratives)

Both known and inferred objections:

- **Known** (from the Active Objections panel): *"We just renewed our MCE contract"* → "MC Next runs alongside MCE during transition. Most teams see a 30% improvement in campaign velocity during the parallel period."
- **Inferred** (from the product profile): *"My team doesn't have bandwidth for a migration"* → "The migration assistant handles 80% of the work automatically. We pair you with a launch engineer for the rest."

### PROOF POINT TO DROP

A specific case study or metric to work into the conversation:

> "Nordstrom's marketing team cut campaign launch time from 2 weeks to 3 days after moving to MC Next. Their email revenue increased 40% in the first quarter."

This is auto-selected from your content library based on industry match (retail) and relevance to the pain points.

### SUGGESTED NEXT STEP

What to propose at the end of the meeting:

> "Based on today's conversation, it might make sense to do a 30-minute technical deep dive with your Marketing Ops lead. I can have our solutions engineer walk through the migration path specific to your MCE setup."

[Screenshot: Prep Me panel showing all six sections of generated talking points]

---

## Step 3: Check active objections

Before the meeting, check what objections have already been raised on this account.

Click the **Overview** tab on Kohl's company page and scroll to **Active Objections**. Or look at the Prep Me output — it already includes known objections.

The Active Objections panel shows:

- **Objection text** — What was said
- **Severity** — High, medium, or low
- **Status** — Active, addressed, or resolved
- **Response** — Your counter-narrative
- **Source** — Where this objection was raised (meeting notes, email, etc.)

If Sarah raises a new objection tomorrow, you can add it here after the meeting. Future Prep Me sessions and content generation will include it automatically.

[Screenshot: Active Objections panel showing two active objections with responses]

---

## Step 4: Check event context

Still on the Prep Me panel, look for any **event attendances** listed. If Sarah is registered for an upcoming event (Dreamforce, a webinar, a regional conference), it shows up here.

This is useful context: "I saw you're attending our Dreamforce session on real-time personalization — I think that'll be directly relevant to what you're describing."

[Screenshot: Prep Me showing event attendance for an upcoming conference]

---

## Step 5: Copy or share the talking points

You have two options:

### Option A: Copy for yourself

Click **Copy All** to copy the entire prep document to your clipboard. Paste it into your notes app, print it, or keep it in a tab during the meeting.

### Option B: Share as a briefing

Click **Share Briefing**. The system generates:

- A **briefing URL** — a standalone page at `/go/briefing/{token}`
- A **6-character access code** — required to view the briefing

Send the URL and code to your SE, partner, or anyone joining the meeting. They don't need an AgentPilot login.

[Screenshot: Share Briefing modal showing the URL and access code]

---

## Step 6: What your SE sees

When your SE opens the briefing link, they see a code gate — a simple input field asking for the 6-character code.

After entering the code:

- **Company name and contact details** — who the meeting is with
- **Event attendances** — upcoming events the contact is attending
- **Prep sections** — the same talking points you generated, formatted for easy scanning

The briefing expires after 48 hours by default. No account data is permanently exposed.

[Screenshot: Briefing page showing company name, contact, and talking point sections]

---

## Step 7: After the meeting

The meeting went well. Sarah raised a new objection you didn't anticipate: *"We're evaluating Braze as well."*

Go back to Kohl's company page → **Active Objections** → **Add Objection**:

- **Objection:** "Evaluating Braze as an alternative"
- **Severity:** High
- **Response:** "Unlike Braze, MC Next includes a native CDP — no separate data platform purchase needed. Also, your existing MCE journeys migrate directly to MC Next but would need to be rebuilt from scratch in Braze."

Now every future piece of content generated for Kohl's — emails, sales pages, talking points — will account for the Braze competitive angle.

[Screenshot: Adding a new objection to the Active Objections panel]

---

## What just happened

You went from zero prep to fully briefed in under 5 minutes:

1. **Prep Me** generated structured talking points using the account's full context — not generic questions from a template
2. **Active objections** gave you ready-made counters for known pushback
3. **Event context** armed you with a conversation hook
4. **Briefing share** got your SE on the same page without requiring them to log in or navigate the tool
5. **Post-meeting objection capture** fed new intelligence back into the system for future content

The prep isn't static. It evolves as you add objections, as new signals come in, and as the account relationship deepens.

---

## Vocabulary box

Terms introduced in this chapter:

- **Prep Me** — AI-generated meeting preparation: structured talking points with opening options, pain probes, value props, objection counters, proof points, and a suggested next step
- **Briefing** — A shareable, code-protected page with meeting prep and account context. No login required for the recipient. Expires after 48 hours.
- **Active objections** — Known objections on an account, tracked with severity, status, and counter-narratives. Fed into all content generation.
- **Briefing code gate** — The 6-character access code required to view a shared briefing, protecting account data from unauthorized access
- **Event attendance** — Events a contact is registered for, surfaced in Prep Me and briefings as conversation context

---

## Next up

You mentioned Dreamforce during the meeting. In [Chapter 6: Dreamforce is Next Month](./06-event-season.md), you'll build an event strategy that gets the right people into the right sessions.
