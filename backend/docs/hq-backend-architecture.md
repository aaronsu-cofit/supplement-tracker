# HQ Backend 架構完整指南

本文檔記錄 Vitera HQ（後台管理系統）的完整架構、功能、數據流和核心設計模式。

Last updated: 2026-05-18

---

## 1. HQ 功能概述

HQ 是一個完整的後台管理系統，通過 REST API 提供以下主要功能：

### 1.1 模組管理 (Module Management)
- **API**: `GET /api/hq/modules`, `PATCH /api/hq/modules/:id`
- **功能**: 管理系統可用的功能模組
- **操作**: 獲取所有模組、更新模組信息（標題、描述、啟用狀態、排序）

### 1.2 管理員管理 (Admin Management)
- **API** 端點:
  - `GET /api/hq/admins` - 獲取所有管理員
  - `POST /api/hq/admins` - 創建新管理員
  - `PATCH /api/hq/admins/:adminId` - 更新管理員角色
  - `PATCH /api/hq/me/password` - 更改自己的密碼
- **特點**: 密碼哈希存儲、角色支持（admin/superadmin）、安全驗證

### 1.3 用戶管理 (User Management)
- **API** 端點:
  - `GET /api/hq/users` - 獲取所有用戶
  - `GET /api/hq/users/:userId` - 獲取單個用戶詳情
  - `GET /api/hq/users/:userId/engagement` - 獲取用戶參與事件
- **用戶信息**: 基本信息、認證方式、時區、軟刪除標記

### 1.4 用戶屬性管理 (User Attributes)
- **API** 端點:
  - `GET /api/hq/users/:userId/attributes` - 獲取用戶所有屬性
  - `PUT /api/hq/users/:userId/attributes/:key` - 設置屬性
  - `DELETE /api/hq/users/:userId/attributes/:key` - 刪除屬性
- **特點**: 鍵值對存儲、Hook 機制、支持跨產品個性化

### 1.5 任務管理 (Mission Management)
- **API** 端點:
  - `GET /api/hq/users/:userId/missions` - 獲取用戶任務
  - `POST /api/hq/users/:userId/missions` - 分配新任務
  - `DELETE /api/hq/users/:userId/missions/:assignmentId` - 放棄任務
- **支持**: 多種任務類型（one_shot、binary_daily、quantitative_daily、checklist_daily）

### 1.6 徽章管理 (Badge Management)
- **API** 端點:
  - `GET /api/hq/users/:userId/badges` - 獲取用戶徽章
  - `DELETE /api/hq/users/:userId/badges/:templateId` - 撤銷徽章
- **功能**: 自動授予、通知推送、emoji 或 URL 圖標

### 1.7 其他用戶數據
- **連續記錄 (Streaks)**: 追蹤連續完成天數
- **旅程 (Journeys)**: 用戶在產品生命週期中的階段進度
- **消息日誌 (Messages)**: 所有進出消息的完整歷史

### 1.8 統計數據 (Statistics)
- **API**: `GET /api/hq/stats`
- **包含**: 用戶總數、任務狀態統計、活躍度等

---

## 2. 核心表與其他系統的關係

### 2.1 產品配置層 (Multi-Tenant)

```
┌─────────────────────────────────────────────────┐
│ 產品層 (可復用配置)                              │
│ products: { id, name, description }             │
├─────────────────────────────────────────────────┤
│ ├─ content_items                  (內容庫)      │
│ ├─ intent_rules                   (規則引擎)    │
│ ├─ mission_templates              (任務模板)    │
│ ├─ badge_templates                (徽章定義)    │
│ ├─ journey_templates              (旅程定義)    │
│ └─ questionnaires                 (問卷模板)    │
└─────────────────────────────────────────────────┘
           ↑
           │ (N:N 映射)
           │
    oa_products
           ↑
           │ (1:N)
           │
┌─────────────────────────────────────────────────┐
│ LINE OA 層 (各官方帳號)                         │
│ line_oa: { id, channel_token, ... }             │
├─────────────────────────────────────────────────┤
│ └─ coblocks_scenarios             (推送場景)    │
│    └─ enrollments (用戶參加)                     │
└─────────────────────────────────────────────────┘
           ↑
           │ (N:1)
           │
┌─────────────────────────────────────────────────┐
│ 用戶層                                          │
│ users + user_oa_sessions                        │
├─────────────────────────────────────────────────┤
│ ├─ user_attributes      (動態屬性)              │
│ ├─ mission_assignments  (任務實例)              │
│ ├─ mission_daily_logs   (日常進度)              │
│ ├─ user_streaks         (連續記錄)              │
│ ├─ user_badges          (已獲徽章)              │
│ └─ user_journey_phases  (旅程進度)              │
└─────────────────────────────────────────────────┘
```

