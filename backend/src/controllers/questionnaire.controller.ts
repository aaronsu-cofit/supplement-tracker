// QuestionnaireController — HTTP layer for /api/questionnaires.
//
// Mix of admin endpoints (require auth) and public-facing endpoints
// (spec fetch + response submit allow anonymous_id fallback so the
// future web version works without LIFF login).

import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { QuestionnaireService } from '../services/questionnaire.service.js';

export class QuestionnaireController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private service: QuestionnaireService,
  ) {
    super(request, reply);
  }

  // ─── Admin ──────────────────────────────────────────────────────

  async list() {
    const { productId } = this.request.params as { productId: string };
    const items = await this.service.list(productId);
    return { items };
  }

  async getByKey() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    return this.service.getByKey(productId, key);
  }

  async create() {
    const { productId } = this.request.params as { productId: string };
    const body = (this.request.body as Record<string, unknown>) ?? {};
    const created = await this.service.create(productId, body);
    this.reply.code(201);
    return created;
  }

  async update() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    const body = (this.request.body as Record<string, unknown>) ?? {};
    return this.service.update(productId, key, body);
  }

  async delete() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    return this.service.delete(productId, key);
  }

  async listAllResponses() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    const { limit } = this.request.query as { limit?: string };
    const items = await this.service.listAllResponses(
      productId,
      key,
      limit ? parseInt(limit, 10) : 100,
    );
    return { items };
  }

  // ─── Public / LIFF ──────────────────────────────────────────────

  async getSpec() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    return this.service.getSpec(productId, key);
  }

  async submitResponse() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    const body = (this.request.body as Record<string, unknown>) ?? {};
    // userId may be null (anonymous web flow); service enforces that
    // either user_id or body.anonymous_id is present.
    const userId = this.getUserId();
    return this.service.submitResponse(productId, key, userId, body);
  }

  async listMyResponses() {
    const { productId, key } = this.request.params as { productId: string; key: string };
    const userId = this.getAuthenticatedUserId();
    const items = await this.service.listMyResponses(productId, key, userId);
    return { items };
  }
}
