/**
 * In-memory sliding window rate limiter for Cloudflare Worker
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory cache per worker isolate
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks and increments the rate limit counter for a given client key and action.
 *
 * @param key Unique identifier (typically client IP address)
 * @param action Route or category, e.g. 'contact' or 'indexnow'
 * @param maxRequests Maximum requests permitted within the window
 * @param windowSeconds Window length in seconds
 */
export function checkRateLimit(
  key: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const mapKey = `${action}:${key}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Cleanup stale records periodically when map grows
  if (rateLimitMap.size > 10000) {
    for (const [k, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(k);
      }
    }
  }

  const existing = rateLimitMap.get(mapKey);

  if (!existing || now > existing.resetTime) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(mapKey, newRecord);
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetSeconds: windowSeconds,
    };
  }

  // Existing window
  existing.count += 1;
  const remaining = Math.max(0, maxRequests - existing.count);
  const resetSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));

  if (existing.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}

/**
 * Helper to reset rate limits (primarily for automated testing)
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}
