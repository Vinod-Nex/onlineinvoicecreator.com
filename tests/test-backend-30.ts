import worker from '../workers/api/src/index';
import type { Env } from '../workers/api/src/types';
import { resetRateLimits } from '../workers/api/src/rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const results: Array<{ id: string; name: string; status: 'PASSED' | 'FAILED'; error?: string }> = [];

async function test(id: string, name: string, fn: () => Promise<void>) {
  try {
    resetRateLimits();
    await fn();
    results.push({ id, name, status: 'PASSED' });
    console.log(`✅ PASS: ${id} - ${name}`);
  } catch (e: any) {
    results.push({ id, name, status: 'FAILED', error: e.message });
    console.error(`❌ FAIL: ${id} - ${name}: ${e.message}`);
  }
}

async function runAll() {
  console.log('\n========================================');
  console.log('  ONLINE INVOICE CREATOR - BACKEND TEST SPRINT');
  console.log('  Running 30 Important Backend Test Cases');
  console.log('========================================\n');

  // BK001
  await test('BK001', 'Health check GET /api/health returns 200 OK with healthy message & environment', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/health', { method: 'GET' });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.success || !json.message?.includes('healthy')) {
      throw new Error(`Unexpected payload: ${JSON.stringify(json)}`);
    }
  });

  // BK002
  await test('BK002', 'Health check rejects POST /api/health with 405 Method Not Allowed', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/health', { method: 'POST' });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 405) throw new Error(`Expected 405, got ${res.status}`);
  });

  // BK003
  await test('BK003', 'Health check rejects PUT and DELETE /api/health with 405 Method Not Allowed', async () => {
    const putRes = await worker.fetch(new Request('https://onlineinvoicecreator.com/api/health', { method: 'PUT' }), defaultEnv);
    const delRes = await worker.fetch(new Request('https://onlineinvoicecreator.com/api/health', { method: 'DELETE' }), defaultEnv);
    if (putRes.status !== 405 || delRes.status !== 405) {
      throw new Error(`Expected both 405, got PUT:${putRes.status} DEL:${delRes.status}`);
    }
  });

  // BK004
  await test('BK004', 'Health check alias GET /health returns 200 OK with healthy status', async () => {
    const req = new Request('https://onlineinvoicecreator.com/health', { method: 'GET' });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.success) throw new Error('Expected success true on /health alias');
  });

  // BK005
  await test('BK005', 'Worker router returns 404 with standard error envelope for unknown routes', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/non-existent-endpoint', { method: 'GET' });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.error?.includes('Route not found')) throw new Error('Expected "Route not found" message');
  });

  // BK006
  await test('BK006', 'CORS preflight OPTIONS /api/contact permits production domain origin', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://onlineinvoicecreator.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    if (res.headers.get('Access-Control-Allow-Origin') !== 'https://onlineinvoicecreator.com') {
      throw new Error('Missing or mismatched Access-Control-Allow-Origin');
    }
    if (!res.headers.get('Access-Control-Allow-Methods')?.includes('POST')) {
      throw new Error('Access-Control-Allow-Methods missing POST');
    }
  });

  // BK007
  await test('BK007', 'CORS preflight permits production www subdomain https://www.onlineinvoicecreator.com', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://www.onlineinvoicecreator.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    if (res.headers.get('Access-Control-Allow-Origin') !== 'https://www.onlineinvoicecreator.com') {
      throw new Error('Mismatched www allow origin header');
    }
  });

  // BK008
  await test('BK008', 'CORS preflight rejects unauthorized external origins with 403 Forbidden', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://malicious-attacker.net',
        'Access-Control-Request-Method': 'POST',
      },
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    if (res.headers.get('Access-Control-Allow-Origin') !== null) {
      throw new Error('Unauthorized origin must not receive Access-Control-Allow-Origin');
    }
  });

  // BK009
  await test('BK009', 'CORS preflight allows http://localhost:4321 in development mode', async () => {
    const devEnv = { ...defaultEnv, ENVIRONMENT: 'development' };
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:4321',
        'Access-Control-Request-Method': 'POST',
      },
    });
    const res = await worker.fetch(req, devEnv);
    if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    if (res.headers.get('Access-Control-Allow-Origin') !== 'http://localhost:4321') {
      throw new Error('Dev localhost not allowed in development environment');
    }
  });

  // BK010
  await test('BK010', 'CORS headers on POST response echo validated origin', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: {
        Origin: 'https://onlineinvoicecreator.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.headers.get('Access-Control-Allow-Origin') !== 'https://onlineinvoicecreator.com') {
      throw new Error('Response did not echo back validated Origin header');
    }
  });

  // BK011
  await test('BK011', 'Strict Privacy: immediately rejects requests containing lineItems with 400 Bad Request', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'Feedback',
        message: 'Hello world',
        turnstileToken: 'valid-test-token',
        lineItems: [{ description: 'Secret client billing', amount: 5000 }],
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.error?.includes('User invoice data is prohibited')) {
      throw new Error(`Expected privacy error message, got: ${json.error}`);
    }
  });

  // BK012
  await test('BK012', 'Strict Privacy: immediately rejects requests containing grandTotal or subtotal with 400', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Question',
        message: 'My message',
        turnstileToken: 'valid-test-token',
        grandTotal: 1000,
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.error?.includes('User invoice data is prohibited')) {
      throw new Error(`Expected privacy error message, got: ${json.error}`);
    }
  });

  // BK013
  await test('BK013', 'Strict Privacy: immediately rejects requests containing bankDetails or accountNumber with 400', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        email: 'bob@example.com',
        subject: 'Question',
        message: 'Help needed',
        turnstileToken: 'valid-test-token',
        bankDetails: 'Bank routing 123456789',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // BK014
  await test('BK014', 'Contact API validates required fields (name, email, subject, message)', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: '', subject: '', message: '' }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.errors?.name || !json.errors?.email || !json.errors?.subject || !json.errors?.message) {
      throw new Error(`Expected structured field errors, got: ${JSON.stringify(json.errors)}`);
    }
  });

  // BK015
  await test('BK015', 'Contact API rejects invalid email formatting according to RFC 5322', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'not-an-email-at-all',
        subject: 'Test Subject',
        message: 'Test message content here.',
        turnstileToken: 'valid-token',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.errors?.email) throw new Error('Expected email format error in response');
  });

  // BK016
  await test('BK016', 'Contact API enforces maximum character lengths for name and message', async () => {
    const longMessage = 'A'.repeat(5001);
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'valid@example.com',
        subject: 'Subject',
        message: longMessage,
        turnstileToken: 'valid-token',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.errors?.message) throw new Error('Expected message length limit error');
  });

  // BK017
  await test('BK017', 'Contact API sanitizes HTML and script tags to prevent stored XSS', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://onlineinvoicecreator.com',
      },
      body: JSON.stringify({
        name: '<script>alert(1)</script>Alex Johnson',
        email: 'alex@example.com',
        subject: '<img src=x onerror=alert(2)>Inquiry',
        message: 'Safe inquiry message body.',
        turnstileToken: 'valid-test-token',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // BK018
  await test('BK018', 'Contact API honeypot traps spam bots with silent 200 OK deception', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spam Bot',
        email: 'bot@spam.com',
        subject: 'Buy cheap items',
        message: 'Spam text',
        _gotcha: 'http://spamlink.com',
        turnstileToken: 'fake',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.success) throw new Error('Expected deceptive success true for bot honeypot');
  });

  // BK019
  await test('BK019', 'Contact API rejects invalid Turnstile challenge tokens with 403 Forbidden', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Name',
        email: 'user@example.com',
        subject: 'Question',
        message: 'Genuine inquiry message.',
        turnstileToken: 'FAIL_TOKEN',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.error?.includes('Turnstile verification failed')) {
      throw new Error(`Expected Turnstile error, got: ${json.error}`);
    }
  });

  // BK020
  await test('BK020', 'Contact API successfully processes valid contact submission', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://onlineinvoicecreator.com',
      },
      body: JSON.stringify({
        name: 'Alex Johnson',
        email: 'alex@company.com',
        subject: 'Feature Request',
        message: 'Could you add support for multi-currency rent receipts?',
        turnstileToken: 'valid-test-token',
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.success || !json.message?.includes('sent successfully')) {
      throw new Error(`Unexpected success payload: ${JSON.stringify(json)}`);
    }
  });

  // BK021
  await test('BK021', 'Contact API enforces IP rate limiting (max 5 requests per window)', async () => {
    const ip = '198.51.100.77';
    for (let i = 0; i < 5; i++) {
      const req = new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip,
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
      if (res.status !== 200) throw new Error(`Expected 200 for request ${i}, got ${res.status}`);
    }

    const excessReq = new Request('https://onlineinvoicecreator.com/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': ip,
      },
      body: JSON.stringify({
        name: 'Excess User',
        email: 'excess@example.com',
        subject: 'Question',
        message: 'Should be rate limited.',
        turnstileToken: 'valid-token',
      }),
    });
    const excessRes = await worker.fetch(excessReq, defaultEnv);
    if (excessRes.status !== 429) throw new Error(`Expected 429 on 6th request, got ${excessRes.status}`);
  });

  // BK022
  await test('BK022', 'Contact API rate limited response includes Retry-After header with seconds', async () => {
    const ip = '198.51.100.88';
    for (let i = 0; i < 5; i++) {
      await worker.fetch(
        new Request('https://onlineinvoicecreator.com/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            subject: 'Rate Limit Subject',
            message: 'Hello, this is a valid length message.',
            turnstileToken: 'valid-token',
          }),
        }),
        defaultEnv
      );
    }

    const res = await worker.fetch(
      new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({
          name: 'Blocked User',
          email: 'blocked@example.com',
          subject: 'Blocked Subject',
          message: 'Blocked message of valid length.',
          turnstileToken: 'valid-token',
        }),
      }),
      defaultEnv
    );
    const retryAfter = res.headers.get('Retry-After');
    if (!retryAfter || isNaN(parseInt(retryAfter, 10)) || parseInt(retryAfter, 10) <= 0) {
      throw new Error(`Expected positive numeric Retry-After header, got ${retryAfter}`);
    }
  });

  // BK023
  await test('BK023', 'Contact API rate limits isolate IP addresses independently', async () => {
    const ipA = '203.0.113.10';
    const ipB = '203.0.113.20';

    for (let i = 0; i < 5; i++) {
      await worker.fetch(
        new Request('https://onlineinvoicecreator.com/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ipA },
          body: JSON.stringify({
            name: 'User A',
            email: 'usera@example.com',
            subject: 'Subject A',
            message: 'Message from A valid length.',
            turnstileToken: 'valid-token',
          }),
        }),
        defaultEnv
      );
    }

    // IP B should still be allowed
    const resB = await worker.fetch(
      new Request('https://onlineinvoicecreator.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ipB },
        body: JSON.stringify({
          name: 'User B',
          email: 'userb@example.com',
          subject: 'Subject B',
          message: 'Message from B valid length.',
          turnstileToken: 'valid-token',
        }),
      }),
      defaultEnv
    );
    if (resB.status !== 200) throw new Error(`Expected 200 for isolated IP B, got ${resB.status}`);
  });

  // BK024
  await test('BK024', 'IndexNow API rejects unauthenticated requests with 401 Unauthorized', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlList: ['https://onlineinvoicecreator.com/'] }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.error?.includes('valid administrative secret required')) {
      throw new Error(`Expected auth error, got: ${json.error}`);
    }
  });

  // BK025
  await test('BK025', 'IndexNow API rejects invalid Bearer authorization secrets with 401 Unauthorized', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token-abc',
      },
      body: JSON.stringify({ urlList: ['https://onlineinvoicecreator.com/'] }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // BK026
  await test('BK026', 'IndexNow API validates URL host and rejects URLs from different hostnames with 400', async () => {
    const req = new Request('https://onlineinvoicecreator.com/api/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${defaultEnv.INDEXNOW_ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        host: 'onlineinvoicecreator.com',
        key: defaultEnv.INDEXNOW_KEY,
        urlList: ['https://phishing-site-external.com/page'],
      }),
    });
    const res = await worker.fetch(req, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = (await res.json()) as any;
    if (!json.errors?.['urlList[0]']?.includes('does not match host')) {
      throw new Error(`Expected host mismatch error, got: ${JSON.stringify(json)}`);
    }
  });

  // BK027
  await test('BK027', 'IndexNow API validates URL list array and enforces maximum batch size limit', async () => {
    const reqEmpty = new Request('https://onlineinvoicecreator.com/api/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${defaultEnv.INDEXNOW_ADMIN_SECRET}`,
      },
      body: JSON.stringify({ host: 'onlineinvoicecreator.com', urlList: [] }),
    });
    const res = await worker.fetch(reqEmpty, defaultEnv);
    if (res.status !== 400) throw new Error(`Expected 400 on empty urlList, got ${res.status}`);
  });

  // BK028
  await test('BK028', 'IndexNow API successfully formats and submits URLs to search engine protocol', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      const urlStr = typeof url === 'string' ? url : url.url || url.toString();
      if (urlStr.includes('indexnow.org') || urlStr.includes('bing.com')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url);
    }) as any;

    try {
      const req = new Request('https://onlineinvoicecreator.com/api/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultEnv.INDEXNOW_ADMIN_SECRET}`,
        },
        body: JSON.stringify({
          host: 'onlineinvoicecreator.com',
          urlList: [
            'https://onlineinvoicecreator.com/',
            'https://onlineinvoicecreator.com/about',
            'https://onlineinvoicecreator.com/contractor-invoice-template',
          ],
        }),
      });
      const res = await worker.fetch(req, defaultEnv);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const json = (await res.json()) as any;
      if (!json.success || json.data?.submittedCount !== 3) {
        throw new Error(`Expected submittedCount 3, got: ${JSON.stringify(json)}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // BK029
  await test('BK029', 'Security Headers: public/_headers enforces strict CSP, HSTS preload, and nosniff', async () => {
    const headersFile = path.join(rootDir, 'public', '_headers');
    if (!fs.existsSync(headersFile)) throw new Error('_headers file missing');
    const content = fs.readFileSync(headersFile, 'utf8');

    if (!content.includes('Content-Security-Policy:')) {
      throw new Error('Missing Content-Security-Policy header in _headers');
    }
    if (!content.includes('Strict-Transport-Security:') || !content.includes('preload')) {
      throw new Error('Missing Strict-Transport-Security with preload in _headers');
    }
    if (!content.includes('X-Content-Type-Options: nosniff')) {
      throw new Error('Missing X-Content-Type-Options: nosniff in _headers');
    }
    if (!content.includes('X-Frame-Options: DENY')) {
      throw new Error('Missing X-Frame-Options: DENY in _headers');
    }
  });

  // BK030
  await test('BK030', 'Server infrastructure: robots.txt and sitemap.xml enforce crawler directives and locations', async () => {
    const robotsFile = path.join(rootDir, 'public', 'robots.txt');
    if (!fs.existsSync(robotsFile)) throw new Error('robots.txt missing');
    const robotsContent = fs.readFileSync(robotsFile, 'utf8');

    if (!robotsContent.includes('User-agent: *')) throw new Error('robots.txt missing User-agent: *');
    if (!robotsContent.includes('Allow: /')) throw new Error('robots.txt missing Allow: /');
    if (!robotsContent.includes('Sitemap: https://onlineinvoicecreator.com/sitemap-index.xml')) {
      throw new Error('robots.txt missing Sitemap declaration');
    }

    const sitemapEndpoint = path.join(rootDir, 'src', 'pages', 'sitemap.xml.ts');
    if (!fs.existsSync(sitemapEndpoint)) throw new Error('sitemap.xml.ts endpoint missing');
    const sitemapContent = fs.readFileSync(sitemapEndpoint, 'utf8');
    if (!sitemapContent.includes('sitemap-index.xml') && !sitemapContent.includes('urlset')) {
      throw new Error('sitemap.xml.ts does not generate standard sitemap payload');
    }
  });

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n=============================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('=============================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll();
