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
    try {
      const moduleList = await this.modulesService.getActiveModules();
      this.logDebug('Fetched active modules', { count: moduleList.length });
      return { modules: moduleList };
    } catch (error) {
      this.logError('[Modules /getModules]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch modules' });
    }
  }
}
