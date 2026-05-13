import type { FastifyInstance } from 'fastify'
import { CycleController } from '../controllers/cycle.controller.js'
import { CycleService } from '../services/cycle.service.js'
import { asyncHandler } from '../controllers/base.controller.js'
import { db } from '../lib/db.js'
import { authenticateUser } from '../middleware/auth.js'

/**
 * Cycle routes plugin
 * Routes for menstrual cycle tracking and daily log management
 */
export async function cycleRoutes(app: FastifyInstance) {
  // Create service instance
  const cycleService = new CycleService(db())

  // Apply authentication middleware to all routes
  app.addHook('preHandler', authenticateUser)

  /**
   * GET /api/cycle/user
   * Get user cycle settings and logs
   */
  app.get(
    '/user',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Get user cycle data',
        description: 'Retrieves cycle settings and all daily logs for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    asyncHandler(async (request, reply) => {
      const controller = new CycleController(request, reply, cycleService)
      return controller.getUserData()
    }),
  )

  /**
   * POST /api/cycle/setup
   * Onboarding setup
   */
  app.post(
    '/setup',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Setup cycle tracking',
        description: 'Initial onboarding setup for menstrual cycle tracking',
        security: [{ bearerAuth: [] }],
      },
    },
    asyncHandler(async (request, reply) => {
      const controller = new CycleController(request, reply, cycleService)
      return controller.setup()
    }),
  )

  /**
   * POST /api/cycle/log
   * Save daily log
   */
  app.post(
    '/log',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Save daily log',
        description: 'Saves or updates a daily log entry (symptoms, emotions, flow, etc.)',
        security: [{ bearerAuth: [] }],
      },
    },
    asyncHandler(async (request, reply) => {
      const controller = new CycleController(request, reply, cycleService)
      return controller.saveLog()
    }),
  )

  /**
   * PATCH /api/cycle/settings
   * Update cycle settings
   */
  app.patch(
    '/settings',
    {
      schema: {
        tags: ['cycle'],
        summary: 'Update cycle settings',
        description: 'Updates cycle duration and length for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    asyncHandler(async (request, reply) => {
      const controller = new CycleController(request, reply, cycleService)
      return controller.updateSettings()
    }),
  )
}
