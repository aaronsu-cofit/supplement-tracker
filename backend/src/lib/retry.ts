/**
 * LINE SDK HTTP errors expose `statusCode`. Transient: 429 (rate limit),
 * 408/500/502/503/504. Permanent: 400/401/403/404 — retrying these won't help.
 */
function isRetriable(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status;
  if (typeof status !== 'number') return true; // network / unknown → retry
  if (status === 429) return true;
  if (status === 408) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Retries the given async fn with exponential backoff on transient errors.
 * Throws the last error if all attempts fail, or immediately on a permanent
 * error (4xx other than 429). Default: 3 attempts, 500ms base, 5s cap.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 5000;

  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts || !isRetriable(err)) {
        const status = (err as { statusCode?: number })?.statusCode;
        console.error(`[retry] ${label} failed after ${attempt} attempt(s)`, { status, message: (err as Error).message });
        throw err;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      console.warn(`[retry] ${label} attempt ${attempt} failed, retrying in ${delay}ms`, { message: (err as Error).message });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
