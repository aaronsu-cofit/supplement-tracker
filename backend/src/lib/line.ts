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
 * Reply to a webhook event with a plain text message.
 */
export async function replyText(replyToken: string, text: string, token: string): Promise<void> {
  await replyMessages(replyToken, [{ type: 'text', text }], token)
}

/**
 * Generic reply. Accepts any LINE Messaging API message object (text,
 * image, sticker, flex, …). Used by the intent router when the matched
 * rule's reply_content points at a non-text ContentItem.
 */
export async function replyMessage(
  replyToken: string,
  message: import('@line/bot-sdk').Message,
  token: string,
): Promise<void> {
  await replyMessages(replyToken, [message], token)
}

/**
 * Push a plain text message to a user without using a reply token.
 * Used for slow async replies — when an LLM call doesn't return in time
 * for the replyToken fast-path, we fall through to push so the user
 * still gets an answer (it just won't show as a "reply" thread visually).
 */
export async function pushText(userId: string, text: string, token: string): Promise<void> {
  if (!token) throw new Error('pushText: missing token')
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LINE push failed ${res.status}: ${err}`)
  }
}

async function replyMessages(
  replyToken: string,
  messages: import('@line/bot-sdk').Message[],
  token: string,
): Promise<void> {
  if (!token) throw new Error('replyMessages: missing token')
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LINE reply failed ${res.status}: ${err}`)
  }
}

/**
 * Show a loading animation in the chat with the given user.
 * Call this before slow async work (e.g. LLM calls) so the user sees
 * the typing indicator instead of silence. The animation stops automatically
 * when any message is sent to the user, or after loadingSeconds (5–60).
 */
export async function showLoadingAnimation(
  userId: string,
  token: string,
  loadingSeconds = 60,
): Promise<void> {
  if (!token) return;
  try {
    await fetch('https://api.line.me/v2/bot/chat/loading/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ chatId: userId, loadingSeconds }),
    });
  } catch {
    // Non-critical — don't let a loading animation failure break the reply flow
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
