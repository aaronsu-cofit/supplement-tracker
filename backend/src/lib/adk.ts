export interface AdkRunResult {
  result: string
  skill_key: string
}

export interface AdkConfig {
  url: string
  /** Pre-signed bearer token to send as `Authorization: Bearer <token>`.
   *  The token itself is generated outside Vitera (e.g. warehouse's
   *  `Token.tokenize(member)`) — Vitera doesn't hold the signing secret
   *  and just forwards. When null/empty, the Authorization header is
   *  omitted. Stored per-OA in the (legacy-named) column
   *  `ai_skill_platform_api_key`. */
  bearerToken?: string | null
}

function resolveConfig(override?: AdkConfig): AdkConfig {
  if (override?.url) return { url: override.url, bearerToken: override.bearerToken ?? null }
  const url = process.env.ADK_URL
  if (!url) {
    throw new Error('ADK config missing — provide per-call {url} or set ADK_URL env var')
  }
  return { url, bearerToken: process.env.ADK_BEARER_TOKEN ?? process.env.ADK_API_KEY ?? null }
}

function buildHeaders(bearerToken: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`
  return headers
}

// 同步呼叫 AI Skill Platform 的 /run endpoint，等待完整結果。
// `cfg` 可以 per-call override（例如從 DB LineOA 拿 url + bearerToken）。
export async function adkRun(
  agentId: string,
  clientId: string,
  options?: { message?: string },
  cfg?: AdkConfig,
): Promise<AdkRunResult> {
  const { url, bearerToken } = resolveConfig(cfg)
  const res = await fetch(`${url.replace(/\/$/, '')}/run`, {
    method: 'POST',
    headers: buildHeaders(bearerToken),
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
  const { url, bearerToken } = resolveConfig(cfg)
  const res = await fetch(`${url.replace(/\/$/, '')}/run_sse`, {
    method: 'POST',
    headers: buildHeaders(bearerToken),
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service stream error ${res.status}: ${err}`)
  }

  return res
}
