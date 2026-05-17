# DB Conventions

Cross-table conventions for the Vitera Prisma schema. If you're adding
a column or table that touches users, products, or "is the row alive?",
read the relevant section first.

Last updated: 2026-05-18 (after the Phase 1/2 DB review fixes).

---

## 1. Soft delete vs status

Two conventions exist in the schema today; pick the one that matches
your row's lifecycle.

### `is_active: Boolean` — toggleable visibility

Use when the row's lifecycle is **on / off** — staff can flip it in HQ
to hide or show without losing config. Examples: `Product.is_active`,
`ContentItem.is_active`, `IntentRule.is_active`,
`MissionTemplate.is_active`, `BadgeTemplate.is_active`,
`JourneyTemplate.is_active`, `LineOA.is_active`,
`CoBlocksScenario.is_active`, `LineOARichMenuTemplate.is_active`.

Filter with `where: { is_active: true }`. Default is **always `true`
for ops-authored config** and **`false` for scenarios** (so they're
draft-by-default until ops opts in).

### `status: VarChar(20)` — multi-state lifecycle

Use when "alive" has more than two states. Allowed values are
documented per-model:

- `User-managed records` — `Wound.status: 'active' | 'archived'`
- `Workflow records` — `Enrollment.status: 'active' | 'completed' | 'abandoned'`
- `Per-user instance` — `MissionAssignment.status: 'pending' | 'completed' | 'abandoned'`

When in doubt, prefer `is_active`. Only use `status` if you actually
need a third state.

### Soft delete (`deleted_at`) — only on `users`

`User.deleted_at` is the **only** soft-delete marker we use. It's there
because user PII has a retention story (regulator can ask for
deletion; we may want to roll back accidental wipes). For other tables
we hard-delete.

---

## 2. UserAttribute key prefix convention

`UserAttribute` is **NOT scoped by `product_id`**. A user bound to two
products with the same `key` shares the value across both. This is
intentional — generic attributes (`life_stage`, `primary_concern`)
should be shared.

To avoid cross-product collisions for product-specific attributes, use
a **product-namespaced prefix**:

| Prefix      | Owner product       | Example keys                                |
| ----------- | ------------------- | ------------------------------------------- |
| `period_*`  | 月經週期 (period_cycle) | `period_phase`, `period_last_start`         |
| `nutri_*`   | 營養 (nutrition)        | `nutri_diet_type`, `nutri_allergens`        |
| _(unprefixed)_ | shared across products | `life_stage`, `primary_concern`, `timezone` |

When you create a new product, claim a prefix in this table and stick
to it. Lookups that need a single product's view filter with
`where: { user_id, key: { startsWith: 'period_' } }`.

If two products genuinely need to share an attribute, leave it
unprefixed — but document who reads/writes it so a future product owner
doesn't collide.

---

## 3. user_id FK + cascade

Every per-user table **must** declare a foreign key on `user_id` with
`ON DELETE CASCADE`. This is what makes `hardPurgeUser(userId)` in
`backend/src/lib/userDeletion.ts` actually wipe the row trail in one
shot — without it, PII deletion becomes a multi-table app-side
checklist that's easy to forget.

Tables fixed in 20260508010000_db_review_phase2_user_fks:

```
mission_assignments    user_attributes        message_log
mission_daily_logs     user_streaks           message_deliveries
user_mission_settings  user_badges            engagement_events
user_journey_phases    user_menu_assignments  unmatched_intents
```

When you add a new platform table:

1. Declare the relation in `schema.prisma`:
   ```prisma
   user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
   ```
2. Add the back-relation under `model User`.

That's it — Prisma will emit the right `ALTER TABLE ... ADD CONSTRAINT
... ON DELETE CASCADE`.

---

## 4. Soft delete + hard purge SOP

See `backend/src/lib/userDeletion.ts` for the helper functions. The
two-step workflow:

1. **Soft delete** (`softDeleteUser`) — sets `deleted_at`. Row stays;
   per-user data stays. Reversible via `restoreUser`.
2. **Hard purge** (`hardPurgeUser`) — `DELETE FROM users WHERE id = ?`.
   The cascade FKs do the rest. Irreversible.

Suggested cadence: a daily cron walks
`listSoftDeletedBefore(now - 30 days)` and calls `hardPurgeUser` on
each. We don't have this cron yet — when we add it, document it here.

### Reading list of active users

After this change, queries that list users **must** filter out
soft-deleted rows or they'll get ghost users back:

```ts
db().user.findMany({ where: { deleted_at: null } });
```

Wrappers in `lib/db.ts` (`getAllUsers`, `findUserById`,
`findOrCreateLineUser`, etc.) should be updated to filter when we
actually start using soft delete in production.

---

## 5. Indexes — when do you need one?

Add an index when:

- You filter by the column in queries that don't already have an index
  (e.g. `is_active`, `deleted_at`)
- You join on the column (every FK should be indexed; Prisma adds these
  automatically when you declare a relation, but explicit `@@index` is
  fine too)
- You sort by the column with a `LIMIT` (composite index with the
  filter column first)

Skip the index when the table will stay small (< ~10k rows) — the
overhead isn't worth it.
