import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { LineoaService } from '../services/lineoa.service.js';

// Minimal controller - delegates to existing db functions for rapid migration
export class LineoaController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private lineoaService: LineoaService,
  ) {
    super(request, reply);
  }
}
