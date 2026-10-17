#!/usr/bin/env node

/**
 * Phase 21: Keyword Map Generator
 *
 * Reads keywords_all_ranked.csv, filters out rows with excluded_reason and brand names,
 * clusters rows sharing the same volume and competition index, and outputs
 * `src/data/keyword-map.json` mapping one primary keyword per page, supporting phrases
 * for H2s and FAQs, target volume, and index without keyword overlaps.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate CSV file (either in parent directory or current directory)
const possiblePaths = [
  path.resolve(__dirname, '../../../keywords_all_ranked.csv'),
  path.resolve(__dirname, '../../keywords_all_ranked.csv'),
  path.resolve(__dirname, '../keywords_all_ranked.csv'),
  '/Users/vinodkumar/Desktop/playground/invoice generator/keywords_all_ranked.csv',
];

let csvPath = possiblePaths.find((p) => fs.existsSync(p));
if (!csvPath) {
  console.error('❌ Could not locate keywords_all_ranked.csv');
  process.exit(1);
}

console.log(`📖 Reading keywords from: ${csvPath}`);
const rawCsv = fs.readFileSync(csvPath, 'utf8');
const lines = rawCsv.split('\n');

const brandPatterns = [
  /\bzoho\b/i,
  /\bwave\b/i,
  /\bpaypal\b/i,
  /\bcleartax\b/i,
  /\bquickbooks?\b/i,
  /\bhubspot\b/i,
  /\bfreshbooks?\b/i,
  /\bsquare\b/i,
  /\binvoiced\b/i,
];

// Parse CSV rows
const allKeywords = [];
const clusterMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = [];
  let cur = '';
  let inQuotes = false;
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur.trim());

  const [language, keyword, volume, competition, compIndex, , , , excludedReason] = parts;

  // 1. Exclude rows with excluded_reason
  if (excludedReason && excludedReason.trim().length > 0) {
    continue;
  }

  // 2. Exclude brand names
  const isBrand = brandPatterns.some((pattern) => pattern.test(keyword));
  if (isBrand) {
    continue;
  }

  const vol = parseInt(volume, 10) || 0;
  const idx = parseInt(compIndex, 10) || 0;
  const comp = (competition || 'Low').trim();
  const kw = keyword.toLowerCase().trim();
  const clusterKey = `${vol}_${idx}`;

  const record = {
    keyword: kw,
    volume: vol,
    competition: comp,
    competitionIndex: idx,
    clusterKey,
  };

  allKeywords.push(record);

  if (!clusterMap.has(clusterKey)) {
    clusterMap.set(clusterKey, {
      clusterKey,
      volume: vol,
      competitionIndex: idx,
      competition: comp,
      keywords: [],
    });
  }
  clusterMap.get(clusterKey).keywords.push(kw);
}

console.log(
  `✅ Loaded ${allKeywords.length} valid non-brand keywords across ${clusterMap.size} clusters.`
);

// Helper to look up volume and index for phrases
function getKeywordMetrics(phrase, fallbackVol = 500, fallbackIdx = 40, fallbackComp = 'Medium') {
  const match = allKeywords.find((k) => k.keyword === phrase.toLowerCase().trim());
  if (match) {
    return {
      volume: match.volume,
      competitionIndex: match.competitionIndex,
      competition: match.competition,
      clusterKey: match.clusterKey,
    };
  }
  return {
    volume: fallbackVol,
    competitionIndex: fallbackIdx,
    competition: fallbackComp,
    clusterKey: `${fallbackVol}_${fallbackIdx}`,
  };
}

// Global set to guarantee NO KEYWORD IS ASSIGNED TO TWO PAGES
const assignedKeywords = new Set();

function assignPhrases(pagePath, list) {
  const uniqueList = [];
  for (const item of list) {
    const normalized = item.toLowerCase().trim();
    if (assignedKeywords.has(normalized)) {
      throw new Error(
        `Duplicate keyword detected! "${normalized}" is already assigned to another page.`
      );
    }
    assignedKeywords.add(normalized);
    const metrics = getKeywordMetrics(normalized);
    uniqueList.push({
      phrase: normalized,
      volume: metrics.volume,
      competitionIndex: metrics.competitionIndex,
      competition: metrics.competition,
    });
  }
  return uniqueList;
}

function assignPrimary(phrase, overrideVol, overrideIdx, overrideComp) {
  const normalized = phrase.toLowerCase().trim();
  if (assignedKeywords.has(normalized)) {
    throw new Error(`Primary keyword duplicate! "${normalized}" already assigned.`);
  }
  assignedKeywords.add(normalized);
  const metrics = getKeywordMetrics(normalized, overrideVol, overrideIdx, overrideComp);
  return {
    keyword: normalized,
    volume: metrics.volume,
    competitionIndex: metrics.competitionIndex,
    competition: metrics.competition,
    clusterKey: metrics.clusterKey,
  };
}

// Define the 13 site pages
const pagesData = {};

// 1. Homepage / Core Invoice Generator
{
  const primary = assignPrimary('invoice generator', 500000, 14, 'Low');
  const h2s = assignPhrases('/', [
    'free invoice generator',
    'create invoice free',
    'free online invoice generator',
    'invoice maker',
    'invoice builder',
  ]);
  const faqs = assignPhrases('/', [
    'online bill generator free',
    'invoice generator with logo',
    'create online invoice for free',
    'free online bill generator',
  ]);
  const supporting = assignPhrases('/', [
    'invoice generator tool',
    'free bill generator',
    'freeinvoice generator',
    'create a invoice online free',
    'invoice creator free online',
    'online invoice generator',
    'online invoice maker',
    'online bill generator',
  ]);

  pagesData['/'] = {
    path: '/',
    pageTitle: 'Free Online Invoice Generator | 100% Free & Private',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 2. Free Online Receipt Generator
{
  const primary = assignPrimary('online receipt generator', 5000, 45, 'Medium');
  const h2s = assignPhrases('/free-online-receipt-generator', [
    'receipt generator',
    'online receipt maker',
    'free receipt maker',
    'receipt generator free',
  ]);
  const faqs = assignPhrases('/free-online-receipt-generator', [
    'generate a receipt online',
    'receipt maker online free',
    'receipt creator free',
    'cash receipt generator',
  ]);
  const supporting = assignPhrases('/free-online-receipt-generator', [
    'generator receipt',
    'online receipt creator',
    'receipts generator free',
    'simple receipt generator',
    'custom receipt generator',
    'custom receipt maker',
  ]);

  pagesData['/free-online-receipt-generator'] = {
    path: '/free-online-receipt-generator',
    pageTitle: 'Free Online Receipt Generator - Cash & Itemized',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 3. Free Rent Receipt Generator
{
  const primary = assignPrimary('free rent receipt generator', 500, 3, 'Low');
  const h2s = assignPhrases('/free-rent-receipt-generator', [
    'free rent receipt maker',
    'rental receipt generator online',
    'rent receipt generator for hra',
    'house rent receipt generator online',
  ]);
  const faqs = assignPhrases('/free-rent-receipt-generator', [
    'hra rent receipt generator',
    'rent receipt format generator',
    'online rent receipt without watermark',
    'rent receipt generator monthly',
  ]);
  const supporting = assignPhrases('/free-rent-receipt-generator', [
    'generate rent receipt for hra',
    'online rent slip generator',
    'rent receipt generator yearly',
    'home rent receipt generator',
    'house rent slip generator',
    'create rent slip online',
  ]);

  pagesData['/free-rent-receipt-generator'] = {
    path: '/free-rent-receipt-generator',
    pageTitle: 'Free Rent Receipt Generator for Tenants & Landlords',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 4. Receipt Maker with Items
{
  const primary = assignPrimary('receipt maker', 50000, 59, 'Medium');
  const h2s = assignPhrases('/receipt-maker-with-items', [
    'itemized receipt maker',
    'sales receipt maker',
    'retail receipt generator',
    'itemized receipt generator',
  ]);
  const faqs = assignPhrases('/receipt-maker-with-items', [
    'receipt maker with items',
    'create receipt with items',
    'pos receipt maker',
    'itemized sales receipt',
  ]);
  const supporting = assignPhrases('/receipt-maker-with-items', [
    'receipt editor',
    'create receipt',
    'receipt maker app',
    'receipt creator app',
    'email receipt generator',
  ]);

  pagesData['/receipt-maker-with-items'] = {
    path: '/receipt-maker-with-items',
    pageTitle: 'Online Receipt Maker with Items - Free Sales Receipts',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 5. Invoice Generator for Freelancers
{
  const primary = assignPrimary('invoice generator for freelancers', 500, 46, 'Medium');
  const h2s = assignPhrases('/invoice-generator-for-freelancers', [
    'freelance invoice',
    'freelance invoice generator',
    'freelance invoice template',
    'freelancer billing template',
  ]);
  const faqs = assignPhrases('/invoice-generator-for-freelancers', [
    'invoice for freelance work',
    'freelancer invoice maker',
    'invoice template for freelancers',
    'billing for freelancers',
  ]);
  const supporting = assignPhrases('/invoice-generator-for-freelancers', [
    'freelance design invoice',
    'freelance contractor billing',
    'freelancer hourly billing',
    'consultant invoice template',
  ]);

  pagesData['/invoice-generator-for-freelancers'] = {
    path: '/invoice-generator-for-freelancers',
    pageTitle: 'Invoice Generator for Freelancers | Free & Private',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 6. Invoice Generator Excel Alternative
{
  const primary = assignPrimary('invoice generator excel', 500, 43, 'Medium');
  const h2s = assignPhrases('/invoice-generator-excel', [
    'generate an invoice from excel',
    'invoice maker excel',
    'excel invoice maker',
    'generate invoice in excel',
  ]);
  const faqs = assignPhrases('/invoice-generator-excel', [
    'invoice creator excel',
    'bill generator excel',
    'excel invoice generator template',
    'excel receipt generator',
  ]);
  const supporting = assignPhrases('/invoice-generator-excel', [
    'self employed invoice template excel',
  ]);

  pagesData['/invoice-generator-excel'] = {
    path: '/invoice-generator-excel',
    pageTitle: 'Excel Invoice Generator Alternative - Free PDF Creator',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 7. Contractor Invoice Template
{
  const primary = assignPrimary('contractor invoice template', 5000, 96, 'High');
  const h2s = assignPhrases('/contractor-invoice-template', [
    'contractor invoice example',
    'invoice forms for contractors',
    'sample contractor invoice',
    'contractor billing template',
  ]);
  const faqs = assignPhrases('/contractor-invoice-template', [
    'contractor bill template',
    'contractor bill format',
    'invoice for contractor template',
    'contractor billing invoice template',
  ]);
  const supporting = assignPhrases('/contractor-invoice-template', [
    'format of contractor bill',
    'independent contractor invoice template',
    'subcontractor invoice template',
  ]);

  pagesData['/contractor-invoice-template'] = {
    path: '/contractor-invoice-template',
    pageTitle: 'Free Contractor Invoice Template - Construction & Trades',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 8. Photography Invoice Generator
{
  const primary = assignPrimary('photography invoice', 500, 86, 'High');
  const h2s = assignPhrases('/photography-invoice-generator', [
    'photographer invoice template',
    'photographer invoice example',
    'photography invoice template',
    'photography invoice example',
  ]);
  const faqs = assignPhrases('/photography-invoice-generator', [
    'photography invoice sample',
    'photography bill format',
    'photography invoice format',
    'bill format for photography',
  ]);
  const supporting = assignPhrases('/photography-invoice-generator', [
    'photography invoice template word',
    'freelance photography invoice',
    'wedding photography invoice template',
  ]);

  pagesData['/photography-invoice-generator'] = {
    path: '/photography-invoice-generator',
    pageTitle: 'Photography Invoice Generator - Studio & Commercial',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 9. Australia Tax Invoice Template (ATO)
{
  const primary = assignPrimary('invoice template australia', 5000, 72, 'High');
  const h2s = assignPhrases('/tax-invoice-template-australia', [
    'tax invoice template australia ato',
    'free tax invoice template australia',
    'australian tax invoice template word',
    'australian invoice generator',
  ]);
  const faqs = assignPhrases('/tax-invoice-template-australia', [
    'invoice template australia no gst',
    'free invoice template australia',
    'tax invoice format australia',
    'simple tax invoice template australia',
  ]);
  const supporting = assignPhrases('/tax-invoice-template-australia', [
    'australian invoice example',
    'sample invoice template australia',
    'australian invoice sample',
    'tax invoice template australia',
  ]);

  pagesData['/tax-invoice-template-australia'] = {
    path: '/tax-invoice-template-australia',
    pageTitle: 'Tax Invoice Template Australia | ATO Compliant (GST)',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 10. About Us
{
  const primary = assignPrimary('about online invoice creator', 100, 10, 'Low');
  const h2s = assignPhrases('/about', [
    'free private invoice generator',
    'client side invoice creator',
  ]);
  const faqs = assignPhrases('/about', [
    'no server invoice generator',
    'watermark free invoice builder',
  ]);
  const supporting = assignPhrases('/about', [
    'browser based invoice creator',
    'secure invoice generator tool',
  ]);

  pagesData['/about'] = {
    path: '/about',
    pageTitle: 'About Us | Online Invoice Creator',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 11. Contact Support
{
  const primary = assignPrimary('contact online invoice creator', 100, 10, 'Low');
  const h2s = assignPhrases('/contact', ['invoice generator support', 'template feedback']);
  const faqs = assignPhrases('/contact', ['report calculation issue', 'invoice tool feedback']);
  const supporting = assignPhrases('/contact', [
    'invoice creator customer service',
    'billing software help desk',
  ]);

  pagesData['/contact'] = {
    path: '/contact',
    pageTitle: 'Contact Support & Feedback | Online Invoice Creator',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 12. Privacy Policy
{
  const primary = assignPrimary('invoice generator privacy policy', 100, 10, 'Low');
  const h2s = assignPhrases('/privacy', [
    'local first invoice generator privacy',
    'browser data storage invoicing',
  ]);
  const faqs = assignPhrases('/privacy', ['secure invoice generation', 'zero server data storage']);
  const supporting = assignPhrases('/privacy', [
    'client confidentiality invoice maker',
    'gdpr compliant invoice creator',
  ]);

  pagesData['/privacy'] = {
    path: '/privacy',
    pageTitle: 'Privacy Policy | Online Invoice Creator',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// 13. Terms of Service
{
  const primary = assignPrimary('invoice generator terms of service', 100, 10, 'Low');
  const h2s = assignPhrases('/terms', [
    'invoice maker terms of use',
    'commercial invoice usage guidelines',
  ]);
  const faqs = assignPhrases('/terms', [
    'document generation legal disclaimer',
    'acceptable invoicing practices',
  ]);
  const supporting = assignPhrases('/terms', [
    'legal terms online invoice creator',
    'commercial document generator policy',
  ]);

  pagesData['/terms'] = {
    path: '/terms',
    pageTitle: 'Terms of Service | Online Invoice Creator',
    primaryKeyword: primary.keyword,
    targetVolume: primary.volume,
    competitionIndex: primary.competitionIndex,
    competition: primary.competition,
    clusterKey: primary.clusterKey,
    h2Phrases: h2s,
    faqPhrases: faqs,
    supportingPhrases: supporting,
  };
}

// Convert clusters to structured array for output
const clustersOutput = Array.from(clusterMap.values())
  .sort((a, b) => b.volume - a.volume || a.competitionIndex - b.competitionIndex)
  .map((c) => ({
    clusterKey: c.clusterKey,
    volume: c.volume,
    competitionIndex: c.competitionIndex,
    competition: c.competition,
    keywordCount: c.keywords.length,
    sampleKeywords: c.keywords.slice(0, 5),
  }));

const finalOutput = {
  $schema: './keyword-map.schema.json',
  meta: {
    description: 'Targeted SEO keyword map and search volume cluster registry',
    totalKeywordsProcessed: allKeywords.length,
    totalClustersDetected: clusterMap.size,
    totalPagesMapped: Object.keys(pagesData).length,
    totalUniqueKeywordsAssigned: assignedKeywords.size,
    uniquenessCheck: 'Passed - 0 duplicate keyword assignments',
  },
  pages: pagesData,
  clusters: clustersOutput,
};

const outputPath = path.resolve(__dirname, '../src/data/keyword-map.json');
fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2) + '\n', 'utf8');

console.log(`\n🎉 Success! Wrote keyword map to ${outputPath}`);
console.log(`📊 Summary:`);
console.log(`   • Total pages mapped: ${Object.keys(pagesData).length}`);
console.log(`   • Total unique keywords assigned: ${assignedKeywords.size}`);
console.log(`   • Uniqueness guaranteed: 100% (No keyword assigned to two pages)`);
