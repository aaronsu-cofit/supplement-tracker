// User deletion SOP. Two-step model:
//
//   1. softDeleteUser(userId)  — sets users.deleted_at = NOW(). Per-user
//      data stays intact for the retention period (so support can roll
//      back if the user changes their mind, audit trail intact for any
//      regulator request, etc.).
//
//   2. hardPurgeUser(userId)   — actually DELETEs the users row. The FKs
//      added in 20260508010000_db_review_phase2_user_fks then cascade
//      and wipe every per-user platform table in one shot. After this
//      the user's PII is gone (modulo backups, which is a separate
//      retention-policy problem).
//
// Tables wiped on hard purge (via ON DELETE CASCADE):
//   mission_assignments, mission_daily_logs, user_mission_settings,
//   user_attributes, user_streaks, user_badges, user_journey_phases,
//   message_log, message_deliveries, engagement_events,
//   unmatched_intents, user_menu_assignments,
//   plus the legacy app tables (supplements, wounds, ...).
//
// What is NOT wiped: cross-user aggregates (BadgeTemplate, ContentItem,
// MissionTemplate) — those are product-level, no PII. Anything you add
// later that holds user_id MUST add an FK with ON DELETE CASCADE so
// hard-purge stays a one-liner.

import { db } from './db';

export async function softDeleteUser(userId: string): Promise<void> {
  await db().user.update({
    where: { id: userId },
    data: { deleted_at: new Date() },
  });
}

export async function restoreUser(userId: string): Promise<void> {
  await db().user.update({
    where: { id: userId },
    data: { deleted_at: null },
  });
}

// Hard purge — irreversible. Caller is responsible for verifying the
// user really wants this (e.g. has been soft-deleted past retention
// window, or has explicitly requested account erasure under
// GDPR/PIPL-equivalent).
//
// We use a raw DELETE so the cascade fires on the DB side. Prisma's
// `user.delete` would also work but goes through Prisma's relation
// graph which can be slower on accounts with lots of message_log rows.
export async function hardPurgeUser(userId: string): Promise<void> {
  await db().$executeRaw`DELETE FROM "users" WHERE "id" = ${userId}`;
}

// Convenience: list users soft-deleted before a cutoff. Use this from
// a cron job to drive the retention-window purge.
//
//   const stale = await listSoftDeletedBefore(new Date(Date.now() - 30 * 86400_000));
//   for (const u of stale) await hardPurgeUser(u.id);
export async function listSoftDeletedBefore(cutoff: Date) {
  return db().user.findMany({
    where: { deleted_at: { not: null, lt: cutoff } },
    select: { id: true, email: true, deleted_at: true },
  });
}
