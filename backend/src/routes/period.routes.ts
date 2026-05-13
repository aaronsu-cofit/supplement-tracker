import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsync } from 'fastify'
import { PeriodController } from '../controllers/period.controller.js'
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
const periodRoutesImpl: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Apply authentication middleware to all routes
  fastify.addHook('preHandler', authenticateUser)

  /**
   * POST /api/periods - Create a new period
   */
  fastify.post(
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
    PeriodController.create
  )

  /**
   * GET /api/periods - List periods
   */
  fastify.get(
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
    PeriodController.list
  )
}

/**
 * Export as Fastify plugin
 */
export const periodRoutes = periodRoutesImpl
