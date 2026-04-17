import { Hono } from 'hono'
import { adkRun, adkStream } from '../lib/adk.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import type { HonoEnv } from '../types.js'

const ai = new Hono<HonoEnv>()

ai.use('*', authMiddleware)

// 同步執行 AI Skill（LINE 聊天室用）
ai.post('/run', async (c) => {
  const userId = c.get('userId')
  const { agent_id } = await c.req.json<{ agent_id: string }>()

  if (!agent_id) {
    return c.json({ error: 'agent_id is required' }, 400)
  }

  try {
    const result = await adkRun(agent_id, userId)
    return c.json(result)
  } catch (err) {
    console.error('[AI /run]', err)
    return c.json({ error: 'AI execution failed' }, 500)
  }
})

// SSE 串流執行 AI Skill（LIFF 用）
ai.post('/stream', async (c) => {
  const userId = c.get('userId')
  const { agent_id } = await c.req.json<{ agent_id: string }>()

  if (!agent_id) {
    return c.json({ error: 'agent_id is required' }, 400)
  }

  try {
    const upstream = await adkStream(agent_id, userId)

    if (!upstream.body) {
      return c.json({ error: 'ADK stream has no body' }, 502)
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[AI /stream]', err)
    return c.json({ error: 'AI stream failed' }, 500)
  }
})

export default ai
