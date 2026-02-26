---
name: "Company setup URLs choice"
overview: "Keep company basic information visible and give users a clear choice between full-website import and specific URLs by handling both paths on the same page and reusing the existing import-progress → review → success flow for both."
todos:
  - id: import-mode-state
    content: "Add importMode state ('full_website' | 'specific_urls' | null) for Step 2 display only"
  - id: specific-urls-button
    content: "Replace Add Specific URLs Link with Button that sets importMode = 'specific_urls'"
  - id: textarea-and-back
    content: "Show textarea when importMode === 'specific_urls' with Back button and URL count"
  - id: specific-urls-flow
    content: "Import these URLs: save → parse URLs → setStep(import-progress) → batch-scrape SSE → setStep(review) → reuse review/success"
  - id: navigate-with-save
    content: "Convert Upload Files / Enter Text to Buttons with handleNavigateToContentLibrary (error handling)"
isProject: false
---

# Company setup: full website vs specific URLs (revised)

## Problem

Clicking **"Add Specific URLs"** on company setup Step 2 navigates to `/dashboard/content-library` **before** Step 1 data is saved. Company basics are lost (and if user has no saved website, they get redirected back with empty form). Users need a clear choice: **full website** or **specific URLs**, with company info always visible.

## Architecture

- **importMode** (`'full_website' | 'specific_urls' | null`) is the **single source of truth for Step 2 choice only**. When `null`, show both options. It does not drive progress/review/success.
- **Existing `step` state** (`'form' | 'import-progress' | 'review' | 'success'`) continues to drive the rest of the flow for **both** paths. Optionally rename to `wizardPhase` in code for clarity to avoid confusion with “step 1/2/3” copy.
- **Specific URLs path** reuses the same **import-progress → review → success** flow as full website. Only the source of URLs differs (textarea vs crawled sitemap). Same progress screen, same review UI, same success screen.

## Key file

- [app/components/company-setup/CompanySetupWizard.tsx](app/components/company-setup/CompanySetupWizard.tsx) — all changes here; no backend changes.

## Build order

### 1. Add importMode state

- `importMode: 'full_website' | 'specific_urls' | null` (default `null`).
- Controls Step 2 display only: when `'specific_urls'`, show textarea + “Import these URLs” instead of the full-website CTA.

### 2. Replace “Add Specific URLs” Link with Button

- Button sets `importMode = 'specific_urls'` (stays on page).
- “Upload Files” and “Enter Text” stay as actions but become **Buttons** (see step 5).

### 3. Textarea when importMode === 'specific_urls'

- Textarea: “Paste URLs, one per line.”
- **Back** button sets `importMode = null`.
- **Import these URLs** button (primary).
- **URL count**: “X valid URLs (max 30)” as user types — parse on change, filter valid http(s) URLs, cap at 30.

### 4. Specific URLs flow — reuse full-website steps

On **“Import these URLs”**:

1. Validate Step 1 (same as today). If invalid, show message and return.
2. Save profile: `await onSaveProfile(data)`. On failure, show error and return.
3. Parse textarea → `validUrls[]` (split by newline, trim, filter valid URLs, slice(0, 30)).
4. `setStep('import-progress')` — **reuse existing import-progress UI**.
5. `POST /api/content-library/batch-scrape` with `{ urls: validUrls }`, consume SSE (same pattern as ContentLibraryActions): `started` → set progress, `page` → update progress. On `complete`, build a **review payload** in the same shape as smart-import results (e.g. `ImportResultItem[]`: url, title, description?, suggestedType, industry?, department?). Batch-scrape doesn’t return that shape today — it writes directly to DB. So either:
   - **Option A**: After SSE `complete`, refetch or build a minimal list from the URLs you sent (e.g. title = URL, suggestedType = 'ResourceLink') and call `setStep('review')` with that list so the same review screen renders; or
   - **Option B**: Have batch-scrape accept a `reviewMode: true` and return structured items in the stream instead of writing to DB, then approve step writes to DB. Option B is a backend change; prefer **Option A** for “no backend changes”: after `complete`, set `importResults` to a list derived from `validUrls` (e.g. `validUrls.map(url => ({ url, title: url, suggestedType: 'ResourceLink' }))`) and set `step('review')`. User can still “Approve & Continue” to run the existing approve API; that might no-op if batch-scrape already created rows, so need to align: either batch-scrape in “specific URLs” path does **not** write to DB and only returns data for review (backend change), or it writes to DB and we skip review and go straight to success.

Checking batch-scrape: it **writes** to ContentLibrary. So for “no backend changes,” after batch-scrape `complete` we have two options:

- **V1 (recommended)**: Skip review for specific-URLs path. After `complete`, set `step('success')` and `successStats({ created: event.saved })`. User sees the same success screen and can go to dashboard/content-library. No review step.
- **Full parity (review for specific URLs)**: Would require either (a) a backend change: batch-scrape supports `reviewMode: true` and streams back structured items without writing, then existing approve API writes; or (b) N× calls to the single-URL scrape with `reviewMode: true`, collect items, then show same review UI and approve. Document as v2 if we want review for specific URLs.

**Recommendation**: V1 = import-progress → success for specific URLs. Same success screen and CTAs. Optional v2 = add review step (backend or N× single-URL).

- **Import these URLs** flow (v1): save → parse URLs → `setStep('import-progress')` → POST batch-scrape, consume SSE → on `complete` set `step('success')` and `successStats({ created: saved })`.

### 5. Upload Files / Enter Text: save before navigate + error handling

- Replace **Upload Files** and **Enter Text** `Link`s with **Button**s.
- `handleNavigateToContentLibrary`:
  - If form invalid, still allow navigate (or block and show message — product decision; “allow navigate” avoids blocking users who want to upload first).
  - Else: `try { await onSaveProfile(data); } catch { setMessage({ type: 'error', text: 'Failed to save company info' }); return; }` then `router.push('/dashboard/content-library')`.
- Do **not** navigate if save fails; show error in existing message area.

### 6. (Optional) URL count display

- As user types in the textarea, parse lines, filter valid URLs, show “X valid URLs (max 30)” below the textarea. Disable “Import these URLs” when `validUrls.length === 0`.

---

## v2 note (not in scope)

- **URL picker**: For demos (e.g. “NVIDIA automotive + product sections only”), a better UX is: domain pre-filled from Step 1, suggested sections (/products, /solutions, /customers, /industries) as checkboxes, plus custom URL field. Textarea is acceptable for v1; document URL picker as v2.

---

## Summary

| Item | Action |
|------|--------|
| importMode | Add state; Step 2 display only; existing `step` unchanged for flow |
| Add Specific URLs | Button → set importMode; show textarea + Back |
| Import these URLs | Save → parse → import-progress → batch-scrape SSE → success (no review in v1) |
| Upload Files / Enter Text | Button + handleNavigateToContentLibrary with save + error handling |
| URL count | “X valid URLs (max 30)” under textarea |

All changes in `CompanySetupWizard.tsx`; no backend changes. Estimate: 2–3 hours.
