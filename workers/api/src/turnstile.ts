/**
 * Cloudflare Turnstile Verification Client
 */
import type { TurnstileVerifyResponse } from './types';

const TURNSTILE_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare official dummy pass secret
const CF_DUMMY_PASS_SECRET = '1x0000000000000000000000000000000AA';

/**
 * Verifies Turnstile response token with Cloudflare's siteverify API.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string | undefined,
  remoteIp?: string | null
): Promise<{ success: boolean; errorCodes?: string[] }> {
  // If no secret key is configured in dev/testing, or using dummy secret
  if (!secretKey || secretKey === CF_DUMMY_PASS_SECRET) {
    if (token === 'FAIL_TOKEN') {
      return { success: false, errorCodes: ['invalid-input-response'] };
    }
    // Allow pass in local test/mock mode
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        errorCodes: [`http-status-${response.status}`],
      };
    }

    const outcome = (await response.json()) as TurnstileVerifyResponse;
    return {
      success: outcome.success === true,
      errorCodes: outcome['error-codes'],
    };
  } catch (err) {
    console.error('Turnstile verification request error:', err);
    return {
      success: false,
      errorCodes: ['verification-fetch-exception'],
    };
  }
}
