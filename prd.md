# PRD: Online Invoice Creator

Product: Online Invoice Creator
Domain: https://onlineinvoicecreator.com
Document version: 1.0
Date: 2026-10-27
Owner: Site owner (solo founder)
Status: Design, on-page SEO and 40-phase build prompts are done. Testing and off-page SEO are next.

---

## 1. Summary

Online Invoice Creator is a free website where a person fills in a form, sees a live preview, and downloads a PDF invoice or receipt. It needs no account, adds no watermark, and never uploads the user's data. Everything runs in the browser.

The business goal is organic search traffic, monetised by ads and affiliate links. The site is a static Astro build on Cloudflare, so hosting cost is close to zero.

One sentence for the product: the fastest way to make a clean invoice on a phone or laptop, with nothing to sign up for.

## 2. Goals and success measures

| Goal | Measure | Target |
|---|---|---|
| Get indexed fast | Pages indexed in Google and Bing | All launch pages indexed within 14 days |
| Earn first search visibility | Impressions in Search Console | First impressions by day 30 |
| Rank for the easiest long-tail phrases | Positions for phrases with competition index under 30 | Page one in months 2 to 3 |
| Grow users | Monthly users | 10,000 in months 4 to 8, 100,000 in months 12 to 18 |
| Keep the tool fast | Core Web Vitals on mobile | LCP under 2.0s, CLS under 0.05, INP under 200ms |
| Keep the promise | Sign-up prompts, watermarks, data uploads | Zero |
| Earn trust links | Referring domains | 10 to 20 relevant domains in 90 days |
| Complete jobs | Share of visitors who download a PDF | Track from day 1 (target set after the first 30 days of data) |

Ranking within one month is not a realistic target for competitive phrases. The 30-day target is a clean, indexed site with early impressions.

## 3. Audience

| Persona | Need | Typical search |
|---|---|---|
| Freelancer | Quick professional invoice, hourly rates | invoice generator for freelancers, freelance invoice |
| Small business owner | Branded invoice with logo, tax, repeat clients | free online invoice generator, invoice generator for small business |
| Contractor or tradesperson | Labor and materials, printable | contractor invoice template, construction invoice |
| Photographer or creative | Deposit, usage terms | photography invoice generator |
| Landlord or tenant (India focus) | Rent receipt for tax records (HRA) | free rent receipt generator |
| Australian sole trader | ATO-style tax invoice with ABN and GST | tax invoice template australia ato |
| Shop or service seller | Simple itemized receipt | free online receipt generator, receipt maker with items |

Device split: assume most visitors are on phones. Mobile first is a hard requirement.

## 4. Scope

### In scope (version 1, English only)
- Invoice tool on the home page.
- Receipt tool and rent receipt tool.
- Four preloaded tool pages (freelancers, Australia tax invoice, contractor, photography) and one Excel-alternative page.
- Home page long copy (800 to 1200 words) and a 13-question FAQ.
- About, Contact, Privacy and Terms pages, with logo.
- Blog with the first four articles.
- Full on-page and technical SEO, structured data, sitemap, robots.txt, redirects, 404.
- Logo, favicon set, Open Graph images.
- Cloudflare Pages hosting, a Cloudflare Worker for the contact form and IndexNow, GitHub CI.
- Frontend test run of 30 tests.
- Off-page SEO plan and tracker.

### Out of scope for version 1
- User accounts, logins, cloud storage of documents, payments, sending invoices by email from the site, recurring invoices, client portal.
- Portuguese and Spanish pages (planned as version 2).
- French pages (hard keywords, only after a narrower angle is tested).
- Native mobile apps.
- Fake or forged document tools. These are never built.

## 5. Brand and design

