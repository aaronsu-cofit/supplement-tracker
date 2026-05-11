import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import {
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getContentItemsForProduct, getContentItemByKey, createContentItem, updateContentItem, deleteContentItem, verifyContentItemBelongsToProduct,
  getIntentRulesForProduct, createIntentRule, updateIntentRule, deleteIntentRule,
  getMissionTemplatesForProduct, createMissionTemplate, updateMissionTemplate, deleteMissionTemplate,
  getBadgeTemplatesForProduct, createBadgeTemplate, updateBadgeTemplate, deleteBadgeTemplate,
  getJourneyTemplatesForProduct, createJourneyTemplate, upsertJourneyTemplate, updateJourneyTemplate, deleteJourneyTemplate,
} from '../lib/db.js';
import { SEED_TEMPLATES, SEED_TEMPLATE_LIST } from '../lib/seedTemplates.js';
import { VALID_BADGE_CRITERIA_TYPES } from '../lib/gamification.js';
import { validatePhases, validateTransitions } from '../lib/journey.js';
import type { BadgeCriteria, JourneyPhase, JourneyTransition } from '../types.js';
import { VALID_MATCH_TYPES, VALID_ACTION_TYPES } from '../lib/intent.js';
import type { IntentMatchType, IntentActionType } from '../types.js';

const KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;

