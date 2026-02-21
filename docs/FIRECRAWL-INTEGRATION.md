# Firecrawl Integration: Scrape, Parse, Store, and Downstream Use

This doc describes the Firecrawl integration: where it’s called, what options are passed, how raw scraped content is parsed (prompts and schemas), how results are stored, and how that content is used for landing pages, chat, and outreach.

---

## 1. Firecrawl integration code and scrape config

### 1.1 Core client (`lib/tools/firecrawl.ts`)

- **Base:** `https://api.firecrawl.dev/v2`
- **Auth:** `Authorization: Bearer ${FIRECRAWL_API_KEY}`

**Scrape (single URL):**

```ts
scrapeUrl(params: ScrapeUrlParams) → POST /v2/scrape
```

| Option | Default | Description |
|--------|---------|-------------|
| `url` | required | Page URL to scrape |
| `formats` | `['markdown']` | `['markdown']` or `['html']`; sent as `[{ type: 'markdown' }]` |
| `onlyMainContent` | `true` | Firecrawl main-content extraction |

**Map (discover links / sitemap):**

```ts
mapUrl(params: MapParams) → POST /v2/map
```

| Option | Default | Description |
|--------|---------|-------------|
| `url` | required | Site URL |
| `limit` | 500 | Max links |
| `search` | optional | Filter |
| `sitemap` | optional | `'skip' \| 'include' \| 'only'` |

**Crawl (multi-page):**

```ts
startCrawl(params: CrawlParams) → POST /v2/crawl
getCrawlStatus(crawlId) → GET /v2/crawl/:crawlId (follows next for pagination)
```

| Option | Default | Description |
|--------|---------|-------------|
| `url` | required | Start URL |
| `limit` | 100 | Max pages |
| `includePaths` | optional | Path allowlist |
| `excludePaths` | optional | Path blocklist |
| `scrapeOptions.formats` | `['markdown']` | Same as scrape |
| `scrapeOptions.onlyMainContent` | `true` | Same as scrape |
| `webhook` | optional | `{ url, events?, metadata? }` |

**Extract (scrape + schema extraction):**

```ts
extract(params: ExtractParams) → POST /v2/extract
```

| Option | Description |
|--------|-------------|
| `urls` | Array of URLs |
| `schema` | JSON schema for extraction |
| `prompt` | Optional instruction |
| `scrapeOptions` | Same as scrape |

**Search:**

```ts
search(params: SearchParams) → POST /v2/search
```

| Option | Default | Description |
|--------|---------|-------------|
| `query` | required | Search query |
| `limit` | 10 | Max results |
| `scrape` | optional | If true, request markdown per result |
| `country` | optional | Geo |

---

### 1.2 Where Firecrawl is called

| Entrypoint | What runs | Scrape/crawl options |
|------------|-----------|----------------------|
| **POST `/api/content-library/scrape`** | Single URL or list; or `sourceUrl` + `mode: 'full'` (map then scrape each link). For each URL: `scrapeUrl({ url, formats: ['markdown'], onlyMainContent: true })`. | `formats: ['markdown']`, `onlyMainContent: true` |
| **POST `/api/content-library/firecrawl/use-cases`** | `importUseCasesFromUrl(url)` → `scrapeUrl({ url, formats: ['markdown'], onlyMainContent: true })` then AI extraction. | Same as above |
| **POST `/api/content-library/firecrawl/case-studies`** | `startCaseStudiesCrawl` or `crawlAndParseCaseStudies`. Crawl: `startCrawl({ url, limit, includePaths, scrapeOptions: { formats: ['markdown'], onlyMainContent: true }, webhook? })`. | `limit` 50–100, `includePaths` default `['/customers', '/case-studies', '/customer-stories', '/success-stories']` |
| **POST `/api/content-library/firecrawl/process-crawl`** | `getCrawlStatus(crawlId)` then `parseCaseStudiesFromCrawlPages(status.data)`. No new scrape; processes existing crawl result. | N/A |
| **POST `/api/content-library/webhooks/firecrawl`** | On `crawl.completed`: same as process-crawl (get status, parse, save). | N/A |
| **POST `/api/content-library/firecrawl/frameworks`** | `extractFrameworksFromUrls(urls)` → `extract({ urls, schema, prompt, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } })`. | Uses Firecrawl Extract API with custom schema |
| **POST `/api/content-library/firecrawl/events-search`** | `searchEventsForContentLibrary` → `search({ query, limit, scrape: true })` then per-result AI extraction. | Search + optional scrape per result |