- Name: Online Invoice Creator. Short name: Invoice Creator.
- Logo: blue rounded square, white invoice page with a fold and two lines, green circle with a check ("paid").
- Colors: blue #1E40AF, green #10B981, ink #0F172A, light #F1F5F9, light blue #BFDBFE.
- Files: favicon.svg, favicon.ico (16, 32, 48), apple-touch-icon.png (180), icon-192.png, icon-512.png, icon-maskable-512.png, logo-mark.svg, logo-horizontal (light and dark, SVG and PNG), og-image.png (1200x630), site.webmanifest.
- Design source: DESIGN.md installed with `npx getdesign@latest add vercel`. Antigravity must follow it and not copy any competitor's design.
- Type: one self-hosted variable font (Inter), font-display swap.
- Modes: light and dark, system-aware, with a manual toggle remembered in localStorage.
- Tone of copy: plain, specific, short sentences. No filler, no hype, no clichés.

## 6. Technology

| Layer | Choice |
|---|---|
| Frontend framework | Astro, static output |
| Styling | Tailwind 4 (tailwind-4-docs skill) |
| Language | TypeScript, strict mode |
| Island framework | Preact or vanilla TypeScript, whichever ships less JavaScript |
| Validation | Zod |
| Unit tests | Vitest |
| Frontend tests | TestSprite MCP (local, port 4321) and Playwright |
| Backend and runtime | Node.js for build scripts, Cloudflare Workers for server tasks |
| Hosting | Cloudflare Pages |
| Version control and CI/CD | Git, GitHub, GitHub Actions |
| AI development tool and editor | Antigravity, with the Astro docs MCP |
| Domain registrar | Spaceship (DNS pointed to Cloudflare) |
| PDF | A client-side library, loaded only on Download click |

Hard rule: content pages ship almost no JavaScript. Only the tool is an island.

## 7. Information architecture

### 7.1 Pages

| URL | Role | Primary keyword (searches / competition index) |
|---|---|---|
| / | Home, pillar, invoice tool | free online invoice generator (5,000 / 41) |
| /free-online-receipt-generator | Pillar, receipt tool | free online receipt generator (500 / 36) |
| /free-rent-receipt-generator | Pillar, rent receipt | free rent receipt generator (500 / 3) |
| /invoice-generator-for-freelancers | Spoke | invoice generator for freelancers (500 / 46) |
| /invoice-generator-excel | Spoke | invoice generator excel (500 / 43) |
| /receipt-maker-with-items | Spoke | receipt maker with items (50 / 19) |
| /tax-invoice-template-australia | Pillar | tax invoice template australia ato (500 / 25) |
| /contractor-invoice-template | Spoke | free printable contractor invoice template (50 / 14) |
| /photography-invoice-generator | Spoke | photography invoice generator (50 / 6) |
| /blog and /blog/[slug] | Support content | informational phrases |
| /about, /contact, /privacy, /terms | Trust and legal | none |
| /404 | Error page | none |

The home page is the pillar for "free online invoice generator". A separate page with that slug is not built. A 301 redirect maps it to /.

### 7.2 Internal linking
- Each spoke links to its pillar. Pillars link to each other.
- A related-tools block and breadcrumbs on every page. Footer links to tools and legal pages.
- Every page is reachable within three clicks from home and has at least three inbound links.
- Descriptive anchor text only.

### 7.3 URL rules
Lowercase, hyphenated, one trailing-slash style enforced everywhere, one hostname (apex), https only.

## 8. Functional requirements

Priority: P0 must have, P1 should have, P2 later.

### 8.1 Invoice tool (home page and tool pages)

