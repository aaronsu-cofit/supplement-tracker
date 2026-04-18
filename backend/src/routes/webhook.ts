import { Hono } from 'hono'
import { verifyLineSignature, replyText } from '../lib/line.js'
import { adkRun } from '../lib/adk.js'
import { findOrCreateLineUser, getActiveScenariosForOA, enrollUserInScenario } from '../lib/db.js'
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

interface LineWebhookEvent {
  type: string
  replyToken?: string
  source: LineSource
  message?: LineTextMessage
}

interface LineWebhookPayload {
  destination: string
  events: LineWebhookEvent[]
}

async function handleLineEvent(event: LineWebhookEvent): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) return

  if (event.type === 'follow') {
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] follow findOrCreateLineUser error:', err)
    }

    const oaId = parseInt(process.env.LINE_OA_ID || '0')
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    if (oaId > 0 && channelToken) {
      evaluateAndAssignMenu(oaId, lineUserId, channelToken).catch(err =>
        console.error('[webhook/line] follow menu evaluation error:', err)
      )

      // Auto-enroll the newly-followed user in every active scenario for this OA
      ;(async () => {
        const scenarios = await getActiveScenariosForOA(oaId)
        await Promise.all(scenarios.map(s => enrollUserInScenario(lineUserId, s.id)))
      })().catch(err =>
        console.error('[webhook/line] follow auto-enroll error:', err)
      )
    }

    if (event.replyToken) {
      try {
        await replyText(event.replyToken, '您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊')
      } catch (err) {
        console.error('[webhook/line] follow reply error:', err)
      }
    }
    return
  }

  if (event.type === 'postback' && event.replyToken) {
    const liffUrl = process.env.LIFF_URL_MAIN || process.env.LIFF_URL_WOUNDS || ''
    try {
      await replyText(
        event.replyToken,
        liffUrl ? `點這裡開啟健康紀錄：${liffUrl}` : '健康紀錄功能即將開放，敬請期待 😊'
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

    try {
      const result = await adkRun('ai-expert', lineUserId, { message: messageText })
      const replyMessage = result.result || '很抱歉，AI 顧問無法提供回應，請稍後再試 🙏'
      await replyText(event.replyToken, replyMessage)
    } catch (err) {
      console.error('[webhook/line] AI Expert error:', err)
      await replyText(event.replyToken, '很抱歉，AI 顧問暫時無法回應，請稍後再試 🙏')
    }
  }
}

// POST /webhook/line
webhook.post('/line', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-line-signature') || ''

  if (!verifyLineSignature(body, signature)) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

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

  // 立即回 200，非同步處理 events（避免 LINE retry）
  for (const event of payload.events) {
    handleLineEvent(event).catch(err => console.error('[webhook/line] event error:', err))
  }

  return c.text('OK', 200)
})

export default webhook
