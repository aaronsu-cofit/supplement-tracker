import { Hono } from 'hono'
import { verifyLineSignature, replyText, replyMessage } from '../lib/line.js'
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
import { logMessage, logOutboundLineMessage } from '../lib/messageLog.js'
import { completeMissionByKey, incrementMissionProgress } from '../lib/missions.js'
import { contentItemToMessage } from '../lib/flow.js'
import { getContentItemByKey } from '../lib/db.js'

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
      const welcomeText = '您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊'
      try {
        await replyText(event.replyToken, welcomeText, oa.channel_access_token)
        logMessage({
          oaId: oa.id, userId: lineUserId,
          direction: 'outbound', type: 'text',
          contentText: welcomeText, source: 'follow_reply',
        })
      } catch (err) {
        console.error('[webhook/line] follow reply error:', err)
      }
    }
    return
  }

  if (event.type === 'postback' && event.replyToken) {
    const postbackData = event.postback?.data ?? ''
    logMessage({
      oaId: oa.id, userId: lineUserId,
      direction: 'inbound', type: 'postback',
      contentText: postbackData,
    })
    logEngagementEvent(lineUserId, 'postback', postbackData).catch(err =>
      console.error('[webhook/line] log postback engagement error:', err)
    )

    // Structured postback actions: data is parsed as URL query string.
    // Supported today:
    //   act=complete_mission&key=<mission_key>[&reply_content=<key>]
    //   act=increment_mission&key=<mission_key>[&step=N][&reply_content=<key>]
    // Required OA-level config: product_id must be bound (missions are
    // product-scoped). The mission's notify_content_key fires on
    // completion as usual, providing the "updated checklist" flow.
    const handled = await tryHandleStructuredPostback(
      postbackData, lineUserId, oa, event.replyToken,
    )
    if (handled) return

    const liffUrl = process.env.LIFF_URL_MAIN || process.env.LIFF_URL_WOUNDS || ''
    const replyBody = liffUrl ? `點這裡開啟健康紀錄：${liffUrl}` : '健康紀錄功能即將開放，敬請期待 😊'
    try {
      await replyText(event.replyToken, replyBody, oa.channel_access_token)
      logMessage({
        oaId: oa.id, userId: lineUserId,
        direction: 'outbound', type: 'text',
        contentText: replyBody, source: 'postback_reply',
      })
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

    logMessage({
      oaId: oa.id, userId: lineUserId,
      direction: 'inbound', type: 'text',
      contentText: messageText,
    })
    logEngagementEvent(lineUserId, 'text_reply', messageText.slice(0, 500)).catch(err =>
      console.error('[webhook/line] log text engagement error:', err)
    )

    // Intent routing first: if the OA is bound to a product and a rule
    // matches, run its action and reply — don't fall through to the AI.
    if (oa.product_id) {
      try {
        const intent = await runIntent(oa.product_id, lineUserId, messageText, {
          oaId: oa.id,
          channelAccessToken: oa.channel_access_token,
        })
        if (intent) {
          if (intent.replyMessage) {
            await replyMessage(event.replyToken, intent.replyMessage, oa.channel_access_token)
            logOutboundLineMessage(oa.id, lineUserId, intent.replyMessage, 'intent', intent.ruleId)
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
      const aiReply = result.result || '很抱歉，AI 顧問無法提供回應，請稍後再試 🙏'
      await replyText(event.replyToken, aiReply, oa.channel_access_token)
      logMessage({
        oaId: oa.id, userId: lineUserId,
        direction: 'outbound', type: 'text',
        contentText: aiReply, source: 'ai_agent', sourceRef: agentId,
      })
    } catch (err) {
      console.error(`[webhook/line] agent=${agentId} error:`, err)
      const errReply = '很抱歉，AI 顧問暫時無法回應，請稍後再試 🙏'
      await replyText(event.replyToken, errReply, oa.channel_access_token)
      logMessage({
        oaId: oa.id, userId: lineUserId,
        direction: 'outbound', type: 'text',
        contentText: errReply, source: 'ai_agent', sourceRef: `${agentId}:error`,
      })
    }
  }
}

/**
 * Parse and dispatch structured postback data. Returns true when the
 * data matched a known action (handler already replied / logged) so the
 * caller knows to skip the default LIFF-link reply. Unknown formats
 * return false and fall through.
 */
async function tryHandleStructuredPostback(
  data: string,
  userId: string,
  oa: OaContext,
  replyToken: string,
): Promise<boolean> {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(data)
  } catch {
    return false
  }
  const act = params.get('act')
  if (!act) return false

  if (act === 'complete_mission' || act === 'increment_mission') {
    const missionKey = params.get('key')
    const replyContentKey = params.get('reply_content') ?? undefined
    const step = Math.max(1, parseInt(params.get('step') ?? '1', 10) || 1)

    if (!oa.product_id) {
      console.warn(`[webhook/postback] ${act} needs product_id but OA #${oa.id} has none`)
      return true
    }
    if (!missionKey) {
      console.warn(`[webhook/postback] ${act} missing key param`)
      return true
    }

    try {
      if (act === 'complete_mission') {
        await completeMissionByKey(oa.product_id, userId, missionKey)
      } else {
        await incrementMissionProgress(oa.product_id, userId, missionKey, step)
      }
    } catch (err) {
      console.error(`[webhook/postback] ${act} ${missionKey} error:`, err)
    }

    // Optional explicit reply separate from the mission's notify_content_key
    // (which fires inside completeMissionByKey via push, not reply token).
    // When `reply_content` is set on the postback data, reply with that
    // content on the reply token so the user gets an immediate ack.
    if (replyContentKey) {
      try {
        const item = await getContentItemByKey(oa.product_id, replyContentKey)
        const msg = item ? contentItemToMessage(item) : null
        if (msg) {
          await replyMessage(replyToken, msg, oa.channel_access_token)
          logOutboundLineMessage(oa.id, userId, msg, 'postback_reply', `${act}:${missionKey}`)
        }
      } catch (err) {
        console.error('[webhook/postback] reply_content error:', err)
      }
    }
    return true
  }

  return false
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