| ID | Requirement | Priority |
|---|---|---|
| F-01 | Form sections: your details, client, items, tax and discount, payment details, notes | P0 |
| F-02 | Sender fields: business name, address, email, phone, tax or business ID (ABN, VAT, GST), logo | P0 |
| F-03 | Client fields: name, address, email | P0 |
| F-04 | Invoice number (prefilled, editable, auto-increment), issue date, due date, PO number (optional) | P0 |
| F-05 | Line items: description, quantity, unit price, per-item tax rate, line total. Add, remove, reorder | P0 |
| F-06 | Calculations: subtotal, discount (percent or fixed, applied before tax), tax, shipping, total, amount due. Rounding to the currency's decimals | P0 |
| F-07 | Currency picker with 30 currencies: USD, EUR, GBP, INR, AUD, CAD, NZD, CHF, JPY, CNY, SGD, HKD, AED, SAR, ZAR, BRL, MXN, ARS, COP, CLP, SEK, NOK, DKK, PLN, CZK, TRY, NGN, KES, PHP, IDR. Formatting via Intl | P0 |
| F-08 | Payment details and terms (bank, PayPal text, payment terms such as Net 14) and a notes field | P0 |
| F-09 | Optional signature (typed or drawn) | P2 |
| F-10 | Logo upload with client-side resize, size limit 5 MB, image types only, clear error messages | P0 |
| F-11 | Live preview, always identical to the PDF. Side by side on desktop, Form/Preview toggle on mobile | P0 |
| F-12 | Four templates: classic, modern, minimal, compact. Switching never loses data | P0 |
| F-13 | PDF export in A4 and US Letter, no watermark, correct fonts including non-Latin characters, sensible file name (for example INV-0001.pdf) | P0 |
| F-14 | PDF library loaded only when the user clicks Download | P0 |
| F-15 | Print button and PNG export | P1 |
| F-16 | Validation: required client name and at least one item before download, due date not before issue date, numeric checks, errors beside fields, focus to the first error, data never lost | P0 |
| F-17 | Discount larger than the subtotal clamps to zero with a message | P0 |

### 8.2 Saving and privacy features

| ID | Requirement | Priority |
|---|---|---|
| S-01 | Autosave to localStorage: business details, clients, last invoice | P0 |
| S-02 | Clear my data button with confirmation | P0 |
| S-03 | Export and import as JSON, with validation and a safe error for bad files | P1 |
| S-04 | Save as template, duplicate invoice | P1 |
| S-05 | Tool works if localStorage is blocked (try/catch everywhere) | P0 |
| S-06 | Visible statement that nothing is uploaded to a server | P0 |

### 8.3 Receipt tool

Reuses the invoice engine. Receipt wording on page and PDF. Itemized lines, cash, payment receipt, payment method, received-by. Page: /free-online-receipt-generator. Spoke /receipt-maker-with-items covers itemized receipts.

### 8.4 Rent receipt tool

Fields: landlord name, tenant name, property address, month or period (range), rent amount, payment mode, optional landlord PAN (with a short explanation of when it is needed for high annual rent), date and signature line. PDF for tax records. PAN stays optional and never blocks the download. Check requirements against the Indian Income Tax Department before publishing.

### 8.5 Preloaded and country pages

| Page | What differs |
|---|---|
| Freelancers | Hourly rate defaults, payment terms, project field |
| Australia tax invoice | ABN field, GST handling, the words "tax invoice", invoice over and under the threshold note. Verify against the ATO |
| Contractor | Labor and materials sections, optional 1099 example text |
| Photography | Deposit, usage and licensing terms, session items |
| Excel alternative | Explains Excel and Word invoices, offers the tool and JSON export instead |

Each page needs its own copy, example and FAQ. No doorway pages.

### 8.6 Navigation and layout
- Sticky header: logo, tools menu, dark mode toggle. Works without heavy JavaScript on mobile.
- Footer: tool links, legal links, logo mark, one line that tools are for genuine business documents.
- Breadcrumbs with BreadcrumbList schema.
- Skip link and landmark roles.

### 8.7 Contact form
Posts to a Cloudflare Worker. Turnstile spam protection, field validation, mailto fallback, no double submit, success and error messages. No invoice data ever reaches the Worker.

## 9. Content requirements

