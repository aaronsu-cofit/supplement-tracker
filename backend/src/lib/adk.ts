function requireAdkConfig(): { url: string; headers: Record<string, string> } {
  const url = process.env.ADK_URL
  const apiKey = process.env.ADK_API_KEY
  if (!url || !apiKey) {
    throw new Error('ADK_URL and ADK_API_KEY must be set')
  }
  return {
    url,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
  }
}

export interface AdkRunResult {
  result: string
  skill_key: string
}

// 同步呼叫 ADK Service，等待完整結果（用於 LINE 聊天室）
export async function adkRun(
  agentId: string,
  clientId: string,
  options?: { message?: string }
): Promise<AdkRunResult> {
  const { url, headers } = requireAdkConfig()
  const res = await fetch(`${url}/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      agent_id: agentId,
      client_id: clientId,
      ...(options?.message !== undefined && { message: options.message }),
    }),
    signal: AbortSignal.timeout(9000),
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
export async function adkStream(agentId: string, clientId: string): Promise<Response> {
  const { url, headers } = requireAdkConfig()
  const res = await fetch(`${url}/run_sse`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service stream error ${res.status}: ${err}`)
  }

  return res
}
