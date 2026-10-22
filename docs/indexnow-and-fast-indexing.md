# IndexNow & Fast Indexing Automation Guide

**Domain:** `https://onlineinvoicecreator.com`  
**Worker Endpoint:** `https://onlineinvoicecreator.com/api/indexnow`  
**IndexNow Key File:** `https://onlineinvoicecreator.com/24680abcdef1234567890abcdef12345.txt`  
**Automation Script:** `scripts/submit-indexnow.mjs`  
**CI/CD Pipeline:** `.github/workflows/ci.yml`

---

## 1. Fast Indexing Strategy & Dual-Engine Architecture

Search engines crawl web pages on varying schedules. To maximize early discoverability and ensure search engines index fresh tools, updates, and schema immediately upon deployment, `onlineinvoicecreator.com` utilizes a two-pronged fast indexing strategy:

```
                            ┌──────────────────────────────────────────────┐
                            │               Git Push to main               │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                     GitHub Action (.github/ci.yml)
                                                   │
                                                   ▼
                                    scripts/submit-indexnow.mjs
                               (Inspects git diff & changed pages)
                                                   │
                                                   ▼
                                Cloudflare Worker (/api/indexnow)
                           (Validates domain, auth secret, & payload)
                                                   │
                                                   ▼
                         IndexNow Protocol API (api.indexnow.org)
                                                   │
                        ┌──────────────────────────┴──────────────────────────┐
                        │                                                     │
                        ▼                                                     ▼
              Microsoft Bing Webmaster                                  Yandex & Seznam
            (Instant crawl within minutes)                       (Instant crawl within minutes)
```

1. **IndexNow Protocol (Bing, Yandex, Seznam, Naver):**
   - Automatically dispatched on every GitHub push to `main`.
   - The Cloudflare API Worker verifies authorization, confirms domain ownership, and relays URLs directly to the IndexNow protocol endpoint.
   - Enables participating search engines to discover and reflect URL additions or modifications in minutes instead of weeks.

2. **Google Search Console (Google):**
   - Google does not participate in IndexNow.
   - For Google, fast indexing relies on submitting `sitemap-index.xml` (Phase 28/32) combined with **manual URL Inspection requests** for priority high-intent pages.

---

## 2. IndexNow Key File in `public/`

IndexNow verifies domain ownership by having search engine spiders fetch a lightweight text file named after your key at the root of the domain:

- **Local Source Path:** `public/24680abcdef1234567890abcdef12345.txt`
- **Build Output Path:** `dist/24680abcdef1234567890abcdef12345.txt`
- **Live Production URL:** `https://onlineinvoicecreator.com/24680abcdef1234567890abcdef12345.txt`
- **File Contents:**
  ```text
  24680abcdef1234567890abcdef12345
  ```

### Key Requirements Checklist:
- [x] Length: 32 hexadecimal characters (protocol permits 8 to 128 alphanumeric characters).
- [x] Content: Must contain only the key string itself (with optional trailing newline).
- [x] Status: Must return HTTP `200 OK` with `Content-Type: text/plain` (or `application/octet-stream`).
- [x] Access: Unblocked in `robots.txt` and preserved during Astro build.

To verify your key file in production, run:
```bash
curl -i https://onlineinvoicecreator.com/24680abcdef1234567890abcdef12345.txt
```
Expected output:
```http
HTTP/2 200
content-type: text/plain; charset=utf-8

24680abcdef1234567890abcdef12345
```

---

## 3. Automated Deploy Submission Script (`scripts/submit-indexnow.mjs`)

The Node script `scripts/submit-indexnow.mjs` identifies which pages changed in the current deployment and notifies the IndexNow network via the Cloudflare Worker.

### 3.1 Git Change Detection Logic
1. **Global Changes:** If any shared component (`src/layouts/`, `src/components/`, `src/styles/`), configuration (`astro.config.mjs`, `package.json`), or global data changes, **all 14 indexable URLs** are marked as modified and submitted.
2. **Page-Specific Changes:** If an individual page or data file changes (e.g. `src/pages/tax-invoice-template-australia.astro` or `src/data/pages/tax-invoice-template-australia.json`), only that specific page URL is submitted.
3. **Tool Scripts:** Changes to `src/scripts/invoice-form-client.ts` submit the 6 invoice tool pages; changes to `src/scripts/receipt-client.ts` submit the 2 receipt tool pages; changes to `src/scripts/rent-receipt-client.ts` submit the rent receipt tool page.
4. **Non-Indexable Filter:** Disallowed pages (`/404` and `/style-guide`) are strictly excluded.
5. **Zero-Change Clean Exit:** If only documentation or tests change, the script logs an informative note and exits cleanly with status code `0`.

