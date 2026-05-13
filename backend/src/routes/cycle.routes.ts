import { FastifyPluginAsync } from 'fastify'
import { CycleController } from '../controllers/cycle.controller.js'
import { authenticateUser } from '../middleware/auth.js'

/**
 * Cycle routes plugin
 * Routes for menstrual cycle tracking and daily log management
 */
export const cycleRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication middleware to all routes
  fastify.addHook('preHandler', authenticateUser)

  /**
   * GET /api/cycle/user
   * Get user cycle settings and logs
   */
  fastify.get(
    '/user',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Get user cycle data',
        description: 'Retrieves cycle settings and all daily logs for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    CycleController.getUserData
  )

  /**
   * POST /api/cycle/setup
   * Onboarding setup
   */
  fastify.post(
    '/setup',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Setup cycle tracking',
        description: 'Initial onboarding setup for menstrual cycle tracking',
        security: [{ bearerAuth: [] }],
      },
    },
    CycleController.setup
  )

  /**
   * POST /api/cycle/log
   * Save daily log
   */
  fastify.post(
    '/log',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Save daily log',
        description: 'Saves or updates a daily log entry (symptoms, emotions, flow, etc.)',
        security: [{ bearerAuth: [] }],
      },
    },
    CycleController.saveLog
  )

  /**
   * PATCH /api/cycle/settings
   * Update cycle settings
   */
  fastify.patch(
    '/settings',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Update cycle settings',
        description: 'Updates cycle duration and length for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    CycleController.updateSettings
  )
}
