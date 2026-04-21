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
  getIntentRulesForProduct,
  createIntentRule,
  updateIntentRule,
  deleteIntentRule,
} from '../lib/db.js';
import { VALID_MATCH_TYPES, VALID_ACTION_TYPES } from '../lib/intent.js';
import type { IntentMatchType, IntentActionType } from '../types.js';

const products = new Hono();
products.use('*', authMiddleware);

// GET /api/products
products.get('/', async (c) => {
  const rows = await getAllProducts();
  return c.json({ products: rows });
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
  const id = c.req.param('id');
  const body = await c.req.json();
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
  const id = c.req.param('id');
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

export default products;
