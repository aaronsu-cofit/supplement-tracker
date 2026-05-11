import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getContentItemsForProduct,
  getContentItemByKey,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  verifyContentItemBelongsToProduct,
  getIntentRulesForProduct,
  createIntentRule,
  updateIntentRule,
  deleteIntentRule,
  getMissionTemplatesForProduct,
  createMissionTemplate,
  updateMissionTemplate,
  deleteMissionTemplate,
  getBadgeTemplatesForProduct,
  createBadgeTemplate,
  updateBadgeTemplate,
  deleteBadgeTemplate,
  getJourneyTemplatesForProduct,
  createJourneyTemplate,
  upsertJourneyTemplate,
  updateJourneyTemplate,
  deleteJourneyTemplate,
} from '../lib/db.js';
import { SEED_TEMPLATES, SEED_TEMPLATE_LIST } from '../lib/seedTemplates.js';
import { VALID_BADGE_CRITERIA_TYPES } from '../lib/gamification.js';
import { validatePhases, validateTransitions } from '../lib/journey.js';
import type { BadgeCriteria, JourneyPhase, JourneyTransition } from '../types.js';
import { VALID_MATCH_TYPES, VALID_ACTION_TYPES } from '../lib/intent.js';
import type { IntentMatchType, IntentActionType } from '../types.js';

const products = new Hono();
products.use('*', authMiddleware);

// GET /api/products
products.get('/', async (c) => {
  const rows = await getAllProducts();
  return c.json({ products: rows });
});

// GET /api/products/seed-templates — list available templates.
// Must register BEFORE /:id, otherwise Hono matches "seed-templates" as
// a productId, hits the catch-all 404 in /:id, and the seed UI silently
// renders "尚無範本可用". Same for any future literal-path routes — they
// all need to come before the /:id pattern.
products.get('/seed-templates', async (c) => {
  return c.json({ templates: SEED_TEMPLATE_LIST });
});

// GET /api/products/:id
products.get('/:id', async (c) => {
  const id = c.req.param('id');
  const product = await getProductById(id);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  return c.json({ product });
});

// POST /api/products
products.post('/', async (c) => {
  const body = await c.req.json();
  const { name, description } = body;
  if (!name || typeof name !== 'string') {
    return c.json({ error: '請提供 name' }, 400);
  }
  const product = await createProduct({ name, description });
  return c.json({ product }, 201);
});

// PATCH /api/products/:id
products.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    const product = await updateProduct(id, body);
    return c.json({ product });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此 Product' }, 404);
    throw e;
  }
});

// DELETE /api/products/:id
products.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await deleteProduct(id);
    return c.json({ success: true });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此 Product' }, 404);
    throw e;
  }
});

// ─── Content Items (per-product content library) ────────────────────────────

const KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;

// GET /api/products/:productId/content
products.get('/:productId/content', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const items = await getContentItemsForProduct(productId);
  return c.json({ items });
});

// GET /api/products/:productId/content/:key
products.get('/:productId/content/:key', async (c) => {
  const productId = c.req.param('productId');
  const key = c.req.param('key');
  const item = await getContentItemByKey(productId, key);
  if (!item) return c.json({ error: '找不到此內容' }, 404);
  return c.json({ item });
});

// POST /api/products/:productId/content
products.post('/:productId/content', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const body = await c.req.json();
  if (!body.key || typeof body.key !== 'string') return c.json({ error: '請提供 key' }, 400);
  if (!KEY_REGEX.test(body.key)) {
    return c.json({ error: 'key 只能包含英數、點、底線、連字號，開頭需為英數' }, 400);
  }
  try {
    const item = await createContentItem(productId, {
      key: body.key,
      type: body.type,
      title: body.title,
      body: body.body,
      metadata: body.metadata,
    });
    return c.json({ item }, 201);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 key 已存在' }, 409);
    throw e;
  }
});

// PATCH /api/products/:productId/content/:id
products.patch('/:productId/content/:id', async (c) => {
  const productId = c.req.param('productId');
  const id = c.req.param('id');
  const body = await c.req.json();

  // 驗證內容項目屬於該產品
  const belongsToProduct = await verifyContentItemBelongsToProduct(id, productId);
  if (!belongsToProduct) {
    return c.json({ error: '找不到此內容' }, 404);
  }

  if (body.key && !KEY_REGEX.test(body.key)) {
    return c.json({ error: 'key 格式不合法' }, 400);
  }
  try {
    const item = await updateContentItem(id, body);
    return c.json({ item });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此內容' }, 404);
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 key 已存在' }, 409);
    throw e;
  }
});

