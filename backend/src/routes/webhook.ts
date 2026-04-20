import { Hono } from 'hono'
import { verifyLineSignature, replyText } from '../lib/line.js'
import {
  findOrCreateLineUser,
  getActiveScenariosForOA,
  enrollUserInScenario,
  logEngagementEvent,
  getLineOAByDestination,
} from '../lib/db.js'
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js'

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
  ai_skill_platform_url: string | null
}

/**
 * Forward the raw webhook body + signature to the AI Skill Platform
 * configured for this OA. The platform verifies signature with the
 * same channel_secret and pushes AI replies to users directly.
 * Fire-and-forget. No-op if no URL configured on the OA.
 */
function forwardToAiSkillPlatform(baseUrl: string | null, body: string, signature: string): void {
  if (!baseUrl) {
    console.warn('[webhook/line] no ai_skill_platform_url configured for OA — message not forwarded')
    return
  }
  const url = `${baseUrl.replace(/\/$/, '')}/webhook/line`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-Signature': signature,
    },
    body,
  })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[webhook/line] AI Skill Platform returned', res.status, text.slice(0, 200))
      }
    })
    .catch(err => console.error('[webhook/line] forward error:', err))
}

/**
 * Side-effect handler for an event. We handle follow/postback ourselves
 * (enrollment, menu evaluation, engagement logging). Message events are
 * intentionally NOT replied to here — the AI Skill Platform handles
 * user-visible replies via its own LINE Push API.
 */
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

    // Welcome reply is handled by AI Skill Platform (or LINE greeting setting).
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

  if (event.type === 'message' && event.message?.type === 'text') {
    const messageText = event.message.text
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] message findOrCreateLineUser error:', err)
    }

    logEngagementEvent(lineUserId, 'text_reply', messageText.slice(0, 500)).catch(err =>
      console.error('[webhook/line] log text engagement error:', err)
    )
    // AI reply is the AI Skill Platform's job (see forwardToAiSkillPlatform).
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

  // Forward raw body to this OA's AI Skill Platform (fire-and-forget).
  forwardToAiSkillPlatform(oa.ai_skill_platform_url, body, signature)

  // Handle our own side effects (follow, postback, engagement logs).
  const oaCtx: OaContext = {
    id: oa.id,
    channel_access_token: oa.channel_access_token,
    ai_skill_platform_url: oa.ai_skill_platform_url,
  }
  for (const event of payload.events) {
    handleLineEvent(event, oaCtx).catch(err => console.error('[webhook/line] event error:', err))
  }

  return c.text('OK', 200)
})

export default webhook
