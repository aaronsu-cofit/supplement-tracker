// Questionnaire routes, mounted at /api/questionnaires.
//
// Mix of admin and public endpoints. Soft-auth at the file level so
// userId is attached when LIFF profile is available, but missing auth
// doesn't 401. Admin-only endpoints assert by calling
// controller.getAuthenticatedUserId() implicitly or explicitly.
//
// (Admin-role enforcement is a separate concern — once we wire
// requireRole middleware it goes on the admin handlers below.)

import { FastifyInstance } from 'fastify';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import { QuestionnaireController } from '../controllers/questionnaire.controller.js';
import { QuestionnaireService } from '../services/questionnaire.service.js';
import { container } from '../lib/container.js';
import { asyncHandler } from '../controllers/base.controller.js';

export async function questionnaireRoutes(app: FastifyInstance) {
  app.addHook('preHandler', softAuthPreHandler);

  const service = container.get<QuestionnaireService>('questionnaireService');

  // ─── Admin: list / create ───────────────────────────────────────

  // GET /api/questionnaires/:productId  — list all questionnaires of a product
  app.get('/:productId', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).list();
  }));

  // POST /api/questionnaires/:productId  — create a new questionnaire
  app.post('/:productId', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).create();
  }));

  // ─── Public: spec fetch (LIFF / vibe-coded pages) ───────────────

  // GET /api/questionnaires/:productId/:key/spec  — public
  app.get('/:productId/:key/spec', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).getSpec();
  }));

  // ─── Public / LIFF: submit answers ──────────────────────────────

  // POST /api/questionnaires/:productId/:key/responses
  app.post('/:productId/:key/responses', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).submitResponse();
  }));

  // ─── LIFF user: my history ──────────────────────────────────────

  // GET /api/questionnaires/:productId/:key/responses/me
  app.get('/:productId/:key/responses/me', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).listMyResponses();
  }));

  // ─── Admin: response viewer ─────────────────────────────────────

  // GET /api/questionnaires/:productId/:key/responses  — admin list
  app.get('/:productId/:key/responses', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).listAllResponses();
  }));

  // ─── Admin: per-questionnaire CRUD ──────────────────────────────
  //
  // Single-resource routes registered AFTER more specific paths above
  // (Fastify uses radix tree so order doesn't strictly matter, but
  // grouped this way for readability).

  // GET /api/questionnaires/:productId/:key
  app.get('/:productId/:key', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).getByKey();
  }));

  // PATCH /api/questionnaires/:productId/:key
  app.patch('/:productId/:key', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).update();
  }));

  // DELETE /api/questionnaires/:productId/:key
  app.delete('/:productId/:key', asyncHandler(async (request, reply) => {
    return new QuestionnaireController(request, reply, service).delete();
  }));
}
