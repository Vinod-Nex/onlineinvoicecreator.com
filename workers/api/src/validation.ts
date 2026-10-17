/**
 * Input validation, schema enforcement, and invoice privacy guard
 */
import type { ValidatedContactInput, ValidatedIndexNowInput } from './types';

// RFC 5322 compliant email regex simplified for practical edge validation
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Strict privacy check: ensures no user invoice or financial data ever reaches the Worker.
 */
export function containsInvoiceData(data: Record<string, unknown>): boolean {
  const forbiddenInvoiceKeys = [
    'lineItems',
    'items',
    'invoiceNumber',
    'invoiceDate',
    'dueDate',
    'subtotal',
    'grandTotal',
    'taxAmount',
    'taxRate',
    'bankDetails',
    'bankName',
    'accountNumber',
    'routingNumber',
    'iban',
    'swift',
    'invoiceData',
    'clientDetails',
    'senderDetails',
    'paymentMode',
    'rentAmount',
    'landlordPan',
  ];

  const keys = Object.keys(data);
  for (const key of keys) {
    if (forbiddenInvoiceKeys.includes(key.toLowerCase()) || forbiddenInvoiceKeys.includes(key)) {
      return true;
    }
  }

  return false;
}

export interface ContactValidationResult {
  isValid: boolean;
  isSpam?: boolean;
  errors?: Record<string, string>;
  data?: ValidatedContactInput;
}

/**
 * Validates contact form submission
 */
export function validateContactInput(raw: unknown): ContactValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: { _general: 'Invalid request body: expected JSON object' },
    };
  }

  const body = raw as Record<string, unknown>;

  // Privacy barrier: reject any invoice payload
  if (containsInvoiceData(body)) {
    return {
      isValid: false,
      errors: {
        _privacy: 'User invoice data is prohibited from being transmitted to this API worker.',
      },
    };
  }

  // Honeypot check (_gotcha / hp)
  const honeypot = body['_gotcha'] ?? body['hp'];
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    // Treat as spam bot: valid response to bot, but flagged to discard silently
    return {
      isValid: true,
      isSpam: true,
    };
  }

  const errors: Record<string, string> = {};

  // Name
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  // Email
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  // Subject
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  if (!subject) {
    errors.subject = 'Subject is required.';
  } else if (subject.length > 150) {
    errors.subject = 'Subject must be 150 characters or fewer.';
  }

  // Message
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    errors.message = 'Message content is required.';
  } else if (message.length < 5) {
    errors.message = 'Message must be at least 5 characters.';
  } else if (message.length > 5000) {
    errors.message = 'Message must not exceed 5000 characters.';
  }

  // Turnstile token
  const token =
    (typeof body['cf-turnstile-response'] === 'string' && body['cf-turnstile-response'].trim()) ||
    (typeof body['turnstileToken'] === 'string' && body['turnstileToken'].trim()) ||
    '';

  if (!token) {
    errors.turnstile = 'Cloudflare Turnstile token is required.';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    isSpam: false,
    data: {
      name,
      email,
      subject,
      message,
      turnstileToken: token,
    },
  };
}

export interface IndexNowValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
  data?: ValidatedIndexNowInput;
}

/**
 * Validates IndexNow submission payload
 */
export function validateIndexNowInput(
  raw: unknown,
  defaultHost: string,
  defaultKey?: string
): IndexNowValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: { _general: 'Invalid request body: expected JSON object' },
    };
  }

  const body = raw as Record<string, unknown>;

  // Privacy barrier: reject any invoice payload
  if (containsInvoiceData(body)) {
    return {
      isValid: false,
      errors: {
        _privacy: 'User invoice data is prohibited from being transmitted to this API worker.',
      },
    };
  }

  const errors: Record<string, string> = {};

  // Host: defaults to defaultHost if not provided
  let host = typeof body.host === 'string' ? body.host.trim() : defaultHost;
  // Strip protocol if user included https://
  host = host
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (!host) {
    errors.host = 'Host domain is required.';
  }

  // Key: payload key or default env key
  const key = typeof body.key === 'string' && body.key.trim() ? body.key.trim() : defaultKey || '';
  if (!key) {
    errors.key = 'IndexNow key is required in payload or worker secret.';
  } else if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    errors.key = 'IndexNow key must be between 8 and 128 alphanumeric characters.';
  }

  // KeyLocation: optional
  let keyLocation: string | undefined = undefined;
  if (typeof body.keyLocation === 'string' && body.keyLocation.trim()) {
    try {
      const parsedUrl = new URL(body.keyLocation.trim());
      if (parsedUrl.hostname.toLowerCase() !== host) {
        errors.keyLocation = 'keyLocation URL must reside on the same host.';
      } else {
        keyLocation = parsedUrl.toString();
      }
    } catch {
      errors.keyLocation = 'keyLocation must be a valid absolute URL.';
    }
  }

  // urlList
  if (!Array.isArray(body.urlList) || body.urlList.length === 0) {
    errors.urlList = 'urlList must be a non-empty array of URL strings.';
  } else if (body.urlList.length > 10000) {
    errors.urlList = 'urlList exceeds the maximum allowed 10,000 URLs per IndexNow request.';
  }

  const validUrls: string[] = [];
  if (Array.isArray(body.urlList)) {
    for (let i = 0; i < body.urlList.length; i++) {
      const u = body.urlList[i];
      if (typeof u !== 'string' || !u.trim()) {
        errors[`urlList[${i}]`] = 'URL must be a non-empty string.';
        continue;
      }
      try {
        const parsed = new URL(u.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors[`urlList[${i}]`] = 'URL must use http or https protocol.';
          continue;
        }
        if (
          parsed.hostname.toLowerCase() !== host &&
          parsed.hostname.toLowerCase() !== `www.${host}`
        ) {
          errors[`urlList[${i}]`] = `URL domain ${parsed.hostname} does not match host ${host}.`;
          continue;
        }
        validUrls.push(parsed.toString());
      } catch {
        errors[`urlList[${i}]`] = `Invalid URL: "${u}".`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      host,
      key,
      keyLocation,
      urlList: validUrls,
    },
  };
}
