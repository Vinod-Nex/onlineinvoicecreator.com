/**
 * CORS handling module strictly restricted to https://{{DOMAIN}}
 */
import type { Env } from './types';

/**
 * Validates if the request origin is permitted.
 * In production: strictly https://${DOMAIN} or https://www.${DOMAIN}
 * In local/dev: also permits localhost:4321, 127.0.0.1:4321, localhost:3000
 */
export function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  const domain = env.DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const productionAllowed = [`https://${domain}`, `https://www.${domain}`];

  if (productionAllowed.includes(origin)) {
    return true;
  }

  // Allow local development origins when not in production
  if (env.ENVIRONMENT !== 'production') {
    const devAllowed = [
      'http://localhost:4321',
      'http://127.0.0.1:4321',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    if (devAllowed.includes(origin)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns standard security and CORS headers for responses
 */
export function getCorsHeaders(origin: string | null, env: Env): HeadersInit {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (origin && isAllowedOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-api-key';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

/**
 * Handles CORS Preflight OPTIONS requests
 */
export function handleOptions(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');

  if (origin && !isAllowedOrigin(origin, env)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed by CORS policy' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        Vary: 'Origin',
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, env),
  });
}

/**
 * Helper to generate JSON responses with CORS and security headers
 */
export function jsonResponse<T>(
  data: T,
  status: number,
  origin: string | null,
  env: Env,
  extraHeaders?: Record<string, string>
): Response {
  const corsHeaders = getCorsHeaders(origin, env);
  const combinedHeaders = new Headers(corsHeaders);
  combinedHeaders.set('Content-Type', 'application/json');

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      combinedHeaders.set(key, value);
    }
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: combinedHeaders,
  });
}
