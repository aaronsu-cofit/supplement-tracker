import { apiFetch } from './api'

export interface AiRunResult {
  result: string
  skill_key: string
}

export async function aiRun(agentId: string): Promise<AiRunResult> {
  const res = await apiFetch('/api/ai/run', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  })

  if (!res.ok) {
    throw new Error(`AI run failed: ${res.status}`)
  }

  return res.json()
}

export async function aiStream(
  agentId: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
): Promise<void> {
  const res = await apiFetch('/api/ai/stream', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`AI stream failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone()
          return
        }
        try {
          const { chunk } = JSON.parse(payload)
          if (chunk) onChunk(chunk)
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  }

  onDone()
}
