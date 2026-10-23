# Title & Snippet Optimization Testing Matrix (Phase 37)

This document serves as the single source of truth for title testing and Search Console click-through rate (CTR) optimization across **Online Invoice Creator**.

---

## 1. Editorial & Click-Appeal Standards

Every title across the platform strictly adheres to these editorial rules:
1. **Specific:** Mentions exact deliverables (PDF, instant download, rent receipt, ATO GST, itemized items, freelance hourly/milestone).
2. **Honest:** Truthful representation of tool capabilities. 100% free, zero watermarks, client-side privacy, no sign-up.
3. **No All Caps:** Uses proper Title Case without shouting words (`FREE`, `BEST`, `NOW`, `CLICK`). Standard abbreviations (`PDF`, `POS`, `ABN`, `ATO`, `GST`, `HRA`) are capitalized according to statutory or technical convention.
4. **No Clickbait:** No curiosity gaps, hyperbole, or deceptive framing (e.g., avoiding "You Won't Believe...", "Secret Trick", "The Only Tool You Need").
5. **Length Limits:** Strictly $\le 60$ characters to avoid truncation in Google and Bing SERP snippets.
6. **Primary Keyword Front-Loading:** For all 9 core tool pages, the target primary keyword from `src/data/keyword-map.json` is located within the first 15 characters.

---

## 2. Title Testing Registry (2 Variants Per Page)

### Core Tool Pages (9 Pages)

| Page Route | Primary Keyword | Baseline (Variant A) | Chars | Test Candidate (Variant B) | Chars | Test Hypothesis / Optimization Goal |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| `/` | `invoice generator` | `Invoice Generator: Free Online PDF Invoices (No Signup)` | 53 | `Invoice Generator: Create Free PDF Invoices in Seconds` | 53 | **Speed vs Privacy:** Tests whether lead-time ("in Seconds") drives higher CTR than friction reduction ("No Signup"). |
| `/free-online-receipt-generator` | `online receipt generator` | `Online Receipt Generator: Free Cash & Payment Slips` | 51 | `Online Receipt Generator: Instant Free PDF Payment Slips` | 55 | **Format & Speed:** Tests whether emphasizing "Instant" and explicit "PDF" format increases organic clicks. |
| `/free-rent-receipt-generator` | `free rent receipt generator` | `Free Rent Receipt Generator for Tenants & Landlords` | 51 | `Free Rent Receipt Generator: HRA & Landlord Tax Slips` | 53 | **Tax Intent:** Tests whether targeting "HRA & Landlord Tax Slips" captures higher intent corporate tenants. |
| `/receipt-maker-with-items` | `receipt maker` | `Receipt Maker with Items: Itemized Sales & POS Slips` | 52 | `Receipt Maker with Items: Free Itemized Cash & POS Slips` | 56 | **Offer Clarity:** Tests whether adding "Free" in conjunction with "Cash & POS" improves commercial search CTR. |
| `/invoice-generator-for-freelancers` | `invoice generator for freelancers` | `Invoice Generator for Freelancers \| Fast & Free PDF` | 51 | `Invoice Generator for Freelancers: Hourly & Project Bills` | 57 | **Deliverable Framing:** Tests whether specifying "Hourly & Project Bills" resonates more with solo consultants than generic "Fast & Free". |
| `/invoice-generator-excel` | `invoice generator excel` | `Invoice Generator Excel Alternative \| Free PDF Creator` | 54 | `Invoice Generator Excel: Create Free PDF Invoices Online` | 56 | **Action Verb:** Tests whether action-oriented "Create Free PDF" outclicks comparative framing ("Alternative"). |
| `/contractor-invoice-template` | `contractor invoice template` | `Contractor Invoice Template: Free Trades & Labor Bills` | 54 | `Contractor Invoice Template: Labor & Materials PDF Bills` | 56 | **Industry Terminology:** Tests whether "Labor & Materials" addresses high-intent trade contractors seeking mechanic-lien proof. |
| `/photography-invoice-generator` | `photography invoice` | `Photography Invoice Generator: Studio & Event Bills` | 51 | `Photography Invoice Generator: Shoot & Licensing Bills` | 54 | **Value Signal:** Tests whether highlighting "Licensing Bills" captures high-ticket commercial photographers over generic shoot bills. |
| `/tax-invoice-template-australia` | `invoice template australia` | `Invoice Template Australia: ATO Tax & 10% GST Compliant` | 55 | `Invoice Template Australia: Free ATO Tax & GST Invoices` | 55 | **Compliance vs Free:** Tests whether emphasizing "Free ATO Tax" outperforms statutory compliance terminology. |

---

### Blog & Invoicing Guides (5 Pages)

