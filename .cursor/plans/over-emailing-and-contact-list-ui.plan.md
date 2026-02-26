---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan: Over-emailing limits + Contact list UI (signal → play → content → contacts)

## Part 1: Over-emailing and same-day touch limits (summary)

- **Per-account cap**: Max 20 emails per company per calendar day (configurable).
- **Per-contact cap**: Max 1 email per contact per calendar day.
- Enforce at send time in **[app/api/chat/route.ts](app/api/chat/route.ts)** (`send_email` tool) and **[app/api/companies/[companyId]/plays/send-email/route.ts](app/api/companies/[companyId]/plays/send-email/route.ts)** via a shared **[lib/outreach/limits.ts](lib/outreach/limits.ts)** with `checkCanSendToContact(companyId, contactId)`. No proactive UI in Part 1 — user only sees an error when a send is blocked.

---

## Part 2: Contact list UI — “email sent this week” and account total

### Desired flow

1. User **finds a signal** (e.g. dashboard Hot Signals or Next Best Action).
2. User **creates the play** (e.g. “Run Feature Release play” or “Run event invite”).
3. User **creates content** (play run page generates email, LinkedIn, talking points).
4. User gets a **list of contacts** to send the content to (existing right-hand Contacts panel on the play run page).
5. **Each contact** shows an indicator: **email sent this week** (so the user can see who was already touched).
6. **Account-level** summary: show **account total** (e.g. “X emails sent to this account this week” — or “X / 20 today” if we want to tie to the daily cap). Exact metric can be “this week” (rolling 7 days) or “today”; “this week” is a useful default so they can avoid over-touching the same people.

### Where it lives in the codebase

- **Play run page**: [app/dashboard/companies/[id]/plays/run/page.tsx](app/dashboard/companies/[id]/plays/run/page.tsx) (server) and [app/dashboard/companies/[id]/plays/run/PlayRunClient.tsx](app/dashboard/companies/[id]/plays/run/PlayRunClient.tsx) (client).
- **Contacts source**: After content is generated, PlayRunClient fetches contacts from **GET [app/api/companies/[companyId]/contacts/by-department/route.ts**](app/api/companies/[companyId]/contacts/by-department/route.ts) and displays them in the right column. Each contact is rendered by **ContactRow** (name, title, Send email button, LinkedIn).
- **Activity data**: `Activity` with `type` in `['Email','EMAIL_SENT']` and `companyId` / `contactId` / `createdAt` is the source of truth for “emails sent.”

### Implementation (Part 2)

**1. Extend by-department API with optional email-activity counts**

- Add optional query param: `?includeEmailActivity=week` (or always include for simplicity; if backwards compatibility is a concern, use the param).
- When present (or always):
  - Query `Activity` where `companyId`, `type` in `['Email','EMAIL_SENT']`, `createdAt >= startOfSevenDaysAgo` (rolling 7 days in UTC).
  - Aggregate:
    - **Per contact**: `count` grouped by `contactId` → map `contactId → count`.
    - **Account total**: total count for that `companyId` in the same window.
  - In the response, for each contact in each group add `emailsSentThisWeek: number` (from the map; 0 if missing).
  - Add to the top-level response `accountEmailsSentThisWeek: number` (same total for the whole company).

**2. PlayRunClient: request and use the new fields**

- When calling `GET .../contacts/by-department`, add `?includeEmailActivity=week` (if we use the param).
- Type the response so each contact may have `emailsSentThisWeek?: number` and the payload has `accountEmailsSentThisWeek?: number`.
- Pass `emailsSentThisWeek` and (if available) `accountEmailsSentThisWeek` into the contacts list section.

**3. ContactRow: per-contact indicator**

- Add optional prop `emailsSentThisWeek?: number`.
- If `emailsSentThisWeek > 0`, show a small indicator under the contact’s title (or next to the name), e.g.:
  - **“Email sent this week”** (badge or muted text), or
  - **“1 email this week”** / **“2 emails this week”** if we want to show the count.
- Keep the existing Send / LinkedIn actions; the indicator is informational so the user can decide whether to send again.

**4. Account total above the contact list**

- Above the list of contacts in the right column, show one line, e.g.:
  - **“Account: 3 emails sent this week”** (using `accountEmailsSentThisWeek`).
  - Optional: if we also have “today” counts from the limits module, we could show **“Today: 2 / 20”** to tie to the daily cap; that can be a follow-up.

### Files to add/change (Part 2)


| File                                                                                                                           | Change                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app/api/companies/[companyId]/contacts/by-department/route.ts](app/api/companies/[companyId]/contacts/by-department/route.ts) | When `includeEmailActivity=week` (or always): query Activity (Email/EMAIL_SENT, last 7 days), build contactId→count map and account total; add `emailsSentThisWeek` to each contact and `accountEmailsSentThisWeek` to response. |
| [app/dashboard/companies/[id]/plays/run/PlayRunClient.tsx](app/dashboard/companies/[id]/plays/run/PlayRunClient.tsx)           | Fetch by-department with activity param; pass `emailsSentThisWeek` into ContactRow; add account total line above the contact list; extend Contact type / props for `emailsSentThisWeek`.                                         |


### UI copy (suggested)

- Per contact: **“Email sent this week”** or **“1 email this week”** (if count shown).
- Account: **“Account: X emails sent this week.”**
- “This week” = rolling last 7 days (UTC) unless we later add a calendar-week option.

---

## Order of work

1. Implement **Part 1** (limits module + enforce in send_email and play send-email API) so blocking works and errors are clear.
2. Implement **Part 2** (by-department activity + PlayRunClient contact list indicators and account total) so the user can see “email sent this week” per contact and the account total when choosing who to send content to.

No change to the “find signal → create play → create content” flow itself; that already exists. Part 2 only adds the indicators and account total to the existing contact list on the play run page.