#!/bin/bash
# ============================================
# WoundCare V2 — Automated API Test
# Tests: multi-wound CRUD, classification, archive
# ============================================

BASE="http://localhost:3000"
PASS=0
FAIL=0
COOKIE_JAR="/tmp/test_cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
    local label="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} $label (HTTP $actual)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $label — expected $expected, got $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local label="$1" body="$2" pattern="$3"
    if echo "$body" | grep -q "$pattern"; then
        echo -e "${GREEN}✓${NC} $label"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $label — pattern '$pattern' not found"
        echo "  Body: ${body:0:200}"
        FAIL=$((FAIL + 1))
    fi
}

echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  WoundCare V2 Automated Test Suite${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

# ---- 0. Register test user & get auth cookie ----
echo -e "${YELLOW}▸ 0. Auth Setup${NC}"
RAND=$RANDOM
EMAIL="v2test${RAND}@test.com"

STATUS=$(curl -s -o /tmp/test_register.json -w "%{http_code}" -c "$COOKIE_JAR" \
    -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"testpass123\",\"displayName\":\"V2Tester\"}")
assert_status "Register test user ($EMAIL)" "200" "$STATUS"

# ---- 1. DB Init (trigger table creation) ----
echo ""
echo -e "${YELLOW}▸ 1. Database Init${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE/api/setup" -X POST)
# Accept 200 or 201
if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    echo -e "${GREEN}✓${NC} DB initialized (HTTP $STATUS)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} DB init failed (HTTP $STATUS)"
    FAIL=$((FAIL + 1))
fi

# ---- 2. Create Wound 1 (with type + location) ----
echo ""
echo -e "${YELLOW}▸ 2. Create Wounds${NC}"
BODY=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE/api/wounds" \
    -H "Content-Type: application/json" \
    -d '{"name":"左膝擦傷","wound_type":"laceration","body_location":"left_leg","date_of_injury":"2026-02-25"}')
STATUS=$?
assert_contains "Wound 1 created" "$BODY" '"id"'
assert_contains "Wound 1 has name" "$BODY" '左膝擦傷'
WOUND1_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "  → Wound 1 ID: $WOUND1_ID"

# Create Wound 2
BODY2=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE/api/wounds" \
    -H "Content-Type: application/json" \
    -d '{"name":"手臂手術","wound_type":"surgical","body_location":"right_arm","date_of_injury":"2026-02-20"}')
assert_contains "Wound 2 created" "$BODY2" '"id"'
WOUND2_ID=$(echo "$BODY2" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "  → Wound 2 ID: $WOUND2_ID"

# ---- 3. List Wounds (should see 2) ----
echo ""
echo -e "${YELLOW}▸ 3. List Active Wounds${NC}"
LIST=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds")
assert_contains "List contains wound 1" "$LIST" "$WOUND1_ID"
assert_contains "List contains wound 2" "$LIST" "$WOUND2_ID"

# Count wounds
WOUND_COUNT=$(echo "$LIST" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$WOUND_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} Wound count >= 2 ($WOUND_COUNT wounds)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} Expected >= 2 wounds, got $WOUND_COUNT"
    FAIL=$((FAIL + 1))
fi

# ---- 4. Get Single Wound ----
echo ""
echo -e "${YELLOW}▸ 4. Get Single Wound${NC}"
SINGLE=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds/$WOUND1_ID")
assert_contains "Single wound has name" "$SINGLE" '左膝擦傷'
assert_contains "Single wound has wound_type" "$SINGLE" 'laceration'
assert_contains "Single wound has body_location" "$SINGLE" 'left_leg'

# ---- 4.5. Edit Wound ----
echo ""
echo -e "${YELLOW}▸ 4.5 Edit Wound${NC}"
EDIT_RES=$(curl -s -b "$COOKIE_JAR" \
    -X PATCH "$BASE/api/wounds/$WOUND1_ID" \
    -H "Content-Type: application/json" \
    -d '{"name":"左膝擦傷(已更新)","wound_type":"surgical","body_location":"right_leg","date_of_injury":"2026-02-24"}')
