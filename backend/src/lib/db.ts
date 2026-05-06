import { PrismaClient, Prisma } from '@prisma/client';
import type {
  CreateSupplementInput,
  CreateWoundInput,
  UpdateWoundInput,
  CreateWoundLogInput,
  CreateFootAssessmentInput,
  CreateFootImageInput,
  CreateShoeImageInput,
  CreateIntimacyAssessmentInput,
  UpdateModuleInput,
  CreateLineOAInput,
  UpdateLineOAInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateProductInput,
  UpdateProductInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  CreateIntentRuleInput,
  UpdateIntentRuleInput,
  CreateMissionTemplateInput,
  UpdateMissionTemplateInput,
  CreateBadgeTemplateInput,
  UpdateBadgeTemplateInput,
  BadgeCriteria,
  CreateJourneyTemplateInput,
  UpdateJourneyTemplateInput,
} from '../types.js';

let _prisma: PrismaClient | undefined;

export function db(): PrismaClient {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export async function initializeDatabase(): Promise<{ success: boolean; mode: string }> {
  await db().$connect();
  return { success: true, mode: 'postgres' };
}

// ============================================
// Supplements CRUD
// ============================================
export async function getSupplements(userId: string) {
  return db().supplement.findMany({
    where: { user_id: userId },
    orderBy: [{ time_of_day: 'asc' }, { name: 'asc' }],
  });
}

export async function createSupplement(userId: string, data: CreateSupplementInput) {
  return db().supplement.create({
    data: {
      user_id: userId,
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || 'daily',
      time_of_day: data.time_of_day || 'morning',
      notes: data.notes || null,
    },
  });
}

export async function updateSupplement(userId: string, id: string, data: CreateSupplementInput) {
  const existing = await db().supplement.findFirst({ where: { id: parseInt(id, 10), user_id: userId } });
  if (!existing) return null;
  return db().supplement.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || 'daily',
      time_of_day: data.time_of_day || 'morning',
      notes: data.notes || null,
    },
  });
}

export async function deleteSupplement(userId: string, id: string): Promise<{ success: boolean }> {
  await db().supplement.deleteMany({ where: { id: parseInt(id, 10), user_id: userId } });
  return { success: true };
}

