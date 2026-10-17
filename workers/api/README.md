# Online Invoice Creator - Serverless API Worker (`workers/api`)

This Cloudflare Worker provides serverless endpoints for **Online Invoice Creator** (`onlineinvoicecreator.com`).

---

## 🔒 Privacy Guarantee

> **No user invoice data ever reaches this Worker.**  
> All invoice, receipt, and rent receipt calculations, storage, and PDF rendering occur 100% locally in the user's browser client. The Worker strictly processes contact support submissions and internal search engine IndexNow notifications. Requests containing invoice fields are immediately rejected at the edge.

---

## 📡 Endpoints

### 1. `POST /api/contact`
Receives contact form submissions, verifies Cloudflare Turnstile bot protection, and delivers notification emails to the support inbox via a configured email provider.

- **Headers**:
  - `Content-Type: application/json`
  - `Origin: https://onlineinvoicecreator.com`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "subject": "Template Request",
    "message": "Could you add a freelance design contract template?",
    "cf-turnstile-response": "0.xxxxxx.xxxxxx",
    "_gotcha": ""
  }
  ```
- **Responses**:
  - `200 OK`: Message received and dispatched.
  - `400 Bad Request`: Validation failure (missing fields, invalid email, or invoice data detected).
  - `403 Forbidden`: Cloudflare Turnstile challenge failed or disallowed CORS origin.
  - `429 Too Many Requests`: Rate limit exceeded (default 5 requests / 10 minutes per IP).
  - `502 Bad Gateway`: Email provider rejected delivery.

### 2. `POST /api/indexnow`
Internal endpoint to notify search engines (Bing, Yandex, IndexNow network) when URLs or sitemaps change.

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <INDEXNOW_ADMIN_SECRET>` (or `x-api-key: <INDEXNOW_ADMIN_SECRET>`)
- **Request Body**:
  ```json
  {
    "host": "onlineinvoicecreator.com",
    "key": "your_indexnow_key",
    "urlList": [
      "https://onlineinvoicecreator.com/",
      "https://onlineinvoicecreator.com/about",
      "https://onlineinvoicecreator.com/free-online-receipt-generator"
    ]
  }
  ```
- **Responses**:
  - `200 OK` / `202 Accepted`: URLs submitted to IndexNow protocol.
  - `401 Unauthorized`: Missing or invalid administrative secret.
  - `400 Bad Request`: Invalid URLs or non-matching domain.
  - `429 Too Many Requests`: Rate limit exceeded.

### 3. `GET /api/health`
Edge health and readiness probe.

---

## 🌐 CORS Policy

CORS is strictly limited to `https://{{DOMAIN}}` (and `https://www.{{DOMAIN}}`). In local development (`ENVIRONMENT != 'production'`), localhost origins (`http://localhost:4321`) are also allowed.

All preflight `OPTIONS` requests from unauthorized origins are rejected with `403 Forbidden`.

---

## ⏱️ Rate Limiting

Rate limiting is enforced at the edge based on client network IP (`CF-Connecting-IP`):
- `/api/contact`: Default **5 requests per 10 minutes** per IP.
- `/api/indexnow`: Default **20 requests per minute** per IP.

---

## 🔐 Managing Secrets via `wrangler secret`

Production secrets are kept out of git and configured using the Cloudflare Wrangler CLI:

```bash
# 1. Cloudflare Turnstile secret key (from Cloudflare dashboard)
npx wrangler secret put TURNSTILE_SECRET_KEY --config workers/api/wrangler.toml

# 2. Administrative secret for calling /api/indexnow
npx wrangler secret put INDEXNOW_ADMIN_SECRET --config workers/api/wrangler.toml

# 3. IndexNow API key (32-character hexadecimal key hosted at /<key>.txt)
npx wrangler secret put INDEXNOW_KEY --config workers/api/wrangler.toml

# 4. Email delivery provider API key (Resend recommended)
npx wrangler secret put RESEND_API_KEY --config workers/api/wrangler.toml

# Alternative email provider secrets (if preferred):
# npx wrangler secret put POSTMARK_SERVER_TOKEN --config workers/api/wrangler.toml
# npx wrangler secret put SENDGRID_API_KEY --config workers/api/wrangler.toml
# npx wrangler secret put EMAIL_WEBHOOK_URL --config workers/api/wrangler.toml
```

---

## 💻 Local Development

1. Create a `.dev.vars` file based on `.dev.vars.example`:
   ```bash
   cp workers/api/.dev.vars.example workers/api/.dev.vars
   ```
2. Start the local worker emulator:
   ```bash
   npm run worker:dev
   ```
3. Run automated worker tests:
   ```bash
   npm test
   ```