### 9.1 Home page copy (800 to 1200 words, below the tool)
Cover: how to create an invoice in four steps, what an invoice must include, an example invoice, why no sign-up and no watermark, privacy (data stays in the browser), invoice vs receipt, who it suits, and tips for getting paid faster. Supporting keywords as H2s or in natural copy: create invoice free, free invoice generator, invoice creator free online, create online invoice for free, online invoice creator, free invoice tool, online invoice tool, invoice generator app, pdf invoice generator, basic invoice generator, digital invoice generator, service invoice generator, invoice generator for small business, free online invoice generator with logo, online invoice maker. Mention naturally, never as headings: free invoice generator no sign up, invoice generator with logo (both highly competitive).

### 9.2 FAQ (13 questions, home page)
1. What is an online invoice creator?
2. Is there a free online invoice generator with no sign-up?
3. How do I create an invoice online for free?
4. What should an invoice include?
5. Can I add my logo to a free invoice?
6. Can I download my invoice as a PDF?
7. Is there an invoice generator app for my phone?
8. Is this invoice generator good for small business?
9. How do I create an invoice for freelance work?
10. Can I make an invoice in Excel or Word?
11. What is the difference between an invoice and a receipt?
12. Is an invoice made here legally valid?
13. Do you store my invoice data?

Rules: answers 40 to 70 words, first sentence answers directly, visible on the page, JSON-LD generated from the same data so text matches exactly. The phone answer says it works in a mobile browser (no store app claimed). The legal answer says tax rules vary, to check local rules, with a link to an official source (ATO, HMRC, IRS or similar).

### 9.3 Blog
Twelve outlines, four written first: how to write an invoice for freelance work, what is a pro forma invoice, invoice vs receipt, how to number invoices. Others: payment terms examples, what to put on a rent receipt. Each includes something a generic article lacks (worked example, sample, calculation) and links to a tool page.

### 9.4 Writing rules
Plain English, short sentences, concrete examples, no clichés. Mark facts that need an official source. Run the humanizer pass on all visible copy and FAQ answers before publishing. Legal guidance carries a last-reviewed date and the line: general information, not legal or tax advice.

## 10. SEO requirements

### 10.1 Keyword rules
- Source: keywords_all_ranked.csv (1,468 unique keywords: English 1,446, Portuguese 11, Spanish 7, French 4) and the keyword plan document.
- Volumes are range bands (50, 500, 5,000). Treat each as a tenfold band. Competition index measures advertiser competition, not ranking difficulty.
- One primary keyword per page. Identical volume and index rows form one cluster, covered by one page.
- Excluded: the 120 "fake receipt" and "fake invoice" phrases (forgery intent) and brand names (Zoho, Wave, PayPal, ClearTax, QuickBooks, HubSpot, FreshBooks, Square, Invoiced).
- Head terms "invoice generator" (500,000 / 14) and "receipt maker" (50,000 / 59) are not first targets.

### 10.2 On-page (every page)
- Title 60 characters or fewer, meta description 155 or fewer, both unique.
- Exactly one H1 with the primary keyword. H2s from supporting phrases. No skipped levels.
- Absolute self-referencing canonical.
- Open Graph (title, description, url, type, site_name, image 1200x630) and Twitter card tags. Unique OG image per tool page.
- Alt text on every image. Descriptive internal links.
- A one-line note that the tools are for genuine business documents.

Planned titles and descriptions:

