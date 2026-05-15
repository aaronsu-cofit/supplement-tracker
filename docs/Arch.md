# Vitera Platform 架構全景圖

本文檔是 Vitera 平台的高層架構概述。詳細文檔請參考 `backend/docs/` 目錄。

Last updated: 2026-05-15

---

## 📊 架構概覽

Vitera 是一個**多產品、多租戶、事件驅動的女性健康管理平台**，包含：
- 🔐 **認證層**: 用戶註冊、LINE 登入、JWT 認證
- 🏥 **健康追蹤層**: 月經週期、補充品、傷口護理、足部健康
- 💬 **LINE OA 層**: 官方帳號、Rich Menu、Webhook 事件
- 🎯 **內容層**: 可復用的文案、規則、任務、徽章、旅程、問卷
- ⏰ **自動化層**: Scheduler、Hook 鏈、菜單評估、AI Agent
- 📊 **分析層**: 消息日誌、事件追蹤、統計數據

---

## 🏗️ 核心系統設計

### 1. HQ Backend (後台管理系統)

**定位**: 完整的管理後台，控制平台的所有配置和用戶狀態。

**主要功能**:
- 管理員管理 (Admin CRUD, 角色控制)
- 用戶管理 (用戶查詢、軟刪除)
- 用戶屬性管理 (鍵值對，支持 Hook 鏈)
- 任務管理 (分配、進度追蹤、放棄)
- 徽章管理 (撤銷)
- 統計數據查詢

**核心機制**: **Hook 鏈** — 設置用戶屬性可自動觸發一系列業務邏輯
```
setUserAttributeWithHooks(userId, life_stage="新手")
  ├─ 設置 user_attributes
  ├─ 自動完成監聽此屬性的任務
  ├─ 執行 on_complete_actions (分配新任務、增加連勝)
  ├─ 評估徽章 (根據連勝或任務完成)
  └─ 評估旅程 (根據屬性、徽章、任務進度轉移階段)
```

**API 路由**: `GET/POST/PATCH /api/hq/*`

**涉及表**: users, admins, user_attributes, mission_assignments, mission_daily_logs, user_streaks, user_badges, user_journey_phases, engagement_events

---

### 2. Scheduler System (自動推播引擎)

**定位**: 每日執行的自動化系統，根據場景定義推送消息、分配任務、設置屬性。

**工作原理**:
```
每日午夜執行 runDailyCycle()
  ├─ 查詢所有 active OAs
  ├─ 對每個 OA:
  │   ├─ 查詢所有 active enrollments
  │   ├─ 對每個 enrollment:
  │   │   ├─ 計算 daysSinceEnrollment (時區感知)
  │   │   ├─ 查詢 scenario 的 Day N 節點
  │   │   ├─ 執行推送、任務、屬性設置等動作
  │   │   └─ 記錄冪等性標記 (messageDelivery)
  │   └─ 重新評估用戶菜單
  └─ 返回統計數據 (sent, skipped, errors)
```

**支持的節點類型**:
- **push-message-node**: 推送訊息 (文字、圖片、Flex)
- **ai-skill-node**: 調用 AI Agent 生成內容
- **mission-assign-node**: 指派任務
- **streak-increment-node**: 增加連勝計數
- **set-attribute-node**: 設置屬性 (可觸發 Hook)
- **menu-change-node**: 切換 LINE Rich Menu

**冪等性**: 使用 messageDelivery 表確保同一節點最多推一次

**API 端點**: `POST /api/scheduler/run`, `POST /api/scheduler/dry-run`, `GET /api/scheduler/activity`

**涉及表**: enrollments, coblocks_scenarios (flow_nodes, flow_edges), message_deliveries, message_log, mission_assignments, user_streaks, user_attributes

---

### 3. Enrollments & Scenarios (場景流程管理)

**定位**: 定義用戶在不同時間點應該收到什麼推播和執行什麼動作。

**核心概念**:
- **Scenario**: 推送場景 = 有向無環圖 (DAG)，由 flow_nodes + flow_edges 組成
- **Enrollment**: 用戶加入場景的記錄，時間基準 (enrolled_at)
- **Day N**: 相對 enrolled_at 的天數（時區感知）

