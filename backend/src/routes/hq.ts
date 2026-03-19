import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
import { getAllModules, updateModule, getAllUsers, updateUserRole } from '../lib/db.js';

const hq = new Hono();
hq.use('*', softAuthMiddleware);

// GET /api/hq/modules
hq.get('/modules', async (c) => {
  try {
    const modules = await getAllModules();
    return c.json({ modules });
  } catch (error) {
    console.error('Failed to fetch HQ modules:', error);
    return c.json({ error: 'Failed to fetch modules' }, 500);
  }
});

// PATCH /api/hq/modules/:id
hq.patch('/modules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const module = await updateModule(id, updates);
    if (!module) return c.json({ error: 'Module not found' }, 404);
    return c.json({ success: true, module });
  } catch (error) {
    return c.json({ error: 'Failed to update module' }, 500);
  }
});

// GET /api/hq/admins (list all users)
hq.get('/admins', async (c) => {
  try {
    const users = await getAllUsers();
    return c.json({ users });
  } catch (error) {
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// PATCH /api/hq/admins/:userId
hq.patch('/admins/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { role } = await c.req.json();
    if (!role) return c.json({ error: 'role is required' }, 400);
    const user = await updateUserRole(userId, role);
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ success: true, user });
  } catch (error) {
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

export default hq;
