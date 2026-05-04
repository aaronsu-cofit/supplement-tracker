import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adkRun } from './adk.js';

// Capture every fetch call so we can assert on URL / headers / body
// without ever touching the network. Reset between tests so leaks
// don't bleed across cases.
type FetchCall = { url: string; init: RequestInit };
let calls: FetchCall[];
let mockResponse: { ok: boolean; status?: number; body: unknown };

beforeEach(() => {
  calls = [];
  mockResponse = { ok: true, body: { result: 'pong', skill_key: 'test_agent' } };
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return {
      ok: mockResponse.ok,
      status: mockResponse.status ?? (mockResponse.ok ? 200 : 500),
      json: async () => mockResponse.body,
      text: async () => JSON.stringify(mockResponse.body),
    } as unknown as Response;
  }) as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ADK_URL;
  delete process.env.ADK_API_KEY;
  delete process.env.ADK_BEARER_TOKEN;
});

describe('adkRun — request shape', () => {
  it('POSTs to <baseUrl>/run', async () => {
    await adkRun('agent_a', 'user_1', undefined, { url: 'https://platform.example.com', bearerToken: 't' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://platform.example.com/run');
    expect(calls[0].init.method).toBe('POST');
  });

  it('strips a trailing slash from base url', async () => {
    await adkRun('agent_a', 'user_1', undefined, { url: 'https://platform.example.com/', bearerToken: 't' });
    expect(calls[0].url).toBe('https://platform.example.com/run');
  });

  it('sends agent_id and client_id in the body', async () => {
    await adkRun('nutrition_analyst', 'U12345', undefined, { url: 'https://x', bearerToken: 't' });
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.agent_id).toBe('nutrition_analyst');
    expect(body.client_id).toBe('U12345');
  });

  it('includes message when provided', async () => {
    await adkRun('a', 'u', { message: 'hi' }, { url: 'https://x', bearerToken: 't' });
    expect(JSON.parse(calls[0].init.body as string).message).toBe('hi');
  });

  it('omits message field entirely when not provided', async () => {
    await adkRun('a', 'u', undefined, { url: 'https://x', bearerToken: 't' });
    const body = JSON.parse(calls[0].init.body as string);
    expect('message' in body).toBe(false);
  });
});

describe('adkRun — auth header (bearer token, forwarded as-is)', () => {
  it('forwards bearerToken verbatim in Authorization', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.fake-payload.fake-sig';
    await adkRun('a', 'u', undefined, { url: 'https://x', bearerToken: token });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${token}`);
    expect('X-API-Key' in headers).toBe(false);
  });

  it('does NOT send Authorization when bearerToken is null', async () => {
    await adkRun('a', 'u', undefined, { url: 'https://x', bearerToken: null });
    const headers = calls[0].init.headers as Record<string, string>;
    expect('Authorization' in headers).toBe(false);
  });

  it('does NOT send Authorization when bearerToken is undefined', async () => {
    await adkRun('a', 'u', undefined, { url: 'https://x' });
    const headers = calls[0].init.headers as Record<string, string>;
    expect('Authorization' in headers).toBe(false);
  });

  it('does NOT send Authorization when bearerToken is empty string', async () => {
    await adkRun('a', 'u', undefined, { url: 'https://x', bearerToken: '' });
    const headers = calls[0].init.headers as Record<string, string>;
    expect('Authorization' in headers).toBe(false);
  });

  it('always sends Content-Type: application/json', async () => {
    await adkRun('a', 'u', undefined, { url: 'https://x' });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('adkRun — env var fallback', () => {
  it('falls back to ADK_URL when no override.url given', async () => {
    process.env.ADK_URL = 'https://env-platform.example.com';
    await adkRun('a', 'u');
    expect(calls[0].url).toBe('https://env-platform.example.com/run');
  });

  it('falls back to ADK_BEARER_TOKEN when no override.bearerToken given', async () => {
    process.env.ADK_URL = 'https://env-platform.example.com';
    process.env.ADK_BEARER_TOKEN = 'env-token';
    await adkRun('a', 'u');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer env-token');
  });

  it('uses ADK_API_KEY as bearerToken alias for backwards compat', async () => {
    process.env.ADK_URL = 'https://env-platform.example.com';
    process.env.ADK_API_KEY = 'legacy-token';
    await adkRun('a', 'u');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer legacy-token');
  });

  it('ADK_BEARER_TOKEN wins over ADK_API_KEY when both set', async () => {
    process.env.ADK_URL = 'https://env-platform.example.com';
    process.env.ADK_BEARER_TOKEN = 'new-token';
    process.env.ADK_API_KEY = 'legacy-token';
    await adkRun('a', 'u');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer new-token');
  });

  it('throws when URL is missing entirely (no override, no env)', async () => {
    await expect(adkRun('a', 'u')).rejects.toThrow(/ADK config missing/);
  });

  it('does NOT throw when URL is set but token is missing', async () => {
    process.env.ADK_URL = 'https://env-platform.example.com';
    await expect(adkRun('a', 'u')).resolves.toBeDefined();
    const headers = calls[0].init.headers as Record<string, string>;
    expect('Authorization' in headers).toBe(false);
  });
});

describe('adkRun — error handling', () => {
  it('throws with response status + body on non-2xx', async () => {
    mockResponse = { ok: false, status: 401, body: 'Unauthorized' };
    await expect(
      adkRun('a', 'u', undefined, { url: 'https://x', bearerToken: 'wrong' }),
    ).rejects.toThrow(/401/);
  });

  it('returns the parsed result on success', async () => {
    mockResponse = { ok: true, body: { result: 'hello there', skill_key: 'agent_x' } };
    const r = await adkRun('a', 'u', undefined, { url: 'https://x' });
    expect(r.result).toBe('hello there');
    expect(r.skill_key).toBe('agent_x');
  });
});
