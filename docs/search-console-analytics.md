# Search Console, Bing Webmaster & Privacy-Friendly Analytics Setup Guide

**Domain:** `https://onlineinvoicecreator.com`  
**Sitemap Index URL:** `https://onlineinvoicecreator.com/sitemap-index.xml`  
**DNS Provider:** Cloudflare DNS  
**Hosting Platform:** Cloudflare Pages  
**Analytics Provider:** Cloudflare Web Analytics (Cookie-Free & Privacy-First)

---

## 1. Exact DNS Verification TXT Records for Cloudflare

Domain-level verification is the most robust method for Google Search Console and Bing Webmaster Tools. It automatically covers all protocols (`http://` and `https://`) and all subdomains (such as `www.` and apex `@`).

Add the following records in your **Cloudflare Dashboard** under **DNS** &rarr; **Records**:

| Type | Name | Content / Target | TTL | Proxy Status | Purpose |
| :---: | :---: | :--- | :---: | :---: | :--- |
| **TXT** | `@` | `google-site-verification=REPLACE_WITH_YOUR_GSC_TOKEN` | `Auto` | DNS only | Google Search Console Domain Verification |
| **TXT** | `@` | `MS=REPLACE_WITH_YOUR_BING_TOKEN` | `Auto` | DNS only | Bing Webmaster Tools Domain Verification |

> [!NOTE]
> - In Cloudflare, `@` represents the apex domain `onlineinvoicecreator.com`.
> - TXT records cannot be proxied by Cloudflare and are automatically set to **DNS only**.
> - Both TXT records can coexist safely on the `@` host alongside your existing CNAME/A records.

### How to Add the Records in Cloudflare:
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select your domain: **`onlineinvoicecreator.com`**.
3. In the left navigation menu, click **DNS** &rarr; **Records**.
4. Click **Add record**:
   - **Type:** `TXT`
   - **Name:** `@`
   - **Content:** Paste your Google verification token string: `google-site-verification=...`
   - **TTL:** `Auto`
   - Click **Save**.
5. Click **Add record** again:
   - **Type:** `TXT`
   - **Name:** `@`
   - **Content:** Paste your Bing verification token string: `MS=...`
   - **TTL:** `Auto`
   - Click **Save**.

---

## 2. Google Search Console Setup & Sitemap Submission

