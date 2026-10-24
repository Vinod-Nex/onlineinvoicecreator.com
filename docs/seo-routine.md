# SEO Routine, Monitoring Cadence & Content Lifecycle Governance

**Domain:** `https://onlineinvoicecreator.com`  
**Document:** `docs/seo-routine.md`  
**Purpose:** Operational operating manual for weekly Search Console triage, monthly content refreshes, quarterly technical audits, keyword rank tracking, and content lifecycle governance (add/merge/delete rules).  
**Companion Automation Script:** `scripts/export-gsc-queries.mjs` (`npm run gsc:export`)  
**Data Export Output:** `docs/gsc-queries-export.csv`  

---

## 1. Operating Cadence Dashboard

Consistent organic search growth requires disciplined, rhythmic monitoring rather than sporadic overhauls. We execute on three distinct operational loops:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            WEEKLY LOOP (30 Minutes)                          │
│  • Export GSC data (`npm run gsc:export`)                                    │
│  • Triage "Striking Distance" queries (Pos 8.0–30.0)                         │
│  • Review Low CTR pages (< 3.0% CTR in top 10) & test Title Variant B        │
│  • Audit GSC Indexing & Coverage report (5xx, 404s, soft 404s, unindexed)   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            MONTHLY LOOP (2 Hours)                            │
│  • Legal & statutory regulation updates (ATO, HMRC, IRS, GST)                │
│  • Content refresh timestamps (`lastReviewedDate` & Schema `dateModified`)   │
│  • FAQ expansion from real long-tail GSC search queries                      │
│  • Conclude 28-day Title & Meta snippet A/B tests                            │
│  • Push updated URLs via IndexNow (`npm run indexnow`)                       │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           QUARTERLY LOOP (Half Day)                          │
│  • Full automated crawler audit (`npm run audit:crawl`)                      │
│  • Metadata & Schema.org validation (`npm run audit:seo`)                    │
│  • Core Web Vitals & performance budget audit (`npm run audit:cwv`)          │
│  • Keyword cannibalization & content lifecycle review (Add / Merge / Delete) │
│  • Security headers, redirects & sitemap health check                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Weekly Search Console Checks (30-Minute Sprint)

Run the automated GSC query export every Monday morning:
```bash
npm run gsc:export
```
This generates `docs/gsc-queries-export.csv`, tagging every search query with its strategic opportunity profile.

---

### Check 1: "Striking Distance" Queries (Position 8.0 to 30.0)

**Why It Matters:**  
Google already views the page as topically relevant for these queries, but it is languishing on page 2 or bottom of page 1. Moving a keyword from position 15 to position 3 typically yields a **10x to 15x increase in organic click volume**.

**Identification:**
- In `docs/gsc-queries-export.csv`, filter by `Opportunity_Tag = STRIKING_DISTANCE`.
- In Google Search Console: **Performance** &rarr; **Search results** &rarr; Filter **Position between 8.0 and 30.0** &rarr; Sort by **Impressions** descending.

**Weekly Execution Playbook (Pick Top 3 Queries Each Week):**
1. **Exact-Match Heading Inclusion**: If a query has $\ge 300$ monthly impressions (e.g., *"invoice maker without watermark"* or *"ato compliant tax invoice generator"*), ensure this exact phrase or a close variant appears in an `<h2>` or `<h3>` on the target landing page.
2. **Featured Snippet Direct Answer**: Add a 40–60 word answer directly below the heading answering the query factually to compete for Position 0 featured snippets.
3. **FAQ Expansion**: Add the query as a new question in the page's FAQ accordion (`src/data/pages/*.json`).
4. **Internal Link Equity Injection**: Identify 2 relevant existing blog articles or spoke pages and add an inline contextual link pointing to the landing page using descriptive partial-match anchor text.

---

### Check 2: High Impression, Low CTR Pages (Snippet Underperformers)

**Why It Matters:**  
If a page ranks in positions 1–7 but receives a click-through rate substantially below organic industry benchmarks, it indicates that the search snippet (title tag and meta description) is failing to attract the user's click or is mismatched with search intent.