**生命週期**:
```
用戶加好友 (follow event)
  ├─ 建立 User 記錄
  ├─ 評估和分配菜單
  ├─ 批量加入所有 active scenarios
  │   └─ Enrollment(status='active') 被建立
  ├─ 推送歡迎訊息
  └─ Scheduler 每天檢查並執行推播

Day 1, 7, 14, 28... 推播對應的訊息和動作
  └─ 記錄冪等性標記，防止重複推送

用戶完成課程
  └─ Enrollment.status = 'completed'
```

**涉及表**: enrollments, coblocks_scenarios, message_deliveries, message_log, content_items

---

### 4. Multi-Tenant & Multi-Product Architecture

**層級結構**:
```
Product (可復用的配置包)
  ├─ ContentItems (文案、Flex 卡片)
  ├─ IntentRules (文字匹配 → 動作)
  ├─ MissionTemplates (任務定義)
  ├─ BadgeTemplates (徽章定義)
  ├─ JourneyTemplates (旅程定義)
  └─ Questionnaires (問卷模板)
         ↑ (N:N 映射 via oa_products)
         │
    LineOA (LINE 官方帳號)
         ↑ (1:N)
         │
    CoBlocksScenarios (推送場景)
         ├─ Enrollments (用戶加入)
         └─ LineOARichMenuTemplates (菜單定義)
```

**優勢**:
- 一個 Product 可被多個 OA 複用（代碼/配置一次編寫）
- 每個 OA 可綁定多個 Product（用戶可在不同課程間切換）
- UserOaSession 記錄每個用戶在該 OA 的當前 Product 上下文

**涉及表**: products, line_oa, oa_products, user_oa_sessions, content_items, intent_rules, mission_templates, badge_templates, journey_templates

---

## 📋 數據表全景

### 核心用戶管理 (2 表)
| 表 | 用途 |
|----|------|
| **users** | 應用用戶（患者） |
| **admins** | HQ 後台管理員 |

### 健康追蹤 (7 表)
| 表 | 用途 |
|----|------|
| **supplements** | 保健品清單 |
| **check_ins** | 保健品打卡歷史 |
| **wounds** | 傷口管理 |
| **wound_logs** | 傷口護理日誌 |
| **foot_assessments** | 足部評估 |
| **foot_images** | 足部圖像分析 |
| **shoe_images** | 鞋子磨損分析 |

### 月經週期追蹤 (3 表)
| 表 | 用途 |
|----|------|
| **menstrual_cycles** | 週期設定 |
| **periods** | 月經週期記錄 |
| **daily_logs** | 日常症狀日記 |

### 產品配置 (12 表)
| 表 | 用途 |
|----|------|
| **products** | 產品配置包 |
| **line_oa** | LINE 官方帳號 |
| **oa_products** | OA↔Product N:N 映射 |
| **user_oa_sessions** | 用戶當前 Product 上下文 |
| **content_items** | 可復用文案 |
| **intent_rules** | 文字匹配規則 |
| **mission_templates** | 任務模板 |
| **mission_assignments** | 任務實例 |
| **mission_daily_logs** | 習慣型任務日誌 |
| **badge_templates** | 徽章定義 |
| **user_badges** | 用戶獲得的徽章 |
| **journey_templates** | 旅程定義 |

### 用戶參與 (8 表)
| 表 | 用途 |
|----|------|
| **user_attributes** | 動態屬性（鍵值對） |
| **user_streaks** | 連勝計數 |
| **user_journey_phases** | 用戶旅程進度 |
| **mission_assignments** | 任務分配 |
| **user_mission_settings** | 任務個性化設定 |
| **user_badges** | 徽章獲得記錄 |
| **message_logs** | 完整對話日誌 |
| **engagement_events** | 語義事件（intent_matched, badge_earned） |

### 場景與自動化 (6 表)
| 表 | 用途 |
|----|------|
| **coblocks_scenarios** | 推送場景流程圖 |
| **enrollments** | 用戶場景訂閱 |
| **message_deliveries** | 推送冪等性標記 |
| **line_oa_rich_menu_templates** | LINE 菜單模板 |
| **user_menu_assignments** | 用戶分配的菜單 |
| **coblocks_scenarios** | CoBlocks 場景編輯器生成的流程 |

### 其他 (6 表)
| 表 | 用途 |
|----|------|
| **modules** | 系統功能模組 |
| **diary_entries** | 日記記錄 |
| **relief_sessions** | 放鬆會話 |
| **assessment_results** | 評估結果 |
| **questionnaires** | 問卷模板 |
| **questionnaire_responses** | 問卷回答 |

