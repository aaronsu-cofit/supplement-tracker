import { Hono } from 'hono';
import { getActiveModules } from '../lib/db.js';

const modules = new Hono();

// GET /api/modules (public — no auth needed)
modules.get('/', async (c) => {
  try {
    const moduleList = await getActiveModules();
    return c.json({ modules: moduleList });
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return c.json({ error: 'Failed to fetch modules' }, 500);
  }
});

export default modules;