**Organic Benchmark CTR Curve:**
- **Position 1**: 28.0% – 35.0% CTR
- **Position 2**: 15.0% – 18.0% CTR
- **Position 3**: 10.0% – 12.0% CTR
- **Position 4–6**: 5.0% – 8.0% CTR
- **Position 7–10**: 2.0% – 3.5% CTR

**Identification:**
- In `docs/gsc-queries-export.csv`, filter by `Opportunity_Tag = LOW_CTR_OPPORTUNITY` (Impressions $\ge 100$, CTR $< 3.0\%$, Position $\le 10.0$).
- In GSC: Filter **Position < 10**, sort by **Impressions** descending, and flag queries with CTR $< 3\%$.

**Weekly Execution Playbook:**
1. Consult `docs/title-testing-matrix.md`.
2. Swap the current page title and description for **Variant B**.
   - *Example*: Swap standard descriptive title *"Contractor Invoice Template - Free PDF Generator"* for the high-intent Variant B: *"Free Contractor Invoice Template (Printable PDF & Excel)"*.
3. Highlight core differentiators in the meta description:
   - Emphasize **"100% Free"**, **"No Watermark"**, **"No Signup Required"**, and **"Instant Vector PDF"**.
4. Log the test date and starting CTR in `docs/title-testing-matrix.md` to evaluate after 28 days.

---

### Check 3: GSC Indexing & Coverage Triage

Open Google Search Console &rarr; **Indexing** &rarr; **Pages** & verify that all 14 master URLs and active blog articles remain indexed without errors.

| GSC Status Category | Severity | Root Cause | Immediate Action |
| :--- | :---: | :--- | :--- |
| **Server error (5xx)** | 🔴 Critical | Cloudflare Worker timeout, origin failure, or edge DNS error. | Inspect Cloudflare Worker logs (`wrangler tail`). Verify origin static cache responds with HTTP 200. |
| **Not found (404)** | 🟠 High | Broken external link, mistyped URL, or deleted legacy page. | Check if URL has incoming traffic. Add a 301 redirect in `public/_redirects` to the closest canonical spoke or pillar. |
| **Soft 404** | 🟠 High | Empty content, missing template data, or template returned blank state. | Inspect the live page. Ensure it renders $\ge 300$ words of helpful content and valid document schema. |
| **Excluded by 'noindex' tag** | 🟡 Medium | Erroneous `<meta name="robots" content="noindex">` on an indexable page. | Verify only `/404.html` and utility endpoints carry `noindex`. Remove `noindex` from `src/data/pages/*.json`. |
| **Crawled - currently not indexed** | 🟡 Medium | Google crawled the URL but determined it lacks sufficient topical authority or link signals. | Check internal link depth. Build 2–3 incoming contextual links from high-authority pages (homepage or Pillar 2). Submit URL via IndexNow. |
| **Discovered - currently not indexed** | 🟡 Medium | Google queued the URL for crawling but hasn't crawled yet due to crawl budget. | Trigger manual URL Inspection in GSC and click **"Request Indexing"**. Ensure URL is in `sitemap-index.xml`. |
| **Duplicate without user-selected canonical** | 🟡 Medium | URL served with trailing slash (`/page/`) vs without (`/page`). | Verify `trailingSlash: 'never'` in `astro.config.mjs` and confirm `public/_redirects` forces 301 redirects to no-slash. |

---

## 3. Monthly Content Refresh Rules (First Week of Month)

Search engines heavily reward pages that demonstrate ongoing editorial maintenance and legal accuracy. The monthly loop prevents content decay:

### Rule 1: Legal & Tax Regulation Audit
Review official statutory authorities for changes in tax rates, invoice mandates, or electronic billing requirements:
- **Australia**: ATO tax invoice rules (ABN thresholds, GST 10%, electronic invoicing standards).
- **United Kingdom**: HMRC VAT invoice requirements, Making Tax Digital (MTD) rules.
- **United States**: IRS 1099 contractor reporting limits, sales tax thresholds.
- **India**: GST e-invoicing limits, CGST/SGST/IGST breakdown rules.
- **European Union**: EU VAT Directive 2006/112/EC invoicing regulations.