### 3.2 CLI Commands

```bash
# Standard automated run (detects changes from Git HEAD~1..HEAD or GITHUB_EVENT_BEFORE)
npm run indexnow

# Force submit all 14 indexable URLs (e.g., initial launch or full re-index)
node scripts/submit-indexnow.mjs --all

# Dry-run mode (prints detection results and payload without dispatching HTTP requests)
node scripts/submit-indexnow.mjs --dry-run

# Submit specific explicit URLs
node scripts/submit-indexnow.mjs --urls "https://onlineinvoicecreator.com/,https://onlineinvoicecreator.com/free-online-receipt-generator"

# Enforce authentication secret (useful in production CI)
node scripts/submit-indexnow.mjs --require-auth
```

### 3.3 GitHub Action Integration

The workflow in `.github/workflows/ci.yml` runs the submission script on every push to `main` (which matches production deployments on Cloudflare Pages):

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 2 # Ensures HEAD~1 is available for git diff comparison

...

- name: Submit changed URLs to IndexNow via Worker
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: node scripts/submit-indexnow.mjs
  env:
    INDEXNOW_ADMIN_SECRET: ${{ secrets.INDEXNOW_ADMIN_SECRET }}
    INDEXNOW_KEY: ${{ secrets.INDEXNOW_KEY }}
    WORKER_INDEXNOW_URL: ${{ secrets.WORKER_INDEXNOW_URL || 'https://onlineinvoicecreator.com/api/indexnow' }}
    GITHUB_EVENT_BEFORE: ${{ github.event.before }}
    GITHUB_SHA: ${{ github.sha }}
```

> [!NOTE]
> If `INDEXNOW_ADMIN_SECRET` has not yet been added to your GitHub repository secrets, the script gracefully logs a warning and exits code 0 so your build pipeline is not interrupted. Once configured, live submissions occur automatically on every push.

---

## 4. Manual Indexing in Google Search Console (First Nine URLs)

Because Google does not support IndexNow, new websites should manually request priority indexing for their core transactional tools via the **URL Inspection** tool in Google Search Console.

### 4.1 The First Nine URLs (Core Tools Registry)

Submit these 9 URLs in the exact priority order below. They represent the primary tools and search intent pillars of `onlineinvoicecreator.com`:

| # | Priority URL | Primary Keyword | H1 Heading Target | Search Intent |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `https://onlineinvoicecreator.com/` | free online invoice generator | Free Online Invoice Generator | Core Tool / Pillar 1 |
| **2** | `https://onlineinvoicecreator.com/free-online-receipt-generator` | free online receipt generator | Free Online Receipt Generator | Core Tool / Pillar 2 |
| **3** | `https://onlineinvoicecreator.com/tax-invoice-template-australia` | tax invoice template australia | Free Tax Invoice Template Australia (ATO Compliant) | Regional Spoke |
| **4** | `https://onlineinvoicecreator.com/receipt-maker-with-items` | receipt maker with items | Online Receipt Maker with Itemized Products | Tool Spoke |
| **5** | `https://onlineinvoicecreator.com/free-rent-receipt-generator` | free rent receipt generator | Free Rent Receipt Generator | Template Spoke |
| **6** | `https://onlineinvoicecreator.com/invoice-generator-for-freelancers` | invoice generator for freelancers | Invoice Generator for Freelancers | Persona Spoke |
| **7** | `https://onlineinvoicecreator.com/contractor-invoice-template` | contractor invoice template | Free Contractor Invoice Template | Persona Spoke |
| **8** | `https://onlineinvoicecreator.com/invoice-generator-excel` | invoice generator excel | Free Online Invoice Generator to Excel & PDF | Format Spoke |
| **9** | `https://onlineinvoicecreator.com/photography-invoice-generator` | photography invoice generator | Photography Invoice Generator | Persona Spoke |

