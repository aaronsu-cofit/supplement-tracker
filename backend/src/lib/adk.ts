const ADK_URL = process.env.ADK_URL!
const ADK_API_KEY = process.env.ADK_API_KEY!

if (!ADK_URL || !ADK_API_KEY) {
  throw new Error('ADK_URL and ADK_API_KEY must be set')
}

const ADK_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': ADK_API_KEY,
}

export interface AdkRunResult {
  result: string
  skill_key: string
}

// 同步呼叫 ADK Service，等待完整結果（用於 LINE 聊天室）
export async function adkRun(agentId: string, clientId: string): Promise<AdkRunResult> {
  const res = await fetch(`${ADK_URL}/run`, {
    method: 'POST',
    headers: ADK_HEADERS,
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ADK Service error ${res.status}: ${err}`)
  }

  return res.json() as Promise<AdkRunResult>
}

// 取得 ADK Service 的 SSE stream（用於 LIFF 串流顯示）
export function adkStream(agentId: string, clientId: string): Promise<Response> {
  return fetch(`${ADK_URL}/run_sse`, {
    method: 'POST',
    headers: ADK_HEADERS,
    body: JSON.stringify({ agent_id: agentId, client_id: clientId }),
  })
}