| URL | Title | Meta description |
|---|---|---|
| / | Free Online Invoice Generator – PDF in 60 Seconds | Make an invoice online free. Add your logo, taxes and currency, then download a PDF. No sign-up and no watermark. |
| /free-online-receipt-generator | Free Online Receipt Generator – Download PDF | Create a clean receipt in your browser. Add items, tax and payment method, then print or save as PDF. Free, no watermark. |
| /free-rent-receipt-generator | Free Rent Receipt Generator – PDF in Seconds | Make a rent receipt with landlord, tenant, month and amount. Download a PDF for tax records. No sign-up needed. |
| /invoice-generator-for-freelancers | Invoice Generator for Freelancers – Free PDF | Send professional invoices as a freelancer. Add hourly rates, payment terms and your logo. Free, no account. |
| /invoice-generator-excel | Invoice Generator Excel Alternative – Free | Need an Excel-style invoice? Fill it in online and download a PDF, or export your data as JSON. Works on any device. |
| /receipt-maker-with-items | Receipt Maker With Items – Free Itemized PDF | Build an itemized receipt with quantities, prices and tax totals. Print or download as PDF in seconds. |
| /tax-invoice-template-australia | Tax Invoice Template Australia (ATO) – Free PDF | Create an ATO-style tax invoice with ABN and GST fields. See what must appear on the invoice. Free download. |
| /contractor-invoice-template | Free Printable Contractor Invoice Template | Fill in a contractor invoice for labor and materials. Print it or save a PDF. Includes a 1099 example. |
| /photography-invoice-generator | Photography Invoice Generator – Free PDF | Invoice clients for shoots, editing and licensing. Add deposits and usage terms. Free, no sign-up. |

### 10.3 Structured data
- Home: Organization (with logo), WebSite, WebApplication (free offer, BusinessApplication, any OS), FAQPage, BreadcrumbList.
- Tool pages: WebApplication, BreadcrumbList, FAQPage where FAQs exist.
- Blog: Article with author and dates.
- No review or rating markup, since there are no real reviews.
- Google shows FAQ rich results for few sites now. Keep the markup, but do not count on visible snippets.

### 10.4 Technical SEO
- robots.txt: allow all, disallow /api/ and /style-guide, link to the sitemap. Never block CSS, JS or images.
- Sitemap: sitemap-index.xml and sitemap-0.xml, absolute URLs, lastmod from git history, no noindex or 404 URLs. Ready for hreflang alternates.
- One URL style, single-hop 301 redirects (http to https, www to apex, /index.html to /).
- Real 404 status with a helpful page.
- Security headers, caching rules, and a CSP in public/_headers.
- Cloudflare: SSL Full (strict), HSTS, Brotli, HTTP/3, Bot Fight Mode with verified bots allowed, never challenge robots.txt or sitemaps.
- Search Console (Domain property, DNS TXT) and Bing Webmaster Tools. Submit the sitemap. Import into Bing.
- IndexNow key file and a post-deploy submission script.
- CI checks for robots.txt, sitemap, canonicals, titles, descriptions, H1 and JSON-LD.

### 10.5 Off-page
Goal: 10 to 20 real links from 10 or more domains in 90 days. Anchor mix mostly brand and bare domain. No paid links, no networks, no comment spam. Work: launch directories (Product Hunt, AlternativeTo, SaaSHub, BetaList, Indie Hackers), brand profiles, linkable assets (invoice numbering and due-date calculator, late-payment interest calculator, per-country invoice checklist, embeddable button), competitor link gap, resource-page outreach, guest posts, community answers within each community's rules, data pitches only with sourced data, unlinked mention follow-up, monthly report. A tracker file records every action.

### 10.6 Future languages (version 2)
Astro i18n: default `en` with no prefix, `pt` and `es` in `/pt/` and `/es/`. Natively written, translated slugs, hreflang with x-default, own pages per language. Portuguese first (`/pt/gerador-de-recibo`, 500 / 31, nine of eleven phrases under index 50). Spanish next, receipts first (`generador-de-recibos`, 500 / 45). The two Spanish source files disagreed on volume, so re-run them for the target country. French last, with narrower phrases tested first.

## 11. Competitors

| Site | Notes |
|---|---|
| invoice-generator.com | Market leader. About 842k organic visits in one Semrush snapshot, authority score 51, about 2,000 referring domains. Position 1 for the main head terms |
| onlineinvoices.com | About 252k visits in one snapshot |
| freeinvoicebuilder.com | About 165k to 218k visits across snapshots. Closest intent match |
| invoicehome.com | Template-led pages |
| invoicesimple.com | Strong on freelancer and small business pages |
| bloom.io | About 99k visits |
| invoicemaker.com | Receipt guide content |

