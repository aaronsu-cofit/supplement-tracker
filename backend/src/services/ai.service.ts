// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/ai.service.ts
import { PrismaClient } from '@prisma/client';
import { adkRun, adkStream } from '../lib/adk.js';

/**
 * AIService - 業務邏輯層
 * 責任：
 * - AI Skill 執行（run, stream）
 * - 與 ADK 交互
 */
export class AIService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 同步執行 AI Skill（LINE 聊天室用）
   * @param agentId - Agent ID
   * @param userId - 用戶 ID
   * @returns AI 執行結果
   */
  async runAI(agentId: string, userId: string) {
    return adkRun(agentId, userId);
  }

  /**
   * SSE 串流執行 AI Skill（LIFF 用）
   * @param agentId - Agent ID
   * @param userId - 用戶 ID
   * @returns SSE 串流響應
   */
  async streamAI(agentId: string, userId: string) {
    return adkStream(agentId, userId);
  }
}
