import { Hono } from 'hono'
import { verifyLineSignature, replyText } from '../lib/line.js'
import { adkRun } from '../lib/adk.js'
import { findOrCreateLineUser } from '../lib/db.js'

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
    await findOrCreateLineUser(lineUserId)
    if (event.replyToken) {
      await replyText(event.replyToken, '您好！我是您的 AI 健康顧問，有任何問題都可以直接傳訊問我 😊')
    }
    return
  }

  if (event.type === 'postback' && event.replyToken) {
    const liffUrl = process.env.LIFF_URL_MAIN || process.env.LIFF_URL_WOUNDS || ''
    if (liffUrl) {
      await replyText(event.replyToken, `點這裡開啟健康紀錄：${liffUrl}`)
    }
    return
  }

  if (event.type === 'message' && event.message?.type === 'text' && event.replyToken) {
    const messageText = event.message.text
    await findOrCreateLineUser(lineUserId)

    try {
      const result = await adkRun('ai-expert', lineUserId, { message: messageText })
      await replyText(event.replyToken, result.result)
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
    payload = JSON.parse(body) as LineWebhookPayload
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
