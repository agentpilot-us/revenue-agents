# Content Library — Deployment & Readiness

Use this after deployment to verify the content library and health scoring behave correctly, and to fix “zero health” or wrong recommendation URLs.

---

## 1. Deploy the right code

The following must be deployed for health and extraction to work:

| Feature | Route / behavior | If not deployed |
|--------|------------------|-----------------|
| **Upload with extraction** | `POST /api/content-library/upload`: `handlePastedText` + `handleFileUpload` both call `enrichScrapedContent`, store `userConfirmed: false` and `content.extraction`. | Uploaded files show “Updated today” but **health stays 0** (no extraction). |
| **Batch scrape** | `POST /api/content-library/batch-scrape`: SSE progress, extraction per URL, health in `complete` event. | Full-site “Get Data” may still use old single scrape or no extraction. |
| **Single URL scrape** | `POST /api/content-library/scrape`: must call `enrichScrapedContent` and persist `content` including extraction. | Scraped pages show as Resource but **health dimensions stay 0**. |

Confirm the commit that includes batch-scrape and the new upload route is on the branch you deploy (e.g. `main`). If the old upload route is still deployed, all of the below will match “not deployed” behavior.

---

## 2. Why “Updated today” but health = 0?

Health score only counts items that have a **structured extraction** (`content.extraction`). Items without it contribute **nothing** to dimensions (value props, capabilities, case studies, etc.).

- **Old upload route:** Stored `UploadedDocument` with `userConfirmed: true` and no extraction (only `fullText`, `fileName`, `blobUrl`). Those rows will always show 0 impact until they are replaced or backfilled.
- **Old scrape path:** If scrape ever ran without `enrichScrapedContent`, or only returned review items and nothing was saved, DB rows may have no `content.extraction`.

**What to do:**

- **Uploads:** Re-upload the same files (or paste the same content) after the new upload route is deployed. New rows will have extraction and show up in health.
- **Scrapes:** Re-run “Get Data” for the site (batch scrape or single scrape with the deployed code) so new rows are created with extraction. Optionally archive or delete old rows that have no extraction.

---

## 3. Recommendation URLs point at staging

Health recommendations (e.g. “Crawl …/customers for case studies”) use a **product URL** derived from stored content. If the first row’s `sourceUrl` was from staging (e.g. `https://revenue-agents.vercel.app`), that origin is used and recommendations show staging links.

**Fix:** Set a canonical product origin so recommendations point at the real site.

- **Env:** `CONTENT_LIBRARY_PRODUCT_ORIGIN=https://www.agentpilot.us` (or your real product domain).
- **Behavior:** Health API and batch-scrape `complete` event use this origin for `productUrl` when set; otherwise they fall back to the first `sourceUrl` in the library.

After setting this and reloading the health panel, “Top recommendations” should suggest crawling the canonical domain (e.g. `https://www.agentpilot.us/customers`).

---

## 4. Case studies, use cases, events, frameworks empty

Health dimensions for **Case Studies**, **Use Cases**, and (where used) **Events** / **Frameworks** are populated only from content that:

- Has **extraction** (so the new upload and scrape paths must be in use), and  
- Is classified as the right type (e.g. `SuccessStory`, `UseCase`).

For a usable onboarding you typically want at least:

- **2+ case studies** (e.g. from `/customers` or `/case-studies`).
- **3+ use cases** (e.g. from `/use-cases` or solutions pages).

Until those pages are scraped (or equivalent content uploaded) and stored with extraction, those sections stay empty and buying-group generation will be limited.

---

## 5. Readiness checklist (honest verdict)

| Capability | Status | Notes |
|------------|--------|--------|
| Health scoring UI | ✅ | Working. |
| Single URL scrape | ⚠️ | Works only if deployed code runs `enrichScrapedContent` and saves extraction. |
| File upload with extraction | ❌ → ✅ | Not deployed = 0 health impact. Deploy new upload route and re-upload (or paste) to get extraction. |
| Batch scrape | ❌ → ✅ | Not deployed = no SSE, no batch extraction. Deploy and use “Get Data” (site) for multi-URL scrape. |
| Case studies | ❌ | Empty until you scrape/upload customer success content (2+ recommended). |
| Use cases | ❌ | Empty until you scrape/upload use-case/solutions content (3+ recommended). |
| Buying group generation | ❌ | Blocked by case studies, use cases, and value props; improve content library first. |

---

## 6. Quick verification after deploy

1. **Upload:** Upload a small PDF or DOCX (or paste 100+ chars). Confirm the item appears in the review list with extraction and “Looks good” flow; after confirm, health dimensions (e.g. value props, capabilities) should increase if extraction is present.
2. **Scrape:** Run “Get Data” for one URL (or batch for a few). Confirm items are saved with extraction and health dimensions move off zero where the content supports it.
3. **Recommendations:** Set `CONTENT_LIBRARY_PRODUCT_ORIGIN` to the real product domain; reload health and confirm recommendation links use that domain, not staging.
4. **Case studies / use cases:** Add content from `/customers`, `/use-cases`, or equivalent, then re-check health and buying-group readiness.
