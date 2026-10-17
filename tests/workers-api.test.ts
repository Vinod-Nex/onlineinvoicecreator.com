import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../workers/api/src/index';
import type { Env } from '../workers/api/src/types';
import { resetRateLimits } from '../workers/api/src/rate-limit';

const defaultEnv: Env = {
  DOMAIN: 'onlineinvoicecreator.com',
  ENVIRONMENT: 'production',
  RATE_LIMIT_CONTACT_MAX: '5',
  RATE_LIMIT_CONTACT_WINDOW_SEC: '600',
  RATE_LIMIT_INDEXNOW_MAX: '20',
  RATE_LIMIT_INDEXNOW_WINDOW_SEC: '60',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  INDEXNOW_KEY: '24680abcdef1234567890abcdef12345',
  INDEXNOW_ADMIN_SECRET: 'test-admin-secret-token-xyz',
  EMAIL_PROVIDER: 'resend',
  CONTACT_EMAIL_TO: 'support@onlineinvoicecreator.com',
  CONTACT_EMAIL_FROM: 'contact@onlineinvoicecreator.com',
};

describe('Cloudflare Worker (workers/api)', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('returns 200 OK for GET /api/health', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/health', {
        method: 'GET',
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('healthy');
    });

    it('rejects POST to health check with 405 Method Not Allowed', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/health', {
        method: 'POST',
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(405);
    });
  });

  describe('CORS Enforcement (restricted to https://{{DOMAIN}})', () => {
    it('permits OPTIONS preflight from https://onlineinvoicecreator.com', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://onlineinvoicecreator.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://onlineinvoicecreator.com'
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('permits preflight from www subdomain https://www.onlineinvoicecreator.com', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://www.onlineinvoicecreator.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://www.onlineinvoicecreator.com'
      );
    });

    it('rejects preflight from unauthorized origin with 403 Forbidden', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://malicious-phishing-domain.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('allows localhost origin when ENVIRONMENT is development', async () => {
      const devEnv = { ...defaultEnv, ENVIRONMENT: 'development' };
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:4321',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const response = await worker.fetch(request, devEnv);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4321');
    });
  });

  describe('Strict Privacy Enforcement (Zero Invoice Data reaches Worker)', () => {
    it('immediately rejects requests containing invoice line items with 400 Bad Request', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.1',
        },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Feedback',
          message: 'Hello world',
          turnstileToken: 'valid-test-token',
          lineItems: [{ description: 'Secret client billing', amount: 5000 }],
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('User invoice data is prohibited');
    });

    it('immediately rejects requests containing bankDetails or grandTotal', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.2',
        },
        body: JSON.stringify({
          name: 'Alice',
          email: 'alice@example.com',
          subject: 'Question',
          message: 'My message',
          turnstileToken: 'valid-test-token',
          grandTotal: 1000,
          bankDetails: 'Secret IBAN',
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('User invoice data is prohibited');
    });
  });

  describe('Route: POST /api/contact', () => {
    it('validates required fields and reports errors', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '198.51.100.1',
        },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email-address',
          subject: '',
          message: 'hi',
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.errors?.name).toBeDefined();
      expect(json.errors?.email).toBeDefined();
      expect(json.errors?.subject).toBeDefined();
      expect(json.errors?.message).toBeDefined();
      expect(json.errors?.turnstile).toBeDefined();
    });

    it('silently discards spam bots caught by honeypot', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '198.51.100.2',
        },
        body: JSON.stringify({
          name: 'Bot Spammer',
          email: 'bot@spam.com',
          subject: 'Buy cheap watches',
          message: 'Spam payload text here',
          _gotcha: 'http://spam-link.example.com',
          turnstileToken: 'fake-token',
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('rejects failed Turnstile verification with 403 Forbidden', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '198.51.100.3',
        },
        body: JSON.stringify({
          name: 'Valid User',
          email: 'user@example.com',
          subject: 'Valid Question',
          message: 'This is a genuine inquiry message from a user.',
          turnstileToken: 'FAIL_TOKEN',
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Turnstile verification failed');
    });

    it('successfully processes valid contact submission', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://onlineinvoicecreator.com',
          'CF-Connecting-IP': '198.51.100.4',
        },
        body: JSON.stringify({
          name: 'Alex Johnson',
          email: 'alex@company.com',
          subject: 'Feature Request',
          message: 'Could you add support for multi-currency rent receipts?',
          turnstileToken: 'valid-test-token',
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('sent successfully');
    });

    it('enforces rate limiting when max requests are exceeded', async () => {
      const clientIp = '203.0.113.55';

      // Send 5 valid requests (max allowed)
      for (let i = 0; i < 5; i++) {
        const req = new Request('https://onlineinvoicecreator.com/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': clientIp,
          },
          body: JSON.stringify({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            subject: 'Question',
            message: 'Hello, this is a test message.',
            turnstileToken: 'valid-token',
          }),
        });
        const res = await worker.fetch(req, defaultEnv);
        expect(res.status).toBe(200);
      }

      // 6th request should trigger rate limit (429)
      const excessReq = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': clientIp,
        },
        body: JSON.stringify({
          name: 'User 6',
          email: 'user6@example.com',
          subject: 'Question',
          message: 'Rate limit test message.',
          turnstileToken: 'valid-token',
        }),
      });

      const excessRes = await worker.fetch(excessReq, defaultEnv);
      expect(excessRes.status).toBe(429);
      expect(excessRes.headers.get('Retry-After')).toBeDefined();
      const excessJson = await excessRes.json();
      expect(excessJson.success).toBe(false);
      expect(excessJson.error).toContain('Too many contact requests');
    });
  });

  describe('Route: POST /api/indexnow', () => {
    it('rejects unauthorized requests missing admin secret with 401', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '198.51.100.10',
        },
        body: JSON.stringify({
          urlList: ['https://onlineinvoicecreator.com/'],
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('valid administrative secret required');
    });

    it('rejects requests with invalid authorization token with 401', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-secret',
          'CF-Connecting-IP': '198.51.100.11',
        },
        body: JSON.stringify({
          urlList: ['https://onlineinvoicecreator.com/'],
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(401);
    });

    it('validates URL list format and domain mismatch', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultEnv.INDEXNOW_ADMIN_SECRET}`,
          'CF-Connecting-IP': '198.51.100.12',
        },
        body: JSON.stringify({
          host: 'onlineinvoicecreator.com',
          key: defaultEnv.INDEXNOW_KEY,
          urlList: ['https://external-unrelated-domain.com/page'],
        }),
      });

      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.errors?.['urlList[0]']).toContain('does not match host');
    });

    it('submits valid URLs to IndexNow protocol', async () => {
      // Mock global fetch for IndexNow API endpoint
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
        const urlStr =
          typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
        if (urlStr.includes('indexnow.org')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(url);
      });

      try {
        const request = new Request('https://onlineinvoicecreator.com/api/indexnow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${defaultEnv.INDEXNOW_ADMIN_SECRET}`,
            'CF-Connecting-IP': '198.51.100.13',
          },
          body: JSON.stringify({
            host: 'onlineinvoicecreator.com',
            urlList: [
              'https://onlineinvoicecreator.com/',
              'https://onlineinvoicecreator.com/about',
              'https://onlineinvoicecreator.com/free-online-receipt-generator',
            ],
          }),
        });

        const response = await worker.fetch(request, defaultEnv);
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.submittedCount).toBe(3);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Route Not Found', () => {
    it('returns 404 for non-existent endpoint', async () => {
      const request = new Request('https://onlineinvoicecreator.com/api/unknown-endpoint', {
        method: 'GET',
      });
      const response = await worker.fetch(request, defaultEnv);
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toContain('Route not found');
    });
  });
});