assert_contains "Edit response success" "$EDIT_RES" '"success":true'

EDITED=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds/$WOUND1_ID")
assert_contains "Edited name" "$EDITED" '已更新'
assert_contains "Edited wound_type" "$EDITED" 'surgical'
assert_contains "Edited body_location" "$EDITED" 'right_leg'

# ---- 5. Create Log for Wound 1 ----
echo ""
echo -e "${YELLOW}▸ 5. Create Wound Logs${NC}"
LOG_BODY=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE/api/wounds/$WOUND1_ID/logs" \
    -H "Content-Type: application/json" \
    -d '{"nrs_pain_score":3,"symptoms":"皆無","ai_assessment_summary":"傷口復原良好","ai_status_label":"復原進度符合預期"}')
assert_contains "Log created for wound 1" "$LOG_BODY" '"id"'

# Create log for Wound 2
LOG_BODY2=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE/api/wounds/$WOUND2_ID/logs" \
    -H "Content-Type: application/json" \
    -d '{"nrs_pain_score":6,"symptoms":"局部發熱,邊緣紅腫","ai_assessment_summary":"手術傷口需密切觀察","ai_status_label":"需多加留意觀察"}')
assert_contains "Log created for wound 2" "$LOG_BODY2" '"id"'

# ---- 6. Get Logs (independent per wound) ----
echo ""
echo -e "${YELLOW}▸ 6. Independent Logs Per Wound${NC}"
LOGS1=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds/$WOUND1_ID/logs")
assert_contains "Wound 1 logs have NRS 3" "$LOGS1" '"nrs_pain_score":3'

LOGS2=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds/$WOUND2_ID/logs")
assert_contains "Wound 2 logs have NRS 6" "$LOGS2" '"nrs_pain_score":6'

# Verify logs are independent — wound 1 should NOT have wound 2's data
if echo "$LOGS1" | grep -q '手術傷口需密切觀察'; then
    echo -e "${RED}✗${NC} Wound 1 logs leaked wound 2 data!"
    FAIL=$((FAIL + 1))
else
    echo -e "${GREEN}✓${NC} Logs are properly isolated between wounds"
    PASS=$((PASS + 1))
fi

# ---- 7. Archive Wound 2 ----
echo ""
echo -e "${YELLOW}▸ 7. Archive Wound${NC}"
ARCHIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
    -X DELETE "$BASE/api/wounds/$WOUND2_ID")
assert_status "Archive wound 2" "200" "$ARCHIVE_STATUS"

# List should now only have wound 1
LIST_AFTER=$(curl -s -b "$COOKIE_JAR" "$BASE/api/wounds")
# Use python for exact ID matching to avoid grep substring issues
ARCHIVED_GONE=$(echo "$LIST_AFTER" | python3 -c "
import sys, json
wounds = json.load(sys.stdin)
ids = [w['id'] for w in wounds]
print('gone' if $WOUND2_ID not in ids else 'present')
" 2>/dev/null || echo "present")
if [ "$ARCHIVED_GONE" = "gone" ]; then
    echo -e "${GREEN}✓${NC} Archived wound removed from active list"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} Archived wound still appears in list!"
    FAIL=$((FAIL + 1))
fi
assert_contains "Wound 1 still in list" "$LIST_AFTER" "$WOUND1_ID"

# ---- 8. Frontend Pages (HTTP check) ----
echo ""
echo -e "${YELLOW}▸ 8. Frontend Pages Render${NC}"
for path in "/wounds" "/wounds/create" "/wounds/$WOUND1_ID" "/wounds/$WOUND1_ID/scan" "/wounds/$WOUND1_ID/history"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE$path")
    assert_status "GET $path" "200" "$STATUS"
done

# ---- Summary ----
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}  ALL $TOTAL TESTS PASSED ✓${NC}"
else
    echo -e "${RED}  $FAIL/$TOTAL TESTS FAILED${NC}"
fi
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"

# Cleanup
rm -f "$COOKIE_JAR" /tmp/test_register.json

exit $FAIL
