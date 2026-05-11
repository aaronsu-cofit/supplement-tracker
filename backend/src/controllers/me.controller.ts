import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { MeService } from '../services/me.service.js';

// Minimal controller - delegates to existing db functions for rapid migration
export class MeController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private meService: MeService,
  ) {
    super(request, reply);
  }
}
