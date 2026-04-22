import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllModules, updateModule, getAllUsers, updateUserRole, getHQStats,
  getUserAttributes, deleteUserAttribute,
  getUserMissionAssignments,
  getUserStreaks, getUserBadges,
  getUserJourneyPhases,
  getMessageLogForUser,
  findUserById, db,
  getMissionTemplateByKey,
  assignMission,
  abandonMissionAssignment,
  removeUserBadge,
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

// POST /api/hq/users/:userId/missions
// Body: { product_id, mission_key } — manually assign a mission to a user.
// Idempotent: returns the existing pending assignment if one already exists.
hq.post('/users/:userId/missions', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    if (typeof body.product_id !== 'string' || typeof body.mission_key !== 'string') {
      return c.json({ error: 'product_id and mission_key required' }, 400);
    }
    const template = await getMissionTemplateByKey(body.product_id, body.mission_key);
    if (!template || !template.is_active) {
      return c.json({ error: 'mission not found or inactive' }, 404);
    }
    const assignment = await assignMission(userId, template.id);
    return c.json({ assignment }, 201);
  } catch (error) {
    console.error('Failed to assign mission:', error);
    return c.json({ error: 'Failed to assign mission' }, 500);
  }
});

// DELETE /api/hq/users/:userId/missions/:assignmentId
// Abandons (does not hard-delete) the assignment — status goes to
// 'abandoned' and it disappears from pending queries but stays in the
// history. Safer than deletion because intent/progress paths have no
// way to reassign automatically.
hq.delete('/users/:userId/missions/:assignmentId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const assignmentId = c.req.param('assignmentId');
    const updated = await abandonMissionAssignment(userId, assignmentId);
    if (!updated) return c.json({ error: 'assignment not found' }, 404);
    return c.json({ assignment: updated });
  } catch (error) {
    console.error('Failed to abandon mission:', error);
    return c.json({ error: 'Failed to abandon mission' }, 500);
  }
});

// DELETE /api/hq/users/:userId/badges/:templateId — revoke a badge
hq.delete('/users/:userId/badges/:templateId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const templateId = c.req.param('templateId');
    await removeUserBadge(userId, templateId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke badge:', error);
    return c.json({ error: 'Failed to revoke badge' }, 500);
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

// GET /api/hq/users/:userId/messages?limit=
hq.get('/users/:userId/messages', async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = Math.min(500, parseInt(c.req.query('limit') || '100', 10));
    const messages = await getMessageLogForUser(userId, limit);
    return c.json({ messages });
  } catch (error) {
    console.error('Failed to fetch user messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// GET /api/hq/users/:userId/journeys
hq.get('/users/:userId/journeys', async (c) => {
  try {
    const userId = c.req.param('userId');
    const phases = await getUserJourneyPhases(userId);
    return c.json({ phases });
  } catch (error) {
    console.error('Failed to fetch user journeys:', error);
    return c.json({ error: 'Failed to fetch journeys' }, 500);
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
