import { PrismaClient } from '@prisma/client';
import { SEED_TEMPLATES, SEED_TEMPLATE_LIST } from '../lib/seedTemplates.js';
import { VALID_BADGE_CRITERIA_TYPES } from '../lib/gamification.js';
import { validatePhases, validateTransitions } from '../lib/journey.js';
import { VALID_MATCH_TYPES, VALID_ACTION_TYPES } from '../lib/intent.js';
import type { BadgeCriteria, JourneyPhase, JourneyTransition } from '../types.js';
import type { IntentMatchType, IntentActionType } from '../types.js';
import { NotFoundError, ConflictError, BadRequestError } from '../middleware/errorHandler.js';
import {
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getContentItemsForProduct, getContentItemByKey, createContentItem, updateContentItem, deleteContentItem, verifyContentItemBelongsToProduct,
  getIntentRulesForProduct, createIntentRule, updateIntentRule, deleteIntentRule,
  getMissionTemplatesForProduct, createMissionTemplate, updateMissionTemplate, deleteMissionTemplate,
  getBadgeTemplatesForProduct, createBadgeTemplate, updateBadgeTemplate, deleteBadgeTemplate,
  getJourneyTemplatesForProduct, createJourneyTemplate, upsertJourneyTemplate, updateJourneyTemplate, deleteJourneyTemplate,
} from '../lib/db.js';

const KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;
const VALID_MISSION_TYPES = ['one_shot', 'binary_daily', 'quantitative_daily', 'checklist_daily'];
const VALID_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];

/**
 * Products Service - Business Logic & Validation
 */
export class ProductsService {
  constructor(private prisma: PrismaClient) {}

  // ─── Validation Methods ─────────────────────────────────────────

  validateIntentRuleInput(body: Record<string, unknown>, requireAll: boolean): string | null {
    if (requireAll || body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return '請提供 name';
    }
    if (body.match_type !== undefined) {
      if (typeof body.match_type !== 'string' || !VALID_MATCH_TYPES.includes(body.match_type as IntentMatchType)) {
        return `match_type 需為 ${VALID_MATCH_TYPES.join('/')}`;
      }
    }
    if (requireAll || body.patterns !== undefined) {
      if (!Array.isArray(body.patterns) || body.patterns.length === 0) return 'patterns 需為非空陣列';
      if (!body.patterns.every(p => typeof p === 'string' && p.trim())) return 'patterns 只能是非空字串';
    }
    if (requireAll || body.action_type !== undefined) {
      if (typeof body.action_type !== 'string' || !VALID_ACTION_TYPES.includes(body.action_type as IntentActionType)) {
        return `action_type 需為 ${VALID_ACTION_TYPES.join('/')}`;
      }
    }
    if (requireAll || body.action_config !== undefined) {
      if (!body.action_config || typeof body.action_config !== 'object') return 'action_config 需為物件';
      const cfg = body.action_config as Record<string, unknown>;
      const type = body.action_type as string | undefined;
      if (type === 'reply_content') {
        if (typeof cfg.content_key !== 'string' || !cfg.content_key.trim()) {
          return 'reply_content action_config 需含 content_key';
        }
      } else if (type === 'set_attribute') {
        if (typeof cfg.key !== 'string' || !cfg.key.trim()) return 'set_attribute action_config 需含 key';
        if (cfg.value != null && typeof cfg.value !== 'string') return 'set_attribute value 需為字串';
        if (cfg.reply_content_key != null && typeof cfg.reply_content_key !== 'string') {
          return 'reply_content_key 需為字串';
        }
      } else if (type === 'assign_mission' || type === 'complete_mission' || type === 'increment_mission_progress') {
        if (typeof cfg.mission_key !== 'string' || !cfg.mission_key.trim()) {
          return `${type} action_config 需含 mission_key`;
        }
        if (cfg.reply_content_key != null && typeof cfg.reply_content_key !== 'string') {
          return 'reply_content_key 需為字串';
        }
        if (type === 'increment_mission_progress' && cfg.step != null && (typeof cfg.step !== 'number' || cfg.step < 1)) {
          return 'step 需為 >= 1 的數字';
        }
      } else if (type === 'increment_streak') {
        if (typeof cfg.streak_key !== 'string' || !cfg.streak_key.trim()) {
          return 'increment_streak 需含 streak_key';
        }
        if (cfg.reply_content_key != null && typeof cfg.reply_content_key !== 'string') {
          return 'reply_content_key 需為字串';
        }
      }
    }
    return null;
  }

