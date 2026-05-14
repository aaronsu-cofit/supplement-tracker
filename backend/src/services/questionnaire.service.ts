// QuestionnaireService — business logic for questionnaires.
//
// Responsibilities:
//   - Admin CRUD (called by HQ)
//   - Spec fetch (called by LIFF / vibe-coded pages)
//   - Response submission: validate answers, run scoring engine, fire
//     on_submit_actions, save row
//   - User history fetch
//
// The scoring engine itself lives in lib/questionnaire/. Hook
// execution (set_attribute / assign_mission / transition_journey)
// reuses the existing helpers from lib/db.ts and lib/journey.ts.

import { PrismaClient, Prisma } from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import { validateSpec } from '../lib/questionnaire/spec-validator.js';
import { calculateAll } from '../lib/questionnaire/scoring.js';
import type { Answers, QuestionnaireSpec } from '../lib/questionnaire/spec.types.js';
import { setUserAttributeWithHooks } from '../lib/missions.js';
import { assignMission, getMissionTemplateByKey, upsertUserJourneyPhase } from '../lib/db.js';

const KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;

interface OnSubmitAction {
  type: 'set_attribute' | 'assign_mission' | 'transition_journey';
  key?: string;
  value?: string;
  mission_key?: string;
  journey_key?: string;
  phase_key?: string;
}

export class QuestionnaireService {
  constructor(private prisma: PrismaClient) {}

  // ─── Admin CRUD ─────────────────────────────────────────────────

