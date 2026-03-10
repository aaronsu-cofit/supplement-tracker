import { PrismaClient } from "@prisma/client";

let _prisma;

function db() {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export async function initializeDatabase() {
  await db().$connect();
  return { success: true, mode: "postgres" };
}

// ============================================
// Supplements CRUD
// ============================================
export async function getSupplements(userId) {
  return db().supplement.findMany({
    where: { user_id: userId },
    orderBy: [{ time_of_day: "asc" }, { name: "asc" }],
  });
}

export async function createSupplement(userId, data) {
  return db().supplement.create({
    data: {
      user_id: userId,
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || "daily",
      time_of_day: data.time_of_day || "morning",
      notes: data.notes || null,
    },
  });
}

export async function updateSupplement(userId, id, data) {
  const existing = await db().supplement.findFirst({
    where: { id, user_id: userId },
  });
  if (!existing) return null;
  return db().supplement.update({
    where: { id },
    data: {
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || "daily",
      time_of_day: data.time_of_day || "morning",
      notes: data.notes || null,
    },
  });
}

export async function deleteSupplement(userId, id) {
  await db().supplement.deleteMany({ where: { id, user_id: userId } });
  return { success: true };
}

// ============================================
// Check-ins
// ============================================
export async function getCheckIns(userId, date) {
  const rows = await db().$queryRaw`
    SELECT ci.*, s.name as supplement_name, s.dosage, s.time_of_day
    FROM check_ins ci
    JOIN supplements s ON ci.supplement_id = s.id
    WHERE ci.user_id = ${userId}
      AND ci.date = ${date}::date
    ORDER BY ci.checked_at
  `;
  return rows;
}

export async function getCheckInHistory(userId, startDate, endDate) {
  const rows = await db().$queryRaw`
    SELECT
      ci.date::text,
      COUNT(ci.id)::int      AS check_count,
      COUNT(DISTINCT ci.supplement_id)::int AS supplements_taken
    FROM check_ins ci
    WHERE ci.user_id = ${userId}
      AND ci.date >= ${startDate}::date
      AND ci.date <= ${endDate}::date
    GROUP BY ci.date
    ORDER BY ci.date DESC
  `;
  return rows;
}

export async function createCheckIn(userId, supplementId) {
  const existing = await db().$queryRaw`
    SELECT id FROM check_ins
    WHERE user_id = ${userId}
      AND supplement_id = ${supplementId}
      AND date = CURRENT_DATE
  `;
  if (existing.length > 0) return { already_checked: true };
  return db().checkIn.create({
    data: { user_id: userId, supplement_id: supplementId },
  });
}

export async function removeCheckIn(userId, supplementId, date) {
  await db().$executeRaw`
    DELETE FROM check_ins
    WHERE user_id = ${userId}
      AND supplement_id = ${supplementId}
      AND date = ${date}::date
  `;
  return { success: true };
}

export async function getStreak(userId) {
  const rows = await db().$queryRaw`
    WITH dates AS (
      SELECT DISTINCT date FROM check_ins
      WHERE user_id = ${userId}
      ORDER BY date DESC
    ),
    numbered AS (
      SELECT date,
             date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day' AS grp
      FROM dates
    )
    SELECT COUNT(*)::int AS streak
    FROM numbered
    WHERE grp = (SELECT grp FROM numbered ORDER BY date DESC LIMIT 1)
  `;
  return rows[0]?.streak || 0;
}

// ============================================
// Wounds CRUD
// ============================================
export async function getWounds(userId) {
  return db().wound.findMany({
    where: {
      user_id: userId,
      status: "active",
    },
    orderBy: { created_at: "desc" },
  });
}

export async function getWoundById(userId, woundId) {
  return db().wound.findFirst({
    where: { id: Number(woundId), user_id: String(userId) },
  });
}

export async function createWound(userId, data) {
  return db().wound.create({
    data: {
      user_id: userId,
      name: data.name || "未命名傷口",
      location: data.location || null,
      date_of_injury: data.date_of_injury
        ? new Date(data.date_of_injury)
        : new Date(),
      display_name: data.display_name || null,
      picture_url: data.picture_url || null,
      wound_type: data.wound_type || null,
      body_location: data.body_location || null,
      status: "active",
    },
  });
}

export async function updateWound(woundId, userId, updates) {
  const existing = await db().wound.findFirst({
    where: { id: woundId, user_id: userId },
  });
  if (!existing) return null;
  return db().wound.update({
    where: { id: woundId },
    data: {
      ...(updates.name != null && { name: updates.name }),
      ...(updates.wound_type != null && { wound_type: updates.wound_type }),
      ...(updates.body_location != null && {
        body_location: updates.body_location,
      }),
      ...(updates.date_of_injury != null && {
        date_of_injury: new Date(updates.date_of_injury),
      }),
    },
  });
}

export async function archiveWound(userId, woundId) {
  const existing = await db().wound.findFirst({
    where: { id: woundId, user_id: userId },
  });
  if (!existing) return null;
  return db().wound.update({
    where: { id: woundId },
    data: { status: "archived" },
  });
}

export async function getAllWoundsAdmin() {
  return db().wound.findMany({
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

// ============================================
// Wound Logs
// ============================================
export async function getWoundLogs(userId, woundId) {
  return db().woundLog.findMany({
    where: { user_id: userId, wound_id: woundId },
    orderBy: { logged_at: "desc" },
  });
}

export async function getWoundLogsAdmin(woundId) {
  return db().woundLog.findMany({
    where: { wound_id: woundId },
    orderBy: { logged_at: "desc" },
  });
}

export async function createWoundLog(userId, woundId, data) {
  return db().woundLog.create({
    data: {
      user_id: userId,
      wound_id: woundId,
      image_data: data.image_data || null,
      nrs_pain_score: data.nrs_pain_score || 0,
      symptoms: data.symptoms || null,
      ai_assessment_summary: data.ai_assessment_summary || null,
      ai_status_label: data.ai_status_label || null,
    },
  });
}

// ============================================
// User Auth
// ============================================
export async function findUserByEmail(email) {
  return db().user.findUnique({ where: { email } });
}

export async function createEmailUser(id, email, passwordHash, displayName) {
  return db().user.create({
    data: {
      id,
      email,
      password_hash: passwordHash,
      display_name: displayName,
      auth_provider: "email",
    },
  });
}

export async function findOrCreateLineUser(
  lineUserId,
  displayName,
  pictureUrl,
) {
  return db().user.upsert({
    where: { id: lineUserId },
    update: { display_name: displayName, picture_url: pictureUrl },
    create: {
      id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl,
      auth_provider: "line",
    },
  });
}

export async function findUserById(userId) {
  return db().user.findUnique({ where: { id: userId } });
}

export async function getAllUsers() {
  return db().user.findMany({
    select: {
      id: true,
      email: true,
      display_name: true,
      picture_url: true,
      auth_provider: true,
      role: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });
}

export async function updateUserRole(userId, newRole) {
  try {
    return await db().user.update({
      where: { id: userId },
      data: { role: newRole },
    });
  } catch {
    return null;
  }
}

// ============================================
// Foot Care / Bones
// ============================================
export async function getFootAssessments(userId) {
  return db().footAssessment.findMany({
    where: { user_id: userId },
    orderBy: { date: "desc" },
  });
}

export async function createFootAssessment(userId, data) {
  return db().footAssessment.create({
    data: {
      user_id: userId,
      pain_locations: data.pain_locations || null,
      nrs_pain_score: data.nrs_pain_score || 0,
      steps_count: data.steps_count || 0,
      standing_hours: data.standing_hours || 0,
      ...(data.date && { date: new Date(data.date) }),
    },
  });
}

export async function getFootImages(userId) {
  return db().footImage.findMany({
    where: { user_id: userId },
    orderBy: { logged_at: "desc" },
  });
}

export async function createFootImage(userId, data) {
  return db().footImage.create({
    data: {
      user_id: userId,
      image_data: data.image_data || null,
      ai_severity: data.ai_severity || null,
      ai_summary: data.ai_summary || null,
      ai_details: data.ai_details || null,
    },
  });
}

// ============================================
// Intimacy
// ============================================
export async function getIntimacyAssessments(userId) {
  return db().intimacyAssessment.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });
}

export async function createIntimacyAssessment(userId, data) {
  return db().intimacyAssessment.create({
    data: {
      user_id: userId,
      gender: data.gender || null,
      primary_concern: data.primary_concern || null,
      assessment_data: data.assessment_data || null,
      ai_summary: data.ai_summary || null,
    },
  });
}

// ============================================
// Modules
// ============================================
export async function getActiveModules() {
  return db().module.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });
}

export async function getAllModules() {
  return db().module.findMany({
    orderBy: { sort_order: "asc" },
  });
}

export async function updateModule(id, updates) {
  return db().module.update({
    where: { id },
    data: {
      ...(updates.name_zh != null && { name_zh: updates.name_zh }),
      ...(updates.name_en != null && { name_en: updates.name_en }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      ...(updates.sort_order !== undefined && {
        sort_order: updates.sort_order,
      }),
      ...(updates.external_url != null && {
        external_url: updates.external_url,
      }),
    },
  });
}