---

## 2. AI parsing step (raw scraped content → structured output)

### 2.1 Generic scrape flow (`/api/content-library/scrape`)

- **Input:** Markdown from `scrapeUrl` (and optional `contentPayload.markdown` in approve flow).
- **Classifier:** `categorizePage(url, markdown)` in `lib/content-library/import-pipeline.ts`.

**Prompt (summary):**

- System: You are a content classifier. Given a web page URL and excerpt, output exactly:
  - `title`: short page title (from content or URL)
  - `description`: one-line description (max 200 chars)
  - `suggestedType`: one of **Product, CaseStudy, Event, SolutionPage, IndustryPlaybook, Pricing, Other**
  - `industry`: optional industry tag
  - `department`: optional department/segment
- URL pattern hints: e.g. `/case-studies/` → CaseStudy, `/events/` → Event, `/products/` → Product, `/use-cases/` → SolutionPage, `/frameworks/` → IndustryPlaybook, `/pricing/` → Pricing.
- User prompt: `URL: ${url}\n\nExcerpt:\n${excerpt}\n\nOutput JSON:`

**Output:** Free-form JSON parsed manually; `suggestedType` mapped to `ContentType` via `suggestedTypeToContentType()` (e.g. CaseStudy → SuccessStory, Event → CompanyEvent, Product → FeatureRelease, SolutionPage → UseCase, IndustryPlaybook → Framework, Pricing/Other → ResourceLink).

**Stored payload (scrape path):** `content = { markdown: slice(0, 100_000), description, suggestedType }`. Approve flow uses `contentPayload` from review items (same shape; may include `markdown`).

---

### 2.2 Use cases (`firecrawl-workflows.ts` → `importUseCasesFromUrl`)

- **Input:** Markdown from `scrapeUrl` (first 30k chars).
- **Model:** `generateObject` with Zod schema.

**Schema:** `useCasesExtractionSchema`:

- `useCases[]`: `{ name, description, benefits?, targetDepartment?, industry? }`

**Prompt:**

- System: Extract industry-specific use cases from a company's use-case or solutions page. Each use case: name, description, optional benefits, targetDepartment, industry. Return all use cases you can find.
- User: `Extract all use cases from this page:\n\n${markdown}`

**Output:** One Content Library item per use case: `type: 'UseCase'`, `content: { name, description, benefits, targetDepartment }`, `industry`, `department`, `sourceUrl`.

---

### 2.3 Case studies (`firecrawl-workflows.ts` → `parseCaseStudiesFromCrawlPages`)

- **Input:** Per-page markdown from crawl result (each page up to 15k chars).
- **Model:** `generateObject` with Zod schema.

**Schema:** `caseStudyExtractionSchema`:

- `caseStudies[]`: `{ company, title, challenge?, solution?, results?, industry?, useCase? }`

**Prompt:**

- System: Extract customer success stories / case studies. Return company, title, challenge, solution, results, industry, use case. If multiple stories on page return all; if single story return one.
- User: raw page text.

**Output:** For each case study, `SuccessStoryForLibrary`: `type: 'SuccessStory'`, `content: { headline, oneLiner, fullSummary, company, useCase, challenge, solution, results }`, `industry`, `company`, `sourceUrl`.

---

### 2.4 Frameworks (`firecrawl-workflows.ts` → `extractFrameworksFromUrls`)

- **Input:** Firecrawl **Extract** API: scrapes `urls` and returns structured data per `schema` (no local LLM for extraction).
- **Schema (JSON):** `frameworkExtractSchema`:

