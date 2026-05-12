#!/bin/bash

# Test script for Fastify MVC Auth endpoints
# Usage: ./scripts/test-fastify.sh

set -e

BASE_URL="${FASTIFY_URL:-http://localhost:8081}"
API_URL="$BASE_URL/api/auth"

echo "🧪 Testing Fastify Auth MVC endpoints"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -e "${YELLOW}1. Testing health check...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi
echo ""

# Test 2: User registration
echo -e "${YELLOW}2. Testing user registration...${NC}"
REGISTER_EMAIL="test-$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$REGISTER_EMAIL\",
    \"password\": \"password123\",
    \"displayName\": \"Test User\"
  }")

echo "Response: $REGISTER_RESPONSE"
if echo "$REGISTER_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Registration passed${NC}"
else
  echo -e "${RED}✗ Registration failed${NC}"
  exit 1
fi
echo ""

# Test 3: User login
echo -e "${YELLOW}3. Testing user login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d "{
    \"email\": \"$REGISTER_EMAIL\",
    \"password\": \"password123\"
  }")

echo "Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Login passed${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo ""

# Test 4: Get authenticated user
echo -e "${YELLOW}4. Testing GET /api/auth/me...${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/me" \
  -b /tmp/cookies.txt)

echo "Response: $ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q "authenticated"; then
  echo -e "${GREEN}✓ Get me passed${NC}"
else
  echo -e "${RED}✗ Get me failed${NC}"
  exit 1
fi
echo ""

# Test 5: Logout
echo -e "${YELLOW}5. Testing logout...${NC}"
LOGOUT_RESPONSE=$(curl -s -X DELETE "$API_URL/me" \
  -b /tmp/cookies.txt)

echo "Response: $LOGOUT_RESPONSE"
if echo "$LOGOUT_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Logout passed${NC}"
else
  echo -e "${RED}✗ Logout failed${NC}"
  exit 1
fi
echo ""

# Test 6: Verify logout (should not be authenticated)
echo -e "${YELLOW}6. Testing authentication after logout...${NC}"
AFTER_LOGOUT_RESPONSE=$(curl -s -X GET "$API_URL/me" \
  -b /tmp/cookies.txt)

echo "Response: $AFTER_LOGOUT_RESPONSE"
if echo "$AFTER_LOGOUT_RESPONSE" | grep -q '"authenticated":false'; then
  echo -e "${GREEN}✓ Logout verification passed${NC}"
else
  echo -e "${RED}✗ Logout verification failed${NC}"
  exit 1
fi
echo ""

# Cleanup
rm -f /tmp/cookies.txt

echo -e "${GREEN}🎉 All tests passed!${NC}"