// DELETE /api/products/:productId/content/:id
products.delete('/:productId/content/:id', async (c) => {
  const productId = c.req.param('productId');
  const id = c.req.param('id');

  // 驗證內容項目屬於該產品
  const belongsToProduct = await verifyContentItemBelongsToProduct(id, productId);
  if (!belongsToProduct) {
    return c.json({ error: '找不到此內容' }, 404);
  }

  await deleteContentItem(id);
  return c.json({ success: true });
});

// ─── Intent Rules (per-product text routing) ────────────────────────────────

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
    } else if (type === 'change_menu') {
      if (typeof cfg.menu_name !== 'string' || !cfg.menu_name.trim()) {
        return 'change_menu 需含 menu_name';
      }
      if (cfg.reply_content_key != null && typeof cfg.reply_content_key !== 'string') {
        return 'reply_content_key 需為字串';
      }
    } else if (type === 'send_mission_checklist') {
      // No required fields — checklist is generated server-side from
      // user's current pending missions. action_config can be {}.
    }
  }
  if (body.priority !== undefined && typeof body.priority !== 'number') return 'priority 需為數字';
  return null;
}

// GET /api/products/:productId/intent
products.get('/:productId/intent', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const rules = await getIntentRulesForProduct(productId);
  return c.json({ rules });
});

// POST /api/products/:productId/intent
products.post('/:productId/intent', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const body = await c.req.json();
  const validationError = validateIntentRuleInput(body, true);
  if (validationError) return c.json({ error: validationError }, 400);
  const rule = await createIntentRule(productId, {
    name: body.name,
    priority: body.priority,
    match_type: body.match_type,
    patterns: body.patterns,
    action_type: body.action_type,
    action_config: body.action_config,
  });
  return c.json({ rule }, 201);
});

// PATCH /api/products/:productId/intent/:id
products.patch('/:productId/intent/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const validationError = validateIntentRuleInput(body, false);
  if (validationError) return c.json({ error: validationError }, 400);
  try {
    const rule = await updateIntentRule(id, body);
    return c.json({ rule });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此規則' }, 404);
    throw e;
  }
});

// DELETE /api/products/:productId/intent/:id
products.delete('/:productId/intent/:id', async (c) => {
  const id = c.req.param('id');
  await deleteIntentRule(id);
  return c.json({ success: true });
});

// ─── Mission Templates ──────────────────────────────────────────────────────

// GET /api/products/:productId/missions
products.get('/:productId/missions', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const missions = await getMissionTemplatesForProduct(productId);
  return c.json({ missions });
});

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

// POST /api/products/:productId/missions
products.post('/:productId/missions', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const body = await c.req.json();
  const validationError = validateMissionPayload(body, true);
  if (validationError) return c.json({ error: validationError }, 400);
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
    return c.json({ mission }, 201);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 mission key 已存在' }, 409);
    throw e;
  }
});

// PATCH /api/products/:productId/missions/:id
products.patch('/:productId/missions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const validationError = validateMissionPayload(body, false);
  if (validationError) return c.json({ error: validationError }, 400);
  try {
    const mission = await updateMissionTemplate(id, body);
    return c.json({ mission });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此任務' }, 404);
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 mission key 已存在' }, 409);
    throw e;
  }
});

// DELETE /api/products/:productId/missions/:id
products.delete('/:productId/missions/:id', async (c) => {
  const id = c.req.param('id');
  await deleteMissionTemplate(id);
  return c.json({ success: true });
});

// ─── Badge Templates ────────────────────────────────────────────────────────

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

// GET /api/products/:productId/badges
products.get('/:productId/badges', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const badges = await getBadgeTemplatesForProduct(productId);
  return c.json({ badges });
});