  validateMissionPayload(body: Record<string, unknown>, requireKeyAndName: boolean): string | null {
    if (requireKeyAndName) {
      if (!body.key || typeof body.key !== 'string') return '請提供 key';
      if (!body.name || typeof body.name !== 'string') return '請提供 name';
    }
    if (body.key != null && typeof body.key === 'string' && !KEY_REGEX.test(body.key)) {
      return 'key 只能包含英數、點、底線、連字號，開頭需為英數';
    }
    if (body.progress_target != null) {
      if (typeof body.progress_target !== 'number' || body.progress_target < 1 || !Number.isInteger(body.progress_target)) {
        return 'progress_target 需為 >= 1 的整數';
      }
    }
    if (body.auto_complete_on_attribute !== undefined && body.auto_complete_on_attribute !== null) {
      if (typeof body.auto_complete_on_attribute !== 'object') return 'auto_complete_on_attribute 需為物件';
      const rule = body.auto_complete_on_attribute as Record<string, unknown>;
      if (typeof rule.attribute_key !== 'string' || !rule.attribute_key.trim()) {
        return 'auto_complete_on_attribute.attribute_key 需為非空字串';
      }
      if (rule.match_value != null && typeof rule.match_value !== 'string') {
        return 'auto_complete_on_attribute.match_value 需為字串';
      }
    }
    if (body.on_complete_actions !== undefined) {
      if (!Array.isArray(body.on_complete_actions)) return 'on_complete_actions 需為陣列';
      for (const raw of body.on_complete_actions) {
        if (!raw || typeof raw !== 'object') return 'on_complete_actions 項目需為物件';
        const a = raw as Record<string, unknown>;
        if (a.type === 'set_attribute') {
          if (typeof a.key !== 'string' || !a.key.trim()) return 'set_attribute 需 key';
          if (typeof a.value !== 'string') return 'set_attribute 需 value（字串）';
        } else if (a.type === 'assign_mission') {
          if (typeof a.mission_key !== 'string' || !a.mission_key.trim()) return 'assign_mission 需 mission_key';
        } else if (a.type === 'increment_streak') {
          if (typeof a.streak_key !== 'string' || !a.streak_key.trim()) return 'increment_streak 需 streak_key';
        } else {
          return 'on_complete_actions.type 需為 set_attribute / assign_mission / increment_streak';
        }
      }
    }
    if (body.notify_content_key != null && typeof body.notify_content_key !== 'string') {
      return 'notify_content_key 需為字串';
    }
    if (body.mission_type != null) {
      if (typeof body.mission_type !== 'string' || !VALID_MISSION_TYPES.includes(body.mission_type)) {
        return `mission_type 需為 ${VALID_MISSION_TYPES.join('/')}`;
      }
    }
    if (body.frequency != null) {
      if (typeof body.frequency !== 'string' || !VALID_FREQUENCIES.includes(body.frequency)) {
        return `frequency 需為 ${VALID_FREQUENCIES.join('/')}`;
      }
    }
    if (body.daily_target != null) {
      if (typeof body.daily_target !== 'number' || body.daily_target < 1 || !Number.isInteger(body.daily_target)) {
        return 'daily_target 需為 >= 1 的整數';
      }
    }
    if (body.step_value != null) {
      if (typeof body.step_value !== 'number' || body.step_value < 1 || !Number.isInteger(body.step_value)) {
        return 'step_value 需為 >= 1 的整數';
      }
    }
    if (body.unit != null && typeof body.unit !== 'string') return 'unit 需為字串';
    if (body.category != null && typeof body.category !== 'string') return 'category 需為字串';
    if (body.action_url != null && typeof body.action_url !== 'string') return 'action_url 需為字串';
    if (body.subtasks !== undefined && body.subtasks !== null) {
      if (!Array.isArray(body.subtasks)) return 'subtasks 需為陣列';
      for (const s of body.subtasks) {
        if (!s || typeof s !== 'object') return 'subtasks 項目需為物件';
        const st = s as Record<string, unknown>;
        if (typeof st.key !== 'string' || !st.key.trim()) return 'subtask.key 需為非空字串';
        if (typeof st.label !== 'string' || !st.label.trim()) return 'subtask.label 需為非空字串';
      }
    }
    if (body.reminder !== undefined && body.reminder !== null) {
      if (typeof body.reminder !== 'object') return 'reminder 需為物件';
      const r = body.reminder as Record<string, unknown>;
      if (r.enabled != null && typeof r.enabled !== 'boolean') return 'reminder.enabled 需為布林';
      if (r.time != null && typeof r.time !== 'string') return 'reminder.time 需為 HH:MM 字串';
    }
    return null;
  }

