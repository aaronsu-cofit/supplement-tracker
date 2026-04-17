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
    const body = await res.text().catch(() => '')
    throw new Error(`AI run failed: ${res.status}${body ? ` — ${body}` : ''}`)
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
    const body = await res.text().catch(() => '')
    throw new Error(`AI stream failed: ${res.status}${body ? ` — ${body}` : ''}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(payload) as { chunk?: string }
          if (typeof parsed.chunk === 'string') onChunk(parsed.chunk)
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }

  // Only reached when the stream closes without a [DONE] frame.
  // The [DONE] path calls onDone() and returns early above.
  onDone()
}