function validateIntentRuleInput(body: Record<string, unknown>, requireAll: boolean): string | null {
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

function validateMissionPayload(body: Record<string, unknown>, requireKeyAndName: boolean): string | null {
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
  const VALID_MISSION_TYPES = ['one_shot', 'binary_daily', 'quantitative_daily', 'checklist_daily'];
  const VALID_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];
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

function validateBadgePayload(body: Record<string, unknown>, requireAll: boolean): string | null {
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

function validateJourneyPayload(body: Record<string, unknown>, requireAll: boolean): string | null {
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

export async function productsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  // GET /api/products
  app.get('/', async (request, reply) => {
    const rows = await getAllProducts();
    return { products: rows };
  });

  // GET /api/products/seed-templates
  app.get('/seed-templates', async (request, reply) => {
    return { templates: SEED_TEMPLATE_LIST };
  });

  // GET /api/products/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const product = await getProductById(id);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    return { product };
  });

  // POST /api/products
  app.post('/', async (request, reply) => {
    const body = request.body as any;
    const { name, description } = body;
    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ error: '請提供 name' });
    }
    const product = await createProduct({ name, description });
    return reply.code(201).send({ product });
  });

  // PATCH /api/products/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    try {
      const product = await updateProduct(id, body);
      return { product };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Product' });
      throw e;
    }
  });

  // DELETE /api/products/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await deleteProduct(id);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Product' });
      throw e;
    }
  });

  // POST /api/products/:productId/seed
  // Body: { template: 'wellness_21d' }
  // Idempotent per-key: items whose key already exists are skipped.
  app.post('/:productId/seed', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    let body: { template?: string };
    try {
      body = (request.body as any) || {};
    } catch {
      body = {};
    }
    const templateKey = body.template ?? 'wellness_21d';
    const tpl = SEED_TEMPLATES[templateKey as keyof typeof SEED_TEMPLATES];
    if (!tpl) return reply.code(400).send({ error: `未知的範本 "${templateKey}"` });

    const summary = {
      content: { created: 0, skipped: 0 },
      missions: { created: 0, skipped: 0 },
      badges: { created: 0, skipped: 0 },
      journeys: { created: 0, skipped: 0 },
      intents: { created: 0, skipped: 0 },
      errors: [] as string[],
    };

    // Helper: run a Prisma create, swallow P2002 (unique-constraint) as
    // "skipped" and any other error as a summary.errors entry.
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
    // Journey is upserted (not skip-on-conflict) so re-applying picks up
    // schedule / transition / phase changes from the latest template.
    // ContentItem / Mission / Badge stay skip-on-conflict to preserve
    // ops content edits between seed runs.
    for (const journey of tpl.journeys) {
      try {
        await upsertJourneyTemplate(productId, journey);
        summary.journeys.created++;
      } catch (err) {
        summary.errors.push(`journey:${journey.key}: ${(err as Error).message}`);
      }
    }
    // Intents have no per-product unique key, so 409 can't happen the same
    // way — but we still wrap errors for reporting.
    for (const intent of tpl.intents) {
      await tryCreate(`intent:${intent.name}`, 'intents', () => createIntentRule(productId, intent));
    }

    return { template: templateKey, summary };
  });

  // Content Items CRUD
  app.get('/:productId/content', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const items = await getContentItemsForProduct(productId);
    return { items };
  });

  app.post('/:productId/content', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    if (!body.key || typeof body.key !== 'string') return reply.code(400).send({ error: '請提供 key' });

    try {
      const item = await createContentItem(productId, {
        key: body.key,
        type: body.type,
        title: body.title,
        body: body.body,
        metadata: body.metadata,
      });
      return reply.code(201).send({ item });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 key 已存在' });
      throw e;
    }
  });

  // PATCH /api/products/:productId/content/:contentId
  app.patch('/:productId/content/:contentId', async (request, reply) => {
    const { productId, contentId } = request.params as any;

    // 驗證 product 存在
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    // 驗證內容項目屬於該產品
    const belongsToProduct = await verifyContentItemBelongsToProduct(contentId, productId);
    if (!belongsToProduct) return reply.code(404).send({ error: '找不到此內容' });

    const body = request.body as any;

    try {
      const item = await updateContentItem(contentId, body);
      return { item };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此內容' });
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 key 已存在' });
      throw e;
    }
  });

  // DELETE /api/products/:productId/content/:contentId
  app.delete('/:productId/content/:contentId', async (request, reply) => {
    const { productId, contentId } = request.params as any;

    // 驗證 product 存在
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    // 驗證內容項目屬於該產品
    const belongsToProduct = await verifyContentItemBelongsToProduct(contentId, productId);
    if (!belongsToProduct) return reply.code(404).send({ error: '找不到此內容' });

    try {
      await deleteContentItem(contentId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此內容' });
      throw e;
    }
  });

  // Mission Templates CRUD
  app.get('/:productId/missions', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const missions = await getMissionTemplatesForProduct(productId);
    return { missions };
  });

  app.post('/:productId/missions', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateMissionPayload(body, true);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const mission = await createMissionTemplate(productId, {
        key: body.key,
        name: body.name,
        description: body.description,
        progress_target: body.progress_target,
        auto_complete_on_attribute: body.auto_complete_on_attribute,
        on_complete_actions: body.on_complete_actions,
        notify_content_key: body.notify_content_key,
        mission_type: body.mission_type,
        frequency: body.frequency,
        daily_target: body.daily_target,
        unit: body.unit,
        step_value: body.step_value,
        subtasks: body.subtasks,
        category: body.category,
        action_url: body.action_url,
        reminder: body.reminder,
      });
      return reply.code(201).send({ mission });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 mission key 已存在' });
      throw e;
    }
  });

  app.patch('/:productId/missions/:missionId', async (request, reply) => {
    const { productId, missionId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateMissionPayload(body, false);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const mission = await updateMissionTemplate(missionId, body);
      return { mission };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Mission' });
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 mission key 已存在' });
      throw e;
    }
  });

  app.delete('/:productId/missions/:missionId', async (request, reply) => {
    const { productId, missionId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    try {
      await deleteMissionTemplate(missionId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Mission' });
      throw e;
    }
  });

  // ─── Badge Templates CRUD ────────────────────────────────────────
  app.get('/:productId/badges', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const badges = await getBadgeTemplatesForProduct(productId);
    return { badges };
  });

  app.post('/:productId/badges', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateBadgePayload(body, true);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const badge = await createBadgeTemplate(productId, {
        key: body.key,
        name: body.name,
        icon: body.icon,
        criteria: body.criteria,
        notify_content_key: body.notify_content_key,
      });
      return reply.code(201).send({ badge });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 badge key 已存在' });
      throw e;
    }
  });

  app.patch('/:productId/badges/:badgeId', async (request, reply) => {
    const { productId, badgeId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateBadgePayload(body, false);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const badge = await updateBadgeTemplate(badgeId, body);
      return { badge };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Badge' });
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 badge key 已存在' });
      throw e;
    }
  });

  app.delete('/:productId/badges/:badgeId', async (request, reply) => {
    const { productId, badgeId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    try {
      await deleteBadgeTemplate(badgeId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Badge' });
      throw e;
    }
  });

  // ─── Journey Templates CRUD ──────────────────────────────────────
  app.get('/:productId/journeys', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const journeys = await getJourneyTemplatesForProduct(productId);
    return { journeys };
  });

  app.post('/:productId/journeys', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateJourneyPayload(body, true);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const journey = await createJourneyTemplate(productId, {
        key: body.key,
        name: body.name,
        phases: body.phases,
        transitions: body.transitions,
      });
      return reply.code(201).send({ journey });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 journey key 已存在' });
      throw e;
    }
  });

  app.patch('/:productId/journeys/:journeyId', async (request, reply) => {
    const { productId, journeyId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateJourneyPayload(body, false);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const journey = await updateJourneyTemplate(journeyId, body);
      return { journey };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Journey' });
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 journey key 已存在' });
      throw e;
    }
  });

  app.delete('/:productId/journeys/:journeyId', async (request, reply) => {
    const { productId, journeyId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    try {
      await deleteJourneyTemplate(journeyId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Journey' });
      throw e;
    }
  });

  // ─── Intent Rules CRUD ───────────────────────────────────────────
  app.get('/:productId/intent-rules', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const rules = await getIntentRulesForProduct(productId);
    return { rules };
  });

  app.post('/:productId/intent-rules', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateIntentRuleInput(body, true);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const rule = await createIntentRule(productId, body);
      return reply.code(201).send({ rule });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 intent rule key 已存在' });
      throw e;
    }
  });

  app.patch('/:productId/intent-rules/:ruleId', async (request, reply) => {
    const { productId, ruleId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateIntentRuleInput(body, false);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const rule = await updateIntentRule(ruleId, body);
      return { rule };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Intent Rule' });
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 intent rule key 已存在' });
      throw e;
    }
  });

  app.delete('/:productId/intent-rules/:ruleId', async (request, reply) => {
    const { productId, ruleId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    try {
      await deleteIntentRule(ruleId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 Intent Rule' });
      throw e;
    }
  });

  // ─── Intent (Backward Compatibility - Hono API) ──────────────────────────

  // GET /api/products/:productId/intent (Hono API - alias for intent-rules)
  app.get('/:productId/intent', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });
    const rules = await getIntentRulesForProduct(productId);
    return { rules };
  });

  // POST /api/products/:productId/intent (Hono API - alias for intent-rules)
  app.post('/:productId/intent', async (request, reply) => {
    const { productId } = request.params as any;
    const product = await getProductById(productId);
    if (!product) return reply.code(404).send({ error: '找不到此 Product' });

    const body = request.body as any;
    const validationError = validateIntentRuleInput(body, true);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const rule = await createIntentRule(productId, body);
      return reply.code(201).send({ rule });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ error: '此 intent rule key 已存在' });
      throw e;
    }
  });

  // PATCH /api/products/:productId/intent/:id (Hono API - alias for intent-rules)
  app.patch('/:productId/intent/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    const validationError = validateIntentRuleInput(body, false);
    if (validationError) return reply.code(400).send({ error: validationError });

    try {
      const rule = await updateIntentRule(id, body);
      return { rule };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此規則' });
      throw e;
    }
  });

  // DELETE /api/products/:productId/intent/:id (Hono API - alias for intent-rules)
  app.delete('/:productId/intent/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await deleteIntentRule(id);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此規則' });
      throw e;
    }
  });
}
