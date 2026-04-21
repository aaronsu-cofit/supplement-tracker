import { Hono } from 'hono'
import { verifyLineSignature, replyText } from '../lib/line.js'
import { adkRun } from '../lib/adk.js'
import {
  findOrCreateLineUser,
  getActiveScenariosForOA,
  enrollUserInScenario,
  logEngagementEvent,
  getLineOAByDestination,
  getActiveEnrollmentsForOA,
} from '../lib/db.js'
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js'
import { findActiveAgentForDay, type FlowNode, type FlowEdge } from '../lib/flow.js'
import { daysBetweenInTz } from '../lib/time.js'
import { runIntent } from '../lib/intent.js'

const webhook = new Hono()

interface LineSource {
  type: 'user' | 'group' | 'room'
  userId?: string
}

interface LineTextMessage {
  type: 'text'
  text: string
}

interface LinePostback {
  data: string
}

interface LineWebhookEvent {
  type: string
  replyToken?: string
  source: LineSource
  message?: LineTextMessage
  postback?: LinePostback
}

interface LineWebhookPayload {
  destination: string
  events: LineWebhookEvent[]
}

interface OaContext {
  id: number
  channel_access_token: string
  default_agent_id: string
  ai_skill_platform_url: string | null
  ai_skill_platform_api_key: string | null
  product_id: string | null
}

async function handleLineEvent(event: LineWebhookEvent, oa: OaContext): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) return

  if (event.type === 'follow') {
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] follow findOrCreateLineUser error:', err)
    }

    evaluateAndAssignMenu(oa.id, lineUserId, oa.channel_access_token).catch(err =>
      console.error('[webhook/line] follow menu evaluation error:', err)
    )

    ;(async () => {
      const scenarios = await getActiveScenariosForOA(oa.id)
      await Promise.all(scenarios.map(s => enrollUserInScenario(lineUserId, s.id)))
    })().catch(err =>
      console.error('[webhook/line] follow auto-enroll error:', err)
    )

    if (event.replyToken) {
      try {
        await replyText(event.replyToken, '您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊', oa.channel_access_token)
      } catch (err) {
        console.error('[webhook/line] follow reply error:', err)
      }
    }
    return
  }

  if (event.type === 'postback' && event.replyToken) {
    logEngagementEvent(lineUserId, 'postback', event.postback?.data).catch(err =>
      console.error('[webhook/line] log postback engagement error:', err)
    )

    const liffUrl = process.env.LIFF_URL_MAIN || process.env.LIFF_URL_WOUNDS || ''
    try {
      await replyText(
        event.replyToken,
        liffUrl ? `點這裡開啟健康紀錄：${liffUrl}` : '健康紀錄功能即將開放，敬請期待 😊',
        oa.channel_access_token,
      )
    } catch (err) {
      console.error('[webhook/line] postback reply error:', err)
    }
    return
  }

  if (event.type === 'message' && event.message?.type === 'text' && event.replyToken) {
    const messageText = event.message.text
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] message findOrCreateLineUser error:', err)
    }

    logEngagementEvent(lineUserId, 'text_reply', messageText.slice(0, 500)).catch(err =>
      console.error('[webhook/line] log text engagement error:', err)
    )

    // Intent routing first: if the OA is bound to a product and a rule
    // matches, run its action and reply — don't fall through to the AI.
    if (oa.product_id) {
      try {
        const intent = await runIntent(oa.product_id, lineUserId, messageText)
        if (intent) {
          if (intent.replyText) {
            await replyText(event.replyToken, intent.replyText, oa.channel_access_token)
          }
          return
        }
      } catch (err) {
        console.error('[webhook/line] intent routing error:', err)
      }
    }

    if (!oa.ai_skill_platform_url || !oa.ai_skill_platform_api_key) {
      console.warn('[webhook/line] OA missing ai_skill_platform_url / api_key — skipping AI reply')
      return
    }

    // Per-phase routing: if the user is in an active scenario that has an
    // ai-skill-node at (or before) their current day, use that agent.
    // Otherwise fall back to the OA's default agent.
    const agentId = (await resolveScenarioAgent(oa.id, lineUserId)) || oa.default_agent_id

    try {
      const result = await adkRun(
        agentId,
        lineUserId,
        { message: messageText },
        { url: oa.ai_skill_platform_url, apiKey: oa.ai_skill_platform_api_key },
      )
      const replyMessage = result.result || '很抱歉，AI 顧問無法提供回應，請稍後再試 🙏'
      await replyText(event.replyToken, replyMessage, oa.channel_access_token)
    } catch (err) {
      console.error(`[webhook/line] agent=${agentId} error:`, err)
      await replyText(event.replyToken, '很抱歉，AI 顧問暫時無法回應，請稍後再試 🙏', oa.channel_access_token)
    }
  }
}

/**
 * Find the ai-skill-node agentId that applies to this user right now.
 * Picks the active enrollment with the latest matching ai-skill-node
 * (by day ≤ daysSinceEnrollment). Returns null if none found.
 */
async function resolveScenarioAgent(oaId: number, userId: string): Promise<string | null> {
  try {
    const enrollments = (await getActiveEnrollmentsForOA(oaId)).filter(e => e.user.id === userId)
    if (enrollments.length === 0) return null

    const now = new Date()
    for (const enr of enrollments) {
      const tz = enr.user.timezone || 'Asia/Taipei'
      const day = daysBetweenInTz(enr.enrolled_at, now, tz)
      const nodes = Array.isArray(enr.scenario.flow_nodes) ? (enr.scenario.flow_nodes as unknown as FlowNode[]) : []
      const edges = Array.isArray(enr.scenario.flow_edges) ? (enr.scenario.flow_edges as unknown as FlowEdge[]) : []
      const agentId = findActiveAgentForDay(nodes, edges, day)
      if (agentId) return agentId
    }
    return null
  } catch (err) {
    console.error('[webhook/line] resolveScenarioAgent error:', err)
    return null
  }
}

// POST /webhook/line
webhook.post('/line', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-line-signature') || ''

  let payload: LineWebhookPayload
  try {
    const parsed = JSON.parse(body)
    if (!parsed || !Array.isArray(parsed.events)) {
      return c.json({ error: 'Invalid payload' }, 400)
    }
    payload = parsed as LineWebhookPayload
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const oa = await getLineOAByDestination(payload.destination)
  if (!oa || !oa.channel_secret) {
    console.warn('[webhook/line] unknown or unconfigured destination', payload.destination)
    return c.json({ error: 'unknown destination — register OA with channel_secret in /lineoamenu' }, 404)
  }

  if (!verifyLineSignature(body, signature, oa.channel_secret)) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const oaCtx: OaContext = {
    id: oa.id,
    channel_access_token: oa.channel_access_token,
    default_agent_id: oa.default_agent_id,
    ai_skill_platform_url: oa.ai_skill_platform_url,
    ai_skill_platform_api_key: oa.ai_skill_platform_api_key,
    product_id: oa.product_id,
  }
  for (const event of payload.events) {
    handleLineEvent(event, oaCtx).catch(err => console.error('[webhook/line] event error:', err))
  }

  return c.text('OK', 200)
})

export default webhook
