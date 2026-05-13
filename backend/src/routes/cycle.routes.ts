import type { FastifyInstance } from 'fastify'
import { CycleController } from '../controllers/cycle.controller.js'
import { CycleService } from '../services/cycle.service.js'
import { asyncHandler } from '../controllers/base.controller.js'
import { db } from '../lib/db.js'
import { authenticateUser } from '../middleware/auth.js'
import {
  getUserCycleDataSchema,
  setupCycleSchema,
  saveDailyLogSchema,
  updateCycleSettingsSchema,
} from '../schemas/cycle.schema.js'

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
    { schema: getUserCycleDataSchema },
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
    { schema: setupCycleSchema },
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
    { schema: saveDailyLogSchema },
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
    { schema: updateCycleSettingsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new CycleController(request, reply, cycleService)
      return controller.updateSettings()
    }),
  )
}
