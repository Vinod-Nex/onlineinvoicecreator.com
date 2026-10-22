import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  findIndexNowKey,
  detectChangedUrls,
  submitUrlsViaWorker,
  ALL_INDEXABLE_URLS,
  DEFAULT_HOST,
  DEFAULT_SITE_ORIGIN,
  DEFAULT_WORKER_ENDPOINT,
} from '../scripts/submit-indexnow.mjs';
import worker from '../workers/api/src/index';
import type { Env } from '../workers/api/src/types';
import { resetRateLimits } from '../workers/api/src/rate-limit';

const TEST_KEY = '24680abcdef1234567890abcdef12345';
const TEST_SECRET = 'test-deploy-admin-secret-xyz';

const workerEnv: Env = {
  DOMAIN: 'onlineinvoicecreator.com',
  ENVIRONMENT: 'production',
  RATE_LIMIT_CONTACT_MAX: '5',
  RATE_LIMIT_CONTACT_WINDOW_SEC: '600',
  RATE_LIMIT_INDEXNOW_MAX: '20',
  RATE_LIMIT_INDEXNOW_WINDOW_SEC: '60',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  INDEXNOW_KEY: TEST_KEY,
  INDEXNOW_ADMIN_SECRET: TEST_SECRET,
  EMAIL_PROVIDER: 'resend',
  CONTACT_EMAIL_TO: 'support@onlineinvoicecreator.com',
  CONTACT_EMAIL_FROM: 'contact@onlineinvoicecreator.com',
};

