import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  getScenariosForOA, getScenarioById,
  createScenario, updateScenario, deleteScenario,
  enrollAllLineUsersInScenario,
} from '../lib/db.js'

// TODO(security): PATCH/DELETE/GET single-scenario routes do not verify OA ownership.
// Any authenticated user can access any scenario by ID. A user-OA membership model
// is needed before multi-tenant production use.

const wizard = new Hono()
wizard.use('*', authMiddleware)

wizard.get('/oa/:oaId/scenarios', async (c) => {
  const scenarios = await getScenariosForOA(c.req.param('oaId'))
  return c.json({ scenarios })
})

wizard.post('/oa/:oaId/scenarios', async (c) => {
  let body: { name: string; flow_nodes?: unknown; flow_edges?: unknown }
  try {
    body = await c.req.json<{ name: string; flow_nodes?: unknown; flow_edges?: unknown }>()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }
  const { name, flow_nodes, flow_edges } = body
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  const scenario = await createScenario(c.req.param('oaId'), name.trim())
  // If flow data provided, update immediately (atomic first-save)
  if (flow_nodes !== undefined || flow_edges !== undefined) {
    const updated = await updateScenario(scenario.id, { flow_nodes, flow_edges })
    return c.json({ scenario: updated }, 201)
  }
  return c.json({ scenario }, 201)
})

wizard.get('/scenarios/:id', async (c) => {
  const scenario = await getScenarioById(c.req.param('id'))
  if (!scenario) return c.json({ error: 'not found' }, 404)
  return c.json({ scenario })
})

wizard.patch('/scenarios/:id', async (c) => {
  let body: { name?: string; flow_nodes?: unknown; flow_edges?: unknown; is_active?: boolean }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }
  try {
    const scenario = await updateScenario(c.req.param('id'), body)
    // Intentionally NOT auto-enrolling existing LINE users on activate.
    // Only new follows (via webhook) get auto-enrolled going forward.
    // Use POST /api/wizard/scenarios/:id/enroll-all for explicit bulk enroll.
    return c.json({ scenario })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: 'not found' }, 404)
    throw e
  }
})

wizard.delete('/scenarios/:id', async (c) => {
  try {
    await deleteScenario(c.req.param('id'))
    return c.json({ success: true })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: 'not found' }, 404)
    throw e
  }
})

// POST /api/wizard/scenarios/:id/enroll-all — opt-in bulk enrollment of all LINE users.
// Use with care: this retroactively enrolls everyone into the scenario's flow, so
// Day 0 messages will fire at the next scheduler run.
wizard.post('/scenarios/:id/enroll-all', async (c) => {
  try {
    const count = await enrollAllLineUsersInScenario(c.req.param('id'))
    return c.json({ enrolled: count })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2003') return c.json({ error: 'scenario not found' }, 404)
    throw e
  }
})

export default wizard
