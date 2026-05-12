import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { ProductsService } from '../services/products.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../middleware/errorHandler.js';

const KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;

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
    try {
      const rows = await this.productsService.getAllProducts();
      return { products: rows };
    } catch (error) {
      this.logError('[Products /getAllProducts]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch products' });
    }
  }

  async getProductById(id: string) {
    try {
      const product = await this.productsService.getProductById(id);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      return { product };
    } catch (error) {
      this.logError('[Products /getProductById]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch product' });
    }
  }

  async createProduct(body: any) {
    const { name, description } = body;
    if (!name || typeof name !== 'string') {
      return this.reply.code(400).send({ error: '請提供 name' });
    }
    try {
      const product = await this.productsService.createProduct({ name, description });
      return this.reply.code(201).send({ product });
    } catch (error) {
      this.logError('[Products /createProduct]', error);
      return this.reply.code(500).send({ error: 'Failed to create product' });
    }
  }

  async updateProduct(id: string, body: any) {
    try {
      const product = await this.productsService.updateProduct(id, body);
      return { product };
    } catch (error: any) {
      this.logError('[Products /updateProduct]', error);
      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }
      return this.reply.code(500).send({ error: 'Failed to update product' });
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.productsService.deleteProduct(id);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteProduct]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete product' });
    }
  }

  // ─── Seed ───────────────────────────────────────────────────

  async seedProduct(productId: string, body: any) {
    try {
      const templateKey = body?.template ?? 'wellness_21d';
      const result = await this.productsService.seedProduct(productId, templateKey);
      return result;
    } catch (error: any) {
      this.logError('[Products /seedProduct]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof BadRequestError) {
        return this.reply.code(400).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to seed product' });
    }
  }

  async getSeedTemplates() {
    try {
      return this.productsService.getSeedTemplateList();
    } catch (error) {
      this.logError('[Products /getSeedTemplates]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch seed templates' });
    }
  }

  // ─── Content Items ──────────────────────────────────────────

  async getContentItems(productId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const items = await this.productsService.getContentItemsForProduct(productId);
      return { items };
    } catch (error) {
      this.logError('[Products /getContentItems]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch content items' });
    }
  }

  async createContentItem(productId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      if (!body.key || typeof body.key !== 'string') {
        return this.reply.code(400).send({ error: '請提供 key' });
      }
      if (!KEY_REGEX.test(body.key)) {
        return this.reply.code(400).send({ error: 'key 只能包含英數、點、底線、連字號，開頭需為英數' });
      }
      const item = await this.productsService.createContentItem(productId, {
        key: body.key,
        type: body.type,
        title: body.title,
        body: body.body,
        metadata: body.metadata,
      });
      return this.reply.code(201).send({ item });
    } catch (error: any) {
      this.logError('[Products /createContentItem]', error);
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to create content item' });
    }
  }

  async updateContentItem(productId: string, contentId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const belongsToProduct = await this.productsService.verifyContentItemBelongsToProduct(contentId, productId);
      if (!belongsToProduct) {
        return this.reply.code(404).send({ error: '找不到此內容' });
      }
      if (body.key && !KEY_REGEX.test(body.key)) {
        return this.reply.code(400).send({ error: 'key 格式不合法' });
      }
      const item = await this.productsService.updateContentItem(contentId, body);
      return { item };
    } catch (error: any) {
      this.logError('[Products /updateContentItem]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to update content item' });
    }
  }

  async deleteContentItem(productId: string, contentId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const belongsToProduct = await this.productsService.verifyContentItemBelongsToProduct(contentId, productId);
      if (!belongsToProduct) {
        return this.reply.code(404).send({ error: '找不到此內容' });
      }
      await this.productsService.deleteContentItem(contentId);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteContentItem]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete content item' });
    }
  }

  // ─── Missions ───────────────────────────────────────────────

  async getMissions(productId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const missions = await this.productsService.getMissionTemplatesForProduct(productId);
      return { missions };
    } catch (error) {
      this.logError('[Products /getMissions]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch missions' });
    }
  }

  async createMission(productId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateMissionPayload(body, true);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
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
    } catch (error: any) {
      this.logError('[Products /createMission]', error);
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to create mission' });
    }
  }

  async updateMission(productId: string, missionId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateMissionPayload(body, false);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const mission = await this.productsService.updateMissionTemplate(missionId, body);
      return { mission };
    } catch (error: any) {
      this.logError('[Products /updateMission]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to update mission' });
    }
  }

  async deleteMission(productId: string, missionId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      await this.productsService.deleteMissionTemplate(missionId);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteMission]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete mission' });
    }
  }

  // ─── Badges ─────────────────────────────────────────────────

  async getBadges(productId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const badges = await this.productsService.getBadgeTemplatesForProduct(productId);
      return { badges };
    } catch (error) {
      this.logError('[Products /getBadges]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch badges' });
    }
  }

  async createBadge(productId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateBadgePayload(body, true);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const badge = await this.productsService.createBadgeTemplate(productId, {
        key: body.key,
        name: body.name,
        icon: body.icon,
        criteria: body.criteria,
        notify_content_key: body.notify_content_key,
      });
      return this.reply.code(201).send({ badge });
    } catch (error: any) {
      this.logError('[Products /createBadge]', error);
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to create badge' });
    }
  }

  async updateBadge(productId: string, badgeId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateBadgePayload(body, false);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const badge = await this.productsService.updateBadgeTemplate(badgeId, body);
      return { badge };
    } catch (error: any) {
      this.logError('[Products /updateBadge]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to update badge' });
    }
  }

  async deleteBadge(productId: string, badgeId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      await this.productsService.deleteBadgeTemplate(badgeId);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteBadge]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete badge' });
    }
  }

  // ─── Journeys ───────────────────────────────────────────────

  async getJourneys(productId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const journeys = await this.productsService.getJourneyTemplatesForProduct(productId);
      return { journeys };
    } catch (error) {
      this.logError('[Products /getJourneys]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch journeys' });
    }
  }

  async createJourney(productId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateJourneyPayload(body, true);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const journey = await this.productsService.createJourneyTemplate(productId, {
        key: body.key,
        name: body.name,
        phases: body.phases,
        transitions: body.transitions,
      });
      return this.reply.code(201).send({ journey });
    } catch (error: any) {
      this.logError('[Products /createJourney]', error);
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to create journey' });
    }
  }

  async updateJourney(productId: string, journeyId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateJourneyPayload(body, false);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const journey = await this.productsService.updateJourneyTemplate(journeyId, body);
      return { journey };
    } catch (error: any) {
      this.logError('[Products /updateJourney]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to update journey' });
    }
  }

  async deleteJourney(productId: string, journeyId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      await this.productsService.deleteJourneyTemplate(journeyId);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteJourney]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete journey' });
    }
  }

  // ─── Intent Rules ───────────────────────────────────────────

  async getIntentRules(productId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const rules = await this.productsService.getIntentRulesForProduct(productId);
      return { rules };
    } catch (error) {
      this.logError('[Products /getIntentRules]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch intent rules' });
    }
  }

  async createIntentRule(productId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateIntentRuleInput(body, true);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const rule = await this.productsService.createIntentRule(productId, body);
      return this.reply.code(201).send({ rule });
    } catch (error: any) {
      this.logError('[Products /createIntentRule]', error);
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to create intent rule' });
    }
  }

  async updateIntentRule(productId: string, ruleId: string, body: any) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      const validationError = this.productsService.validateIntentRuleInput(body, false);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }
      const rule = await this.productsService.updateIntentRule(ruleId, body);
      return { rule };
    } catch (error: any) {
      this.logError('[Products /updateIntentRule]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return this.reply.code(409).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to update intent rule' });
    }
  }

  async deleteIntentRule(productId: string, ruleId: string) {
    try {
      const product = await this.productsService.getProductById(productId);
      if (!product) {
        return this.reply.code(404).send({ error: '找不到此 Product' });
      }
      await this.productsService.deleteIntentRule(ruleId);
      return { success: true };
    } catch (error: any) {
      this.logError('[Products /deleteIntentRule]', error);
      if (error instanceof NotFoundError) {
        return this.reply.code(404).send({ error: error.message });
      }
      return this.reply.code(500).send({ error: 'Failed to delete intent rule' });
    }
  }
}
