import { db } from './db.js';
import { Prisma } from '@prisma/client';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageLogSource =
  | 'user'
  | 'follow_reply'
  | 'postback_reply'
  | 'intent'
  | 'ai_agent'
  | 'scheduler_push'
  | 'scheduler_ai'
  | 'mission_notify'
  | 'badge_notify'
  | 'habit_reminder'
  | 'manual_push'
  | 'phase_daily_push';

export interface LogInput {
  oaId: number;
  userId: string;
  direction: MessageDirection;
  /** 'text' | 'image' | 'sticker' | 'flex' | 'postback' */
  type: string;
  /** Plain text / altText / postback data — for preview. */
  contentText?: string | null;
  /** Full structured payload for flex / sticker / image. */
  contentJson?: unknown;
  source?: MessageLogSource;
  sourceRef?: string;
}

/**
 * Write one message to the conversation log. Fire-and-forget at call
 * sites (logging must never block or fail the actual LINE send), so
 * errors are caught and logged at ERROR level — never rethrown.
 */
export async function logMessage(input: LogInput): Promise<void> {
  try {
    await db().messageLog.create({
      data: {
        oa_id: input.oaId,
        user_id: input.userId,
        direction: input.direction,
        type: input.type,
        content_text: input.contentText ?? null,
        content_json:
          input.contentJson === undefined
            ? Prisma.JsonNull
            : (input.contentJson as Prisma.InputJsonValue),
        source: input.source ?? null,
        source_ref: input.sourceRef ?? null,
      },
    });
  } catch (err) {
    console.error('[messageLog] failed', err, { oaId: input.oaId, userId: input.userId });
  }
}

/**
 * Convenience: log a LINE Messaging API Message object as an outbound
 * entry. Extracts a preview text and stores the full payload so the UI
 * can render flex cards and stickers faithfully.
 */
export async function logOutboundLineMessage(
  oaId: number,
  userId: string,
  message: import('@line/bot-sdk').Message,
  source: MessageLogSource,
  sourceRef?: string,
): Promise<void> {
  const { type } = message;
  let contentText: string | null = null;
  let contentJson: unknown = message;
  switch (type) {
    case 'text':
      contentText = (message as { text?: string }).text ?? null;
      break;
    case 'image':
      contentText = (message as { originalContentUrl?: string }).originalContentUrl ?? null;
      break;
    case 'sticker': {
      const m = message as { packageId?: string; stickerId?: string };
      contentText = `sticker ${m.packageId ?? '?'}/${m.stickerId ?? '?'}`;
      break;
    }
    case 'flex':
      contentText = (message as { altText?: string }).altText ?? null;
      break;
    default:
      contentText = null;
  }
  await logMessage({
    oaId,
    userId,
    direction: 'outbound',
    type,
    contentText,
    contentJson,
    source,
    sourceRef,
  });
}