---

### 4.2 Step-by-Step Instructions in Google Search Console

Follow these steps for each of the 9 URLs above:

#### Step 1: Open Property
1. Navigate to [Google Search Console](https://search.google.com/search-console/).
2. Select your verified domain property from the top-left dropdown: **`sc-domain:onlineinvoicecreator.com`**.

#### Step 2: Open the URL Inspection Tool
1. Click the search bar at the very top of the page labeled:  
   **"Inspect any URL in 'onlineinvoicecreator.com'"** (or press the keyboard shortcut `/`).
2. Paste the first URL:  
   `https://onlineinvoicecreator.com/`
3. Press **Enter**.

#### Step 3: Review Retrieval Status
1. Search Console will retrieve data from the Google Index:
   - For a brand new URL, you will typically see:  
     **"URL is not on Google"** with the explanation *"This page is not in the index, but not because of an error."*
   - For an existing URL, you will see coverage, last crawl date, and canonical status.

#### Step 4: Run "Test Live URL" (Recommended Quality Gate)
1. In the top right corner, click **Test Live URL**.
2. Wait 15–30 seconds while Googlebot fetches the page in real-time.
3. Confirm the green checkmarks:
   - **URL is available to Google**
   - **Mobile Usability:** Page is usable on mobile
   - **Breadcrumbs:** Valid
   - **Software Application / WebApplication:** Valid schema detected
   - **User-declared canonical:** Matches Google-selected canonical (`https://onlineinvoicecreator.com/`)

#### Step 5: Click "Request Indexing"
1. Click the **Request Indexing** button.
2. A modal dialog will appear stating:  
   **"Indexing requested"**  
   *"URL was added to a priority crawl queue. Submitting a page multiple times will not change its queue position or priority."*
3. Click **Got It**.

#### Step 6: Repeat for URLs 2 through 9
1. Return to the search bar at the top and paste URL #2:  
   `https://onlineinvoicecreator.com/free-online-receipt-generator`
2. Click **Request Indexing**.
3. Continue sequentially through URL #9:  
   `https://onlineinvoicecreator.com/photography-invoice-generator`

---

### 4.3 Google Search Console Quota & Best Practices

| Parameter | Guidance |
| :--- | :--- |
| **Daily Request Quota** | Google limits manual URL indexing requests to between **10 and 50 URLs per day** per Search Console property. Submitting all 9 core URLs consumes exactly 9 requests and is safely within the daily limit. |
| **Rate Limiting Message** | If you see *"Quota exceeded: You have reached your daily quota of indexing requests"*, stop and submit remaining URLs the following calendar day (quota resets midnight Pacific Time). |
| **Crawl Timeframe** | Priority crawl queue typically processes URLs within **1 to 48 hours**. |
| **Do Not Spam Requests** | Submitting the same URL multiple times does not expedite crawling; once added to the priority queue, additional submissions have zero effect. |

---

## 5. Verifying Indexing & Bing Webmaster Integration

### 5.1 Checking Bing Webmaster Tools IndexNow Dashboard
1. Log in to [Bing Webmaster Tools](https://www.bing.com/webmasters/).
2. Select `onlineinvoicecreator.com`.
3. In the left navigation menu, expand **SEO** and click **IndexNow**.
4. You will see:
   - **Submitted URLs:** Recent batches submitted by your Cloudflare Worker.
   - **Crawled URLs:** URLs crawled directly from IndexNow notifications.
   - **Key Verification:** Confirms that Bing retrieved your key file at `https://onlineinvoicecreator.com/24680abcdef1234567890abcdef12345.txt`.

### 5.2 Checking Google Search Console Indexing Status
1. Navigate to **Indexing** &rarr; **Pages** in Google Search Console.
2. Monitor the two primary states:
   - **Discovered – currently not indexed:** Google knows about the page via sitemap, but has not yet crawled it. (Requesting indexing moves it out of this state).
   - **Crawled – currently not indexed:** Google crawled the page but has not indexed it yet. (Our 100/100 Core Web Vitals, high-intent FAQ content, and rich Schema.org metadata prevent this issue).
   - **Indexed:** The URL is live in Google search results. Check with: `site:onlineinvoicecreator.com`.
