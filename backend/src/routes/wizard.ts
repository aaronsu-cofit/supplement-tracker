import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  getScenariosForOA, getScenarioById,
  createScenario, updateScenario, deleteScenario,
} from '../lib/db.js'

const wizard = new Hono()
wizard.use('*', authMiddleware)

wizard.get('/oa/:oaId/scenarios', async (c) => {
  const scenarios = await getScenariosForOA(c.req.param('oaId'))
  return c.json({ scenarios })
})

wizard.post('/oa/:oaId/scenarios', async (c) => {
  let body: { name: string }
  try {
    body = await c.req.json<{ name: string }>()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }
  const { name } = body
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  const scenario = await createScenario(c.req.param('oaId'), name.trim())
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

export default wizard
