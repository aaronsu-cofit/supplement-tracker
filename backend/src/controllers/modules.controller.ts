import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { ModulesService } from '../services/modules.service.js';

export class ModulesController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private modulesService: ModulesService,
  ) {
    super(request, reply);
  }

  async getModules() {
    const moduleList = await this.modulesService.getActiveModules();
    return this.sendSuccess({ modules: moduleList });
  }
}