**總計**: 42 個表，支持完整的女性健康生態系統

---

## 🔄 關鍵工作流

### 工作流 1: 用戶加好友 (Follow Event)

```
用戶在 LINE 加好友
  ↓
Webhook 接收 follow event
  ├─ findOrCreateLineUser() → User 表
  ├─ evaluateAndAssignMenu() → UserMenuAssignment
  └─ enrollUserInScenario() (批量)
      └─ for each active scenario:
          └─ Enrollment 建立 (status='active')
  ├─ logInboundLineMessage()
  └─ replyText() → 歡迎訊息
```

### 工作流 2: 用戶收到日推 (Scheduler)

```
每日午夜執行 runDailyCycle()
  ├─ getActiveEnrollmentsForOA()
  ├─ for each enrollment:
  │   ├─ daysSinceEnrollment = 7
  │   ├─ findPushNodesForDay(nodes, edges, 7)
  │   │   └─ query flow_nodes with data.day=7
  │   │   └─ follow edges from day-node to push-message-node
  │   ├─ for each push node:
  │   │   ├─ tryClaimDelivery() → messageDelivery 冪等性
  │   │   ├─ getContentItem(contentKey)
  │   │   ├─ client.pushMessage()
  │   │   └─ logOutboundLineMessage()
  │   └─ ... (mission, streak, attribute 節點)
  └─ evaluateAllActiveUsers() → 菜單重新評估
```

### 工作流 3: HQ 設置用戶屬性 (Hook Chain)

```
PATCH /hq/users/{userId}/attributes/life_stage = "新手"
  ├─ setUserAttributeWithHooks(userId, life_stage, "新手")
  ├─ 設置 user_attributes
  ├─ 查詢監聽此屬性的任務
  │   └─ auto_complete_on_attribute = {key: "life_stage"}
  ├─ 自動完成匹配的任務
  │   ├─ UPDATE mission_assignments SET status='completed'
  │   └─ 執行 on_complete_actions
  │       ├─ assign_mission() → 新任務
  │       └─ increment_streak() → 連勝+1
  ├─ evaluateMissionBadges()
  │   └─ criteria = {type: "mission_completed", mission_key: "intro"}
  │   └─ awardBadge() if criteria met
  ├─ evaluateJourneys()
  │   └─ 根據 transitions 觸發條件更新 user_journey_phases
  └─ logEngagementEvent('attribute_set', ...)
```

### 工作流 4: Webhook 文字匹配 (Intent Rule)

```
用戶發送「月經來了」
  ↓
Webhook 接收 message event
  ├─ 查詢 product 的 intent_rules (按 priority 排序)
  ├─ 逐一比對 patterns (substring, case-insensitive)
  ├─ 首次匹配 → 執行 action_type
  │   ├─ reply_content: getContentItem(content_key) + replyMessage()
  │   ├─ set_attribute: setUserAttributeWithHooks() + Hook 鏈
  │   └─ switch_product: updateUserOaSession()
  ├─ 不匹配 → 調用 AI Agent (ADK)
  │   └─ adkRun(agentId, userId, ...) → 自由形式回覆
  ├─ logInboundLineMessage()
  └─ logEngagementEvent('intent_matched', ...) if matched
```

---

## 🔌 外部集成

### LINE Platform
- **@line/bot-sdk**: 推送消息、驗證簽名、Rich Menu 管理
- **Webhook**: 接收 follow, message, postback, join 等事件

### AI & ML
- **@google/generative-ai**: Gemini API (文字、圖像分析)
- **ADK (AI Skill Platform)**: 自定義 Agent 調用

### 排程
- **node-cron**: `0 0 * * *` 每日午夜執行 Scheduler

### 數據與認證
- **@prisma/client**: ORM，所有 DB 操作
- **bcryptjs**: 密碼加密 (10 輪迭代)
- **@fastify/jwt**: JWT 認證

### 日期與驗證
- **date-fns**: 日期運算 (daysBetweenInTz 時區感知)
- **zod**: 運行時類型驗證

---

## 🎯 設計亮點

### 1. 時區感知
所有日期運算都考慮用戶的時區，確保全球用戶的行為一致。
```typescript
daysSinceEnrollment = daysBetweenInTz(enrolled_at, now, user.timezone);
// ✅ 用戶在台北晚上 23:59，仍算作 Day 1
// ✅ 不會因為 UTC 轉換導致邊界問題
```