Traffic figures are third-party snapshots of uneven quality. Verify in Semrush or Ahrefs.

Gaps we use: no forced sign-up or paywall, no watermark, country-specific fields (ABN, GST, VAT, PAN), a thin rent receipt results page, cramped mobile layouts elsewhere, saved details without an account.

SERP read for the target pages: rent receipt results are weak (best early chance), receipt results are mixed, Portuguese results include one small site holding three slots, head invoice terms are hard, Australian tax invoice results are mostly banks and payment companies (slower).

## 12. Non-functional requirements

### Performance
- LCP under 2.0s, CLS under 0.05, INP under 200ms, TBT under 150ms on mobile.
- Content pages under 60 KB of JavaScript. Tool page under 150 KB before the lazy PDF library.
- Images in AVIF or WebP with explicit width and height. Fonts self-hosted.
- Ads, when added, have reserved space and load after the tool is usable.

### Accessibility
- WCAG 2.2 AA target. Visible focus, labelled inputs, error messages tied to fields, aria-live for totals, reduced motion, readable contrast in both modes, full keyboard use.
- Layouts tested at 320, 360, 390, 768 and 1280 px. No horizontal scroll. Tap targets 44 px or larger.

### Browser support
Current versions of Chrome, Edge, Safari (iOS and macOS) and Firefox.

### Security and privacy
- Invoice data stays in the browser. The Worker never receives it.
- Worker input validation, rate limiting, Turnstile, CORS limited to the site, secrets in wrangler secrets.
- Privacy page states: browser-only processing, what localStorage holds, analytics and ads data, cookie use.
- Terms state that tools are for genuine business documents.
- Consent banner only where law requires it.

### Reliability
Static hosting on Cloudflare. No database. The tool must keep working if the Worker is down.

## 13. Analytics and monetisation

- Analytics: Cloudflare Web Analytics (no cookies) plus Search Console. Events to track: tool started, PDF downloaded (by page and template), template switched, receipt tool used, FAQ opened.
- Ads: AdSense or similar once content and legal pages are live. Slots below the tool only. Never inside the form or over the Download button. ads.txt in /public.
- Affiliate: labelled links to accounting software where relevant.
- Revenue note: invoice niche ad rates are high, but earnings depend on country mix and traffic. No revenue target is promised.

## 14. Hosting, deployment and workflow

1. Git and GitHub with a protected main branch.
2. GitHub Actions on every pull request: install, lint, typecheck, unit tests, build, and the SEO checks (title, description, H1, canonical, JSON-LD).
3. Cloudflare Pages deploys from GitHub. Build command `npm run build`, output `dist`, Node version from `.nvmrc`.
4. Spaceship domain pointed to Cloudflare. Custom domain added in Pages.
5. After deploy: IndexNow submission, smoke test.
6. Work happens in Antigravity with the Astro docs MCP and the tailwind-4-docs skill.

## 15. Build plan (40 phases, already written)

- Phases 1 to 20: build (competitor teardown, site map, structure, design tokens, base layout, header and footer, data model, form, preview and templates, PDF, saving, receipts, page templates, content, legal pages, performance, accessibility, Worker, CI, deploy).
- Phases 21 to 40: SEO (keyword map, titles, headings, schema, FAQ, internal links, images and OG, sitemap and robots, canonicals, Core Web Vitals, audit, Search Console and Bing, IndexNow, blog, templates, trust, snippets, backlinks, ads, monitoring).
- Add-on packs: technical SEO T1 to T12, branding B1 to B4, off-page O1 to O12.

## 16. Test plan and acceptance

Frontend run with TestSprite, 30 tests: 16 P0, 14 P1. Spec file: oic-test-spec-30-tests.md.

