import { createHmac } from 'crypto'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET

if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_CHANNEL_SECRET) {
  throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set')
}

export function verifyLineSignature(body: string, signature: string): boolean {
  const expected = createHmac('sha256', LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return expected === signature
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LINE reply failed ${res.status}: ${err}`)
  }
}
