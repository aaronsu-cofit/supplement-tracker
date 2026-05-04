import { SignJWT } from 'jose'

export interface AdkRunResult {
  result: string
  skill_key: string
}

export interface AdkConfig {
  url: string
  /** HS256 signing secret for the bearer JWT. Same secret the AI Skill
   *  Platform uses to verify (matches warehouse's `secret_key_base`).
   *  Stored per-OA in `ai_skill_platform_api_key`. When null/empty, no
   *  Authorization header is sent — useful for a public dev platform. */
  apiKey?: string | null
}

function resolveConfig(override?: AdkConfig): AdkConfig {
  if (override?.url) return { url: override.url, apiKey: override.apiKey ?? null }
  const url = process.env.ADK_URL
  if (!url) {
    throw new Error('ADK config missing — provide per-call {url} or set ADK_URL env var')
  }
  return { url, apiKey: process.env.ADK_API_KEY ?? null }
}

/**
 * Build the bearer JWT for one outbound call. Mirrors warehouse's
 * `Token.tokenize` shape — `member_id` / `member_class` — so the AI
 * Skill Platform can decode with the same Cofit-wide secret. Right now
 * the platform doesn't actually act on member info; once it does,
 * change the caller to pass the resolved Cofit member_id.
 *
 * `app_name` lets the platform tell which service called when many
 * services share the secret. Tokens are short-lived (5 min) so a leak
 * has a small blast radius — this is a service-to-service call, not a
 * user session, so we don't need long expiry.
 */
async function buildBearerJwt(
  secret: string,
  payload: { memberId: string; memberClass?: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({
    member_id: payload.memberId,
    member_class: payload.memberClass ?? 'LineUser',
    app_name: 'vitera',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60)
    .sign(new TextEncoder().encode(secret))
}

async function buildHeaders(
  apiKey: string | null | undefined,
  clientId: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    const jwt = await buildBearerJwt(apiKey, { memberId: clientId })
    headers['Authorization'] = `Bearer ${jwt}`
  }
  return headers
}

// 同步呼叫 AI Skill Platform 的 /run endpoint，等待完整結果。
// `cfg` 可以 per-call override（例如從 DB LineOA 拿 url + key）。
export async function adkRun(
  agentId: string,
  clientId: string,
  options?: { message?: string },
  cfg?: AdkConfig,
): Promise<AdkRunResult> {
  const { url, apiKey } = resolveConfig(cfg)
  const res = await fetch(`${url.replace(/\/$/, '')}/run`, {
    method: 'POST',
    headers: await buildHeaders(apiKey, clientId),
    body: JSON.stringify({
      agent_id: agentId,
      client_id: clientId,
      ...(options?.message !== undefined && { message: options.message }),
    }),
    // 30s — webhook handler is fire-and-forget so LINE's 10s ack isn't
    // the constraint; replyToken is valid for ~60s, leaving headroom for
    // the fast-path race in webhook.ts to switch to pushText if late.
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service error ${res.status}: ${err}`)
  }

  return res.json() as Promise<AdkRunResult>
}

// 取得 ADK Service 的 SSE stream（用於 LIFF 串流顯示）
// Known limitation: timeout(30000) only covers header delivery — a stalled stream body
// after headers arrive has no per-chunk timeout. Acceptable for POC.
export async function adkStream(agentId: string, clientId: string, cfg?: AdkConfig): Promise<Response> {
  const { url, apiKey } = resolveConfig(cfg)
  const res = await fetch(`${url.replace(/\/$/, '')}/run_sse`, {
    method: 'POST',
    headers: await buildHeaders(apiKey, clientId),
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service stream error ${res.status}: ${err}`)
  }

  return res
}
