import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WomenHealingService } from '../services/womenHealing.service.js';

// Minimal controller - delegates to existing db functions for rapid migration
export class WomenHealingController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private womenHealingService: WomenHealingService,
  ) {
    super(request, reply);
  }
}
