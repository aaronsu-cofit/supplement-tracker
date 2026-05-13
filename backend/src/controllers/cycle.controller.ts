import type { FastifyRequest, FastifyReply } from 'fastify'
import { BaseController } from './base.controller.js'
import { CycleService } from '../services/cycle.service.js'
import { ZodError } from 'zod'

/**
 * CycleController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class CycleController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private cycleService: CycleService,
  ) {
    super(request, reply)
  }

  /**
   * Get user cycle settings and all daily logs
   * GET /api/cycle/user
   */
  async getUserData() {
    try {
      const userId = this.getAuthenticatedUserId()
      const data = await this.cycleService.getUserCycleData(userId)

      this.logDebug('Retrieved cycle data', { userId })
      this.reply.code(200)
      return data
    } catch (error) {
      this.logError('[Cycle /getUserData]', error)
      this.reply.code(500)
      return {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Initial onboarding setup for cycle tracking
   * POST /api/cycle/setup
   */
  async setup() {
    try {
      const userId = this.getAuthenticatedUserId()
      const result = await this.cycleService.setupCycle(userId, this.request.body)

      this.logDebug('Setup cycle', { userId })
      this.reply.code(200)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        this.reply.code(400)
        return {
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        }
      }

      this.logError('[Cycle /setup]', error)
      this.reply.code(400)
      return {
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Save or update a daily log entry
   * POST /api/cycle/log
   */
  async saveLog() {
    try {
      const userId = this.getAuthenticatedUserId()
      const result = await this.cycleService.saveDailyLog(userId, this.request.body)

      this.logDebug('Saved daily log', { userId, date: result.date })
      this.reply.code(200)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        this.reply.code(400)
        return {
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        }
      }

      this.logError('[Cycle /saveLog]', error)
      this.reply.code(400)
      return {
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update cycle settings
   * PATCH /api/cycle/settings
   */
  async updateSettings() {
    try {
      const userId = this.getAuthenticatedUserId()
      const result = await this.cycleService.updateCycleSettings(userId, this.request.body)

      this.logDebug('Updated cycle settings', { userId })
      this.reply.code(200)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        this.reply.code(400)
        return {
          error: 'Validation Error',
          message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        }
      }

      this.logError('[Cycle /updateSettings]', error)
      this.reply.code(400)
      return {
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