  validateBadgePayload(body: Record<string, unknown>, requireAll: boolean): string | null {
    if (requireAll || body.key !== undefined) {
      if (typeof body.key !== 'string' || !body.key.trim()) return '請提供 key';
      if (!KEY_REGEX.test(body.key)) return 'key 格式不合法';
    }
    if (requireAll || body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return '請提供 name';
    }
    if (body.icon != null && typeof body.icon !== 'string') return 'icon 需為字串';
    if (requireAll || body.criteria !== undefined) {
      if (!body.criteria || typeof body.criteria !== 'object') return 'criteria 需為物件';
      const crit = body.criteria as Record<string, unknown>;
      if (typeof crit.type !== 'string' || !VALID_BADGE_CRITERIA_TYPES.includes(crit.type as BadgeCriteria['type'])) {
        return `criteria.type 需為 ${VALID_BADGE_CRITERIA_TYPES.join('/')}`;
      }
      if (crit.type === 'streak_reached') {
        if (typeof crit.streak_key !== 'string' || !crit.streak_key.trim()) return 'streak_reached 需 streak_key';
        if (typeof crit.threshold !== 'number' || crit.threshold < 1 || !Number.isInteger(crit.threshold)) {
          return 'threshold 需為 >= 1 的整數';
        }
      } else if (crit.type === 'mission_completed') {
        if (typeof crit.mission_key !== 'string' || !crit.mission_key.trim()) return 'mission_completed 需 mission_key';
      }
    }
    if (body.notify_content_key != null && typeof body.notify_content_key !== 'string') {
      return 'notify_content_key 需為字串';
    }
    return null;
  }

  validateJourneyPayload(body: Record<string, unknown>, requireAll: boolean): string | null {
    if (requireAll || body.key !== undefined) {
      if (typeof body.key !== 'string' || !body.key.trim()) return '請提供 key';
      if (!KEY_REGEX.test(body.key)) return 'key 格式不合法';
    }
    if (requireAll || body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return '請提供 name';
    }
    if (body.phases !== undefined && body.phases !== null) {
      if (!Array.isArray(body.phases)) return 'phases 需為陣列';
      const phaseErr = validatePhases(body.phases as JourneyPhase[]);
      if (phaseErr) return phaseErr;
    }
    if (body.transitions !== undefined && body.transitions !== null) {
      if (!Array.isArray(body.transitions)) return 'transitions 需為陣列';
      const phases = (body.phases as JourneyPhase[]) || [];
      const transErr = validateTransitions(body.transitions as JourneyTransition[], phases);
      if (transErr) return transErr;
    }
    return null;
  }

  // ─── Business Logic Methods ─────────────────────────────────────

  async seedProduct(productId: string, templateKey: string = 'wellness_21d') {
    const product = await getProductById(productId);
    if (!product) throw new NotFoundError('找不到此 Product');

    const tpl = SEED_TEMPLATES[templateKey as keyof typeof SEED_TEMPLATES];
    if (!tpl) throw new BadRequestError(`未知的範本 "${templateKey}"`);

    const summary = {
      content: { created: 0, skipped: 0 },
      missions: { created: 0, skipped: 0 },
      badges: { created: 0, skipped: 0 },
      journeys: { created: 0, skipped: 0 },
      intents: { created: 0, skipped: 0 },
      errors: [] as string[],
    };

    const tryCreate = async (
      label: string,
      section: keyof typeof summary,
      fn: () => Promise<unknown>
    ) => {
      try {
        await fn();
        (summary[section] as { created: number; skipped: number }).created++;
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002') {
          (summary[section] as { created: number; skipped: number }).skipped++;
        } else {
          summary.errors.push(`${label}: ${(err as Error).message}`);
        }
      }
    };

    for (const item of tpl.content) {
      await tryCreate(`content:${item.key}`, 'content', () => createContentItem(productId, item));
    }
    for (const mission of tpl.missions) {
      await tryCreate(`mission:${mission.key}`, 'missions', () => createMissionTemplate(productId, mission));
    }
    for (const badge of tpl.badges) {
      await tryCreate(`badge:${badge.key}`, 'badges', () => createBadgeTemplate(productId, badge));
    }
    for (const journey of tpl.journeys) {
      try {
        await upsertJourneyTemplate(productId, journey);
        summary.journeys.created++;
      } catch (err) {
        summary.errors.push(`journey:${journey.key}: ${(err as Error).message}`);
      }
    }
    for (const intent of tpl.intents) {
      await tryCreate(`intent:${intent.name}`, 'intents', () => createIntentRule(productId, intent));
    }

