import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
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

export default products;
