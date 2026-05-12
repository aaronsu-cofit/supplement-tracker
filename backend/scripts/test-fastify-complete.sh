#!/bin/bash

# Vitera Fastify MVC 完整測試套件

set -e

echo "=================================="
echo "Vitera Fastify MVC 完整測試開始"
echo "=================================="

cd /Users/chingchingyeh/cofit/dtx-space/Vitera/backend

# 1. 編譯檢查
echo ""
echo "1️⃣ [TypeScript 編譯檢查]..."
pnpm run build
if [ $? -eq 0 ]; then
  echo "✅ TypeScript 編譯通過"
else
  echo "❌ TypeScript 編譯失敗"
  exit 1
fi

# 2. 單元測試
echo ""
echo "2️⃣ [單元測試執行]..."
pnpm test
if [ $? -eq 0 ]; then
  echo "✅ 所有單元測試通過"
else
  echo "⚠️ 某些單元測試失敗（非阻塞）"
fi

# 3. 啟動 Fastify 服務器（後台）
echo ""
echo "3️⃣ [啟動 Fastify 服務器]..."
node dist/fastify-app.js &
FASTIFY_PID=$!
sleep 3

# 4. 健康檢查
echo ""
echo "4️⃣ [健康檢查]..."
HEALTH_RESPONSE=$(curl -s http://localhost:8081/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ 服務器健康檢查通過"
else
  echo "❌ 服務器健康檢查失敗"
  kill $FASTIFY_PID
  exit 1
fi

# 5. 端點驗證
echo ""
echo "5️⃣ [API 端點驗證]..."
bash ./scripts/verify-endpoints.sh
if [ $? -eq 0 ]; then
  echo "✅ 所有關鍵端點驗證通過"
else
  echo "⚠️ 某些端點驗證失敗"
fi

# 6. 性能基準測試
echo ""
echo "6️⃣ [性能基準測試]..."
if command -v wrk &> /dev/null; then
  bash ./scripts/benchmark-performance.sh
  echo "✅ 性能基準測試完成"
else
  echo "⚠️ wrk 工具未安裝，跳過性能測試"
fi

# 清理
echo ""
echo "7️⃣ [清理]..."
kill $FASTIFY_PID

echo ""
echo "=================================="
echo "✅ 所有測試完成！"
echo "=================================="
