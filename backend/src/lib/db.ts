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
} from '../types.js';

let _prisma: PrismaClient | undefined;

function db(): PrismaClient {
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

const OA_PUBLIC_SELECT = {
  id: true,
  name: true,
  description: true,
  is_active: true,
  created_at: true,
  updated_at: true,
};

export async function getAllLineOAs() {
  return db().lineOA.findMany({
    select: OA_PUBLIC_SELECT,
    orderBy: { created_at: 'desc' },
  });
}

export async function getLineOAById(id: string) {
  return db().lineOA.findUnique({ where: { id: parseInt(id, 10) } });
}

export async function createLineOA(data: CreateLineOAInput) {
  const oa = await db().lineOA.create({
    data: {
      name: data.name,
      description: data.description || null,
      channel_access_token: data.channel_access_token,
    },
  });
  const { channel_access_token: _, ...safe } = oa;
  return safe;
}

export async function updateLineOA(id: string, data: UpdateLineOAInput) {
  const oa = await db().lineOA.update({
    where: { id: parseInt(id, 10) },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.channel_access_token != null && { channel_access_token: data.channel_access_token }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
  const { channel_access_token: _, ...safe } = oa;
  return safe;
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
  ] = await Promise.all([
    db().lineOA.count(),
    db().coBlocksScenario.count(),
    db().coBlocksScenario.count({ where: { is_active: true } }),
    db().lineOARichMenuTemplate.count(),
    db().lineOARichMenuTemplate.count({ where: { line_rich_menu_id: { not: null } } }),
    db().userMenuAssignment.count({ where: { assigned_at: { gte: sevenDaysAgo } } }),
  ]);
  return {
    oaCount,
    scenarioCount,
    activeScenarioCount,
    templateCount,
    deployedTemplateCount,
    recentAssignmentCount,
  };
}

export async function getUserRole(userId: string): Promise<string | null> {
  const row = await db().user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role ?? null;
}
