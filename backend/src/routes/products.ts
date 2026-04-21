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
} from '../lib/db.js';

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

export default products;
