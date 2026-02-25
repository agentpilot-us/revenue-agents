# Sales Demo Guide — Running the Demo

Use this guide to run a product demo for a prospect using a **locked demo account**. Demo accounts use pre-built data and do not call external APIs or AI during the demo, so the experience is fast and predictable.

---

## Before You Start

- **You must be logged in** to the app (same account that owns the demo company).
- **A demo account must already exist.** If you don’t see a demo company or the “Demo setup” link, ask your admin to build and lock one (see [Building a Demo (Admin)](#building-a-demo-admin) below).
- **Recommended:** Use a separate browser profile or incognito window for a clean demo and to avoid mixing your own data.

---

## Step 1: Open the app and go to the dashboard

1. Go to the app URL (e.g. your production or staging URL).
2. Sign in if prompted.
3. You should land on **Dashboard** with a list of companies (or go to **Dashboard** from the left sidebar).

---

## Step 2: Choose the demo company

1. In the left sidebar, click **Target companies**.
2. In the list, find the company that is used for demos (often named for the vertical, e.g. “NVIDIA” for semiconductor, “Acme” for SaaS).
3. Click the company name to open its **company view**.

   **Tip:** If your admin set up the demo, they can tell you which company name to use (e.g. “NVIDIA – Semiconductor demo”).

---

## Step 3: Show the company overview

On the company page you’ll see:

- **Tabs** near the top: **Messaging**, **Campaigns**, **Contacts**, **Content**, **Map**, **Expansion** (depending on configuration).
- **Progress / status** for research, departments, contacts, and campaigns.
- **Actions** (e.g. ARR-related actions if enabled).

**What to do:**

1. Click through the main tabs and briefly explain what each is for:
   - **Messaging** — Account-level messaging and value props.
   - **Campaigns** — Segments and landing pages / campaigns.
   - **Contacts** — Contact list by department, enrichment status.
   - **Content** — Content library and created assets.
   - **Map / Expansion** — Account map and expansion (if shown).

2. Point out that research is done, departments are defined, and contacts are loaded so the prospect sees a “ready” account.

---

## Step 4: Show the AI chat (in-demo behavior)

1. On the same company page, find the **chat widget** (usually on the side or bottom).
2. Open it and type a short question, e.g.:
   - *“Who are the main contacts in IT?”*
   - *“Summarize this account.”*
   - *“What campaigns do we have?”*
3. The demo responds using **only pre-built data** (no live API or LLM calls), so answers are instant and consistent.
4. Explain that in a real account, the same chat uses full AI and live data.

---

## Step 5: Show contacts and campaigns

1. Go to the **Contacts** tab (or click **Build Contact List** / **Contacts** in the sidebar for this company).
   - Show contacts by department.
   - Mention enrichment status and how the tool finds and enriches contacts.
2. Go to the **Campaigns** tab.
   - Show the demo campaign(s) and any segment/landing page.
   - If there’s a **Launch outreach** or similar link, you can show how outreach is launched from this account.

---

## Step 6: Optional — Intelligence and other pages

- **Account Intelligence** (if linked from the company or nav): show how research and messaging are applied and how the tool recommends next steps.
- **Analytics** (from the main dashboard nav): show high-level analytics; for a locked demo, data is pre-seeded so charts and activities look realistic.

---

## Building a Demo (Admin)

Only needed if no demo account exists yet. **Demo setup** is only available when `ALLOW_DEMO_SETUP=true` is set for the environment.

1. In the left sidebar, click **Demo setup** (between Target companies and Create content when enabled).
2. **Vertical** — Choose the vertical (e.g. saas, pharma, semiconductor, fintech).
3. **Company** — Select the company to turn into a demo (use an existing test company or create one first under Target companies).
4. Click **Build demo**.
   - The app runs: research → apply research → find & enrich contacts → generate messaging → create demo campaign → seed demo activities.
   - Wait until all four steps show green checkmarks: Apply research, Find & enrich contacts, Generate messaging, Launch campaign.
5. In **Lock as demo**, add a short note (e.g. “NVIDIA/GM semiconductor demo — built 2026-02-23 — 12 contacts, 4 segments”).
6. Click **Lock as demo**.
7. After lock, the account is read-only for AI/external calls: all views use pre-built data. You can now use this company for demos by following **Steps 1–6** above.

**Alternative: Celigo/Lattice demo seed**  
To prepopulate a Celigo → Lattice HQ demo for a specific account (e.g. `demo-saas@agentpilot.us`), sign in as that user once, then run: `npm run seed:demo:celigo`. This creates products, content library, Lattice HQ company, buying groups, contacts, and two sales pages. Optional: set `DEMO_USER_EMAIL` in `.env.local` to target a different user.

---

## Quick reference

| Step | Action |
|------|--------|
| 1 | Log in → Dashboard |
| 2 | Target companies → select demo company |
| 3 | Show company overview (tabs, progress, messaging, campaigns, contacts) |
| 4 | Open chat widget; ask 1–2 questions to show instant, pre-built answers |
| 5 | Show Contacts and Campaigns in detail |
| 6 | (Optional) Account Intelligence, Analytics |

---

## Troubleshooting

- **“Demo setup” link is missing**  
  Demo setup is disabled. Ask your admin to set `ALLOW_DEMO_SETUP=true` and to build/lock a demo company.

- **No companies in the list**  
  Create a company first (Target companies → Add company), then have an admin run **Build demo** and **Lock as demo** for it.

- **Chat or pages are slow or behave oddly**  
  Confirm the company is **locked** as a demo (in Demo setup it shows “(locked)” next to the company). If it isn’t locked, the app may still call live APIs.

- **Wrong data in the demo**  
  Locked demos don’t update from live APIs. To change the data, an admin must unlock (if supported), rebuild, and lock again, or use a different company as the demo.