  async list(productId: string) {
    return this.prisma.questionnaire.findMany({
      where: { product_id: productId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getByKey(productId: string, key: string) {
    const row = await this.prisma.questionnaire.findUnique({
      where: { product_id_key: { product_id: productId, key } },
    });
    if (!row) throw new NotFoundError(`Questionnaire "${key}" not found`);
    return row;
  }

  async create(productId: string, body: Record<string, unknown>) {
    const key = String(body.key ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!key) throw new ValidationError('key required', [{ field: 'key', message: 'required' }]);
    if (!KEY_REGEX.test(key)) {
      throw new ValidationError('key invalid', [
        { field: 'key', message: 'only [a-zA-Z0-9_.-], start alphanumeric, ≤100 chars' },
      ]);
    }
    if (!name) throw new ValidationError('name required', [{ field: 'name', message: 'required' }]);

    const spec = (body.spec as QuestionnaireSpec) ?? { question_sets: [] };
    const specErrors = validateSpec(spec);
    if (specErrors.length > 0) {
      throw new ValidationError('spec invalid', specErrors.map((e) => ({ field: 'spec', message: e })));
    }

    try {
      return await this.prisma.questionnaire.create({
        data: {
          product_id: productId,
          key,
          name,
          description: typeof body.description === 'string' ? body.description : null,
          spec: spec as unknown as Prisma.InputJsonValue,
          on_submit_actions: (body.on_submit_actions ?? []) as Prisma.InputJsonValue,
          liff_url: typeof body.liff_url === 'string' ? body.liff_url : null,
          is_active: body.is_active !== false,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictError(`Questionnaire key "${key}" already exists in this product`);
      }
      throw err;
    }
  }

  async update(productId: string, key: string, body: Record<string, unknown>) {
    const existing = await this.getByKey(productId, key);

    // Validate spec if provided
    if (body.spec !== undefined) {
      const specErrors = validateSpec(body.spec as QuestionnaireSpec);
      if (specErrors.length > 0) {
        throw new ValidationError('spec invalid', specErrors.map((e) => ({ field: 'spec', message: e })));
      }
    }

    return this.prisma.questionnaire.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined && { name: String(body.name) }),
        ...(body.description !== undefined && {
          description: body.description === null ? null : String(body.description),
        }),
        ...(body.spec !== undefined && { spec: body.spec as Prisma.InputJsonValue }),
        ...(body.on_submit_actions !== undefined && {
          on_submit_actions: body.on_submit_actions as Prisma.InputJsonValue,
        }),
        ...(body.liff_url !== undefined && {
          liff_url: body.liff_url === null ? null : String(body.liff_url),
        }),
        ...(body.is_active !== undefined && { is_active: Boolean(body.is_active) }),
      },
    });
  }

  async delete(productId: string, key: string) {
    const existing = await this.getByKey(productId, key);
    await this.prisma.questionnaire.delete({ where: { id: existing.id } });
    return { success: true };
  }

  // ─── Public: spec fetch ─────────────────────────────────────────

  /** What LIFF / vibe-coded pages call to render. Only active
   *  questionnaires are exposed; inactive returns NotFound to prevent
   *  fishing for unpublished drafts. */
  async getSpec(productId: string, key: string) {
    const row = await this.prisma.questionnaire.findFirst({
      where: { product_id: productId, key, is_active: true },
      select: { id: true, key: true, name: true, description: true, spec: true, liff_url: true },
    });
    if (!row) throw new NotFoundError(`Questionnaire "${key}" not found or inactive`);
    return row;
  }

  // ─── Submit response ────────────────────────────────────────────

  /** Score + persist + fire hooks. Idempotency is intentionally NOT
   *  enforced — `可多次填答 但也是有多比record` per the design. Each
   *  POST creates a new row.
   *
   *  Anonymous fallback: if no user_id is in the auth context, the
   *  client may send `anonymous_id` in the body. One or the other must
   *  exist (DB CHECK enforces it). */
  async submitResponse(
    productId: string,
    key: string,
    userId: string | null,
    body: Record<string, unknown>,
  ) {
    const row = await this.prisma.questionnaire.findFirst({
      where: { product_id: productId, key, is_active: true },
    });
    if (!row) throw new NotFoundError(`Questionnaire "${key}" not found or inactive`);

    const answers = (body.answers ?? {}) as Answers;
    if (typeof answers !== 'object' || answers === null) {
      throw new ValidationError('answers must be an object', [
        { field: 'answers', message: 'must be an object keyed by question id' },
      ]);
    }

    const anonymousId = typeof body.anonymous_id === 'string' ? body.anonymous_id : null;
    if (!userId && !anonymousId) {
      throw new ValidationError('identity required', [
        { field: 'anonymous_id', message: 'either authenticate (LIFF) or send anonymous_id' },
      ]);
    }

    // Score the submission
    let scores: ReturnType<typeof calculateAll>;
    try {
      scores = calculateAll(row.spec as unknown as QuestionnaireSpec, answers);
    } catch (err) {
      throw new ValidationError('scoring failed', [
        { field: 'spec', message: (err as Error).message },
      ]);
    }

    // Fire on_submit_actions. Only when we have a real user — anonymous
    // submissions skip hooks since the platform state (attributes /
    // missions / journey) is user-scoped.
    const triggeredActions: Array<{ type: string; ok: boolean; reason?: string }> = [];
    const actions = Array.isArray(row.on_submit_actions)
      ? (row.on_submit_actions as unknown as OnSubmitAction[])
      : [];

    if (userId) {
      for (const action of actions) {
        try {
          await this.runAction(action, userId, productId);
          triggeredActions.push({ type: action.type, ok: true });
        } catch (err) {
          triggeredActions.push({ type: action.type, ok: false, reason: (err as Error).message });
        }
      }
    }

    const saved = await this.prisma.questionnaireResponse.create({
      data: {
        questionnaire_id: row.id,
        user_id: userId,
        anonymous_id: userId ? null : anonymousId,
        answers: answers as unknown as Prisma.InputJsonValue,
        scores: scores.scores as unknown as Prisma.InputJsonValue,
        interpretation: scores.interpretation as unknown as Prisma.InputJsonValue,
        triggered_actions: triggeredActions as unknown as Prisma.InputJsonValue,
        completed_at: new Date(),
      },
    });

    return {
      id: saved.id,
      scores: scores.scores,
      interpretation: scores.interpretation,
      triggered_actions: triggeredActions,
    };
  }

  private async runAction(action: OnSubmitAction, userId: string, productId: string) {
    switch (action.type) {
      case 'set_attribute': {
        if (!action.key) throw new Error('set_attribute requires key');
        await setUserAttributeWithHooks(userId, action.key, action.value ?? null);
        return;
      }
      case 'assign_mission': {
        if (!action.mission_key) throw new Error('assign_mission requires mission_key');
        const tpl = await getMissionTemplateByKey(productId, action.mission_key);
        if (!tpl) throw new Error(`mission_key "${action.mission_key}" not found in product`);
        await assignMission(userId, tpl.id);
        return;
      }
      case 'transition_journey': {
        if (!action.journey_key || !action.phase_key) {
          throw new Error('transition_journey requires journey_key and phase_key');
        }
        await upsertUserJourneyPhase(productId, userId, action.journey_key, action.phase_key);
        return;
      }
      default:
        throw new Error(`Unknown action type: ${(action as { type?: string }).type}`);
    }
  }

  // ─── LIFF user history ──────────────────────────────────────────

  async listMyResponses(productId: string, key: string, userId: string) {
    const row = await this.prisma.questionnaire.findFirst({
      where: { product_id: productId, key },
      select: { id: true },
    });
    if (!row) throw new NotFoundError(`Questionnaire "${key}" not found`);
    return this.prisma.questionnaireResponse.findMany({
      where: { questionnaire_id: row.id, user_id: userId },
      orderBy: { completed_at: 'desc' },
      take: 100,
    });
  }

  // ─── Admin response viewer ──────────────────────────────────────

  async listAllResponses(productId: string, key: string, limit = 100) {
    const row = await this.prisma.questionnaire.findFirst({
      where: { product_id: productId, key },
      select: { id: true },
    });
    if (!row) throw new NotFoundError(`Questionnaire "${key}" not found`);
    return this.prisma.questionnaireResponse.findMany({
      where: { questionnaire_id: row.id },
      orderBy: { completed_at: 'desc' },
      take: Math.min(limit, 500),
      include: {
        user: { select: { id: true, display_name: true } },
      },
    });
  }
}