// POST /api/products/:productId/badges
products.post('/:productId/badges', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const body = await c.req.json();
  const validationError = validateBadgePayload(body, true);
  if (validationError) return c.json({ error: validationError }, 400);
  try {
    const badge = await createBadgeTemplate(productId, {
      key: body.key,
      name: body.name,
      description: body.description,
      icon: body.icon,
      criteria: body.criteria as BadgeCriteria,
      notify_content_key: body.notify_content_key,
    });
    return c.json({ badge }, 201);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 badge key 已存在' }, 409);
    throw e;
  }
});

// PATCH /api/products/:productId/badges/:id
products.patch('/:productId/badges/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const validationError = validateBadgePayload(body, false);
  if (validationError) return c.json({ error: validationError }, 400);
  try {
    const badge = await updateBadgeTemplate(id, body);
    return c.json({ badge });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此徽章' }, 404);
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 badge key 已存在' }, 409);
    throw e;
  }
});

// DELETE /api/products/:productId/badges/:id
products.delete('/:productId/badges/:id', async (c) => {
  const id = c.req.param('id');
  await deleteBadgeTemplate(id);
  return c.json({ success: true });
});

// ─── Journey Templates ──────────────────────────────────────────────────────

function validateJourneyPayload(body: Record<string, unknown>, requireAll: boolean): string | null {
  if (requireAll || body.key !== undefined) {
    if (typeof body.key !== 'string' || !body.key.trim()) return '請提供 key';
    if (!KEY_REGEX.test(body.key)) return 'key 格式不合法';
  }
  if (requireAll || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return '請提供 name';
  }
  const phases = body.phases as JourneyPhase[] | undefined;
  const transitions = body.transitions as JourneyTransition[] | undefined;
  if (requireAll || phases !== undefined) {
    if (!phases) return 'phases 必填';
    const phaseError = validatePhases(phases);
    if (phaseError) return phaseError;
  }
  if (requireAll || transitions !== undefined) {
    if (!transitions) return 'transitions 必填';
    const tError = validateTransitions(transitions, phases ?? []);
    if (tError) return tError;
  }
  return null;
}

// GET /api/products/:productId/journeys
products.get('/:productId/journeys', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const journeys = await getJourneyTemplatesForProduct(productId);
  return c.json({ journeys });
});

// POST /api/products/:productId/journeys
products.post('/:productId/journeys', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);
  const body = await c.req.json();
  const err = validateJourneyPayload(body, true);
  if (err) return c.json({ error: err }, 400);
  try {
    const journey = await createJourneyTemplate(productId, {
      key: body.key,
      name: body.name,
      description: body.description,
      phases: body.phases,
      transitions: body.transitions,
    });
    return c.json({ journey }, 201);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 journey key 已存在' }, 409);
    throw e;
  }
});

// PATCH /api/products/:productId/journeys/:id
products.patch('/:productId/journeys/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const err = validateJourneyPayload(body, false);
  if (err) return c.json({ error: err }, 400);
  try {
    const journey = await updateJourneyTemplate(id, body);
    return c.json({ journey });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此 journey' }, 404);
    if ((e as { code?: string })?.code === 'P2002') return c.json({ error: '此 journey key 已存在' }, 409);
    throw e;
  }
});

// DELETE /api/products/:productId/journeys/:id
products.delete('/:productId/journeys/:id', async (c) => {
  const id = c.req.param('id');
  await deleteJourneyTemplate(id);
  return c.json({ success: true });
});

// ─── Seed templates (demo data) ─────────────────────────────────────────────
// (Note: GET /seed-templates is registered earlier, before /:id, to avoid
//  Hono treating "seed-templates" as a productId.)

// POST /api/products/:productId/seed
// Body: { template: 'wellness_21d' }
// Idempotent per-key: items whose key already exists are skipped.
products.post('/:productId/seed', async (c) => {
  const productId = c.req.param('productId');
  const product = await getProductById(productId);
  if (!product) return c.json({ error: '找不到此 Product' }, 404);

  let body: { template?: string };
  try { body = await c.req.json(); } catch { body = {}; }
  const templateKey = body.template ?? 'wellness_21d';
  const tpl = SEED_TEMPLATES[templateKey];
  if (!tpl) return c.json({ error: `未知的範本 "${templateKey}"` }, 400);

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
    fn: () => Promise<unknown>,
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

  return c.json({ template: templateKey, summary });
});

export default products;
