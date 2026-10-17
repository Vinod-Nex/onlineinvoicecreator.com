/**
 * Cloudflare Worker: onlineinvoicecreator-api
 *
 * Routes:
 * - POST /api/contact   -> Validate input, verify Cloudflare Turnstile, dispatch email
 * - POST /api/indexnow  -> Internal route to notify search engines of changed URLs
 * - GET  /api/health    -> Health status check
 *
 * Security & Privacy:
 * - CORS strictly restricted to https://{{DOMAIN}}
 * - Zero user invoice data stored or processed (strictly prohibited)
 * - Rate limited per IP
 * - Honeypot & Turnstile bot defense
 */

import type { Env, ApiResponse } from './types';
import { handleOptions, jsonResponse } from './cors';
import { checkRateLimit } from './rate-limit';
import { validateContactInput, validateIndexNowInput, containsInvoiceData } from './validation';
import { verifyTurnstileToken } from './turnstile';
import { sendContactEmail } from './email';
import { submitToIndexNow } from './indexnow';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      '127.0.0.1';

    // 2. Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      if (request.method !== 'GET') {
        return jsonResponse<ApiResponse>(
          { success: false, error: 'Method not allowed' },
          405,
          origin,
          env
        );
      }
      return jsonResponse<ApiResponse>(
        {
          success: true,
          message: 'onlineinvoicecreator-api healthy',
          data: {
            environment: env.ENVIRONMENT || 'production',
            domain: env.DOMAIN,
          },
        },
        200,
        origin,
        env
      );
    }

    // 3. Route: POST /api/contact
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return jsonResponse<ApiResponse>(
          { success: false, error: 'Method not allowed. Use POST.' },
          405,
          origin,
          env
        );
      }

      // Rate limit check
      const maxContact = parseInt(env.RATE_LIMIT_CONTACT_MAX || '5', 10);
      const windowContact = parseInt(env.RATE_LIMIT_CONTACT_WINDOW_SEC || '600', 10);
      const limit = checkRateLimit(clientIp, 'contact', maxContact, windowContact);

      if (!limit.allowed) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: `Too many contact requests from this network. Please wait ${limit.resetSeconds} seconds before trying again.`,
          },
          429,
          origin,
          env,
          { 'Retry-After': String(limit.resetSeconds) }
        );
      }

      // Parse payload (JSON or URL-encoded/FormData)
      let rawBody: unknown;
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          rawBody = await request.json();
        } else if (
          contentType.includes('application/x-www-form-urlencoded') ||
          contentType.includes('multipart/form-data')
        ) {
          const formData = await request.formData();
          const obj: Record<string, string> = {};
          formData.forEach((value, key) => {
            if (typeof value === 'string') obj[key] = value;
          });
          rawBody = obj;
        } else {
          rawBody = await request.json().catch(() => ({}));
        }
      } catch {
        return jsonResponse<ApiResponse>(
          { success: false, error: 'Malformed request payload. Expected valid JSON.' },
          400,
          origin,
          env
        );
      }

      // Strict privacy guard: reject any invoice payload
      if (
        rawBody &&
        typeof rawBody === 'object' &&
        containsInvoiceData(rawBody as Record<string, unknown>)
      ) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: 'User invoice data is prohibited from being transmitted to this API worker.',
          },
          400,
          origin,
          env
        );
      }

      // Validate contact input
      const validation = validateContactInput(rawBody);
      if (!validation.isValid) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: 'Please correct the validation errors.',
            errors: validation.errors,
          },
          400,
          origin,
          env
        );
      }

      // Honeypot spam silent discard
      if (validation.isSpam) {
        return jsonResponse<ApiResponse>(
          {
            success: true,
            message: 'Your message has been sent successfully.',
          },
          200,
          origin,
          env
        );
      }

      const contactData = validation.data!;

      // Verify Cloudflare Turnstile token
      const turnstileResult = await verifyTurnstileToken(
        contactData.turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        clientIp
      );

      if (!turnstileResult.success) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error:
              'Turnstile verification failed. Please complete the security challenge and try again.',
          },
          403,
          origin,
          env
        );
      }

      // Dispatch contact email
      const emailResult = await sendContactEmail(contactData, env);
      if (!emailResult.success) {
        console.error('Email dispatch failure:', emailResult.error);
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error:
              'Failed to deliver message via email provider. Please email support@onlineinvoicecreator.com directly.',
          },
          502,
          origin,
          env
        );
      }

      return jsonResponse<ApiResponse>(
        {
          success: true,
          message: 'Thank you! Your message has been sent successfully.',
        },
        200,
        origin,
        env
      );
    }

    // 4. Route: POST /api/indexnow
    if (pathname === '/api/indexnow') {
      if (request.method !== 'POST') {
        return jsonResponse<ApiResponse>(
          { success: false, error: 'Method not allowed. Use POST.' },
          405,
          origin,
          env
        );
      }

      // Internal security: verify admin secret header
      const authHeader = request.headers.get('Authorization') || '';
      const apiKeyHeader = request.headers.get('x-api-key') || '';
      const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

      if (env.INDEXNOW_ADMIN_SECRET) {
        if (!providedSecret || providedSecret !== env.INDEXNOW_ADMIN_SECRET) {
          return jsonResponse<ApiResponse>(
            { success: false, error: 'Unauthorized: valid administrative secret required.' },
            401,
            origin,
            env
          );
        }
      }

      // Rate limit check
      const maxIndexNow = parseInt(env.RATE_LIMIT_INDEXNOW_MAX || '20', 10);
      const windowIndexNow = parseInt(env.RATE_LIMIT_INDEXNOW_WINDOW_SEC || '60', 10);
      const limit = checkRateLimit(clientIp, 'indexnow', maxIndexNow, windowIndexNow);

      if (!limit.allowed) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: `Too many IndexNow requests. Please wait ${limit.resetSeconds} seconds before trying again.`,
          },
          429,
          origin,
          env,
          { 'Retry-After': String(limit.resetSeconds) }
        );
      }

      // Parse payload
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return jsonResponse<ApiResponse>(
          { success: false, error: 'Malformed request payload. Expected valid JSON.' },
          400,
          origin,
          env
        );
      }

      // Privacy barrier
      if (
        rawBody &&
        typeof rawBody === 'object' &&
        containsInvoiceData(rawBody as Record<string, unknown>)
      ) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: 'User invoice data is prohibited from being transmitted to this API worker.',
          },
          400,
          origin,
          env
        );
      }

      // Validate IndexNow payload
      const validation = validateIndexNowInput(rawBody, env.DOMAIN, env.INDEXNOW_KEY);
      if (!validation.isValid) {
        return jsonResponse<ApiResponse>(
          {
            success: false,
            error: 'Invalid IndexNow payload.',
            errors: validation.errors,
          },
          400,
          origin,
          env
        );
      }

      // Submit to IndexNow API
      const indexNowResult = await submitToIndexNow(validation.data!);

      const responseStatus = indexNowResult.success
        ? indexNowResult.statusCode === 202
          ? 202
          : 200
        : indexNowResult.statusCode;

      return jsonResponse<ApiResponse>(
        {
          success: indexNowResult.success,
          message: indexNowResult.message,
          data: {
            submittedCount: indexNowResult.submittedCount,
            upstreamStatus: indexNowResult.statusCode,
          },
        },
        responseStatus >= 200 && responseStatus < 600 ? responseStatus : 502,
        origin,
        env
      );
    }

    // 5. Fallback for undefined routes
    return jsonResponse<ApiResponse>(
      {
        success: false,
        error: `Route not found: ${request.method} ${pathname}`,
      },
      404,
      origin,
      env
    );
  },
};