// ============================================
// Check-ins
// ============================================
export async function getCheckIns(userId: string, date: string) {
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

export async function getCheckInHistory(userId: string, startDate: string, endDate: string) {
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

export async function createCheckIn(userId: string, supplementId: string) {
  const existing = await db().$queryRaw`
    SELECT id FROM check_ins
    WHERE user_id = ${userId}
      AND supplement_id = ${supplementId}
      AND date = CURRENT_DATE
  ` as unknown[];
  if (existing.length > 0) return { already_checked: true };
  return db().checkIn.create({
    data: { user_id: userId, supplement_id: parseInt(supplementId, 10) },
  });
}

export async function removeCheckIn(userId: string, supplementId: string, date: string): Promise<{ success: boolean }> {
  await db().$executeRaw`
    DELETE FROM check_ins
    WHERE user_id = ${userId}
      AND supplement_id = ${supplementId}
      AND date = ${date}::date
  `;
  return { success: true };
}

export async function getStreak(userId: string): Promise<number> {
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
  ` as Array<{ streak: number }>;
  return rows[0]?.streak || 0;
}

// ============================================
// Wounds CRUD
// ============================================
export async function getWounds(userId: string) {
  return db().wound.findMany({
    where: { user_id: userId, status: 'active' },
    orderBy: { created_at: 'desc' },
  });
}

export async function getWoundById(userId: string, woundId: number) {
  return db().wound.findFirst({
    where: { id: woundId, user_id: userId },
  });
}

export async function createWound(userId: string, data: CreateWoundInput) {
  return db().wound.create({
    data: {
      user_id: userId,
      name: data.name || '未命名傷口',
      location: data.location || null,
      date_of_injury: data.date_of_injury ? new Date(data.date_of_injury) : new Date(),
      display_name: data.display_name || null,
      picture_url: data.picture_url || null,
      wound_type: data.wound_type || null,
      body_location: data.body_location || null,
      status: 'active',
    },
  });
}

export async function updateWound(woundId: number, userId: string, updates: UpdateWoundInput) {
  const existing = await db().wound.findFirst({ where: { id: woundId, user_id: userId } });
  if (!existing) return null;
  return db().wound.update({
    where: { id: woundId },
    data: {
      ...(updates.name != null && { name: updates.name }),
      ...(updates.wound_type != null && { wound_type: updates.wound_type }),
      ...(updates.body_location != null && { body_location: updates.body_location }),
      ...(updates.date_of_injury != null && { date_of_injury: new Date(updates.date_of_injury) }),
    },
  });
}

export async function archiveWound(userId: string, woundId: number) {
  const existing = await db().wound.findFirst({ where: { id: woundId, user_id: userId } });
  if (!existing) return null;
  return db().wound.update({ where: { id: woundId }, data: { status: 'archived' } });
}

export async function getAllWoundsAdmin() {
  return db().wound.findMany({
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

// ============================================
// Wound Logs
// ============================================
export async function getWoundLogs(userId: string, woundId: number) {
  return db().woundLog.findMany({
    where: { user_id: userId, wound_id: woundId },
    orderBy: { logged_at: 'desc' },
  });
}

export async function getWoundLogsAdmin(woundId: number) {
  return db().woundLog.findMany({
    where: { wound_id: woundId },
    orderBy: { logged_at: 'desc' },
  });
}

export async function createWoundLog(userId: string, woundId: number, data: CreateWoundLogInput) {
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
export async function findUserByEmail(email: string) {
  return db().user.findUnique({ where: { email } });
}

export async function createEmailUser(
  id: string,
  email: string,
  passwordHash: string,
  displayName: string,
) {
  return db().user.create({
    data: {
      id,
      email,
      password_hash: passwordHash,
      display_name: displayName,
      auth_provider: 'email',
    },
  });
}

export async function findOrCreateLineUser(
  lineUserId: string,
  displayName?: string,
  pictureUrl?: string,
) {
  return db().user.upsert({
    where: { id: lineUserId },
    update: { display_name: displayName, picture_url: pictureUrl },
    create: {
      id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl,
      auth_provider: 'line',
    },
  });
}

export async function findUserById(userId: string) {
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
    orderBy: { created_at: 'desc' },
  });
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    return await db().user.update({ where: { id: userId }, data: { role: newRole } });
  } catch {
    return null;
  }
}

// ============================================
// Foot Care / Bones
// ============================================
export async function getFootAssessments(userId: string) {
  return db().footAssessment.findMany({
    where: { user_id: userId },
    orderBy: { date: 'desc' },
  });
}

export async function createFootAssessment(userId: string, data: CreateFootAssessmentInput) {
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

export async function getFootImages(userId: string) {
  return db().footImage.findMany({
    where: { user_id: userId },
    orderBy: { logged_at: 'desc' },
  });
}

export async function createFootImage(userId: string, data: CreateFootImageInput) {
  return db().footImage.create({
    data: {
      user_id: userId,
      image_data: data.image_data || null,
      ai_severity: data.ai_severity || null,
      ai_summary: data.ai_summary || null,
      ai_details: (data.ai_details as object) || null,
    },
  });
}

export async function getShoeImages(userId: string) {
  return db().shoeImage.findMany({
    where: { user_id: userId },
    orderBy: { logged_at: 'desc' },
  });
}

export async function createShoeImage(userId: string, data: CreateShoeImageInput) {
  return db().shoeImage.create({
    data: {
      user_id: userId,
      image_data: data.image_data || null,
      ai_risk_level: data.ai_risk_level || null,
      ai_wear_pattern: data.ai_wear_pattern || null,
      ai_summary: data.ai_summary || null,
      ai_details: (data.ai_details as object) || null,
    },
  });
}

// ============================================
// Intimacy
// ============================================
export async function getIntimacyAssessments(userId: string) {
  return db().intimacyAssessment.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

export async function createIntimacyAssessment(userId: string, data: CreateIntimacyAssessmentInput) {
  return db().intimacyAssessment.create({
    data: {
      user_id: userId,
      gender: data.gender || null,
      primary_concern: data.primary_concern || null,
      assessment_data: (data.assessment_data as object) || null,
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
    orderBy: { sort_order: 'asc' },
  });
}

export async function getAllModules() {
  return db().module.findMany({ orderBy: { sort_order: 'asc' } });
}

export async function updateModule(id: string, updates: UpdateModuleInput) {
  return db().module.update({
    where: { id },
    data: {
      ...(updates.name_zh != null && { name_zh: updates.name_zh }),
      ...(updates.name_en != null && { name_en: updates.name_en }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      ...(updates.sort_order !== undefined && { sort_order: updates.sort_order }),
      ...(updates.external_url != null && { external_url: updates.external_url }),
    },
  });
}

// ============================================
// LINE OA CRUD
// ============================================

// The actual channel_secret value is never returned to clients; we only
// expose a boolean `has_channel_secret` computed in the query wrapper.
const OA_PUBLIC_WITH_SECRET_STATUS = {
  id: true,
  name: true,
  description: true,
  is_active: true,
  line_destination_id: true,
  channel_secret: true,
  default_agent_id: true,
  ai_skill_platform_url: true,
  ai_skill_platform_api_key: true,
  product_id: true,
  created_at: true,
  updated_at: true,
};

export async function getAllLineOAs() {
  const rows = await db().lineOA.findMany({
    select: OA_PUBLIC_WITH_SECRET_STATUS,
    orderBy: { created_at: 'desc' },
  });
  return rows.map(r => {
    const { channel_secret, ai_skill_platform_api_key, ...safe } = r;
    return {
      ...safe,
      has_channel_secret: !!channel_secret,
      has_ai_skill_platform_api_key: !!ai_skill_platform_api_key,
    };
  });
}

export async function getLineOAById(id: string) {
  return db().lineOA.findUnique({ where: { id: parseInt(id, 10) } });
}

export async function createLineOA(data: CreateLineOAInput & { line_destination_id?: string | null }) {
  const oa = await db().lineOA.create({
    data: {
      name: data.name,
      description: data.description || null,
      channel_access_token: data.channel_access_token,
      channel_secret: data.channel_secret || null,
      line_destination_id: data.line_destination_id || null,
      ...(data.default_agent_id && { default_agent_id: data.default_agent_id }),
      ai_skill_platform_url: data.ai_skill_platform_url || null,
      ai_skill_platform_api_key: data.ai_skill_platform_api_key || null,
      ...(data.product_id !== undefined && { product_id: data.product_id || null }),
    },
  });
  const { channel_access_token: _t, channel_secret: _s, ai_skill_platform_api_key: _k, ...safe } = oa;
  void _t; void _s; void _k;
  return safe;
}

export async function updateLineOA(id: string, data: UpdateLineOAInput & { line_destination_id?: string | null }) {
  const oa = await db().lineOA.update({
    where: { id: parseInt(id, 10) },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.channel_access_token != null && { channel_access_token: data.channel_access_token }),
      ...(data.channel_secret !== undefined && { channel_secret: data.channel_secret || null }),
      ...(data.line_destination_id !== undefined && { line_destination_id: data.line_destination_id || null }),
      ...(data.default_agent_id != null && { default_agent_id: data.default_agent_id }),
      ...(data.ai_skill_platform_url !== undefined && { ai_skill_platform_url: data.ai_skill_platform_url || null }),
      ...(data.ai_skill_platform_api_key !== undefined && { ai_skill_platform_api_key: data.ai_skill_platform_api_key || null }),
      ...(data.product_id !== undefined && { product_id: data.product_id || null }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
  const { channel_access_token: _t, channel_secret: _s, ai_skill_platform_api_key: _k, ...safe } = oa;
  void _t; void _s; void _k;
  return safe;
}

/**
 * Find the OA that owns a given webhook `destination` (the bot's LINE
 * user ID). Returns null if no match. Used by the webhook router.
 */
export async function getLineOAByDestination(destination: string) {
  return db().lineOA.findFirst({
    where: { line_destination_id: destination, is_active: true },
  });
}

export async function deleteLineOA(id: string): Promise<{ success: boolean }> {
  await db().lineOA.delete({ where: { id: parseInt(id, 10) } });
  return { success: true };
}

// ─── LINE OA Rich Menu Templates ────────────────────────────────────────────

export async function getTemplatesForOA(oaId: string) {
  return db().lineOARichMenuTemplate.findMany({
    where: { oa_id: parseInt(oaId, 10) },
    orderBy: { created_at: 'desc' },
  });
}

export async function getTemplateById(id: string) {
  return db().lineOARichMenuTemplate.findUnique({ where: { id: parseInt(id, 10) } });
}

export async function createTemplate(oaId: string, data: CreateTemplateInput) {
  return db().lineOARichMenuTemplate.create({
    data: { oa_id: parseInt(oaId, 10), name: data.name, zones: data.zones as Prisma.InputJsonValue },
  });
}

export async function updateTemplate(id: string, data: UpdateTemplateInput) {
  return db().lineOARichMenuTemplate.update({
    where: { id: parseInt(id, 10) },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.zones != null && { zones: data.zones as Prisma.InputJsonValue }),
    },
  });
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  await db().lineOARichMenuTemplate.delete({ where: { id: parseInt(id, 10) } });
  return { success: true };
}

export async function setActiveTemplate(oaId: string, templateId: string, richMenuId: string | null = null) {
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: parseInt(oaId, 10) },
    data: { is_active: false },
  });
  return db().lineOARichMenuTemplate.update({
    where: { id: parseInt(templateId, 10) },
    data: {
      is_active: true,
      ...(richMenuId != null && { line_rich_menu_id: richMenuId }),
    },
  });
}

export async function deactivateAllTemplates(oaId: string) {
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: parseInt(oaId, 10) },
    data: { is_active: false },
  });
}

// ─── CoBlocks Scenarios ──────────────────────────────────────────────────────

export async function getScenariosForOA(oaId: string) {
  return db().coBlocksScenario.findMany({
    where: { oa_id: oaId },
    orderBy: { created_at: 'desc' },
  });
}

export async function getScenarioById(id: string) {
  return db().coBlocksScenario.findUnique({ where: { id } });
}

export async function createScenario(oaId: string, name: string) {
  return db().coBlocksScenario.create({
    data: { oa_id: oaId, name },
  });
}

export async function updateScenario(
  id: string,
  data: { name?: string; flow_nodes?: unknown; flow_edges?: unknown; is_active?: boolean }
) {
  return db().coBlocksScenario.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.flow_nodes !== undefined && { flow_nodes: data.flow_nodes as Prisma.InputJsonValue }),
      ...(data.flow_edges !== undefined && { flow_edges: data.flow_edges as Prisma.InputJsonValue }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteScenario(id: string) {
  return db().coBlocksScenario.delete({ where: { id } });
}

// ─── User Menu Assignments ────────────────────────────────────────────────────

export async function upsertUserMenuAssignment(
  userId: string,
  oaId: number,
  templateId: number | null,
  source: 'rule' | 'ai' | 'fallback' | 'manual'
) {
  return db().userMenuAssignment.upsert({
    where: { user_id_oa_id: { user_id: userId, oa_id: oaId } },
    create: { user_id: userId, oa_id: oaId, template_id: templateId, source, assigned_at: new Date() },
    update: { template_id: templateId, source, assigned_at: new Date() },
  });
}

export async function getUserMenuAssignment(userId: string, oaId: number) {
  return db().userMenuAssignment.findUnique({
    where: { user_id_oa_id: { user_id: userId, oa_id: oaId } },
  });
}

export async function getActiveTemplateForOA(oaId: number) {
  return db().lineOARichMenuTemplate.findFirst({
    where: { oa_id: oaId, is_active: true, line_rich_menu_id: { not: null } },
  });
}

export async function getRecentMenuAssignments(oaId: number, limit = 20) {
  const rows = await db().userMenuAssignment.findMany({
    where: { oa_id: oaId },
    orderBy: { assigned_at: 'desc' },
    take: limit,
  });
  const templateIds = [...new Set(rows.map(r => r.template_id).filter((id): id is number => id !== null))];
  const templates = templateIds.length
    ? await db().lineOARichMenuTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(templates.map(t => [t.id, t.name]));
  return rows.map(r => ({
    ...r,
    template_name: r.template_id != null ? nameById.get(r.template_id) ?? null : null,
  }));
}

export async function getHQStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    oaCount,
    scenarioCount,
    activeScenarioCount,
    templateCount,
    deployedTemplateCount,
    recentAssignmentCount,
    enrollmentCount,
    recentEngagementCount,
  ] = await Promise.all([
    db().lineOA.count(),
    db().coBlocksScenario.count(),
    db().coBlocksScenario.count({ where: { is_active: true } }),
    db().lineOARichMenuTemplate.count(),
    db().lineOARichMenuTemplate.count({ where: { line_rich_menu_id: { not: null } } }),
    db().userMenuAssignment.count({ where: { assigned_at: { gte: sevenDaysAgo } } }),
    db().enrollment.count({ where: { status: 'active' } }),
    db().engagementEvent.count({ where: { occurred_at: { gte: sevenDaysAgo } } }),
  ]);
  return {
    oaCount,
    scenarioCount,
    activeScenarioCount,
    templateCount,
    deployedTemplateCount,
    recentAssignmentCount,
    enrollmentCount,
    recentEngagementCount,
  };
}

export async function getUserRole(userId: string): Promise<string | null> {
  const row = await db().user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role ?? null;
}

// ============================================
// Scheduler (push message engine)
// ============================================
export async function getLineUsers() {
  return db().user.findMany({
    where: { auth_provider: 'line' },
    select: { id: true, created_at: true, timezone: true },
  });
}

export async function getActiveScenariosForOA(oaId: number) {
  return db().coBlocksScenario.findMany({
    where: {
      is_active: true,
      OR: [{ oa_id: oaId.toString() }, { oa_id: 'default' }],
    },
  });
}

/**
 * Idempotently enroll a user in a scenario. If an enrollment already exists
 * (regardless of its status), it is NOT overwritten — caller can explicitly
 * update the status via updateEnrollmentStatus.
 */
export async function enrollUserInScenario(userId: string, scenarioId: string, enrolledAt?: Date) {
  return db().enrollment.upsert({
    where: { user_id_scenario_id: { user_id: userId, scenario_id: scenarioId } },
    create: { user_id: userId, scenario_id: scenarioId, enrolled_at: enrolledAt ?? new Date() },
    update: {},
  });
}

/**
 * Bulk-enroll every LINE user in the given scenario (e.g., when a scenario
 * is newly activated). Uses createMany(skipDuplicates) so existing
 * enrollments are preserved. Returns the count of LINE users considered.
 */
export async function deleteEnrollment(id: number): Promise<void> {
  try {
    await db().enrollment.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return;
    throw err;
  }
}

export async function deleteAllEnrollmentsForScenario(scenarioId: string): Promise<number> {
  const res = await db().enrollment.deleteMany({ where: { scenario_id: scenarioId } });
  return res.count;
}

export async function enrollAllLineUsersInScenario(scenarioId: string): Promise<number> {
  const users = await db().user.findMany({ where: { auth_provider: 'line' }, select: { id: true } });
  if (users.length === 0) return 0;
  const now = new Date();
  await db().enrollment.createMany({
    data: users.map(u => ({ user_id: u.id, scenario_id: scenarioId, enrolled_at: now })),
    skipDuplicates: true,
  });
  return users.length;
}

/**
 * Returns active enrollments for scenarios that (a) are is_active=true and
 * (b) belong to the given OA (or to legacy oa_id='default'). Includes user
 * timezone and the scenario's flow JSON for scheduler consumption.
 */
export async function logEngagementEvent(userId: string, eventType: string, payload?: string) {
  return db().engagementEvent.create({
    data: { user_id: userId, event_type: eventType, payload: payload ?? null },
  });
}

/**
 * List active enrollments, optionally filtered to scenarios belonging to
 * the given OA (or legacy 'default'). When oaId is omitted returns all.
 */
export async function getActiveEnrollmentsList(limit = 50, oaId?: number) {
  return db().enrollment.findMany({
    where: {
      status: 'active',
      ...(oaId != null && {
        scenario: {
          OR: [{ oa_id: oaId.toString() }, { oa_id: 'default' }],
        },
      }),
    },
    orderBy: { enrolled_at: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, display_name: true, timezone: true } },
      scenario: { select: { id: true, name: true, is_active: true, oa_id: true } },
    },
  });
}

/**
 * Recent deliveries. When oaId is provided, restricts to scenarios of that
 * OA (plus legacy 'default') via a subquery on scenario_id.
 */
/**
 * Recent deliveries with each row enriched by the scenario name and the
 * matching flow node's type and a small data snapshot. Node-level detail
 * lives in the scenario's flow_nodes JSON, so we batch-fetch scenarios
 * once and resolve locally. Callers that don't need the enrichment can
 * still use the raw shape — the base fields are unchanged.
 */
export async function getRecentDeliveries(limit = 50, oaId?: number) {
  async function fetchRows() {
    if (oaId == null) {
      return db().messageDelivery.findMany({ orderBy: { delivered_at: 'desc' }, take: limit });
    }
    const scenarioIds = (
      await db().coBlocksScenario.findMany({
        where: { OR: [{ oa_id: oaId.toString() }, { oa_id: 'default' }] },
        select: { id: true },
      })
    ).map(s => s.id);
    if (scenarioIds.length === 0) return [];
    return db().messageDelivery.findMany({
      where: { scenario_id: { in: scenarioIds } },
      orderBy: { delivered_at: 'desc' },
      take: limit,
    });
  }
  const rows = await fetchRows();
  if (rows.length === 0) return rows;
  const uniqueScenarioIds = Array.from(new Set(rows.map(r => r.scenario_id)));
  const scenarios = await db().coBlocksScenario.findMany({
    where: { id: { in: uniqueScenarioIds } },
    select: { id: true, name: true, flow_nodes: true },
  });
  const byId = new Map(scenarios.map(s => [s.id, s]));
  return rows.map(r => {
    const scenario = byId.get(r.scenario_id);
    const nodes = Array.isArray(scenario?.flow_nodes)
      ? (scenario!.flow_nodes as Array<{ id: string; type?: string; data?: Record<string, unknown> }>)
      : [];
    const node = nodes.find(n => n.id === r.node_id);
    return {
      ...r,
      scenario_name: scenario?.name ?? null,
      node_type: node?.type ?? null,
      node_data: node?.data ?? null,
    };
  });
}

export async function getRecentEngagementEvents(limit = 50) {
  return db().engagementEvent.findMany({
    orderBy: { occurred_at: 'desc' },
    take: limit,
  });
}

export async function getActiveEnrollmentsForOA(oaId: number) {
  return db().enrollment.findMany({
    where: {
      status: 'active',
      scenario: {
        is_active: true,
        OR: [{ oa_id: oaId.toString() }, { oa_id: 'default' }],
      },
    },
    include: {
      user: { select: { id: true, timezone: true } },
      scenario: { select: { id: true, flow_nodes: true, flow_edges: true } },
    },
  });
}

export async function getMessageDelivery(userId: string, scenarioId: string, nodeId: string) {
  return db().messageDelivery.findUnique({
    where: { user_id_scenario_id_node_id: { user_id: userId, scenario_id: scenarioId, node_id: nodeId } },
  });
}

/**
 * Atomically claim a (user, scenario, node) delivery slot. Returns true if
 * this caller won the claim; false if another caller (or a previous run)
 * already claimed it. The unique constraint makes this a safe compare-and-set.
 */
export async function tryClaimDelivery(userId: string, scenarioId: string, nodeId: string): Promise<boolean> {
  try {
    await db().messageDelivery.create({
      data: { user_id: userId, scenario_id: scenarioId, node_id: nodeId },
    });
    return true;
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') return false;
    throw err;
  }
}

/**
 * Release a previously claimed delivery slot so a future run may retry.
 * Called when the downstream push failed after the claim succeeded.
 */
export async function releaseDelivery(userId: string, scenarioId: string, nodeId: string): Promise<void> {
  try {
    await db().messageDelivery.delete({
      where: { user_id_scenario_id_node_id: { user_id: userId, scenario_id: scenarioId, node_id: nodeId } },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return;
    throw err;
  }
}

// ============================================
// Products (shareable config bundles across OAs)
// ============================================
export async function getAllProducts() {
  const rows = await db().product.findMany({
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { oas: true } } },
  });
  return rows.map(r => {
    const { _count, ...rest } = r;
    return { ...rest, oa_count: _count.oas };
  });
}

export async function getProductById(id: string) {
  return db().product.findUnique({
    where: { id },
    include: {
      oas: {
        select: { id: true, name: true, is_active: true },
        orderBy: { created_at: 'desc' },
      },
    },
  });
}

export async function createProduct(data: CreateProductInput) {
  return db().product.create({
    data: {
      name: data.name,
      description: data.description ?? null,
    },
  });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  return db().product.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  await db().product.delete({ where: { id } });
  return { success: true };
}

// ============================================
// User Attributes (per-user key/value store)
// ============================================
export async function getUserAttributes(userId: string) {
  return db().userAttribute.findMany({
    where: { user_id: userId },
    orderBy: { key: 'asc' },
  });
}

export async function getUserAttribute(userId: string, key: string) {
  return db().userAttribute.findUnique({
    where: { user_id_key: { user_id: userId, key } },
  });
}

export async function setUserAttribute(userId: string, key: string, value: string | null) {
  return db().userAttribute.upsert({
    where: { user_id_key: { user_id: userId, key } },
    create: { user_id: userId, key, value, set_at: new Date() },
    update: { value, set_at: new Date() },
  });
}

export async function deleteUserAttribute(userId: string, key: string): Promise<{ success: boolean }> {
  try {
    await db().userAttribute.delete({
      where: { user_id_key: { user_id: userId, key } },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Content Items (per-product content library)
// ============================================
export async function getContentItemsForProduct(productId: string) {
  return db().contentItem.findMany({
    where: { product_id: productId },
    // Active first so disabled items sink, then newest-first within each
    // group (ops mostly cares about what they just created).
    orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
  });
}

export async function getContentItemByKey(productId: string, key: string) {
  return db().contentItem.findUnique({
    where: { product_id_key: { product_id: productId, key } },
  });
}

export async function createContentItem(productId: string, data: CreateContentItemInput) {
  return db().contentItem.create({
    data: {
      product_id: productId,
      key: data.key,
      type: data.type ?? 'text',
      title: data.title ?? null,
      body: data.body ?? null,
      metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

export async function updateContentItem(id: string, data: UpdateContentItemInput) {
  return db().contentItem.update({
    where: { id },
    data: {
      ...(data.key != null && { key: data.key }),
      ...(data.type != null && { type: data.type }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.metadata !== undefined && { metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteContentItem(id: string): Promise<{ success: boolean }> {
  try {
    await db().contentItem.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Intent Rules (per-product text routing)
// ============================================
export async function getIntentRulesForProduct(productId: string) {
  return db().intentRule.findMany({
    where: { product_id: productId },
    orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
  });
}

export async function getActiveIntentRulesForProduct(productId: string) {
  return db().intentRule.findMany({
    where: { product_id: productId, is_active: true },
    orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
  });
}

export async function createIntentRule(productId: string, data: CreateIntentRuleInput) {
  return db().intentRule.create({
    data: {
      product_id: productId,
      name: data.name,
      priority: data.priority ?? 100,
      match_type: data.match_type ?? 'keyword',
      patterns: data.patterns as Prisma.InputJsonValue,
      action_type: data.action_type,
      action_config: data.action_config as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateIntentRule(id: string, data: UpdateIntentRuleInput) {
  return db().intentRule.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.priority != null && { priority: data.priority }),
      ...(data.match_type != null && { match_type: data.match_type }),
      ...(data.patterns != null && { patterns: data.patterns as Prisma.InputJsonValue }),
      ...(data.action_type != null && { action_type: data.action_type }),
      ...(data.action_config != null && { action_config: data.action_config as unknown as Prisma.InputJsonValue }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteIntentRule(id: string): Promise<{ success: boolean }> {
  try {
    await db().intentRule.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Mission Templates (product-scoped mission blueprints)
// ============================================
export async function getMissionTemplatesForProduct(productId: string) {
  return db().missionTemplate.findMany({
    where: { product_id: productId },
    orderBy: [{ is_active: 'desc' }, { key: 'asc' }],
  });
}

export async function getMissionTemplateByKey(productId: string, key: string) {
  return db().missionTemplate.findUnique({
    where: { product_id_key: { product_id: productId, key } },
  });
}

export async function createMissionTemplate(productId: string, data: CreateMissionTemplateInput) {
  return db().missionTemplate.create({
    data: {
      product_id: productId,
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      progress_target: data.progress_target ?? 1,
      auto_complete_on_attribute:
        data.auto_complete_on_attribute == null
          ? Prisma.JsonNull
          : (data.auto_complete_on_attribute as unknown as Prisma.InputJsonValue),
      on_complete_actions: (data.on_complete_actions ?? []) as unknown as Prisma.InputJsonValue,
      notify_content_key: data.notify_content_key ?? null,
      mission_type: data.mission_type ?? 'one_shot',
      frequency: data.frequency ?? 'once',
      daily_target: data.daily_target ?? null,
      unit: data.unit ?? null,
      step_value: data.step_value ?? null,
      subtasks: data.subtasks == null
        ? Prisma.JsonNull
        : (data.subtasks as unknown as Prisma.InputJsonValue),
      category: data.category ?? null,
      action_url: data.action_url ?? null,
      reminder: data.reminder == null
        ? Prisma.JsonNull
        : (data.reminder as unknown as Prisma.InputJsonValue),
    },
  });
}

export async function updateMissionTemplate(id: string, data: UpdateMissionTemplateInput) {
  return db().missionTemplate.update({
    where: { id },
    data: {
      ...(data.key != null && { key: data.key }),
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.progress_target != null && { progress_target: data.progress_target }),
      ...(data.auto_complete_on_attribute !== undefined && {
        auto_complete_on_attribute:
          data.auto_complete_on_attribute === null
            ? Prisma.JsonNull
            : (data.auto_complete_on_attribute as unknown as Prisma.InputJsonValue),
      }),
      ...(data.on_complete_actions !== undefined && {
        on_complete_actions: data.on_complete_actions as unknown as Prisma.InputJsonValue,
      }),
      ...(data.notify_content_key !== undefined && { notify_content_key: data.notify_content_key }),
      ...(data.mission_type !== undefined && { mission_type: data.mission_type }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.daily_target !== undefined && { daily_target: data.daily_target }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.step_value !== undefined && { step_value: data.step_value }),
      ...(data.subtasks !== undefined && {
        subtasks: data.subtasks === null
          ? Prisma.JsonNull
          : (data.subtasks as unknown as Prisma.InputJsonValue),
      }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.action_url !== undefined && { action_url: data.action_url }),
      ...(data.reminder !== undefined && {
        reminder: data.reminder === null
          ? Prisma.JsonNull
          : (data.reminder as unknown as Prisma.InputJsonValue),
      }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteMissionTemplate(id: string): Promise<{ success: boolean }> {
  try {
    await db().missionTemplate.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Mission Assignments (per-user mission instances)
// ============================================

/**
 * Assign a mission to a user. If the user already has a pending assignment
 * for this template, returns that one (idempotent). Past completed/abandoned
 * assignments are preserved as history; a new pending row is created.
 * progress_target is snapshotted from the template so later template edits
 * don't change an in-flight assignment.
 */
export async function assignMission(userId: string, templateId: string) {
  const existing = await db().missionAssignment.findFirst({
    where: { user_id: userId, template_id: templateId, status: 'pending' },
  });
  if (existing) return existing;
  const template = await db().missionTemplate.findUnique({
    where: { id: templateId },
    select: { progress_target: true },
  });
  const target = Math.max(1, template?.progress_target ?? 1);
  return db().missionAssignment.create({
    data: {
      user_id: userId,
      template_id: templateId,
      status: 'pending',
      progress_current: 0,
      progress_target: target,
    },
  });
}

/**
 * Mark a specific assignment completed. Low-level — callers should go
 * through the `completeMissionAssignment` wrapper in lib/missions.ts so
 * on_complete_actions run.
 */
export async function markMissionAssignmentCompleted(assignmentId: string) {
  return db().missionAssignment.update({
    where: { id: assignmentId },
    data: { status: 'completed', completed_at: new Date() },
  });
}

/**
 * Return the user's most-recent pending assignment for this template
 * (or null). Used by intent completion and progress increment paths.
 */
export async function getPendingAssignment(userId: string, templateId: string) {
  return db().missionAssignment.findFirst({
    where: { user_id: userId, template_id: templateId, status: 'pending' },
    orderBy: { assigned_at: 'desc' },
  });
}

export async function incrementAssignmentProgress(assignmentId: string, step: number) {
  return db().missionAssignment.update({
    where: { id: assignmentId },
    data: { progress_current: { increment: step } },
  });
}

/**
 * Find all pending assignments for the user whose template declares an
 * auto_complete_on_attribute rule matching the given attribute key.
 * Filtering by match_value is done in-process since it's optional.
 */
export async function getPendingAssignmentsForAttribute(userId: string, attributeKey: string) {
  return db().missionAssignment.findMany({
    where: {
      user_id: userId,
      status: 'pending',
      template: {
        auto_complete_on_attribute: { path: ['attribute_key'], equals: attributeKey },
      },
    },
    include: {
      template: {
        select: {
          id: true,
          key: true,
          product_id: true,
          auto_complete_on_attribute: true,
          on_complete_actions: true,
          notify_content_key: true,
        },
      },
    },
  });
}

export async function getUserMissionAssignments(userId: string) {
  return db().missionAssignment.findMany({
    where: { user_id: userId },
    orderBy: { assigned_at: 'desc' },
    include: {
      template: { select: { id: true, key: true, name: true, product_id: true } },
    },
  });
}

// ============================================
// Habit tracker: daily logs
// ============================================

/**
 * Fetch the user's active daily-habit templates (via MissionAssignment)
 * for a given product, with today's log row (if any) attached. Used by
 * the LIFF "today" view. `today` is a UTC-midnight Date representing
 * the user's local calendar day.
 */
export async function getHabitsForUserProduct(
  userId: string,
  productId: string,
  today: Date,
) {
  const assignments = await db().missionAssignment.findMany({
    where: {
      user_id: userId,
      status: 'pending',
      template: {
        product_id: productId,
        is_active: true,
      },
    },
    include: {
      template: true,
    },
    orderBy: { assigned_at: 'asc' },
  });
  if (assignments.length === 0) return [];

  const templateIds = assignments.map(a => a.template_id);
  const [todayLogs, settings] = await Promise.all([
    db().missionDailyLog.findMany({
      where: { user_id: userId, template_id: { in: templateIds }, date: today },
    }),
    getUserMissionSettingsByTemplateIds(userId, templateIds),
  ]);
  const logByTemplate = new Map(todayLogs.map(l => [l.template_id, l]));
  const settingByTemplate = new Map(settings.map(s => [s.template_id, s]));

  return assignments.map(a => {
    const setting = settingByTemplate.get(a.template_id);
    // Merge user overrides onto template defaults — null override
    // falls back to the template value.
    const effectiveTemplate = {
      ...a.template,
      daily_target: setting?.daily_target ?? a.template.daily_target,
      reminder: setting && (setting.reminder_enabled != null || setting.reminder_time != null)
        ? {
            enabled: setting.reminder_enabled ?? (a.template.reminder as { enabled?: boolean } | null)?.enabled ?? false,
            time: setting.reminder_time ?? (a.template.reminder as { time?: string } | null)?.time ?? null,
          }
        : a.template.reminder,
    };
    return {
      assignment: {
        id: a.id,
        status: a.status,
        assigned_at: a.assigned_at,
        progress_current: a.progress_current,
        progress_target: a.progress_target,
      },
      template: effectiveTemplate,
      user_setting: setting
        ? {
            daily_target: setting.daily_target,
            reminder_enabled: setting.reminder_enabled,
            reminder_time: setting.reminder_time,
          }
        : null,
      today_log: logByTemplate.get(a.template_id) ?? null,
    };
  });
}

/** Single-row fetch for the date-level log. */
export async function getMissionDailyLog(
  userId: string,
  templateId: string,
  date: Date,
) {
  return db().missionDailyLog.findUnique({
    where: {
      user_id_template_id_date: { user_id: userId, template_id: templateId, date },
    },
  });
}

/**
 * Upsert a daily log row. Returns both the previous (pre-update) and
 * the new row so callers can detect the "just became completed" edge
 * and fire completion hooks only once per day.
 */
export async function upsertMissionDailyLog(
  userId: string,
  templateId: string,
  date: Date,
  patch: {
    value?: number;
    completed?: boolean;
    skipped?: boolean;
    subtask_state?: Record<string, boolean>;
    note?: string | null;
  },
): Promise<{
  previous: Awaited<ReturnType<typeof getMissionDailyLog>>;
  next: NonNullable<Awaited<ReturnType<typeof getMissionDailyLog>>>;
}> {
  const previous = await getMissionDailyLog(userId, templateId, date);
  const wasCompleted = previous?.completed ?? false;
  const completingNow = patch.completed === true && !wasCompleted;
  const next = await db().missionDailyLog.upsert({
    where: {
      user_id_template_id_date: { user_id: userId, template_id: templateId, date },
    },
    create: {
      user_id: userId,
      template_id: templateId,
      date,
      value: patch.value ?? 0,
      completed: patch.completed ?? false,
      skipped: patch.skipped ?? false,
      subtask_state: patch.subtask_state == null
        ? Prisma.JsonNull
        : (patch.subtask_state as unknown as Prisma.InputJsonValue),
      note: patch.note ?? null,
      completed_at: patch.completed ? new Date() : null,
    },
    update: {
      ...(patch.value !== undefined && { value: patch.value }),
      ...(patch.completed !== undefined && { completed: patch.completed }),
      ...(patch.skipped !== undefined && { skipped: patch.skipped }),
      ...(patch.subtask_state !== undefined && {
        subtask_state: patch.subtask_state === null
          ? Prisma.JsonNull
          : (patch.subtask_state as unknown as Prisma.InputJsonValue),
      }),
      ...(patch.note !== undefined && { note: patch.note }),
      ...(completingNow && { completed_at: new Date() }),
    },
  });
  return { previous, next };
}

/** Delete today's (or any given date's) log row, used by the LIFF undo. */
export async function deleteMissionDailyLog(
  userId: string,
  templateId: string,
  date: Date,
): Promise<{ success: boolean }> {
  try {
    await db().missionDailyLog.delete({
      where: {
        user_id_template_id_date: { user_id: userId, template_id: templateId, date },
      },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

/** History: last N days of logs for a habit template. */
export async function getMissionDailyHistory(
  userId: string,
  templateId: string,
  sinceDate: Date,
) {
  return db().missionDailyLog.findMany({
    where: { user_id: userId, template_id: templateId, date: { gte: sinceDate } },
    orderBy: { date: 'asc' },
  });
}

// ============================================
// Habit per-user settings (overrides)
// ============================================
export async function getUserMissionSetting(userId: string, templateId: string) {
  return db().userMissionSetting.findUnique({
    where: { user_id_template_id: { user_id: userId, template_id: templateId } },
  });
}

export async function getUserMissionSettingsByTemplateIds(userId: string, templateIds: string[]) {
  if (templateIds.length === 0) return [];
  return db().userMissionSetting.findMany({
    where: { user_id: userId, template_id: { in: templateIds } },
  });
}

export async function upsertUserMissionSetting(
  userId: string,
  templateId: string,
  data: {
    daily_target?: number | null;
    reminder_enabled?: boolean | null;
    reminder_time?: string | null;
  },
) {
  return db().userMissionSetting.upsert({
    where: { user_id_template_id: { user_id: userId, template_id: templateId } },
    create: {
      user_id: userId,
      template_id: templateId,
      daily_target: data.daily_target ?? null,
      reminder_enabled: data.reminder_enabled ?? null,
      reminder_time: data.reminder_time ?? null,
    },
    update: {
      ...(data.daily_target !== undefined && { daily_target: data.daily_target }),
      ...(data.reminder_enabled !== undefined && { reminder_enabled: data.reminder_enabled }),
      ...(data.reminder_time !== undefined && { reminder_time: data.reminder_time }),
    },
  });
}

/**
 * Abandon a user's mission assignment (admin override). Keeps the row
 * in history so we can see what was abandoned; the status change is
 * picked up by queries that filter by `status: 'pending'`. Returns the
 * updated row, or null if the assignment doesn't exist or doesn't
 * belong to the user (treated as a safety fence).
 */
export async function abandonMissionAssignment(userId: string, assignmentId: string) {
  const row = await db().missionAssignment.findFirst({
    where: { id: assignmentId, user_id: userId },
  });
  if (!row) return null;
  return db().missionAssignment.update({
    where: { id: assignmentId },
    data: { status: 'abandoned' },
  });
}

/**
 * Revoke a user badge (hard delete). Used by admin overrides in the
 * conversations/state panel. If the row doesn't exist we return success
 * idempotently — treats double-clicks as no-op.
 */
export async function removeUserBadge(userId: string, templateId: string): Promise<{ success: boolean }> {
  try {
    await db().userBadge.delete({
      where: { user_id_template_id: { user_id: userId, template_id: templateId } },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Gamification: streaks
// ============================================
export async function getUserStreak(productId: string, userId: string, streakKey: string) {
  return db().userStreak.findUnique({
    where: {
      product_id_user_id_streak_key: {
        product_id: productId,
        user_id: userId,
        streak_key: streakKey,
      },
    },
  });
}

export async function upsertStreak(
  productId: string,
  userId: string,
  streakKey: string,
  countCurrent: number,
  countBest: number,
  lastOccurredOn: Date,
) {
  return db().userStreak.upsert({
    where: {
      product_id_user_id_streak_key: {
        product_id: productId,
        user_id: userId,
        streak_key: streakKey,
      },
    },
    create: {
      product_id: productId,
      user_id: userId,
      streak_key: streakKey,
      count_current: countCurrent,
      count_best: countBest,
      last_occurred_on: lastOccurredOn,
    },
    update: {
      count_current: countCurrent,
      count_best: countBest,
      last_occurred_on: lastOccurredOn,
    },
  });
}

export async function getUserStreaks(userId: string) {
  return db().userStreak.findMany({
    where: { user_id: userId },
    orderBy: [{ updated_at: 'desc' }],
  });
}

// ============================================
// Gamification: badge templates
// ============================================
export async function getBadgeTemplatesForProduct(productId: string) {
  return db().badgeTemplate.findMany({
    where: { product_id: productId },
    orderBy: [{ is_active: 'desc' }, { key: 'asc' }],
  });
}

export async function getActiveBadgeTemplatesForProduct(productId: string) {
  return db().badgeTemplate.findMany({
    where: { product_id: productId, is_active: true },
  });
}

export async function createBadgeTemplate(productId: string, data: CreateBadgeTemplateInput) {
  return db().badgeTemplate.create({
    data: {
      product_id: productId,
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? null,
      criteria: data.criteria as unknown as Prisma.InputJsonValue,
      notify_content_key: data.notify_content_key ?? null,
    },
  });
}

export async function updateBadgeTemplate(id: string, data: UpdateBadgeTemplateInput) {
  return db().badgeTemplate.update({
    where: { id },
    data: {
      ...(data.key != null && { key: data.key }),
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.criteria != null && { criteria: data.criteria as unknown as Prisma.InputJsonValue }),
      ...(data.notify_content_key !== undefined && { notify_content_key: data.notify_content_key }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteBadgeTemplate(id: string): Promise<{ success: boolean }> {
  try {
    await db().badgeTemplate.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Gamification: earned user badges
// ============================================

/**
 * Award a badge to a user. Uniqueness constraint makes this naturally
 * idempotent — a P2002 means already earned, which we treat as success.
 */
export async function awardBadge(userId: string, templateId: string): Promise<{ awarded: boolean }> {
  try {
    await db().userBadge.create({ data: { user_id: userId, template_id: templateId } });
    return { awarded: true };
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') return { awarded: false };
    throw err;
  }
}

export async function getUserBadges(userId: string) {
  return db().userBadge.findMany({
    where: { user_id: userId },
    orderBy: { earned_at: 'desc' },
    include: {
      template: {
        select: { id: true, key: true, name: true, icon: true, product_id: true, description: true },
      },
    },
  });
}

/**
 * Find active badge templates in a product whose criteria type matches,
 * for use by the gamification evaluator. Returns raw criteria JSON; the
 * evaluator in lib/gamification.ts filters further by streak_key/mission_key.
 */
export async function getBadgeTemplatesByCriteriaType(productId: string, criteriaType: BadgeCriteria['type']) {
  return db().badgeTemplate.findMany({
    where: {
      product_id: productId,
      is_active: true,
      criteria: { path: ['type'], equals: criteriaType },
    },
  });
}

// ============================================
// Journey: templates
// ============================================
export async function getJourneyTemplatesForProduct(productId: string) {
  return db().journeyTemplate.findMany({
    where: { product_id: productId },
    orderBy: [{ is_active: 'desc' }, { key: 'asc' }],
  });
}

export async function getActiveJourneyTemplatesForProduct(productId: string) {
  return db().journeyTemplate.findMany({
    where: { product_id: productId, is_active: true },
  });
}

export async function createJourneyTemplate(productId: string, data: CreateJourneyTemplateInput) {
  return db().journeyTemplate.create({
    data: {
      product_id: productId,
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      phases: data.phases as unknown as Prisma.InputJsonValue,
      transitions: data.transitions as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Upsert a Journey template by (product_id, key). Used by the seed
 * apply path so re-applying a template refreshes Journey to match the
 * template (picks up new schedule fields, etc.) — unlike ContentItem /
 * MissionTemplate which are skip-on-conflict to preserve ops edits.
 *
 * Trade-off: ops customizations to Journey phases/transitions get
 * overwritten on re-apply. Acceptable for the seed flow because Journey
 * structure is template-driven (the day-by-day content lives in
 * ContentItem, where edits ARE preserved).
 */
export async function upsertJourneyTemplate(productId: string, data: CreateJourneyTemplateInput) {
  return db().journeyTemplate.upsert({
    where: { product_id_key: { product_id: productId, key: data.key } },
    create: {
      product_id: productId,
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      phases: data.phases as unknown as Prisma.InputJsonValue,
      transitions: data.transitions as unknown as Prisma.InputJsonValue,
    },
    update: {
      name: data.name,
      description: data.description ?? null,
      phases: data.phases as unknown as Prisma.InputJsonValue,
      transitions: data.transitions as unknown as Prisma.InputJsonValue,
      is_active: true,
    },
  });
}

export async function updateJourneyTemplate(id: string, data: UpdateJourneyTemplateInput) {
  return db().journeyTemplate.update({
    where: { id },
    data: {
      ...(data.key != null && { key: data.key }),
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.phases !== undefined && { phases: data.phases as unknown as Prisma.InputJsonValue }),
      ...(data.transitions !== undefined && { transitions: data.transitions as unknown as Prisma.InputJsonValue }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
}

export async function deleteJourneyTemplate(id: string): Promise<{ success: boolean }> {
  try {
    await db().journeyTemplate.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') return { success: true };
    throw err;
  }
  return { success: true };
}

// ============================================
// Journey: user phase state
// ============================================
export async function getUserJourneyPhase(productId: string, userId: string, journeyKey: string) {
  return db().userJourneyPhase.findUnique({
    where: {
      product_id_user_id_journey_key: {
        product_id: productId, user_id: userId, journey_key: journeyKey,
      },
    },
  });
}

export async function upsertUserJourneyPhase(
  productId: string, userId: string, journeyKey: string, phaseKey: string,
) {
  const now = new Date();
  return db().userJourneyPhase.upsert({
    where: {
      product_id_user_id_journey_key: {
        product_id: productId, user_id: userId, journey_key: journeyKey,
      },
    },
    create: {
      product_id: productId,
      user_id: userId,
      journey_key: journeyKey,
      phase_key: phaseKey,
      entered_at: now,
    },
    update: { phase_key: phaseKey, entered_at: now },
  });
}

export async function getUserJourneyPhases(userId: string) {
  return db().userJourneyPhase.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' },
  });
}

// ============================================
// Message log (full conversation history)
// ============================================
export async function getMessageLogForOa(oaId: number, options: {
  userId?: string;
  limit?: number;
  before?: Date;
} = {}) {
  const limit = Math.min(500, options.limit ?? 100);
  return db().messageLog.findMany({
    where: {
      oa_id: oaId,
      ...(options.userId && { user_id: options.userId }),
      ...(options.before && { created_at: { lt: options.before } }),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}

export async function getMessageLogForUser(userId: string, limit = 100) {
  return db().messageLog.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: Math.min(500, limit),
  });
}

/**
 * Distinct user_ids for a given OA, most recent first — used by the OA
 * conversations UI to populate a "which user" picker without a full
 * enrollment query.
 */
export async function getDistinctMessageLogUsersForOa(oaId: number, limit = 100) {
  // LEFT JOIN users so the HQ conversation list can show LINE display_name
  // / picture_url instead of the opaque LINE userId. Anonymous senders
  // (no users row yet) keep null for those fields and the UI falls back
  // to the user_id.
  const rows = await db().$queryRaw<Array<{
    user_id: string;
    last_at: Date;
    display_name: string | null;
    picture_url: string | null;
  }>>`
    SELECT
      ml.user_id,
      MAX(ml.created_at) AS last_at,
      MAX(u.display_name) AS display_name,
      MAX(u.picture_url) AS picture_url
    FROM message_log ml
    LEFT JOIN users u ON u.id = ml.user_id
    WHERE ml.oa_id = ${oaId}
    GROUP BY ml.user_id
    ORDER BY last_at DESC
    LIMIT ${Math.min(500, limit)}
  `;
  return rows;
}
