#!/bin/bash

# Vitera Backend - 中間件層驗證腳本
# 用於驗證 Task 3 完成情況

echo "=========================================="
echo "Vitera Backend - 中間件層驗證"
echo "=========================================="
echo ""

# 檢查文件是否存在
echo "1️⃣  檢查核心文件..."
FILES=(
  "auth.middleware.ts"
  "errorHandler.ts"
  "logger.ts"
  "__tests__/middleware.test.ts"
  "README.md"
  "examples.ts"
  "TASK3_COMPLETION.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file (缺失)"
  fi
done

echo ""
echo "2️⃣  統計代碼行數..."
echo "   auth.middleware.ts: $(wc -l < auth.middleware.ts) 行"
echo "   errorHandler.ts: $(wc -l < errorHandler.ts) 行"
echo "   logger.ts: $(wc -l < logger.ts) 行"
echo "   測試文件: $(wc -l < __tests__/middleware.test.ts) 行"

echo ""
echo "3️⃣  檢查類型導入..."
grep -q "FastifyRequest.*FastifyReply" auth.middleware.ts && echo "   ✅ auth.middleware.ts 導入正確" || echo "   ❌ auth.middleware.ts 導入錯誤"
grep -q "FastifyInstance.*FastifyError" errorHandler.ts && echo "   ✅ errorHandler.ts 導入正確" || echo "   ❌ errorHandler.ts 導入錯誤"
grep -q "FastifyInstance" logger.ts && echo "   ✅ logger.ts 導入正確" || echo "   ❌ logger.ts 導入錯誤"

echo ""
echo "4️⃣  檢查導出函數..."
grep -q "export async function authMiddleware" auth.middleware.ts && echo "   ✅ authMiddleware 已導出" || echo "   ❌ authMiddleware 未導出"
grep -q "export async function requireAuthMiddleware" auth.middleware.ts && echo "   ✅ requireAuthMiddleware 已導出" || echo "   ❌ requireAuthMiddleware 未導出"
grep -q "export async function softAuthMiddleware" auth.middleware.ts && echo "   ✅ softAuthMiddleware 已導出" || echo "   ❌ softAuthMiddleware 未導出"
grep -q "export function registerErrorHandler" errorHandler.ts && echo "   ✅ registerErrorHandler 已導出" || echo "   ❌ registerErrorHandler 未導出"
grep -q "export function registerLoggerMiddleware" logger.ts && echo "   ✅ registerLoggerMiddleware 已導出" || echo "   ❌ registerLoggerMiddleware 未導出"

echo ""
echo "5️⃣  檢查錯誤類..."
ERRORS=(
  "ValidationError"
  "NotFoundError"
  "UnauthorizedError"
  "ForbiddenError"
  "ConflictError"
  "BadRequestError"
)

for error in "${ERRORS[@]}"; do
  grep -q "export class $error" errorHandler.ts && echo "   ✅ $error 已定義" || echo "   ❌ $error 未定義"
done

echo ""
echo "=========================================="
echo "驗證完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 執行 TypeScript 編譯: pnpm run build"
echo "2. 執行單元測試: pnpm test"
echo "3. 查看文檔: cat README.md"
echo "4. 查看示例: cat examples.ts"
echo ""
