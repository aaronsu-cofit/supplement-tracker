import { createHmac, timingSafeEqual } from 'crypto'

function requireLineConfig(): { token: string; secret: string } {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!token || !secret) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set')
  }
  return { token, secret }
}

export function verifyLineSignature(body: string, signature: string): boolean {
  const { secret } = requireLineConfig()
  const expected = createHmac('sha256', secret)
    .update(body)
    .digest()
  let sigBuffer: Buffer
  try {
    sigBuffer = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  if (expected.length !== sigBuffer.length) return false
  return timingSafeEqual(expected, sigBuffer)
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  const { token } = requireLineConfig()
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
