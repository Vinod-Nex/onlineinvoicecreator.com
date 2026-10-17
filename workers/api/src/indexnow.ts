/**
 * IndexNow Protocol Submission Client
 * Submits URL change notifications to search engines (Bing, Yandex, etc.)
 */
import type { ValidatedIndexNowInput } from './types';

const INDEXNOW_API_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowSubmitResult {
  success: boolean;
  statusCode: number;
  message: string;
  submittedCount: number;
  upstreamResponse?: string;
}

/**
 * Submits URLs to the IndexNow protocol endpoint.
 */
export async function submitToIndexNow(
  payload: ValidatedIndexNowInput
): Promise<IndexNowSubmitResult> {
  const requestBody: Record<string, unknown> = {
    host: payload.host,
    key: payload.key,
    urlList: payload.urlList,
  };

  if (payload.keyLocation) {
    requestBody.keyLocation = payload.keyLocation;
  }

  try {
    const response = await fetch(INDEXNOW_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(requestBody),
    });

    const status = response.status;
    let message = 'URLs successfully submitted to IndexNow.';

    if (status === 200) {
      message = 'IndexNow accepted and indexed submitted URLs.';
    } else if (status === 202) {
      message = 'IndexNow accepted URLs; key verification in progress.';
    } else if (status === 400) {
      message = 'IndexNow rejected request: invalid format.';
    } else if (status === 403) {
      message = 'IndexNow key invalid or key file not found on host.';
    } else if (status === 422) {
      message = 'IndexNow rejected: URLs do not belong to the specified host.';
    } else if (status === 429) {
      message = 'IndexNow rate limit reached (too many requests).';
    } else {
      message = `IndexNow returned status ${status}.`;
    }

    const responseText = await response.text();

    return {
      success: status === 200 || status === 202,
      statusCode: status,
      message,
      submittedCount: payload.urlList.length,
      upstreamResponse: responseText ? responseText.slice(0, 500) : undefined,
    };
  } catch (err) {
    console.error('Failed to submit to IndexNow API:', err);
    return {
      success: false,
      statusCode: 502,
      message: `Failed to contact IndexNow API: ${err instanceof Error ? err.message : String(err)}`,
      submittedCount: 0,
    };
  }
}