### 2.2 HQ 使用的核心表

| 表名 | 主要欄位 | 用途 |
|------|--------|------|
| **users** | id, email, display_name, timezone, deleted_at | 平台用戶（患者） |
| **admins** | id, email, password_hash, role, deleted_at | HQ 後台管理員 |
| **modules** | id, name_zh, name_en, is_active, sort_order | 系統功能模組 |
| **products** | id, name, is_active | 產品配置包（可共享） |
| **user_attributes** | user_id, key, value | 用戶自定義屬性（鍵值對） |
| **mission_templates** | id, product_id, key, name, mission_type, on_complete_actions | 任務模板 |
| **mission_assignments** | id, user_id, template_id, status, progress | 任務分配實例 |
| **user_streaks** | id, user_id, product_id, streak_key, count_current | 連續記錄 |
| **user_badges** | id, user_id, template_id, earned_at | 獲得的徽章 |
| **user_journey_phases** | id, user_id, product_id, journey_key, phase_key | 用戶旅程進度 |
| **engagement_events** | id, user_id, event_type, payload, occurred_at | 語義事件（intent_matched, badge_earned） |

---

## 3. Hook 鏈機制 (setUserAttributeWithHooks)

這是 HQ 最強大的功能：設置用戶屬性可以自動觸發一系列業務邏輯。

### 3.1 完整的 Hook 流程

```
setUserAttributeWithHooks(userId, key, value)
    ↓
1. user_attributes: 設置屬性
    ↓
2. mission_templates: 查詢 auto_complete_on_attribute
    ├─ 查找監聽該屬性的任務
    └─ 自動完成 (status: pending → completed)
        ↓
3. mission_templates.on_complete_actions:
    ├─ set_attribute (可能觸發更多 hook，深度限制 5)
    │   └─ 遞歸調用 setUserAttributeWithHooks()
    ├─ assign_mission
    │   └─ mission_assignments
    └─ increment_streak
        └─ user_streaks
            ↓
4. badge_templates: 根據 criteria 評估徽章
    ├─ streak_reached: user_streaks.count_current >= threshold
    └─ mission_completed: 檢查完成的任務
        ↓
5. user_badges: 發獎徽章
    ├─ notification: 推送 badge_templates.notify_content_key
    └─ message_log: 記錄
        ↓
6. journey_templates: 評估旅程轉移
    ├─ 檢查 transitions 的觸發條件
    └─ user_journey_phases: 更新當前階段
```

### 3.2 防止無限循環

- **深度限制**: `MAX_CHAIN_DEPTH = 5`
- **訪問跟蹤**: 避免重複設置相同的屬性
- **冪等性**: 同一屬性值的重複設置不觸發 hook

---

## 4. HQ 後台操作流程示例

### 4.1 運營人員設置用戶屬性的完整流程

```
HQ 後台
    ↓
PATCH /hq/users/{userId}/attributes/life_stage = "新手"
    ↓
HQ Controller
    ├─ 驗證 Admin 權限
    └─ 呼叫 HQ Service
        ↓
HQ Service
    └─ setUserAttributeWithHooks(userId, "life_stage", "新手")
        ↓
lib/missions.ts
├─ 1. 設置 user_attributes
├─ 2. 查詢監聽 life_stage 的任務
│   └─ SELECT * FROM mission_templates WHERE auto_complete_on_attribute = { key: "life_stage" }
├─ 3. 自動完成這些任務
│   ├─ UPDATE mission_assignments SET status = "completed"
│   ├─ INSERT mission_daily_logs
│   └─ 執行 on_complete_actions
│       ├─ assign_mission: 分配「新手教程」
│       └─ increment_streak: 開始連勝計數
├─ 4. 評估徽章
│   └─ badge_templates.criteria = { type: "mission_completed", mission_key: "intro" }
│       └─ INSERT user_badges
├─ 5. 評估旅程
│   └─ journey_templates.transitions 觸發
│       └─ UPDATE user_journey_phases 進入「學習」階段
│
└─ 記錄事件: engagement_events = "attribute_set"

結果：用戶同時獲得：
  ✓ 新的屬性值
  ✓ 自動完成的任務
  ✓ 分配的新任務
  ✓ 增加的連勝計數
  ✓ 可能的徽章獎勵
  ✓ 旅程階段進度
```

