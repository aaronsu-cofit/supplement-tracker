// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/checkins.service.ts
import { PrismaClient } from '@prisma/client';
import { BadRequestError } from '../middleware/errorHandler.js';
import { getCheckIns, createCheckIn, removeCheckIn, getCheckInHistory, getStreak } from '../lib/db.js';

export class CheckinsService {
  constructor(private prisma: PrismaClient) {}

  async getCheckIns(userId: string, date?: string) {
    const today = date || new Date().toISOString().split('T')[0];
    return getCheckIns(userId, today);
  }

  async getStreak(userId: string) {
    return getStreak(userId);
  }

  async getHistory(userId: string, startDate: string, endDate: string) {
    return getCheckInHistory(userId, startDate, endDate);
  }

  async createCheckIn(userId: string, supplementId: number) {
    if (!supplementId) {
      throw new BadRequestError('supplementId is required');
    }
    return createCheckIn(userId, String(supplementId));
  }

  async removeCheckIn(userId: string, supplementId: number, date?: string) {
    return removeCheckIn(userId, String(supplementId), date || new Date().toISOString().split('T')[0]);
  }
}