| Page Route | Primary Keyword | Baseline (Variant A) | Chars | Test Candidate (Variant B) | Chars | Test Hypothesis / Optimization Goal |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| `/blog` | `invoicing guides` | `Invoicing Guides & Billing Tips \| Online Invoice Creator` | 56 | `Freelance Invoicing Guides & Tax Tips for Small Business` | 56 | **Audience Specificity:** Tests whether naming target personas (Freelance / Small Business) lifts hub discovery CTR. |
| `/blog/how-to-write-an-invoice-for-freelance-work` | `how to write an invoice for freelance work` | `How to Write an Invoice for Freelance Work \| Guide` | 50 | `How to Write a Freelance Invoice: Examples & Payment Terms` | 58 | **Resource Breadth:** Tests whether mentioning "Examples & Payment Terms" satisfies informational search intent faster. |
| `/blog/what-is-a-pro-forma-invoice` | `what is a pro forma invoice` | `What Is a Pro Forma Invoice? Definition & Worked Sample` | 55 | `What Is a Pro Forma Invoice vs Commercial Invoice? Guide` | 56 | **Comparison Intent:** Tests whether matching query comparison ("vs Commercial Invoice") captures high-volume exploratory searchers. |
| `/blog/invoice-vs-receipt` | `invoice vs receipt` | `Invoice vs Receipt: 5 Differences & When to Use Each` | 52 | `Invoice vs Receipt: Key Differences, Timing & Tax Rules` | 55 | **Tax Depth:** Tests whether accounting/tax angle ("Timing & Tax Rules") drives higher engagement than numbered list framing. |
| `/blog/how-to-number-invoices` | `how to number invoices` | `How to Number Invoices: Formats, Prefixes & Rules` | 49 | `How to Number Invoices: Sequential Formats & Tax Rules` | 54 | **Compliance Appeal:** Tests whether "Sequential Formats & Tax Rules" increases CTR for businesses worried about audit compliance. |

---

### Trust & Utility Pages (5 Pages)

| Page Route | Primary Keyword | Baseline (Variant A) | Chars | Test Candidate (Variant B) | Chars | Test Hypothesis / Optimization Goal |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| `/about` | `about online invoice creator` | `About Us \| Online Invoice Creator` | 33 | `About Online Invoice Creator: Free Client-Side Invoicing` | 56 | **Value Proposition:** Tests whether articulating the privacy architecture in the title improves informational CTR. |
| `/contact` | `contact support` | `Contact & Support \| Online Invoice Creator` | 42 | `Contact Support & Invoicing Help \| Online Invoice Creator` | 57 | **Assistance Intent:** Tests whether adding "Invoicing Help" captures users needing technical or billing guidance. |
| `/privacy` | `invoice generator privacy policy` | `Privacy Policy \| Online Invoice Creator` | 39 | `Privacy Policy: 100% Client-Side Invoicing & Zero Storage` | 57 | **Differentiator:** Tests whether stating zero server storage in the SERP snippet improves trust and click willingness. |
| `/terms` | `terms of service` | `Terms of Service \| Online Invoice Creator` | 41 | `Terms of Service & Usage Policy \| Online Invoice Creator` | 56 | **Clarity:** Tests whether pairing "Terms of Service" with "Usage Policy" matches legal intent more thoroughly. |
| `/changelog` | `invoice generator changelog` | `Changelog & Updates \| Online Invoice Creator` | 44 | `Changelog: Releases & Features \| Online Invoice Creator` | 55 | **Product Velocity:** Tests whether "Releases & Features" attracts users checking product maintenance and updates. |

---

## 3. Google Search Console Testing Protocol

To test Variant B against Variant A without confounding external seasonality or Google core algorithm shifts:

1. **Establish 28-Day Baseline:**
   - Record total Impressions, Clicks, Average Position, and CTR for Variant A across the target URL in Google Search Console (`Performance > Search Results > Pages`).
2. **Execute Single-Variable Switch:**
   - Swap `metaTitle` in `src/data/pages/<slug>.json` (or the respective Astro page) to Variant B.
   - Run `npm run test` and `npm run build` to verify character constraints and schema integrity.
   - Deploy to production and submit the updated URL via IndexNow (`npm run indexnow`).
3. **Observation Window (28 Days):**
   - Track daily CTR in GSC. Exclude impressions when average position changes by more than $\pm 1.5$ ranks (to ensure CTR differences are driven by title appeal rather than ranking fluctuation).
4. **Evaluation Criteria:**
   - **Win:** Variant B increases CTR by $\ge 10\%$ relative to Variant A with statistical significance ($p < 0.05$). Adopt permanently.
   - **Inconclusive:** CTR changes by $< 5\%$. Revert to Variant A.
   - **Loss:** CTR decreases. Revert to Variant A immediately.
