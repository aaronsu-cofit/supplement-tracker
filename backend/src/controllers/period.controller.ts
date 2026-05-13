import type { FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { createPeriod, listPeriods } from '../services/period.service'
import type { CreatePeriodRequest, PeriodQuery } from '../schemas/period.schema'

/**
 * Period Controller
 * Handles HTTP requests for period management
 */
export class PeriodController {
  /**
   * Create a new period record
   * POST /api/periods
   */
  static async create(request: FastifyRequest<{ Body: CreatePeriodRequest }>, reply: FastifyReply) {
    try {
      const { startDate, endDate, notes } = request.body
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const period = await createPeriod(userId, {
        startDate,
        endDate,
        notes,
      })

      return reply.status(201).send(period)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        })
      }

      request.log.error(error, 'Failed to create period')
      return reply.status(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * List period records
   * GET /api/periods
   */
  static async list(request: FastifyRequest<{ Querystring: PeriodQuery }>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const periods = await listPeriods(userId, request.query)

      return reply.status(200).send(periods)
    } catch (error) {
      request.log.error(error, 'Failed to list periods')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
