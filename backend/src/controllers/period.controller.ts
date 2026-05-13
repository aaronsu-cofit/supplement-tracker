import type { FastifyRequest, FastifyReply } from 'fastify'
import { BaseController } from './base.controller.js'
import { PeriodService } from '../services/period.service.js'
import { ZodError } from 'zod'
import type { CreatePeriodRequest, PeriodQuery } from '../schemas/period.schema.js'

/**
 * PeriodController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class PeriodController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private periodService: PeriodService,
  ) {
    super(request, reply)
  }

  /**
   * Create a new period record
   * POST /api/periods
   */
  async create() {
    try {
      const userId = this.getAuthenticatedUserId()
      const { startDate, endDate, notes } = this.request.body as CreatePeriodRequest

      const period = await this.periodService.createPeriod(userId, {
        startDate,
        endDate,
        notes,
      })

      this.logDebug('Created period', { userId, periodId: period.id })
      this.reply.code(201)
      return period
    } catch (error) {
      if (error instanceof ZodError) {
        this.reply.code(400)
        return {
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        }
      }

      this.logError('[Period /create]', error)
      this.reply.code(400)
      return {
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List period records
   * GET /api/periods
   */
  async list() {
    try {
      const userId = this.getAuthenticatedUserId()
      const periods = await this.periodService.listPeriods(userId, this.request.query as PeriodQuery)

      this.logDebug('Listed periods', { userId, count: periods.length })
      this.reply.code(200)
      return periods
    } catch (error) {
      this.logError('[Period /list]', error)
      this.reply.code(500)
      return {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