```json
{
  "type": "object",
  "properties": {
    "frameworks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "framework_name": { "type": "string" },
          "use_case": { "type": "string" },
          "stages": { "type": "array", "items": { "type": "string" } },
          "talking_points": { "type": "array", "items": { "type": "string" } },
          "value_props": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

**Prompt (sent to Firecrawl):** Extract sales frameworks and messaging guides. For each framework: framework_name, use_case, stages (e.g. MEDDIC), talking_points, value_props.

**Output:** One Content Library item per framework: `type: 'Framework'`, `content: { framework_name, use_case, stages, talking_points, value_props }`, `sourceUrl`.

---

### 2.5 Events (`firecrawl-workflows.ts` → `searchEventsForContentLibrary`)

- **Input:** Per-search-result `markdown` or title+description (up to 12k chars per result).
- **Model:** `generateObject` with Zod schema.

**Schema:** `eventsExtractionSchema`:

- `events[]`: `{ title, description?, date?, url?, eventType? }`

**Prompt:**

- System: Extract event/session information (conferences, webinars, sessions). Include title (required), description, date, url, eventType.
- User: `Extract all events from this content. Source: ${eventSourceName}\n\n${text}`

**Output:** One item per event: `type: 'CompanyEvent'`, `content: { eventDate, eventType, description, registrationUrl, targetAudience, topics, primaryTopic, eventSource }`, `sourceUrl`, `persona`.

---

## 3. Data model: how extracted content is stored

### 3.1 Content Library (Prisma)

**Model: `ContentLibrary`** (`prisma/schema.prisma`)

| Field | Type | Notes |
|-------|------|--------|
| `id` | String (cuid) | PK |
| `userId` | String | Owner |
| `productId` | String? | Optional product link (null for content-first) |
| `title` | String | Display title |
| `type` | ContentType | UseCase, SuccessStory, CompanyEvent, Framework, FeatureRelease, ResourceLink, UploadedDocument, etc. |
| `content` | Json | Type-specific payload (use case fields, case study fields, event fields, etc.) |
| `persona` | String? | |
| `department` | String? | Segment/department tag |
| `industry` | String? | Industry tag |
| `company` | String? | e.g. customer name for case studies |
| `inferredTags` | Json? | |
| `userConfirmed` | Boolean | Default false; true when saved from scrape/import |
| `confidenceScore` | String? | |
| `sourceUrl` | String? | Original page URL |
| `scrapedAt` | DateTime? | When scraped |
| `contentHash` | String? | For change detection |
| `previousContent` | Json? | Previous version (diffs) |
| `version` | String? | e.g. "1.0" |
| `archivedAt` | DateTime? | Soft delete / archive |
| `isPinned` | Boolean | |
| `isActive` | Boolean | Default true |
| `createdAt` / `updatedAt` | DateTime | |

**RAG (vector search):** `ContentLibraryChunk`

- `contentLibraryId`, `chunkIndex`, `content` (text), `embedding` (vector(1536)).
- Chunks are created when content is saved (e.g. `ingestContentLibraryChunks(contentLibraryId, markdown)` in scrape and approve flows).

**Schedules:** `ContentLibrarySchedule` (per-item refresh), `ContentCrawlSchedule` (Firecrawl crawl schedule by product + contentType + url).

### 3.2 Where create/update happens

- **Scrape (direct):** `prisma.contentLibrary.create` with `content = contentPayload`, `type = suggestedTypeToContentType(categorized.suggestedType)`, then `ingestContentLibraryChunks(row.id, contentPayload.markdown)`.
- **Scrape approve:** Same create + RAG ingest using `contentPayload` (and `markdown` if present) from review items.
- **Use cases:** For each item from `importUseCasesFromUrl`: `contentLibrary.findFirst` by userId, productId, type UseCase, title, sourceUrl → update or create.
- **Case studies (crawl):** For each item from `parseCaseStudiesFromCrawlPages`: find by userId, productId, type SuccessStory, title, company → update or create. Same in process-crawl and webhook.
- **Frameworks:** Caller (e.g. frameworks route) creates ContentLibrary rows from `extractFrameworksFromUrls` items.
- **Events:** Caller creates from `searchEventsForContentLibrary` items.

---

## 4. How content is retrieved and used downstream

### 4.1 Landing pages (segment/campaign drafts)

**API:** `POST /api/companies/[companyId]/campaigns/generate-draft`

- **Research:** `getCompanyResearchPromptBlock(companyId, userId)` (saved account research).
- **Account messaging:** `getAccountMessagingPromptBlock(companyId, userId)` (uses Content Library refs in AccountMessaging: useCases, successStories).
- **Industry playbook:** `getIndustryPlaybookBlock(userId, company.industry)` (IndustryPlaybook model, not ContentLibrary).
- **RAG:** `findRelevantContentLibraryChunks(userId, ragQuery, 8)` with query like `landing page value prop for ${company.name} ${segmentNames}`. Chunks come from **ContentLibraryChunk** (any type that was chunked: e.g. scrape/approve with markdown).
- **Output:** Drafts with `headline`, `body`, `pageSections` (events, caseStudy, successStory). Events/case studies are resolved from context built from the above (research, account messaging, RAG, playbook).

So: **scraped/imported content** reaches landing page generation via **RAG chunks** and, indirectly, via **account messaging** (which references Content Library use cases/success stories) and **research/playbook** context.

---

### 4.2 Chat

**API:** `POST /api/chat` (main expansion chat)

- **Content Library (product messaging):** `prisma.contentLibrary.findMany` by userId, filters (industry/department/company), ordered; formatted as “PRODUCT MESSAGING (Content Library)”.
- **Product knowledge:** `getProductKnowledgeBlock(userId, relevantProductIds)` (ProductProfile + linked case studies from ContentLibrary).
- **Industry playbook:** `getIndustryPlaybookBlock(userId, company?.industry)`.
- **Case studies:** `getCaseStudiesBlock(userId, industry, department, productIds)` → `contentLibrary.findMany` type SuccessStory, filtered by industry/department.
- **Company events:** `getCompanyEventsBlock(...)` → ContentLibrary type CompanyEvent.
- **Feature releases:** `getFeatureReleasesBlock(...)` → ContentLibrary type FeatureRelease.
- **Content Library products list:** `getContentLibraryProductsBlock(userId)` → Product model (name/description/category).
- **RAG:** `findRelevantContentLibraryChunks(userId, ragQuery, 8)` from last user message (or default “value proposition and outreach”), formatted as “Company content (relevant)”.

So: **all stored Content Library types** (use cases, case studies, events, frameworks, feature releases, and RAG chunks from scraped markdown) are used in chat via the above blocks and RAG.

---

### 4.3 Outreach (content generation and follow-up)

**APIs:**

- **POST `/api/companies/[companyId]/content/generate`** (email/LinkedIn/talk track/custom URL)
  - Uses: `getCompanyResearchPromptBlock`, `getAccountMessagingPromptBlock`, `getProductKnowledgeBlock`, `getIndustryPlaybookBlock`, `getCaseStudiesBlock`, and **RAG** `findRelevantContentLibraryChunks(userId, ragQuery, 8)` with query like `value proposition for ${company.name} ${industry} for ${contentType}`.
  - So: **Content Library** is used via case studies block, product knowledge (linked case studies), industry playbook, and RAG.

- **POST `/api/draft-follow-up/route.ts`** (follow-up drafts)
  - Uses: `getCompanyResearchPromptBlock`, `getAccountMessagingPromptBlock`, `getIndustryPlaybookBlock`, and RAG. Same idea: **Content Library** via account messaging refs and RAG chunks.

**Account messaging (reference to Content Library):**

- `getAccountMessagingPromptBlock` loads AccountMessaging and, for each use case/success story, resolves `contentLibraryId` via `prisma.contentLibrary.findMany` and injects titles and content into the prompt. So **use cases and success stories** (including those from Firecrawl use-case and case-study flows) are used in outreach and follow-up.

---

## 5. End-to-end summary

| Stage | Use cases | Case studies | Frameworks | Events | Generic scrape |
|-------|-----------|--------------|------------|--------|----------------|
| **Firecrawl** | Scrape 1 URL | Crawl many URLs (or search) | Extract with schema | Search + scrape | Scrape or map+scrape |
| **Options** | markdown, onlyMainContent: true | limit, includePaths, webhook | schema + prompt | query, limit, scrape | same + reviewMode |
| **AI parse** | generateObject (useCases[]) | generateObject (caseStudies[]) per page | Firecrawl extract (frameworks[]) | generateObject (events[]) per result | categorizePage (title, suggestedType, …) |
| **Stored in** | ContentLibrary (UseCase) | ContentLibrary (SuccessStory) | ContentLibrary (Framework) | ContentLibrary (CompanyEvent) | ContentLibrary (type from suggestedType) + RAG chunks |
| **Landing pages** | Via RAG + account messaging refs | Via RAG + account messaging refs | Via RAG | Via events block + RAG | Via RAG (chunks) |
| **Chat** | Content Library section + RAG | getCaseStudiesBlock + RAG | RAG / content section | getCompanyEventsBlock | RAG (chunks) |
| **Outreach** | Account messaging + RAG | Case studies block + account messaging + RAG | RAG | Events in context | RAG (chunks) |

RAG chunks are built from **markdown** stored in `content` (e.g. generic scrape/approve). So any Firecrawl flow that ends up saving markdown (or full text) and calling `ingestContentLibraryChunks` feeds **landing pages**, **chat**, and **outreach** via semantic search over `ContentLibraryChunk`.
