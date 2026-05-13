import type { FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import {
  getUserCycleData,
  setupCycle,
  saveDailyLog,
  updateCycleSettings,
} from '../services/cycle.service.js'

/**
 * Cycle Controller
 * Handles HTTP requests for menstrual cycle tracking and daily logs
 */
export class CycleController {
  /**
   * Get user cycle settings and all daily logs
   * GET /api/cycle/user
   */
  static async getUserData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const data = await getUserCycleData(userId)
      return reply.status(200).send(data)
    } catch (error) {
      request.log.error(error, 'Failed to get user cycle data')
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Initial onboarding setup for cycle tracking
   * POST /api/cycle/setup
   */
  static async setup(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const result = await setupCycle(userId, request.body)
      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        })
      }

      request.log.error(error, 'Failed to setup cycle')
      return reply.status(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Save or update a daily log entry
   * POST /api/cycle/log
   */
  static async saveLog(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const result = await saveDailyLog(userId, request.body)
      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        })
      }

      request.log.error(error, 'Failed to save daily log')
      return reply.status(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Update cycle settings
   * PATCH /api/cycle/settings
   */
  static async updateSettings(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const result = await updateCycleSettings(userId, request.body)
      return reply.status(200).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        })
      }

      request.log.error(error, 'Failed to update cycle settings')
      return reply.status(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