### 4.2 分配任務給用戶

```
HQ: POST /hq/users/:userId/missions
    ↓
1. 從 mission_templates 取得任務定義
    ↓
2. 創建 mission_assignments
    ├─ status = 'pending'
    ├─ progress_target = template.progress_target
    └─ assigned_at = now
    ↓
3. 如果是習慣型任務，創建 mission_daily_logs
    ↓
4. 如果任務有 auto_complete_on_attribute，檢查是否應立即完成
    ↓
5. 返回 mission_assignment
```

---

## 5. 性能考慮

### 5.1 數據庫索引

```prisma
// 關鍵索引確保快速查詢
@@index([user_id, status])               // mission_assignments
@@unique([user_id, template_id, date])   // mission_daily_logs
@@index([product_id, is_active, priority]) // intent_rules
@@index([user_id, created_at])           // engagement_events
```

### 5.2 批量操作

- **Scheduler**: 批量查詢所有活躍 enrollments
- **菜單評估**: 批量評估所有活躍用戶
- **統計**: 一次性查詢用戶、任務、徽章統計

### 5.3 時區感知

```typescript
// localDateInTz(now, tz): 計算用戶所在時區的「今天」
// daysBetweenInTz(d1, d2, tz): 以用戶時區計算日差
// 時區感知確保全球用戶的正確行為
```

---

## 6. 安全與合規

| 機制 | 實現 |
|-----|------|
| **密碼安全** | bcryptjs 10 輪迭代，不可逆 |
| **管理員認證** | JWT + Cookie，@fastify/jwt 中間件 |
| **權限檢查** | `requireAdmin`, `requireSuperAdmin` 中間件 |
| **軟刪除** | User/Admin 有 `deleted_at`，邏輯刪除而非物理刪除 |
| **時區感知** | 所有日期運算都考慮用戶時區，避免邊界 bug |

---

## 7. 關鍵檔案參考

| 檔案 | 用途 |
|------|------|
| **src/controllers/hq.controller.ts** | HQ 請求處理 |
| **src/services/hq.service.ts** | HQ 業務邏輯 |
| **src/routes/hq.routes.ts** | HQ 路由定義 |
| **src/lib/db.ts** | 150+ 個數據庫操作函數 |
| **src/lib/missions.ts** | 任務完成邏輯 |
| **src/lib/gamification.ts** | 徽章邏輯 |
| **src/lib/journey.ts** | 旅程轉移邏輯 |

---

## 8. 與其他系統的集成

### 8.1 與 Scheduler 的交互

HQ 設置的屬性、任務、徽章等可以被 Scheduler 讀取並執行相應的業務邏輯。

### 8.2 與 Webhook 的交互

LINE Webhook 接收到的事件（follow、message、postback）可以觸發 HQ 中定義的規則和動作。

### 8.3 與 AI Agent 的交互

通過 Intent Rules，用戶的文字可以觸發 AI Agent 生成回應，或執行預定義的動作。

---

## 9. 擴展指南

### 9.1 添加新的 HQ 功能

1. 在 `hq.routes.ts` 中定義新路由
2. 在 `hq.controller.ts` 中實現請求處理
3. 在 `hq.service.ts` 中實現業務邏輯
4. 如需數據庫操作，在 `lib/db.ts` 中添加函數

### 9.2 添加新的 Hook 類型

在 `setUserAttributeWithHooks` 中添加新的條件檢查和動作執行邏輯。

### 9.3 添加新的 Badge 條件

在 `badge_templates.criteria` 中定義新的觸發條件，在 `gamification.ts` 中實現評估邏輯。
