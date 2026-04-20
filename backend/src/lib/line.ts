import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify LINE webhook signature using the given channel secret.
 * Returns false if secret is empty or signature doesn't match.
 */
export function verifyLineSignature(body: string, signature: string, secret: string): boolean {
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(body).digest()
  let sigBuffer: Buffer
  try {
    sigBuffer = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  if (expected.length !== sigBuffer.length) return false
  return timingSafeEqual(expected, sigBuffer)
}

/**
 * Reply to a webhook event using the given channel's access token.
 */
export async function replyText(replyToken: string, text: string, token: string): Promise<void> {
  if (!token) throw new Error('replyText: missing token')
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

/**
 * Fetch the bot's own info (including its LINE user ID that shows up in
 * webhook payloads as `destination`). Used when admin registers an OA —
 * we auto-populate `line_destination_id` from the channel access token.
 * Returns null on failure so callers can keep going without blocking save.
 */
export async function fetchLineBotInfo(token: string): Promise<{ userId: string; displayName?: string } | null> {
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn('[line.fetchBotInfo] non-OK', res.status)
      return null
    }
    const data = (await res.json()) as { userId?: string; displayName?: string }
    if (!data.userId) return null
    return { userId: data.userId, displayName: data.displayName }
  } catch (err) {
    console.warn('[line.fetchBotInfo] error', err)
    return null
  }
}
