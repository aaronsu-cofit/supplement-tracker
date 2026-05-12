import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { RichmenuService } from '../services/richmenu.service.js';
import { BadRequestError, ServiceUnavailableError } from '../middleware/errorHandler.js';

export class RichmenuController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private richmenuService: RichmenuService,
  ) {
    super(request, reply);
  }

  /**
   * Extract and validate image file from multipart form data
   */
  private async extractImageFile(): Promise<File | null> {
    try {
      const formData = await this.request.formData();
      const imageFile = formData.get('image');

      // Validate: must be a File object, not a string
      if (!imageFile || typeof imageFile === 'string') {
        return null;
      }

      return imageFile as File;
    } catch (error) {
      throw new BadRequestError('無法解析表單資料，請確認圖片已正確上傳');
    }
  }

  async deployMainMenu() {
    try {
      const imageFile = await this.extractImageFile();
      if (!imageFile) {
        this.reply.code(400);
        return { success: false, error: '未提供圖片檔案' };
      }

      const result = await this.richmenuService.deployMainMenu(imageFile);
      return result;
    } catch (error: any) {
      this.logError('[Richmenu /deployMainMenu]', error);
      console.error('Rich menu deploy error:', error);

      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { success: false, error: error.message };
      }

      if (error instanceof ServiceUnavailableError) {
        this.reply.code(503);
        return { success: false, error: error.message };
      }

      this.reply.code(500);
      return { success: false, error: '部署失敗', details: (error as Error).message };
    }
  }

  async deployWoundsMenu() {
    try {
      const imageFile = await this.extractImageFile();
      if (!imageFile) {
        this.reply.code(400);
        return { success: false, error: '未提供圖片檔案' };
      }

      const result = await this.richmenuService.deployWoundsMenu(imageFile);
      return result;
    } catch (error: any) {
      this.logError('[Richmenu /deployWoundsMenu]', error);
      console.error('Rich menu deploy error:', error);

      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { success: false, error: error.message };
      }

      if (error instanceof ServiceUnavailableError) {
        this.reply.code(503);
        return { success: false, error: error.message };
      }

      this.reply.code(500);
      return { success: false, error: '部署失敗', details: (error as Error).message };
    }
  }
}