Release passes when:
- All 16 P0 tests pass and at least 12 of 14 P1 pass, each failure ticketed.
- No uncaught console errors on any page.
- No horizontal scroll at 360 px.
- No watermark and no sign-up prompt in the tool flow.
- Every indexable page has a unique title (60 or fewer), a unique description (155 or fewer), one H1 and an absolute canonical.
- Check numbers: items 200 + 100 + 120 = 420. With 10% tax, 462.00. With 10% discount then 10% tax, 415.80. With a 25.00 fixed discount then 10% tax, 434.50.

## 17. Launch plan

| Window | Target |
|---|---|
| Days 1 to 7 | Domain bought, site live, sitemap submitted, home and 8 tool URLs requested for indexing |
| Days 8 to 30 | All pages indexed, first impressions, directory submissions, four blog posts, first outreach |
| Days 31 to 60 | First page-one results for the easiest phrases, rewrite low-CTR titles |
| Days 61 to 90 | Start Portuguese and Spanish receipt pages, more templates, 10 to 20 links, ads application |

Weekly routine: Search Console check (queries at positions 8 to 30, low-CTR pages, indexing errors). Monthly: content refresh, link quality review, report. Quarterly: technical audit.

## 18. Risks

| Risk | Effect | Response |
|---|---|---|
| New domain, strong incumbents | Slow ranking | Target long tail first, build links, be patient |
| Thin or duplicate spoke pages | Filtered as spam | Unique copy, example and FAQ per page |
| Forged-document misuse | Ad bans, trust loss | Genuine-use statement, no fake receipt targeting |
| Legal inaccuracy per country | Loss of trust | Cite official sources, last-reviewed dates, disclaimer |
| PDF differs from preview | User frustration | One render source, tests in TC-12 and TC-13 |
| Ads hurt speed | Lower rankings | Reserved slots, lazy load, below the tool |
| Keyword data mismatch (range bands, uneven sources) | Wrong priorities | Cross-check with Search Console and Ahrefs |
| Domain availability unconfirmed at the time of research | Name changes | Domain is now chosen: onlineinvoicecreator.com |
| Free-plan features or third-party limits change | Rework | Keep the stack portable (static site) |

## 19. Open questions

1. Target country for each future language (Brazil or Portugal, Mexico or Spain).
2. Ad network choice and timing.
3. PDF library choice after a size and font test.
4. Whether to add a signature drawing feature in version 1.
5. Which email provider the contact Worker uses.
6. Real data to support any digital PR pitch.

## 20. Roadmap

| Version | Content |
|---|---|
| 1.0 | English site, three tool families, five preloaded pages, FAQ, blog start, legal pages, SEO, tests |
| 1.1 | More industry templates, calculators (late-payment interest, due date), embeddable widget |
| 2.0 | Portuguese and Spanish receipt and invoice pages with hreflang |
| 2.1 | French after testing narrower phrases, more country tax pages (UK VAT, Canada GST) |

## 21. Glossary

- Competition index: advertiser competition score from Keyword Planner, not ranking difficulty.
- Pillar page: main page for a topic. Spoke: supporting page that links back to it.
- Island: an interactive component in an otherwise static Astro page.
- IndexNow: protocol that tells search engines about new or changed URLs.
- Core Web Vitals: LCP (loading), CLS (layout shift), INP (responsiveness).
- Maskable icon: app icon that fills the platform's icon shape.

## 22. Related files

- keywords_all_ranked.csv and Invoice__Receipt_Generator_Low-Competition_Keyword_Plan_EN_PT_ES_FR.docx (keyword data)
- invoice-site-master-plan.md (domain, 44 phases, competitors)
- oic-test-spec-30-tests.md (30 tests)
- oic-technical-and-offpage-seo-prompts.md (T, B and O phases)
- oic-brand.zip (logo and favicon set)
