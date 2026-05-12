// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/middleware/adminAuth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { getAdminRole } from '../lib/db.js';
import { ForbiddenError, UnauthorizedError } from './errorHandler.js';
import type { AuthenticatedRequest } from '../types/http.js';

type AdminRole = 'admin' | 'superadmin';

/**
 * Fastify 管理員角色驗證中間件
 *
 * 必須在 authenticateUser 之後運行，確保 request.user 已設置
 * 驗證當前用戶是否具有指定的管理員角色
 *
 * @param allowedRoles - 允許的角色列表
 * @returns Fastify 中間件函數
 */
export function requireAdminRole(...allowedRoles: AdminRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authReq = request as AuthenticatedRequest;

    // 確保用戶已認證
    if (!authReq.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    // 獲取用戶的管理員角色
    const role = await getAdminRole(authReq.user.id);

    // 驗證角色
    if (!role || !allowedRoles.includes(role as AdminRole)) {
      throw new ForbiddenError('Access denied: insufficient permissions');
    }

    // 角色驗證通過，繼續處理請求
  };
}

/**
 * 便捷函數：要求用戶必須是管理員（admin 或 superadmin）
 */
export const requireAdmin = () => requireAdminRole('admin', 'superadmin');

/**
 * 便捷函數：要求用戶必須是超級管理員
 */
export const requireSuperAdmin = () => requireAdminRole('superadmin');