### 2. 冪等性設計
使用 messageDelivery 表確保分布式環境安全重試。
```typescript
const claimed = await tryClaimDelivery(userId, scenario_id, node_id);
if (!claimed) { skipped++; continue; }  // 已推過，跳過
// 重複執行 Scheduler 是安全的
```

### 3. Hook 鏈機制
設置屬性可自動觸發一系列業務邏輯，實現複雜的工作流。
```typescript
setUserAttributeWithHooks() 可:
  ├─ 自動完成任務 (auto_complete_on_attribute)
  ├─ 執行完成後動作 (on_complete_actions)
  ├─ 評估徽章
  ├─ 評估旅程轉移
  └─ 深度限制 (MAX_CHAIN_DEPTH=5) 防止無限循環
```

### 4. 多租戶設計
一個 Product 可被多個 OA 複用，減少配置冗餘。
```
Product (定義一次) ↔ N:N ↔ LineOAs (複用多次)
           ↓
    UserOaSession (用戶當前產品上下文)
```

### 5. Flow Graph (DAG)
場景不是硬編碼，而是可視化流程圖，支持靈活的推播編排。
```
day-node (Day 7) → push-message-node (推送 Flex)
                 → mission-assign-node (分配任務)
                 → set-attribute-node (觸發 Hook)
```

---

## 📖 詳細文檔

更多細節請參考：

1. **HQ Backend Architecture** (`backend/docs/hq-backend-architecture.md`)
   - HQ 功能、Hook 鏈機制、後台操作流程

2. **Scheduler System** (`backend/docs/scheduler-system.md`)
   - Scheduler 執行流程、節點類型、冪等性、故障排查

3. **Enrollments & Scenarios** (`backend/docs/enrollments-scenarios-guide.md`)
   - Scenario 流程圖設計、Enrollment 生命週期、女性療癒課程示例

4. **Database Conventions** (`backend/docs/db-conventions.md`)
   - 軟刪除、索引策略、外鍵約束、屬性鍵前綴

5. **Base Controller Usage** (`backend/docs/base-controller-usage.md`)
   - 控制器基類、驗證方法、認證方式

---

## 🚀 技術棧

| 層 | 技術 |
|----|------|
| **Framework** | Fastify 5.0, TypeScript 5.9 |
| **ORM** | Prisma 6.19 |
| **Database** | PostgreSQL 14+ |
| **Authentication** | JWT, bcryptjs, @fastify/jwt |
| **External APIs** | LINE Messaging API, Google Gemini, ADK |
| **Scheduling** | node-cron |
| **Logging** | Pino, pino-pretty |
| **Testing** | Vitest |

---

## 📞 關鍵端點

### HQ API
```
GET /api/hq/users
GET /api/hq/users/:userId
PUT /api/hq/users/:userId/attributes/:key
POST /api/hq/users/:userId/missions
GET /api/hq/stats
```

### Scheduler API
```
POST /api/scheduler/run
POST /api/scheduler/dry-run
GET /api/scheduler/activity
```

### Webhook
```
POST /webhook/line (LINE Bot Webhook)
```

### 其他
```
GET /health (健康檢查)
```

---

## 🔐 安全考慮

- ✅ **LINE 簽名驗證**: HMAC-SHA256, timing-safe 對比
- ✅ **管理員認證**: JWT + Cookie, requireAdmin 中間件
- ✅ **密碼安全**: bcryptjs 10 輪迭代
- ✅ **軟刪除**: GDPR/PII 合規，可審計
- ✅ **級聯刪除**: ON DELETE CASCADE 確保完整清理

---

## 📈 性能優化

- ✅ **批量查詢**: Scheduler 一次性載入所有 enrollments
- ✅ **索引策略**: (user_id, date), (oa_id, status) 等複合索引
- ✅ **冪等性**: 重複執行安全，避免重複推送

---

## 🎓 學習路徑

1. **了解核心概念**: 閱讀本文 (Arch.md)
2. **了解後台管理**: 看 `hq-backend-architecture.md`
3. **了解自動化**: 看 `scheduler-system.md`
4. **了解場景流程**: 看 `enrollments-scenarios-guide.md`
5. **深入數據設計**: 看 `db-conventions.md`
6. **實際開發**: 查閱 `backend/src/` 的具體實現

---

**最後更新**: 2026-05-15
**主要貢獻者**: Vitera Engineering Team