    return { template: templateKey, summary };
  }

  getSeedTemplateList() {
    return { templates: SEED_TEMPLATE_LIST };
  }

  // ─── Database Access Methods ───────────────────────────────────

  // Products
  getAllProducts() {
    return getAllProducts();
  }

  getProductById(id: string) {
    return getProductById(id);
  }

  createProduct(data: { name: string; description?: string }) {
    return createProduct(data);
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    try {
      return await updateProduct(id, data);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Product');
      }
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      return await deleteProduct(id);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Product');
      }
      throw error;
    }
  }

  // Content Items
  getContentItemsForProduct(productId: string) {
    return getContentItemsForProduct(productId);
  }

  getContentItemByKey(productId: string, key: string) {
    return getContentItemByKey(productId, key);
  }

  async createContentItem(productId: string, data: Record<string, unknown>) {
    try {
      return await createContentItem(productId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('此 key 已存在');
      }
      throw error;
    }
  }

  async updateContentItem(contentId: string, data: Record<string, unknown>) {
    try {
      return await updateContentItem(contentId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此內容');
      }
      if (error?.code === 'P2002') {
        throw new ConflictError('此 key 已存在');
      }
      throw error;
    }
  }

  async deleteContentItem(contentId: string) {
    try {
      return await deleteContentItem(contentId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此內容');
      }
      throw error;
    }
  }

  verifyContentItemBelongsToProduct(contentId: string, productId: string) {
    return verifyContentItemBelongsToProduct(contentId, productId);
  }

  // Missions
  getMissionTemplatesForProduct(productId: string) {
    return getMissionTemplatesForProduct(productId);
  }

  async createMissionTemplate(productId: string, data: Record<string, unknown>) {
    try {
      return await createMissionTemplate(productId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('此 mission key 已存在');
      }
      throw error;
    }
  }

  async updateMissionTemplate(missionId: string, data: Record<string, unknown>) {
    try {
      return await updateMissionTemplate(missionId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Mission');
      }
      if (error?.code === 'P2002') {
        throw new ConflictError('此 mission key 已存在');
      }
      throw error;
    }
  }

  async deleteMissionTemplate(missionId: string) {
    try {
      return await deleteMissionTemplate(missionId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Mission');
      }
      throw error;
    }
  }

  // Badges
  getBadgeTemplatesForProduct(productId: string) {
    return getBadgeTemplatesForProduct(productId);
  }

  async createBadgeTemplate(productId: string, data: Record<string, unknown>) {
    try {
      return await createBadgeTemplate(productId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('此 badge key 已存在');
      }
      throw error;
    }
  }

  async updateBadgeTemplate(badgeId: string, data: Record<string, unknown>) {
    try {
      return await updateBadgeTemplate(badgeId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Badge');
      }
      if (error?.code === 'P2002') {
        throw new ConflictError('此 badge key 已存在');
      }
      throw error;
    }
  }

  async deleteBadgeTemplate(badgeId: string) {
    try {
      return await deleteBadgeTemplate(badgeId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Badge');
      }
      throw error;
    }
  }

  // Journeys
  getJourneyTemplatesForProduct(productId: string) {
    return getJourneyTemplatesForProduct(productId);
  }

  async createJourneyTemplate(productId: string, data: Record<string, unknown>) {
    try {
      return await createJourneyTemplate(productId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('此 journey key 已存在');
      }
      throw error;
    }
  }

  async upsertJourneyTemplate(productId: string, data: Record<string, unknown>) {
    return upsertJourneyTemplate(productId, data as any);
  }

  async updateJourneyTemplate(journeyId: string, data: Record<string, unknown>) {
    try {
      return await updateJourneyTemplate(journeyId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Journey');
      }
      if (error?.code === 'P2002') {
        throw new ConflictError('此 journey key 已存在');
      }
      throw error;
    }
  }

  async deleteJourneyTemplate(journeyId: string) {
    try {
      return await deleteJourneyTemplate(journeyId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Journey');
      }
      throw error;
    }
  }

  // Intent Rules
  getIntentRulesForProduct(productId: string) {
    return getIntentRulesForProduct(productId);
  }

  async createIntentRule(productId: string, data: Record<string, unknown>) {
    try {
      return await createIntentRule(productId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('此 intent rule 已存在');
      }
      throw error;
    }
  }

  async updateIntentRule(ruleId: string, data: Record<string, unknown>) {
    try {
      return await updateIntentRule(ruleId, data as any);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Intent Rule');
      }
      if (error?.code === 'P2002') {
        throw new ConflictError('此 intent rule 已存在');
      }
      throw error;
    }
  }

  async deleteIntentRule(ruleId: string) {
    try {
      return await deleteIntentRule(ruleId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError('找不到此 Intent Rule');
      }
      throw error;
    }
  }
}