### Rule 2: Editorial Review Timestamps & E-E-A-T
When a page is reviewed or updated:
1. Update `lastReviewedDate="[Current Month Year]"` on the visible `<EditorialNote />` component.
2. Update the `dateModified` field in the page's JSON-LD Schema graph (`src/lib/schema.ts` / page data).
3. Update visible changelog notes on [/changelog](https://onlineinvoicecreator.com/changelog) if features or tax fields were modified.

### Rule 3: External Statutory Citation Validation
Verify that all external citations to official government tax portals (ATO, HMRC, IRS) return HTTP 200 and haven't relocated to new URLs. If an agency relocated their guidance, update the link and anchor text immediately.

### Rule 4: FAQ Expansion from GSC Search Terms
Review the month's search queries in `docs/gsc-queries-export.csv`. Identify 1–2 real questions asked by searchers that aren't addressed on the page. Add them into the page's `faq.items` array.

### Rule 5: Conclude Title & Snippet A/B Tests
Review the 28-day performance of any Variant B titles deployed during the previous month:
- **Win Criterion**: CTR increased by $\ge 15\%$ without a drop in average position.
  - *Action*: Adopt Variant B as the permanent canonical title.
- **Loss / Inconclusive**: CTR decreased or average position fell.
  - *Action*: Revert to Variant A or iterate with a new benefit-driven title.

### Rule 6: IndexNow Submission
Run the fast-indexing submission script to notify Bing, Yandex, and participating search engines of updated content:
```bash
npm run indexnow
```

---

## 4. Quarterly Technical Audit Playbook

Every quarter (Q1: January, Q2: April, Q3: July, Q4: October), run a complete technical health audit:

### Step 1: Automated Crawler & Integrity Audit
Execute the automated technical crawler to verify zero broken links, zero redirect chains, and zero payload budget overruns:
```bash
npm run audit:crawl
```
**Acceptance Threshold:** 0 broken links, 0 redirect loops, 0 uncompressed images, 0 mixed-content requests.

### Step 2: Metadata & Schema Compliance
Run the build-time SEO auditor across all generated HTML in `dist/`:
```bash
npm run audit:seo
```
**Acceptance Threshold:** 
- Title length $\le 60$ characters on all pages.
- Meta description length $\le 155$ characters.
- Single `<h1>` per page containing primary target keyword.
- Schema.org JSON-LD contains valid `WebApplication`, `BreadcrumbList`, and `FAQPage` entities.

### Step 3: Core Web Vitals Budget Audit
Audit mobile Core Web Vitals across all 5 key templates:
```bash
npm run audit:cwv
```
**Performance Budgets:**
- **Largest Contentful Paint (LCP)**: $\le 2.0\text{s}$ (Target: $< 1.0\text{s}$)
- **Cumulative Layout Shift (CLS)**: $\le 0.05$ (Target: $0.00$)
- **Total Blocking Time (TBT)**: $\le 150\text{ms}$
- **Lighthouse Performance Score**: $\ge 90/100$

### Step 4: Schema.org & Rich Results Validation
Test key URLs in [Google's Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/):
- Verify zero warnings or errors on `FAQPage` schema.
- Verify `WebApplication` schema renders price `0` and currency `USD`.
- Verify `BreadcrumbList` hierarchy resolves cleanly.

### Step 5: Security & HTTP Headers Review
Inspect `public/_headers` to ensure modern security postures:
- `Content-Security-Policy`: Scripts, styles, and beacons allowed without wildcard leaks.
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 5. Master Keyword Tracking Sheet

Use this master table to monitor organic ranking trajectories, click volume, and target thresholds across all core site assets:

| # | Target URL Path | Primary Target Keyword | Search Intent | Est. Monthly Vol | Baseline Rank | Current Rank | Target Pos | 28d Impr | 28d CTR | Status / Next Tactical Action |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `/` | `invoice generator` | Transactional | 500,000 | 24.5 | 4.2 | 1–3 | 8,900 | 4.7% | Top performer; defend ranking & monitor top 3 competitors |
| **2** | `/free-online-receipt-generator` | `receipt generator` | Transactional | 100,000 | 18.2 | 3.5 | 1–3 | 3,800 | 5.2% | Strong ranking; expand itemized tax receipt walkthrough |
| **3** | `/free-rent-receipt-generator` | `rent receipt generator` | Transactional | 40,000 | 14.1 | 3.2 | 1–3 | 2,600 | 5.0% | Top 3; test Variant B title for higher mobile CTR |
| **4** | `/invoice-generator-for-freelancers` | `invoice generator for freelancers`| Transactional | 25,000 | 16.0 | 3.8 | 1–3 | 2,800 | 5.2% | Stable; add internal links from freelance blog guide |
| **5** | `/invoice-generator-excel` | `invoice generator excel` | Transactional | 18,000 | 22.4 | 7.8 | 3–5 | 3,400 | 1.9% | Low CTR; test Variant B title highlighting "Excel & PDF" |
| **6** | `/receipt-maker-with-items` | `receipt maker with items` | Transactional | 12,000 | 19.8 | 4.9 | 1–3 | 1,950 | 4.2% | Approaching top 3; add barcode/receipt footer FAQ |
| **7** | `/tax-invoice-template-australia` | `tax invoice template australia` | Transactional | 15,000 | 12.0 | 2.9 | 1–2 | 2,100 | 7.6% | Dominant rank; keep ATO references updated quarterly |
| **8** | `/contractor-invoice-template` | `contractor invoice template` | Transactional | 20,000 | 19.5 | 6.4 | 1–3 | 2,900 | 3.8% | Striking distance for "subcontractor invoice template" |
| **9** | `/photography-invoice-generator` | `photography invoice generator` | Transactional | 5,000 | 15.2 | 4.1 | 1–3 | 890 | 5.1% | Steady; target wedding and commercial photography queries |
| **10**| `/blog/how-to-write-an-invoice-for-freelance-work` | `how to write an invoice for freelance work` | Informational | 8,000 | 28.0 | 8.4 | 1–5 | 1,850 | 2.9% | Striking distance; add downloadable sample checklist |
| **11**| `/blog/how-to-number-invoices` | `how to number invoices` | Informational | 6,500 | 24.0 | 7.1 | 1–3 | 2,100 | 3.2% | High potential; embed invoice number generator widget |
| **12**| `/blog/invoice-vs-receipt` | `invoice vs receipt` | Informational | 14,000 | 31.0 | 9.2 | 1–5 | 1,620 | 2.5% | Striking distance; strengthen visual comparison infographic |
| **13**| `/blog/what-is-a-pro-forma-invoice` | `what is a pro forma invoice` | Informational | 9,500 | 26.0 | 10.1 | 1–5 | 1,480 | 2.5% | Striking distance; add international customs example |
| **14**| `/blog` | `invoicing guides & billing tips` | Informational | 3,000 | 35.0 | 15.2 | 5–10 | 620 | 1.8% | Content hub; add category filter links and latest guides |

---

## 6. Content Lifecycle Governance: When to Add, Merge, or Delete a Page

To prevent topical bloat, keyword cannibalization, and crawl waste, every URL change must strictly adhere to the following governance rules:

```
                            New Opportunity Evaluated
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        Distinct Search Intent?                   Existing Page Covers It?
                    │                                       │
           ┌────────┴────────┐                              ▼
          YES                NO                   Update Existing Page
           │                 │                   (Add Section / H2 / FAQ)
           ▼                 ▼
   Search Demand $\ge$ 500?   Do Not Create
           │
           ▼
     CREATE NEW PAGE
 (Spoke or Blog Guide)
```

---

### Rule 1: When to ADD a Page

A new page should **only** be added when all four criteria are met:
1. **Distinct Search Intent**: The query cannot be adequately answered by an existing page without creating intent confusion.
   - *Example*: "UK VAT Invoice Template" has unique statutory VAT rules (HMRC) that warrant a dedicated regional spoke, distinct from the generic invoice generator.
2. **Search Demand Threshold**: The topic has demonstrable search demand ($\ge 500$ monthly searches across the keyword cluster or $\ge 1,000$ impressions in GSC striking distance reports).
3. **Dedicated Functional or Statutory Utility**: The page requires distinct calculations, unique form fields (e.g. VAT registration numbers, CIS deductions), or a specialized downloadable format.
4. **Clean Cluster Integration**: The new page must cleanly nest under Pillar 1 (Invoicing) or Pillar 2 (Receipts), with at least 3 incoming internal links planned before publishing.

---

### Rule 2: When to MERGE a Page (Consolidation & 301 Redirect)

Pages must be merged when keyword cannibalization or thin utility is identified:

**Cannibalization Triggers:**
- Two or more URLs rank on page 2 or 3 for the same cluster of search terms.
- GSC shows Google constantly alternating between two URLs for the same query.
- Neither page can achieve top-5 rankings because organic signals and internal links are split.

**Standard Merge Protocol:**
1. **Identify the Winner**: Choose the URL with higher historical impressions, stronger backlink profile, or broader thematic authority.
2. **Synthesize Content**: Port over any unique sections, FAQs, code examples, or how-to steps from the secondary page into the primary page.
3. **Execute Permanent 301 Redirect**: Add the 301 redirect rule to `public/_redirects`:
   ```text
   /legacy-spoke-slug  /primary-spoke-slug  301
   ```
4. **Remove Source File**: Delete the redundant Astro page from `src/pages/` to prevent duplicate static build outputs.
5. **Update Internal Links**: Grep the codebase for all references to `/legacy-spoke-slug` and update them to `/primary-spoke-slug`.
6. **Update Sitemap & Keyword Map**: Remove the old route from `src/data/keyword-map.json` and verify `sitemap-index.xml`.
7. **Notify Search Engines**: Dispatch both URLs to `scripts/submit-indexnow.mjs` to execute fast de-indexing of the redirected URL.

---

### Rule 3: When to DELETE a Page (410 Gone vs 301 Redirect)

Deleting pages without a protocol creates 404 errors that degrade crawl efficiency. Follow this decision matrix:

| Scenario | Action | HTTP Status | Implementation |
| :--- | :---: | :---: | :--- |
| **Page has external backlinks or legacy traffic** | Redirect | **301 Moved Permanently** | Add redirect in `public/_redirects` to the nearest thematic parent. Never delete outright. |
| **Topic has a valid replacement or successor page** | Redirect | **301 Moved Permanently** | Add redirect in `public/_redirects` to the successor page. |
| **Erroneously indexed test/staging URL** | Remove | **410 Gone** | Configure 410 in Cloudflare Worker or `_redirects` to instruct search spiders to remove it immediately. |
| **Obsolete regulation / dead product with 0 backlinks** | Remove | **410 Gone** | Return 410 Gone; remove from sitemap and `keyword-map.json`. |

**Deletion Safety Checklist:**
1. Check Ahrefs, Moz, or GSC Links report for inbound external backlinks.
2. If external links exist $\to$ **MUST 301 redirect**, never 404/410.
3. Grep codebase for internal links (`grep_search`) and remove all broken references.
4. Verify `dist/` contains zero dangling references via `npm run audit:crawl`.

---

## 7. GSC Export Script Technical Reference

The companion automation script `scripts/export-gsc-queries.mjs` provides programmatic access to search performance data:

### Available CLI Flags

| Flag | Default | Description |
| :--- | :---: | :--- |
| `--output <path>` | `docs/gsc-queries-export.csv` | File path for exported CSV data. |
| `--days <number>` | `28` | Date lookback window in days (7, 28, 90). |
| `--site <url>` | `sc-domain:onlineinvoicecreator.com` | Search Console property name. |
| `--min-impressions <n>` | `5` | Filter out low-volume queries below threshold. |
| `--mock` / `--dry-run` | `false` | Generate opportunity dataset offline without API credentials. |

### Setting Up Live Google Search Console API Credentials
To enable fully automated live data fetching in production CI or cron jobs:
1. Create a Google Cloud Project and enable the **Google Search Console API**.
2. Create a **Service Account** and generate a JSON key.
3. In Google Search Console, add the service account email as a **User** (Read-only permissions) to `sc-domain:onlineinvoicecreator.com`.
4. Set environment variables:
   ```bash
   export GSC_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
   export GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```
5. Run the export script:
   ```bash
   npm run gsc:export
   ```
