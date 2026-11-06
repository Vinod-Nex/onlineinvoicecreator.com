#!/usr/bin/env node
/**
 * Build-time validation script for i18n dictionaries.
 * Verifies that all keys in src/i18n/en.json are present in all other locale dictionaries.
 * Exits with code 1 if any dictionary is missing keys.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const i18nDir = path.resolve(__dirname, '../src/i18n');

const enPath = path.join(i18nDir, 'en.json');
if (!fs.existsSync(enPath)) {
  console.error('❌ en.json not found at:', enPath);
  process.exit(1);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const targetLocales = ['pt-br', 'es', 'fr', 'de'];
let hasErrors = false;

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(getAllKeys(val, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

const enKeys = getAllKeys(en);

for (const locale of targetLocales) {
  const dictPath = path.join(i18nDir, `${locale}.json`);
  if (!fs.existsSync(dictPath)) {
    console.error(`❌ Missing dictionary file for locale "${locale}": ${dictPath}`);
    hasErrors = true;
    continue;
  }

  let dict;
  try {
    dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to parse JSON for locale "${locale}":`, err.message);
    hasErrors = true;
    continue;
  }

  const missingKeys = [];
  for (const key of enKeys) {
    const parts = key.split('.');
    let curr = dict;
    let found = true;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        found = false;
        break;
      }
    }
    if (!found) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    console.error(`❌ Locale "${locale}.json" is missing ${missingKeys.length} key(s):`);
    for (const k of missingKeys) {
      console.error(`   - ${k}`);
    }
    hasErrors = true;
  } else {
    console.log(`✅ Locale "${locale}.json" contains all ${enKeys.length} required keys.`);
  }
}

if (hasErrors) {
  console.error('\n💥 i18n dictionary verification failed.');
  process.exit(1);
} else {
  console.log(`\n🎉 All ${targetLocales.length} locale dictionaries are 100% complete and match en.json!`);
  process.exit(0);
}

