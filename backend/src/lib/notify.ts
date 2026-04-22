import { db, getContentItemByKey, getLineOAById } from './db.js';
import { contentItemToMessage } from './flow.js';
import { logOutboundLineMessage, type MessageLogSource } from './messageLog.js';

/**
 * Push a product's ContentItem to a user via LINE. Used when a mission
 * completes or a badge is earned and the template has opted into an
 * auto-notification.
 *
 * LINE user IDs are channel-scoped, so we have to push through the OA
 * where this user actually exists. Strategy: look up the most recent
 * message_log row for the user, take its oa_id, and use that OA's
 * channel access token. If the user has never exchanged a message
 * (either direction) with any OA, we log a warning and skip.
 *
 * All errors are swallowed and logged — never rethrown — so a failed
 * notify can't take down the path that triggered it (mission
 * completion, badge award).
 */
export async function pushContentToUser(
  productId: string,
  userId: string,
  contentKey: string,
  source: MessageLogSource,
  sourceRef?: string,
): Promise<void> {
  try {
    const item = await getContentItemByKey(productId, contentKey);
    if (!item) {
      console.warn(`[notify] content "${contentKey}" not found in product ${productId}`);
      return;
    }
    const message = contentItemToMessage(item);
    if (!message) {
      console.warn(`[notify] content "${contentKey}" inactive/empty/malformed — skipping`);
      return;
    }

    const recent = await db().messageLog.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { oa_id: true },
    });
    if (!recent) {
      console.warn(`[notify] no OA context for user ${userId} — skipping notify (${sourceRef})`);
      return;
    }

    const oa = await getLineOAById(recent.oa_id.toString());
    if (!oa?.channel_access_token) {
      console.warn(`[notify] OA #${recent.oa_id} missing token — skipping notify`);
      return;
    }

    const { Client } = await import('@line/bot-sdk');
    const client = new Client({ channelAccessToken: oa.channel_access_token });
    await client.pushMessage(userId, message);
    await logOutboundLineMessage(oa.id, userId, message, source, sourceRef);
  } catch (err) {
    console.error('[notify] pushContentToUser error:', err);
  }
}
