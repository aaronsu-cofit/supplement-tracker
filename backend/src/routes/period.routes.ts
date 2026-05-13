import type { FastifyInstance } from 'fastify'
import { PeriodController } from '../controllers/period.controller.js'
import { PeriodService } from '../services/period.service.js'
import { asyncHandler } from '../controllers/base.controller.js'
import { db } from '../lib/db.js'
import { authenticateUser } from '../middleware/auth.js'
import {
  createPeriodSchema,
  listPeriodSchema,
} from '../schemas/period.schema.js'

/**
 * Period routes plugin
 * Routes for period management endpoints
 */
export async function periodRoutes(app: FastifyInstance) {
  // Create service instance
  const periodService = new PeriodService(db())

  // Apply authentication middleware to all routes
  app.addHook('preHandler', authenticateUser)

  /**
   * POST /api/periods - Create a new period
   */
  app.post(
    '/',
    { schema: createPeriodSchema },
    asyncHandler(async (request, reply) => {
      const controller = new PeriodController(request, reply, periodService)
      return controller.create()
    }),
  )

  /**
   * GET /api/periods - List periods
   */
  app.get(
    '/',
    { schema: listPeriodSchema },
    asyncHandler(async (request, reply) => {
      const controller = new PeriodController(request, reply, periodService)
      return controller.list()
    }),
  )
}
