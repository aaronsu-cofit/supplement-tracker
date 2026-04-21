import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllModules, updateModule, getAllUsers, updateUserRole, getHQStats,
  getUserAttributes, deleteUserAttribute,
  getUserMissionAssignments,
  getUserStreaks, getUserBadges,
  findUserById, db,
} from '../lib/db.js';
import { setUserAttributeWithHooks } from '../lib/missions.js';

const hq = new Hono<HonoEnv>();
hq.use('*', authMiddleware);

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

// ─── User Attributes (per-user key/value store) ─────────────────────────────

// GET /api/hq/users/:userId/attributes
hq.get('/users/:userId/attributes', async (c) => {
  try {
    const userId = c.req.param('userId');
    const attributes = await getUserAttributes(userId);
    return c.json({ attributes });
  } catch (error) {
    console.error('Failed to fetch user attributes:', error);
    return c.json({ error: 'Failed to fetch attributes' }, 500);
  }
});

// PUT /api/hq/users/:userId/attributes/:key
hq.put('/users/:userId/attributes/:key', async (c) => {
  try {
    const userId = c.req.param('userId');
    const key = c.req.param('key');
    const body = await c.req.json().catch(() => ({}));
    const value = typeof body.value === 'string' ? body.value : null;
    const attribute = await setUserAttributeWithHooks(userId, key, value);
    return c.json({ attribute });
  } catch (error) {
    console.error('Failed to set user attribute:', error);
    return c.json({ error: 'Failed to set attribute' }, 500);
  }
});

// DELETE /api/hq/users/:userId/attributes/:key
hq.delete('/users/:userId/attributes/:key', async (c) => {
  try {
    const userId = c.req.param('userId');
    const key = c.req.param('key');
    await deleteUserAttribute(userId, key);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user attribute:', error);
    return c.json({ error: 'Failed to delete attribute' }, 500);
  }
});

// GET /api/hq/users/:userId
hq.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await findUserById(userId);
    if (!user) return c.json({ error: 'User not found' }, 404);
    // strip password hash
    const { password_hash, ...safe } = user;
    void password_hash;
    return c.json({ user: safe });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// GET /api/hq/users/:userId/engagement?limit=50
hq.get('/users/:userId/engagement', async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = Math.min(200, parseInt(c.req.query('limit') || '50', 10));
    const events = await db().engagementEvent.findMany({
      where: { user_id: userId },
      orderBy: { occurred_at: 'desc' },
      take: limit,
    });
    return c.json({ events });
  } catch (error) {
    console.error('Failed to fetch engagement events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// GET /api/hq/users/:userId/missions
hq.get('/users/:userId/missions', async (c) => {
  try {
    const userId = c.req.param('userId');
    const missions = await getUserMissionAssignments(userId);
    return c.json({ missions });
  } catch (error) {
    console.error('Failed to fetch user missions:', error);
    return c.json({ error: 'Failed to fetch missions' }, 500);
  }
});

// GET /api/hq/users/:userId/streaks
hq.get('/users/:userId/streaks', async (c) => {
  try {
    const userId = c.req.param('userId');
    const streaks = await getUserStreaks(userId);
    return c.json({ streaks });
  } catch (error) {
    console.error('Failed to fetch user streaks:', error);
    return c.json({ error: 'Failed to fetch streaks' }, 500);
  }
});

// GET /api/hq/users/:userId/badges
hq.get('/users/:userId/badges', async (c) => {
  try {
    const userId = c.req.param('userId');
    const badges = await getUserBadges(userId);
    return c.json({ badges });
  } catch (error) {
    console.error('Failed to fetch user badges:', error);
    return c.json({ error: 'Failed to fetch badges' }, 500);
  }
});

// GET /api/hq/stats
hq.get('/stats', async (c) => {
  try {
    const stats = await getHQStats();
    return c.json(stats);
  } catch (error) {
    console.error('Failed to fetch HQ stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default hq;
