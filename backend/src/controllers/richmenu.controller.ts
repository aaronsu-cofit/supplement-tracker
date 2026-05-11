import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { RichmenuService } from '../services/richmenu.service.js';

export class RichmenuController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private richmenuService: RichmenuService,
  ) {
    super(request, reply);
  }

  async deployMainMenu() {
    let formData;
    try {
      // Use type assertion to handle multipart plugin
      const req = this.request as any;
      if (req.file && typeof req.file === 'function') {
        formData = await req.file();
      } else {
        // Fallback: try to get from body
        formData = this.request.body;
      }
    } catch {
      this.reply.code(400);
      return { success: false, error: '無法解析表單資料，請確認圖片已正確上傳' };
    }

    if (!formData) {
      this.reply.code(400);
      return { success: false, error: '未提供圖片檔案' };
    }

    try {
      const result = await this.richmenuService.deployMainMenu(formData as any);
      return this.sendSuccess(result);
    } catch (error) {
      this.reply.code(500);
      return { success: false, error: (error as Error).message };
    }
  }

  async deployWoundsMenu() {
    let formData;
    try {
      // Use type assertion to handle multipart plugin
      const req = this.request as any;
      if (req.file && typeof req.file === 'function') {
        formData = await req.file();
      } else {
        // Fallback: try to get from body
        formData = this.request.body;
      }
    } catch {
      this.reply.code(400);
      return { success: false, error: '無法解析表單資料，請確認圖片已正確上傳' };
    }

    if (!formData) {
      this.reply.code(400);
      return { success: false, error: '未提供圖片檔案' };
    }

    try {
      const result = await this.richmenuService.deployWoundsMenu(formData as any);
      return this.sendSuccess(result);
    } catch (error) {
      this.reply.code(500);
      return { success: false, error: (error as Error).message };
    }
  }
}
