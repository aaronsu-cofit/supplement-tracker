// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/footcare.service.ts
import { PrismaClient } from '@prisma/client';
import {
  getFootAssessments,
  createFootAssessment,
  getFootImages,
  createFootImage,
  getShoeImages,
  createShoeImage,
  initializeDatabase,
} from '../lib/db.js';
import type {
  CreateFootAssessmentInput,
  CreateFootImageInput,
  CreateShoeImageInput,
} from '../types.js';

/**
 * FootcareService - 足部健康管理業務邏輯層
 */
export class FootcareService {
  constructor(private prisma: PrismaClient) {}

  async getAssessments(userId: string) {
    await initializeDatabase();
    return getFootAssessments(userId);
  }

  async createAssessment(userId: string, data: CreateFootAssessmentInput) {
    await initializeDatabase();
    return createFootAssessment(userId, data);
  }

  async getFootImages(userId: string) {
    await initializeDatabase();
    return getFootImages(userId);
  }

  async createFootImage(userId: string, data: CreateFootImageInput) {
    await initializeDatabase();
    return createFootImage(userId, data);
  }

  async getShoeImages(userId: string) {
    await initializeDatabase();
    return getShoeImages(userId);
  }

  async createShoeImage(userId: string, data: CreateShoeImageInput) {
    await initializeDatabase();
    return createShoeImage(userId, data);
  }
}
