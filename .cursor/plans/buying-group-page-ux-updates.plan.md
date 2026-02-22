# Buying group page UX updates

All changes are UI-only; no backend or API changes.

---

## Verification (done)

- **Change 1 — _count.contacts:** The company page query in [page.tsx](app/dashboard/companies/[id]/page.tsx) uses `include: { _count: { select: { contacts: true, activities: true } }, ... }` (line 95), and the `departments` map spreads `...d`, so `dept._count.contacts` is present on each department passed to `DepartmentsTab`. Safe to gate "Start Expansion Play" on `dept._count.contacts > 0`.

- **Change 5 — Tab IDs:** Tab navigation uses **IDs only**. `initialTab` is set from `searchParams.tab` (e.g. `tab=contacts`, `tab=messaging`); [CompanyTabs](app/components/company/CompanyTabs.tsx) uses `TabId` and `setActiveTab(tab.id)`. No array indices; reordering the `TABS` array only changes display order.

- **Change 3 — hasDepartments:** `DepartmentsTab` receives `departments`; it does not receive a separate `hasDepartments` prop. Use `departments.length > 0` to show "Find & enrich all segments" only when there are departments. Link must be `/dashboard/companies/${companyId}/contacts` (contacts page), not discover-contacts.

---

## 1. Problem 1: "Start Expansion Play" — show only when contacts > 0

**File:** [app/components/company/DepartmentsTab.tsx](app/components/company/DepartmentsTab.tsx)

- Gate the "Start Expansion Play" button on `dept._count.contacts > 0` (data is present; see verification).
- Wrap that `Button`/`Link` in `{dept._count.contacts > 0 && ( ... )}`.
- Leave "Find contacts for this department", "View Details", and "View Contacts" as-is.

---

## 2. Problem 2: "Expansion Strategy Recommendation" → "Where to focus first"

**File:** [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx)

- **Rename:** Heading from "Expansion Strategy Recommendation" to **"Where to focus first"**.
- **Primary CTA:** Replace "Chat with AI about strategy" with **"Find contacts for Phase 1 segments"** → link to `/dashboard/companies/${companyId}/contacts` (optionally `?focus=phase1` for future use).
- **Secondary "Ask AI" link:** Add only if the chat route supports a pre-filled prompt. If added, use a **specific** prompt, e.g. "What's my best approach to Phase 1 at [company name]?" (pass `companyName` into the section), not a generic "how do I approach Phase 1". If there is no support for pre-filled prompts, do not add a link that opens chat with no context.

---

## 3. Problem 3: Remove sticky bar; add "Find & enrich all segments" on Buying Groups tab

**Files:** [app/dashboard/companies/[id]/page.tsx](app/dashboard/companies/[id]/page.tsx), [app/components/company/DepartmentsTab.tsx](app/components/company/DepartmentsTab.tsx)

- **Remove bar:** In `page.tsx`, remove the `nextStepBar={{ ... }}` prop from `CompanyTabs`. Leave the `NextStepBar` component in the codebase.
- **Batch CTA in DepartmentsTab:** Add **"Find & enrich all segments"** at the top of the Buying Groups content (e.g. in the header row with "Departments" / "Discover More").
  - **Condition:** Show only when `departments.length > 0` (no button when there are no departments).
  - **Link:** `/dashboard/companies/${companyId}/contacts` (contacts page), **not** discover-contacts.

---

## 4. Problem 4: "RESEARCH PHASE" badge → "X contacts" badge

**File:** [app/components/company/DepartmentsTab.tsx](app/components/company/DepartmentsTab.tsx)

- When `dept.status === DepartmentStatus.RESEARCH_PHASE`, render a neutral badge with **"{dept._count.contacts} contacts"** (e.g. "0 contacts") instead of "🔍 RESEARCH PHASE".
- For other statuses, keep the existing status badge. When contacts > 0 and status is still RESEARCH_PHASE, showing "3 contacts" is correct and more useful than a status label.

---

## 5. Problem 5: Tab order to match workflow

**File:** [app/components/company/CompanyTabs.tsx](app/components/company/CompanyTabs.tsx)

- Reorder the `TABS` array to:
  1. Buying Groups (departments)
  2. Contacts
  3. Messaging
  4. Content
  5. Sales Page (campaigns)
  6. Engagement
  7. Activity
  8. Overview
  9. Expansion
  10. Account Map (map)
- Tab IDs and `initialTab` / `?tab=` usage remain unchanged; only display order changes.

---

## Summary

| # | Change | File(s) |
|---|--------|--------|
| 1 | Show "Start Expansion Play" only when `dept._count.contacts > 0` | DepartmentsTab.tsx |
| 2 | Rename block to "Where to focus first"; primary CTA "Find contacts for Phase 1 segments" → contacts; optional "Ask AI" with company-specific prompt only if chat supports pre-fill | CompanyTabs.tsx |
| 3 | Remove `nextStepBar` from page.tsx; add "Find & enrich all segments" in DepartmentsTab when `departments.length > 0`, link to `/contacts` | page.tsx, DepartmentsTab.tsx |
| 4 | For RESEARCH_PHASE, show "X contacts" badge (neutral style) | DepartmentsTab.tsx |
| 5 | Reorder TABS to workflow order (Buying Groups → Contacts → Messaging → … → Account Map) | CompanyTabs.tsx |

**Unchanged:** Card structure (segment name, value prop, use case, estimated opportunity in green, target roles), "Find contacts for this department", "View Details", "View Contacts", and all existing data/APIs.
