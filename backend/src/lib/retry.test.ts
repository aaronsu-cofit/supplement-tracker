import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry.js';

function linelike(statusCode: number, message = 'err') {
  return Object.assign(new Error(message), { statusCode });
}

describe('withRetry', () => {
  it('returns the value on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(linelike(429, 'rate limited'))
      .mockRejectedValueOnce(linelike(429, 'rate limited'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on 503 and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(linelike(503))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', { baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400 permanent error', async () => {
    const fn = vi.fn().mockRejectedValue(linelike(400, 'bad request'));
    await expect(withRetry(fn, 'test', { baseDelayMs: 1 })).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 404 permanent error', async () => {
    const fn = vi.fn().mockRejectedValue(linelike(404));
    await expect(withRetry(fn, 'test', { baseDelayMs: 1 })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries unknown errors (no statusCode) — assumed network issue', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', { baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts on persistent transient error', async () => {
    const fn = vi.fn().mockRejectedValue(linelike(500));
    await expect(withRetry(fn, 'test', { maxAttempts: 3, baseDelayMs: 1 })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
