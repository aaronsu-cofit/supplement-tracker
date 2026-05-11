// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/ai.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * AIService - 業務邏輯層
 * 責任：
 * - AI Skill 執行（run, stream）
 * - 數據驗證和業務規則
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
    // 驗證 agent_id
    if (!agentId || typeof agentId !== 'string') {
      throw new ValidationError('agent_id is required', [
        { field: 'agent_id', message: 'agent_id must be a non-empty string' },
      ]);
    }

    const { adkRun } = await import('../lib/adk.js');
    return adkRun(agentId, userId);
  }

  /**
   * SSE 串流執行 AI Skill（LIFF 用）
   * @param agentId - Agent ID
   * @param userId - 用戶 ID
   * @returns SSE 串流響應
   */
  async streamAI(agentId: string, userId: string) {
    // 驗證 agent_id
    if (!agentId || typeof agentId !== 'string') {
      throw new ValidationError('agent_id is required', [
        { field: 'agent_id', message: 'agent_id must be a non-empty string' },
      ]);
    }

    const { adkStream } = await import('../lib/adk.js');
    return adkStream(agentId, userId);
  }
}
