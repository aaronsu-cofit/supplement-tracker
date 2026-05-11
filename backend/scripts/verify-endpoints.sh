#!/bin/bash

# API 端點驗證腳本

BASE_URL="http://localhost:8081"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "開始驗證 API 端點..."

# 測試函數
test_endpoint() {
  local METHOD=$1
  local ENDPOINT=$2
  local EXPECTED_STATUS=$3
  local DATA=$4

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ -n "$DATA" ]; then
    RESPONSE=$(curl -s -w "%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "$DATA" -o /dev/null)
  else
    RESPONSE=$(curl -s -w "%{http_code}" -X $METHOD "$BASE_URL$ENDPOINT" -o /dev/null)
  fi

  STATUS_CODE="$RESPONSE"

  if [ "$STATUS_CODE" = "$EXPECTED_STATUS" ]; then
    echo "✅ $METHOD $ENDPOINT - $STATUS_CODE"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo "❌ $METHOD $ENDPOINT - Expected $EXPECTED_STATUS, Got $STATUS_CODE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 健康檢查端點
echo ""
echo "### 健康檢查端點 ###"
test_endpoint "GET" "/health" "200"

# 認證端點
echo ""
echo "### 認證端點 ###"
test_endpoint "GET" "/api/auth/me" "401"
test_endpoint "POST" "/api/auth/login" "400"  # 缺少必填字段
test_endpoint "POST" "/api/auth/register" "400"  # 缺少必填字段

# 補充品端點
echo ""
echo "### 補充品端點 ###"
test_endpoint "GET" "/api/supplements" "401"
test_endpoint "POST" "/api/supplements" "401"

# 傷口端點
echo ""
echo "### 傷口端點 ###"
test_endpoint "GET" "/api/wounds" "401"

# HQ 管理端點
echo ""
echo "### HQ 管理端點 ###"
test_endpoint "GET" "/api/hq/modules" "401"  # 需要管理員認證

# 其他端點
echo ""
echo "### 其他端點 ###"
test_endpoint "GET" "/api/checkins" "401"
test_endpoint "GET" "/api/modules" "200"  # 公開端點
test_endpoint "GET" "/api/products" "200"  # 公開端點

# 總結
echo ""
echo "=================================="
echo "端點驗證結果："
echo "總計: $TOTAL_TESTS"
echo "✅ 通過: $PASSED_TESTS"
echo "❌ 失敗: $FAILED_TESTS"
echo "=================================="

if [ $FAILED_TESTS -eq 0 ]; then
  exit 0
else
  exit 1
fi
