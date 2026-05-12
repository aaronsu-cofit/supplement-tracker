#!/bin/bash

# 性能基準測試腳本（需要 wrk 工具）

echo "開始性能基準測試..."
echo ""

BASE_URL="http://localhost:8081"

# 測試健康檢查端點
echo "📊 健康檢查端點 (GET /health)"
wrk -t4 -c100 -d10s "$BASE_URL/health"
echo ""

# 測試模組列表端點（公開端點）
echo "📊 模組列表端點 (GET /api/modules)"
wrk -t4 -c100 -d10s "$BASE_URL/api/modules"
echo ""

# 測試產品列表端點（公開端點）
echo "📊 產品列表端點 (GET /api/products)"
wrk -t4 -c100 -d10s "$BASE_URL/api/products"
echo ""

echo "✅ 性能基準測試完成"
echo ""
echo "📝 測試說明："
echo "  -t4: 使用 4 個線程"
echo "  -c100: 維持 100 個 HTTP 連接"
echo "  -d10s: 測試持續 10 秒"
echo ""
echo "📊 關鍵指標："
echo "  - Requests/sec: 吞吐量（越高越好）"
echo "  - Latency: 平均延遲（越低越好）"
echo "  - 99%ile: P99 延遲（越低越好）"
