import type { FastifyInstance } from 'fastify'
import { PeriodController } from '../controllers/period.controller.js'
import { PeriodService } from '../services/period.service.js'
import { asyncHandler } from '../controllers/base.controller.js'
import { container } from '../lib/container.js'
import { db } from '../lib/db.js'
import { authenticateUser } from '../middleware/auth.js'
import {
  CreatePeriodSchema,
  PeriodQuerySchema,
  PeriodResponseSchema,
  PeriodListResponseSchema,
  ErrorResponseSchema,
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
    {
      schema: {
        tags: ['periods'],
        summary: 'Create a new period',
        description: 'Creates a new menstrual period record for the authenticated user',
        security: [{ bearerAuth: [] }],
        body: CreatePeriodSchema,
        response: {
          201: PeriodResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
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
    {
      schema: {
        tags: ['periods'],
        summary: 'List periods',
        description:
          'Retrieves a list of menstrual period records for the authenticated user with optional filtering',
        security: [{ bearerAuth: [] }],
        querystring: PeriodQuerySchema,
        response: {
          200: PeriodListResponseSchema,
          401: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const controller = new PeriodController(request, reply, periodService)
      return controller.list()
    }),
  )
}
