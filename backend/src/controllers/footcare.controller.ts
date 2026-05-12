// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/footcare.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { FootcareService } from '../services/footcare.service.js';
import type {
  CreateFootAssessmentInput,
  CreateFootImageInput,
  CreateShoeImageInput,
} from '../types.js';

export class FootcareController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private footcareService: FootcareService,
  ) {
    super(request, reply);
  }

  async getAssessments() {
    const userId = this.getUserId();
    const assessments = await this.footcareService.getAssessments(userId);
    return this.sendSuccess(assessments);
  }

  async createAssessment() {
    const userId = this.getUserId();
    const body = (await this.request.body) as CreateFootAssessmentInput;
    const assessment = await this.footcareService.createAssessment(userId, body);
    this.reply.code(201);
    return this.sendSuccess(assessment);
  }

  async getFootImages() {
    const userId = this.getUserId();
    const images = await this.footcareService.getFootImages(userId);
    return this.sendSuccess(images);
  }

  async createFootImage() {
    const userId = this.getUserId();
    const body = (await this.request.body) as CreateFootImageInput;
    const image = await this.footcareService.createFootImage(userId, body);
    this.reply.code(201);
    return this.sendSuccess(image);
  }

  async getShoeImages() {
    const userId = this.getUserId();
    const images = await this.footcareService.getShoeImages(userId);
    return this.sendSuccess(images);
  }

  async createShoeImage() {
    const userId = this.getUserId();
    const body = (await this.request.body) as CreateShoeImageInput;
    const image = await this.footcareService.createShoeImage(userId, body);
    this.reply.code(201);
    return this.sendSuccess(image);
  }
}
