import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { ProductsService } from '../services/products.service.js';

/**
 * Products Controller - HTTP Request Handlers
 * Handles all product-related API endpoints
 */
export class ProductsController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private productsService: ProductsService,
  ) {
    super(request, reply);
  }

  // ─── Product CRUD ───────────────────────────────────────────

  async getAllProducts() {
    const rows = await this.productsService.getAllProducts();
    return { products: rows };
  }

  async getProductById(id: string) {
    const product = await this.productsService.getProductById(id);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    return { product };
  }

  async createProduct(body: any) {
    const { name, description } = body;
    if (!name || typeof name !== 'string') {
      return this.reply.code(400).send({ error: '請提供 name' });
    }
    const product = await this.productsService.createProduct({ name, description });
    return this.reply.code(201).send({ product });
  }

  async updateProduct(id: string, body: any) {
    try {
      const product = await this.productsService.updateProduct(id, body);
      return { product };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      throw e;
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.productsService.deleteProduct(id);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      throw e;
    }
  }

  // ─── Seed ───────────────────────────────────────────────────

  async seedProduct(productId: string, body: any) {
    try {
      const templateKey = body?.template ?? 'wellness_21d';
      const result = await this.productsService.seedProduct(productId, templateKey);
      return result;
    } catch (e: any) {
      if (e.message.includes('找不到')) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      if (e.message.includes('未知的範本')) {
        return this.reply.code(400).send({ error: e.message });
      }
      throw e;
    }
  }

  async getSeedTemplates() {
    return this.productsService.getSeedTemplateList();
  }

  // ─── Content Items ──────────────────────────────────────────

  async getContentItems(productId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const items = await this.productsService.getContentItemsForProduct(productId);
    return { items };
  }

  async createContentItem(productId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    if (!body.key || typeof body.key !== 'string') {
      return this.reply.code(400).send({ error: '請提供 key' });
    }
    try {
      const item = await this.productsService.createContentItem(productId, {
        key: body.key,
        type: body.type,
        title: body.title,
        body: body.body,
        metadata: body.metadata,
      });
      return this.reply.code(201).send({ item });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 key 已存在' });
      }
      throw e;
    }
  }

  async updateContentItem(productId: string, contentId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const belongsToProduct = await this.productsService.verifyContentItemBelongsToProduct(contentId, productId);
    if (!belongsToProduct) {
      return this.reply.code(404).send({ error: '找不到此內容' });
    }
    try {
      const item = await this.productsService.updateContentItem(contentId, body);
      return { item };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此內容' });
      }
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 key 已存在' });
      }
      throw e;
    }
  }

  async deleteContentItem(productId: string, contentId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const belongsToProduct = await this.productsService.verifyContentItemBelongsToProduct(contentId, productId);
    if (!belongsToProduct) {
      return this.reply.code(404).send({ error: '找不到此內容' });
    }
    try {
      await this.productsService.deleteContentItem(contentId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此內容' });
      }
      throw e;
    }
  }

  // ─── Missions ───────────────────────────────────────────────

  async getMissions(productId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const missions = await this.productsService.getMissionTemplatesForProduct(productId);
    return { missions };
  }

  async createMission(productId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateMissionPayload(body, true);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const mission = await this.productsService.createMissionTemplate(productId, {
        key: body.key,
        name: body.name,
        description: body.description,
        progress_target: body.progress_target,
        auto_complete_on_attribute: body.auto_complete_on_attribute,
        on_complete_actions: body.on_complete_actions,
        notify_content_key: body.notify_content_key,
        mission_type: body.mission_type,
        frequency: body.frequency,
        daily_target: body.daily_target,
        unit: body.unit,
        step_value: body.step_value,
        subtasks: body.subtasks,
        category: body.category,
        action_url: body.action_url,
        reminder: body.reminder,
      });
      return this.reply.code(201).send({ mission });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 mission key 已存在' });
      }
      throw e;
    }
  }

  async updateMission(productId: string, missionId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateMissionPayload(body, false);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const mission = await this.productsService.updateMissionTemplate(missionId, body);
      return { mission };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Mission' });
      }
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 mission key 已存在' });
      }
      throw e;
    }
  }

  async deleteMission(productId: string, missionId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    try {
      await this.productsService.deleteMissionTemplate(missionId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Mission' });
      }
      throw e;
    }
  }

  // ─── Badges ─────────────────────────────────────────────────

  async getBadges(productId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const badges = await this.productsService.getBadgeTemplatesForProduct(productId);
    return { badges };
  }

  async createBadge(productId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateBadgePayload(body, true);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const badge = await this.productsService.createBadgeTemplate(productId, {
        key: body.key,
        name: body.name,
        icon: body.icon,
        criteria: body.criteria,
        notify_content_key: body.notify_content_key,
      });
      return this.reply.code(201).send({ badge });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 badge key 已存在' });
      }
      throw e;
    }
  }

  async updateBadge(productId: string, badgeId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateBadgePayload(body, false);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const badge = await this.productsService.updateBadgeTemplate(badgeId, body);
      return { badge };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Badge' });
      }
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 badge key 已存在' });
      }
      throw e;
    }
  }

  async deleteBadge(productId: string, badgeId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    try {
      await this.productsService.deleteBadgeTemplate(badgeId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Badge' });
      }
      throw e;
    }
  }

  // ─── Journeys ───────────────────────────────────────────────

  async getJourneys(productId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const journeys = await this.productsService.getJourneyTemplatesForProduct(productId);
    return { journeys };
  }

  async createJourney(productId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateJourneyPayload(body, true);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const journey = await this.productsService.createJourneyTemplate(productId, {
        key: body.key,
        name: body.name,
        phases: body.phases,
        transitions: body.transitions,
      });
      return this.reply.code(201).send({ journey });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 journey key 已存在' });
      }
      throw e;
    }
  }

  async updateJourney(productId: string, journeyId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateJourneyPayload(body, false);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const journey = await this.productsService.updateJourneyTemplate(journeyId, body);
      return { journey };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Journey' });
      }
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 journey key 已存在' });
      }
      throw e;
    }
  }

  async deleteJourney(productId: string, journeyId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    try {
      await this.productsService.deleteJourneyTemplate(journeyId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Journey' });
      }
      throw e;
    }
  }

  // ─── Intent Rules ───────────────────────────────────────────

  async getIntentRules(productId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const rules = await this.productsService.getIntentRulesForProduct(productId);
    return { rules };
  }

  async createIntentRule(productId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateIntentRuleInput(body, true);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const rule = await this.productsService.createIntentRule(productId, body);
      return this.reply.code(201).send({ rule });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 intent rule key 已存在' });
      }
      throw e;
    }
  }

  async updateIntentRule(productId: string, ruleId: string, body: any) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    const validationError = this.productsService.validateIntentRuleInput(body, false);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }
    try {
      const rule = await this.productsService.updateIntentRule(ruleId, body);
      return { rule };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Intent Rule' });
      }
      if (e?.code === 'P2002') {
        return this.reply.code(409).send({ error: '此 intent rule key 已存在' });
      }
      throw e;
    }
  }

  async deleteIntentRule(productId: string, ruleId: string) {
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      return this.reply.code(404).send({ error: '找不到此 Product' });
    }
    try {
      await this.productsService.deleteIntentRule(ruleId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此 Intent Rule' });
      }
      throw e;
    }
  }
}