### Step 1: Add Property in Google Search Console
1. Navigate to [Google Search Console](https://search.google.com/search-console/).
2. Click the property dropdown in the top-left corner and click **+ Add property**.
3. Under the **Domain** card (left option):
   - Enter: `onlineinvoicecreator.com` (do not enter `https://` or `www`).
   - Click **Continue**.
4. Google will display the required DNS TXT verification token (e.g., `google-site-verification=...`).
5. Copy this string and add it to Cloudflare DNS as shown in Section 1.
6. Click **Verify** in Google Search Console. (Cloudflare DNS propagates within seconds).

### Step 2: Submit Sitemap Index
1. In Google Search Console, select the verified `onlineinvoicecreator.com` property.
2. In the left-hand menu, navigate to **Indexing** &rarr; **Sitemaps**.
3. Under **Add a new sitemap**, enter the path:
   ```
   sitemap-index.xml
   ```
4. Click **Submit**.
5. Once processed (usually within seconds to a few hours), the status will display **"Success"**.
6. Google Search Console will detect the child sitemap `sitemap-0.xml` and report all 14 discovered indexable URLs.

---

## 3. Bing Webmaster Tools: Import from Google Search Console (Recommended)

Bing Webmaster Tools provides a 1-click import feature that links directly to your verified Google Search Console account. This automatically verifies ownership, imports your sitemaps, and syncs crawling data without needing any manual DNS configuration.

### Recommended 1-Click Import Steps:
1. Log in to [Bing Webmaster Tools](https://www.bing.com/webmasters/).
2. Click **Add a site** in the top-left navigation.
3. Select the left option: **Import your sites from GSC** (Import from Google Search Console).
4. Click **Continue**.
5. Sign in with the Google account that manages your Google Search Console property.
6. Grant Bing Webmaster Tools permission to read your Search Console properties.
7. Select **`onlineinvoicecreator.com`** from the list of available properties.
8. Click **Import**.
9. Bing Webmaster Tools will immediately:
   - Verify domain ownership.
   - Import `https://onlineinvoicecreator.com/sitemap-index.xml`.
   - Schedule initial crawling for Yahoo, Bing, and DuckDuckGo search engines.

---

## 4. Bing Webmaster Tools: Manual Verification & Sitemap Submission

If you prefer direct DNS verification instead of the Google Search Console import:

### Step 1: Add Site via Manual Verification
1. Log in to [Bing Webmaster Tools](https://www.bing.com/webmasters/).
2. In the right card (**Add site manually**), enter:
   ```
   https://onlineinvoicecreator.com
   ```
3. Click **Add**.
4. Under verification methods, choose **Domain Connect (DNS)** or **Add CNAME/TXT record to your DNS provider**:
   - Copy the `MS=...` code provided by Bing.
   - Add this TXT record to Cloudflare DNS (as detailed in Section 1).
5. Click **Verify**.

### Step 2: Submit Sitemap Index in Bing
1. In the left sidebar, click **Sitemaps**.
2. Click the blue **Submit sitemap** button at the top right.
3. Enter the full canonical sitemap index URL:
   ```
   https://onlineinvoicecreator.com/sitemap-index.xml
   ```
4. Click **Submit**.
5. Status will show **Processing** &rarr; **Success**, showing all indexed URLs and alternate language links (`en`, `es`, `pt`).

---

## 5. Privacy-Friendly Analytics (Cloudflare Web Analytics)

To maintain absolute user trust and 100% GDPR, CCPA, and PECR compliance, the application integrates **Cloudflare Web Analytics**:
- **0 Cookies & 0 Local Storage Trackers:** No cookie banners or consent popups required.
- **Zero Fingerprinting:** No tracking across sites, no collecting of IP addresses or personal identifiable information (PII).
- **Core Web Vitals Optimized:** Lightweight snippet (< 5 KB), deferred execution (`defer`), 0ms Total Blocking Time (TBT).

### How to Get Your Cloudflare Analytics Token:
1. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to **Analytics & Logs** &rarr; **Web Analytics**.
2. Click **Manage Sites** &rarr; **Add a site**.
3. Enter your domain: `onlineinvoicecreator.com`.
4. Cloudflare will generate a snippet containing your unique site token:
   ```html
   <!-- Cloudflare Web Analytics -->
   <script
     defer
     src="https://static.cloudflareinsights.com/beacon.min.js"
     data-cf-beacon='{"token": "YOUR_CLOUDFLARE_ANALYTICS_TOKEN"}'
   ></script>
   <!-- End Cloudflare Web Analytics -->
   ```
5. Copy the 32-character hexadecimal token string (e.g., `a1b2c3d4e5f6...`).

### How to Activate in Production:

#### Option A: Cloudflare Pages Environment Variable (Zero Code Change)
1. In the Cloudflare Dashboard, go to **Workers & Pages** &rarr; **onlineinvoicecreator** &rarr; **Settings** &rarr; **Environment variables**.
2. Under **Production**, click **Add variable**:
   - **Variable name:** `PUBLIC_CF_ANALYTICS_TOKEN`
   - **Value:** Paste your 32-character token.
3. Click **Save and deploy**.
4. Astro automatically injects this token through `src/components/CloudflareAnalytics.astro` at build time!

#### Option B: Cloudflare Pages Automatic Edge Injection
Alternatively, in your Cloudflare Pages dashboard under **Settings** &rarr; **Web Analytics**, simply click **Enable Web Analytics**. Cloudflare will automatically inject the beacon at edge proxy level.

### Content Security Policy (CSP) Verification
`public/_headers` has been configured to allow Cloudflare Web Analytics:
- `script-src`: allows `https://static.cloudflareinsights.com`
- `connect-src`: allows `https://cloudflareinsights.com`
