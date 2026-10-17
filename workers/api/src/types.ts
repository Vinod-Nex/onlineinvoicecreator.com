/**
 * Cloudflare Worker Environment Bindings and Type Definitions
 */

export interface Env {
  // Public variables defined in wrangler.toml [vars]
  DOMAIN: string;
  ENVIRONMENT?: string;
  RATE_LIMIT_CONTACT_MAX?: string;
  RATE_LIMIT_CONTACT_WINDOW_SEC?: string;
  RATE_LIMIT_INDEXNOW_MAX?: string;
  RATE_LIMIT_INDEXNOW_WINDOW_SEC?: string;
  EMAIL_PROVIDER?: 'resend' | 'postmark' | 'sendgrid' | 'webhook';
  CONTACT_EMAIL_TO?: string;
  CONTACT_EMAIL_FROM?: string;

  // Secrets configured via `wrangler secret put`
  TURNSTILE_SECRET_KEY?: string;
  INDEXNOW_KEY?: string;
  INDEXNOW_ADMIN_SECRET?: string;
  RESEND_API_KEY?: string;
  POSTMARK_SERVER_TOKEN?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_WEBHOOK_URL?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  data?: T;
}

export interface ValidatedContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
}

export interface ValidatedIndexNowInput {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

export interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}