describe('Phase 33: IndexNow & Fast Indexing Automation', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('1. IndexNow Key File Verification', () => {
    const keyFilePath = path.resolve(process.cwd(), `public/${TEST_KEY}.txt`);

    it('has an IndexNow key file present in public/ directory', () => {
      expect(fs.existsSync(keyFilePath)).toBe(true);
    });

    it('key file contents match the filename exactly', () => {
      const content = fs.readFileSync(keyFilePath, 'utf8').trim();
      expect(content).toBe(TEST_KEY);
    });

    it('key adheres strictly to the IndexNow protocol requirements (8-128 chars, hex/alphanumeric)', () => {
      expect(TEST_KEY.length).toBeGreaterThanOrEqual(8);
      expect(TEST_KEY.length).toBeLessThanOrEqual(128);
      expect(/^[a-zA-Z0-9-]{8,128}$/.test(TEST_KEY)).toBe(true);
    });

    it('findIndexNowKey() automatically discovers and returns the key from public/', () => {
      const discoveredKey = findIndexNowKey();
      expect(discoveredKey).toBe(TEST_KEY);
    });

    it('exports proper default endpoint and host constants', () => {
      expect(DEFAULT_HOST).toBe('onlineinvoicecreator.com');
      expect(DEFAULT_SITE_ORIGIN).toBe('https://onlineinvoicecreator.com');
      expect(DEFAULT_WORKER_ENDPOINT).toBe('https://onlineinvoicecreator.com/api/indexnow');
    });
  });

  describe('2. Master Registry of Indexable URLs', () => {
    it('contains exactly 14 indexable canonical URLs', () => {
      expect(ALL_INDEXABLE_URLS).toHaveLength(14);
    });

    it('includes all 9 core tool pages as priority URLs', () => {
      const expectedNineTools = [
        'https://onlineinvoicecreator.com/',
        'https://onlineinvoicecreator.com/free-online-receipt-generator',
        'https://onlineinvoicecreator.com/free-rent-receipt-generator',
        'https://onlineinvoicecreator.com/invoice-generator-for-freelancers',
        'https://onlineinvoicecreator.com/invoice-generator-excel',
        'https://onlineinvoicecreator.com/receipt-maker-with-items',
        'https://onlineinvoicecreator.com/tax-invoice-template-australia',
        'https://onlineinvoicecreator.com/contractor-invoice-template',
        'https://onlineinvoicecreator.com/photography-invoice-generator',
      ];

      for (const toolUrl of expectedNineTools) {
        expect(ALL_INDEXABLE_URLS).toContain(toolUrl);
      }
    });

    it('strictly excludes non-indexable routes (404 and style-guide)', () => {
      const nonIndexable = [
        'https://onlineinvoicecreator.com/404',
        'https://onlineinvoicecreator.com/style-guide',
      ];

      for (const forbidden of nonIndexable) {
        expect(ALL_INDEXABLE_URLS).not.toContain(forbidden);
      }
    });

    it('every URL uses https and the canonical apex domain without trailing slash (except root)', () => {
      for (const url of ALL_INDEXABLE_URLS) {
        expect(url.startsWith('https://onlineinvoicecreator.com')).toBe(true);
        if (url !== 'https://onlineinvoicecreator.com/') {
          expect(url.endsWith('/')).toBe(false);
        }
      }
    });
  });

  describe('3. Git Diff Change Detection Logic', () => {
    it('returns all 14 URLs when forceAll flag is enabled', () => {
      const result = detectChangedUrls({ forceAll: true });
      expect(result.urls).toHaveLength(14);
      expect(result.reason).toContain('Forced full submission');
    });

    it('returns all 14 URLs when global layout or styling changes', () => {
      const result = detectChangedUrls({
        changedFiles: ['src/layouts/BaseLayout.astro', 'README.md'],
      });
      expect(result.urls).toHaveLength(14);
      expect(result.reason).toContain('Global template');
    });

    it('returns all 14 URLs when package.json or astro config changes', () => {
      const result = detectChangedUrls({
        changedFiles: ['astro.config.mjs'],
      });
      expect(result.urls).toHaveLength(14);
      expect(result.reason).toContain('Global template');
    });

    it('identifies exact single page when a single page astro file changes', () => {
      const result = detectChangedUrls({
        changedFiles: ['src/pages/tax-invoice-template-australia.astro'],
      });
      expect(result.urls).toEqual([
        'https://onlineinvoicecreator.com/tax-invoice-template-australia',
      ]);
    });

    it('identifies exact single page when a single page json data file changes', () => {
      const result = detectChangedUrls({
        changedFiles: ['src/data/pages/free-online-receipt-generator.json'],
      });
      expect(result.urls).toEqual([
        'https://onlineinvoicecreator.com/free-online-receipt-generator',
      ]);
    });

    it('maps invoice client script changes to the 6 invoice tool pages', () => {
      const result = detectChangedUrls({
        changedFiles: ['src/scripts/invoice-form-client.ts'],
      });
      expect(result.urls).toHaveLength(6);
      expect(result.urls).toContain('https://onlineinvoicecreator.com/');
      expect(result.urls).toContain(
        'https://onlineinvoicecreator.com/tax-invoice-template-australia'
      );
      expect(result.urls).toContain('https://onlineinvoicecreator.com/contractor-invoice-template');
      expect(result.urls).toContain(
        'https://onlineinvoicecreator.com/invoice-generator-for-freelancers'
      );
      expect(result.urls).toContain('https://onlineinvoicecreator.com/invoice-generator-excel');
      expect(result.urls).toContain(
        'https://onlineinvoicecreator.com/photography-invoice-generator'
      );
    });

    it('returns empty array when only documentation or test files change', () => {
      const result = detectChangedUrls({
        changedFiles: ['docs/competitor-notes.md', 'tests/performance.test.ts'],
      });
      expect(result.urls).toHaveLength(0);
      expect(result.reason).toContain('0 specific URL(s)');
    });
  });

  describe('4. Worker IndexNow Submission Client', () => {
    it('handles dry-run mode without initiating network requests', async () => {
      const result = await submitUrlsViaWorker({
        urls: ['https://onlineinvoicecreator.com/'],
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('Dry run completed');
      expect(result.submittedCount).toBe(1);
    });

    it('gracefully skips submission when admin secret is absent', async () => {
      const result = await submitUrlsViaWorker({
        urls: ['https://onlineinvoicecreator.com/'],
        adminSecret: undefined,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(0);
      expect(result.message).toContain('INDEXNOW_ADMIN_SECRET is not configured');
    });

    it('successfully dispatches URLs to Cloudflare Worker endpoint', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi
          .fn()
          .mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
            const urlStr =
              typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();

            if (urlStr.includes('/api/indexnow')) {
              // Forward directly to worker mock fetch
              const request = new Request(urlStr, {
                method: init?.method,
                headers: init?.headers,
                body: init?.body,
              });
              return worker.fetch(request, workerEnv);
            }

            if (urlStr.includes('api.indexnow.org')) {
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }

            return originalFetch(url, init);
          });

        const urls = [
          'https://onlineinvoicecreator.com/',
          'https://onlineinvoicecreator.com/free-online-receipt-generator',
        ];

        const result = await submitUrlsViaWorker({
          urls,
          workerUrl: 'https://onlineinvoicecreator.com/api/indexnow',
          adminSecret: TEST_SECRET,
          key: TEST_KEY,
          host: 'onlineinvoicecreator.com',
          dryRun: false,
        });

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.submittedCount).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects submissions with wrong admin secret token', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi
          .fn()
          .mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
            const urlStr =
              typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
            if (urlStr.includes('/api/indexnow')) {
              const request = new Request(urlStr, {
                method: init?.method,
                headers: init?.headers,
                body: init?.body,
              });
              return worker.fetch(request, workerEnv);
            }
            return originalFetch(url, init);
          });

        await expect(
          submitUrlsViaWorker({
            urls: ['https://onlineinvoicecreator.com/'],
            workerUrl: 'https://onlineinvoicecreator.com/api/indexnow',
            adminSecret: 'wrong-admin-secret-token',
            key: TEST_KEY,
            host: 'onlineinvoicecreator.com',
            dryRun: false,
          })
        ).rejects.toThrow(/Worker IndexNow submission failed \(401\)/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
