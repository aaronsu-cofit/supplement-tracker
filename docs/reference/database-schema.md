# Database Schema Reference

本專案使用 **Neon Serverless Postgres** 作為關聯式資料庫，並透過 **Prisma ORM** 管理 schema 與 migrations。

- **Schema 定義檔**：`backend/prisma/schema.prisma`
- **資料庫連線**：透過環境變數 `POSTGRES_URL` 注入
- **ORM 實作**：`backend/src/lib/db.ts` (使用 PrismaClient)
- **ER 圖**: 📊 [完整 ER 圖總覽](./er-diagrams.md) - 視覺化資料表關係

---

## 🗂️ 資料庫架構概覽

Vitera 資料庫包含以下主要功能區塊：

1. **使用者與認證** — `users`, `admins`
2. **健康照護模組** — supplements, wounds, footcare, intimacy, period tracking
3. **LINE OA 平台** — LINE 官方帳號管理、產品配置、內容管理
4. **遊戲化系統** — missions, badges, streaks, journeys
5. **問卷系統** — questionnaires, responses
6. **訊息與互動** — message logs, engagement events, unmatched intents

---

## 👤 核心使用者表

### `users` — 一般使用者（病患）

平台的核心使用者表，支援 LINE 與 Email 雙重認證。

```prisma
model User {
  id            String    @id @db.VarChar(64)          // UUID or LINE userId
  email         String?   @unique @db.VarChar(200)
  password_hash String?   @db.VarChar(200)             // bcrypt hash
  display_name  String?   @db.VarChar(200)
  picture_url   String?
  auth_provider String    @db.VarChar(20)              // 'email' or 'line'
  role          String    @default("user") @db.VarChar(20)
  timezone      String    @default("Asia/Taipei") @db.VarChar(50)
  created_at    DateTime  @default(now())
  deleted_at    DateTime?                              // 軟刪除標記
}
```

**Relations**: supplements, check_ins, wounds, wound_logs, foot_assessments, intimacy_assessments, periods, menstrual_cycle, daily_logs, mission_assignments, user_badges, message_logs, 等

---

### `admins` — 管理員使用者

後台管理介面（HQ）的存取控制。與 Patient Users 分離以保持權責清晰。

```prisma
model Admin {
  id            String    @id @db.VarChar(64)
  email         String    @unique @db.VarChar(200)
  password_hash String    @db.VarChar(200)
  display_name  String?   @db.VarChar(200)
  picture_url   String?
  auth_provider String    @default("email") @db.VarChar(20)  // "email" or "line"
  role          String    @default("admin") @db.VarChar(20)  // "admin" or "superadmin"
  timezone      String    @default("Asia/Taipei") @db.VarChar(50)
  created_at    DateTime  @default(now())
  deleted_at    DateTime?
}
```

---

## 💊 保健品追蹤模組

### `supplements` — 保健品清單

```prisma
model Supplement {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  name        String   @db.VarChar(200)
  dosage      String?  @db.VarChar(100)
  frequency   String   @default("daily") @db.VarChar(50)    // daily, weekly, monthly
  time_of_day String   @default("morning") @db.VarChar(20)  // morning, afternoon, evening
  notes       String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

### `check_ins` — 服藥打卡紀錄

紀錄使用者哪一天有按時服用某種保健品。

```prisma
model CheckIn {
  id            Int      @id @default(autoincrement())
  user_id       String   @db.VarChar(64)
  supplement_id Int
  checked_at    DateTime @default(now())
  date          DateTime @default(now()) @db.Date
}
```

**Indexes**: `idx_checkins_user_date (user_id, date)`

---

## 🩹 傷口照護模組

### `wounds` — 傷口清單

支援多傷口管理，含傷口類型、部位、狀態追蹤。

```prisma
model Wound {
  id             Int       @id @default(autoincrement())
  user_id        String    @db.VarChar(64)
  name           String?   @db.VarChar(200)
  location       String?   @db.VarChar(200)
  date_of_injury DateTime? @db.Date
  wound_type     String?   @db.VarChar(50)             // abrasion, surgical, burn, etc.
  body_location  String?   @db.VarChar(100)            // left_arm, right_leg, etc.
  status         String    @default("active") @db.VarChar(20)  // active, archived
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
}
```

### `wound_logs` — 傷口照護日誌

每次回診/掃描紀錄，含 AI 分析結果。

```prisma
model WoundLog {
  id                    Int      @id @default(autoincrement())
  wound_id              Int
  user_id               String   @db.VarChar(64)
  image_data            String?                        // base64 encoded image
  nrs_pain_score        Int      @default(0)           // 0-10 疼痛量表
  symptoms              String?                        // 逗號分隔症狀
  ai_assessment_summary String?                        // AI 分析摘要
  ai_status_label       String?  @db.VarChar(100)      // 狀態標籤
  logged_at             DateTime @default(now())
  date                  DateTime @default(now()) @db.Date
}
```

**Indexes**: `idx_wound_logs_user_date (user_id, date)`

---

## 🦴 足部照護模組

### `foot_assessments` — 足部評估

```prisma
model FootAssessment {
  id             Int      @id @default(autoincrement())
  user_id        String   @db.VarChar(64)
  pain_locations String?                               // 痛點位置
  nrs_pain_score Int      @default(0)
  steps_count    Int      @default(0)                  // 步數
  standing_hours Float    @default(0)                  // 站立時數
  date           DateTime @default(now()) @db.Date
}
```

### `foot_images` — 足部影像 AI 分析

```prisma
model FootImage {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  image_data  String?
  ai_severity String?  @db.VarChar(50)                // 嚴重程度評估
  ai_summary  String?
  ai_details  Json?
  logged_at   DateTime @default(now())
}
```

### `shoe_images` — 鞋子磨損分析

```prisma
model ShoeImage {
  id              Int      @id @default(autoincrement())
  user_id         String   @db.VarChar(64)
  image_data      String?
  ai_risk_level   String?  @db.VarChar(50)
  ai_wear_pattern String?  @db.VarChar(100)
  ai_summary      String?
  ai_details      Json?
  logged_at       DateTime @default(now())
}
```

---

## 💗 親密健康模組

### `intimacy_assessments` — 親密健康評估

```prisma
model IntimacyAssessment {
  id              Int      @id @default(autoincrement())
  user_id         String   @db.VarChar(64)
  gender          String?  @db.VarChar(20)
  primary_concern String?  @db.VarChar(200)
  assessment_data Json?
  ai_summary      String?
  created_at      DateTime @default(now())
}
```

---

## 🩸 經期追蹤模組

### `menstrual_cycles` — 經期週期設定

儲存使用者的經期週期設定與 onboarding 狀態。

```prisma
model MenstrualCycle {
  id             String   @id @default(cuid())
  user_id        String   @unique @db.VarChar(64)
  cycle_length   Int      @default(28)                // 平均週期天數
  period_length  Int      @default(5)                 // 平均經期天數
  onboarding_done Boolean @default(false)             // 是否完成引導
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
}
```

### `menstrual_periods` — 經期紀錄

```prisma
model Period {
  id         String   @id @default(cuid())
  user_id    String   @db.VarChar(64)
  start_date DateTime
  end_date   DateTime?
  notes      String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Indexes**: `idx_periods_user`, `idx_periods_start_date`

### `menstrual_daily_logs` — 每日詳細紀錄

儲存症狀、情緒、血量、血色、血塊等詳細資訊。

```prisma
model DailyLog {
  id        String   @id @default(cuid())
  user_id   String   @db.VarChar(64)
  date      DateTime
  data      Json     // 包含 symptoms, emotions, flow, bloodColor, clots, pbacLogs 等
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Unique Constraint**: `(user_id, date)`

---

## 🏢 LINE OA 與平台管理

### `line_oa` — LINE 官方帳號

```prisma
model LineOA {
  id                        Int      @id @default(autoincrement())
  name                      String   @db.VarChar(200)
  description               String?
  channel_access_token      String   @db.VarChar(500)
  channel_secret            String?  @db.VarChar(200)
  line_destination_id       String?  @db.VarChar(64)
  default_agent_id          String   @default("ai-expert") @db.VarChar(100)
  ai_skill_platform_url     String?  @db.VarChar(500)
  ai_skill_platform_api_key String?  @db.VarChar(500)
  product_id                String?  @db.VarChar(30)
  is_active                 Boolean  @default(true)
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt
}
```

### `products` — 產品配置包

可分享的配置包（內容庫、任務、意圖規則、情境、徽章、旅程），讓多個 LINE OA 可以綁定。

```prisma
model Product {
  id          String   @id @default(cuid()) @db.VarChar(30)
  name        String   @db.VarChar(200)
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Relations**: content_items, intent_rules, mission_templates, badge_templates, journey_templates, questionnaires

### `oa_products` — OA 與產品的 N:N 關聯

```prisma
model OaProduct {
  oa_id      Int
  product_id String   @db.VarChar(30)
  is_default Boolean  @default(false)
  sort_order Int      @default(0)
  created_at DateTime @default(now())
}
```

### `user_oa_sessions` — 使用者當前產品上下文

```prisma
model UserOaSession {
  user_id            String   @db.VarChar(64)
  oa_id              Int
  current_product_id String   @db.VarChar(30)
  last_active_at     DateTime @default(now())
}
```

**Primary Key**: `(user_id, oa_id)`

---

## 📝 內容管理

### `content_items` — 可分享內容項目

```prisma
model ContentItem {
  id         String   @id @default(cuid()) @db.VarChar(30)
  product_id String   @db.VarChar(30)
  key        String   @db.VarChar(100)                  // product-scoped slug
  type       String   @default("text") @db.VarChar(50)  // text, flex, card
  title      String?  @db.VarChar(200)
  body       String?  @db.Text
  metadata   Json?
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, key)`

### `intent_rules` — 意圖規則

```prisma
model IntentRule {
  id            String   @id @default(cuid()) @db.VarChar(30)
  product_id    String   @db.VarChar(30)
  name          String   @db.VarChar(200)
  priority      Int      @default(100)
  match_type    String   @default("keyword") @db.VarChar(20)  // keyword, regex, exact
  patterns      Json                                          // array of strings
  action_type   String   @db.VarChar(50)                      // reply_content, set_attribute
  action_config Json
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}
```

---

## 🎯 遊戲化系統

### `mission_templates` — 任務藍圖

```prisma
model MissionTemplate {
  id                         String  @id @default(cuid()) @db.VarChar(30)
  product_id                 String  @db.VarChar(30)
  key                        String  @db.VarChar(100)
  name                       String  @db.VarChar(200)
  description                String?
  progress_target            Int     @default(1)
  auto_complete_on_attribute Json?
  on_complete_actions        Json    @default("[]")
  notify_content_key         String? @db.VarChar(100)

  // Habit-tracker extensions
  mission_type String  @default("one_shot") @db.VarChar(30)  // one_shot, binary_daily, quantitative_daily, checklist_daily
  frequency    String  @default("once") @db.VarChar(20)      // once, daily, weekly, monthly
  daily_target Int?
  unit         String? @db.VarChar(30)
  step_value   Int?
  subtasks     Json?
  category     String? @db.VarChar(50)
  action_url   String?
  reminder     Json?

  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, key)`

### `mission_assignments` — 使用者任務實例

```prisma
model MissionAssignment {
  id               String    @id @default(cuid()) @db.VarChar(30)
  user_id          String    @db.VarChar(64)
  template_id      String    @db.VarChar(30)
  status           String    @default("pending") @db.VarChar(20)  // pending, completed, abandoned
  progress_current Int       @default(0)
  progress_target  Int       @default(1)
  assigned_at      DateTime  @default(now())
  completed_at     DateTime?
}
```

### `mission_daily_logs` — 每日習慣打卡紀錄

```prisma
model MissionDailyLog {
  id            Int       @id @default(autoincrement())
  user_id       String    @db.VarChar(64)
  template_id   String    @db.VarChar(30)
  date          DateTime  @db.Date
  completed     Boolean   @default(false)
  skipped       Boolean   @default(false)
  value         Int       @default(0)
  subtask_state Json?
  note          String?   @db.VarChar(500)
  completed_at  DateTime?
  updated_at    DateTime  @updatedAt
}
```

**Unique Constraint**: `(user_id, template_id, date)`

### `user_mission_settings` — 使用者自訂設定

```prisma
model UserMissionSetting {
  id               Int      @id @default(autoincrement())
  user_id          String   @db.VarChar(64)
  template_id      String   @db.VarChar(30)
  daily_target     Int?
  reminder_enabled Boolean?
  reminder_time    String?  @db.VarChar(10)
  updated_at       DateTime @updatedAt
}
```

**Unique Constraint**: `(user_id, template_id)`

### `user_streaks` — 連續打卡紀錄

```prisma
model UserStreak {
  id               Int       @id @default(autoincrement())
  product_id       String    @db.VarChar(30)
  user_id          String    @db.VarChar(64)
  streak_key       String    @db.VarChar(100)
  count_current    Int       @default(0)
  count_best       Int       @default(0)
  last_occurred_on DateTime? @db.Date
  updated_at       DateTime  @updatedAt
}
```

**Unique Constraint**: `(product_id, user_id, streak_key)`

### `badge_templates` — 徽章藍圖

```prisma
model BadgeTemplate {
  id                 String   @id @default(cuid()) @db.VarChar(30)
  product_id         String   @db.VarChar(30)
  key                String   @db.VarChar(100)
  name               String   @db.VarChar(200)
  description        String?
  icon               String?  @db.Text                           // emoji, URL, or data URI
  criteria           Json                                        // { type, ... }
  notify_content_key String?  @db.VarChar(100)
  is_active          Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, key)`

### `user_badges` — 已獲得徽章

```prisma
model UserBadge {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  template_id String   @db.VarChar(30)
  earned_at   DateTime @default(now())
}
```

**Unique Constraint**: `(user_id, template_id)`

### `journey_templates` — 旅程藍圖

```prisma
model JourneyTemplate {
  id          String   @id @default(cuid()) @db.VarChar(30)
  product_id  String   @db.VarChar(30)
  key         String   @db.VarChar(100)
  name        String   @db.VarChar(200)
  description String?
  phases      Json                                              // array of phases
  transitions Json                                              // array of transitions
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, key)`

### `user_journey_phases` — 使用者當前階段

```prisma
model UserJourneyPhase {
  id          Int      @id @default(autoincrement())
  product_id  String   @db.VarChar(30)
  user_id     String   @db.VarChar(64)
  journey_key String   @db.VarChar(100)
  phase_key   String   @db.VarChar(100)
  entered_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, user_id, journey_key)`

---

## 📋 問卷系統

### `questionnaires` — 問卷定義

```prisma
model Questionnaire {
  id                String   @id @default(cuid()) @db.VarChar(30)
  product_id        String   @db.VarChar(30)
  key               String   @db.VarChar(100)
  name              String   @db.VarChar(200)
  description       String?
  spec              Json     @default("{\"question_sets\":[]}")
  on_submit_actions Json     @default("[]")
  liff_url          String?
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

**Unique Constraint**: `(product_id, key)`

### `questionnaire_responses` — 問卷回覆

```prisma
model QuestionnaireResponse {
  id                String    @id @default(cuid()) @db.VarChar(30)
  questionnaire_id  String    @db.VarChar(30)
  user_id           String?   @db.VarChar(64)
  anonymous_id      String?   @db.VarChar(64)
  answers           Json
  scores            Json
  interpretation    Json?
  triggered_actions Json      @default("[]")
  started_at        DateTime  @default(now())
  completed_at      DateTime?
}
```

---

## 💬 訊息與互動

### `message_log` — 完整對話紀錄

```prisma
model MessageLog {
  id           Int      @id @default(autoincrement())
  oa_id        Int
  user_id      String   @db.VarChar(64)
  direction    String   @db.VarChar(10)                // inbound, outbound
  type         String   @db.VarChar(20)                // text, flex, sticker
  content_text String?  @db.Text
  content_json Json?
  source       String?  @db.VarChar(30)                // intent, ai_agent, scheduler_push, etc.
  source_ref   String?  @db.VarChar(200)
  created_at   DateTime @default(now())
}
```

**Indexes**: `idx_message_log_oa_time`, `idx_message_log_user_time`, `idx_message_log_oa_user_time`

### `unmatched_intents` — 未匹配的使用者訊息

```prisma
model UnmatchedIntent {
  id         Int      @id @default(autoincrement())
  user_id    String   @db.VarChar(64)
  oa_id      Int
  product_id String?  @db.VarChar(30)
  agent_id   String?  @db.VarChar(100)
  message    String   @db.VarChar(2000)
  reply      String?
  skill_key  String?  @db.VarChar(100)
  model      String?  @db.VarChar(100)
  latency_ms Int?
  error      String?
  resolved   Boolean  @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

### `engagement_events` — 語義事件追蹤

```prisma
model EngagementEvent {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  event_type  String   @db.VarChar(30)
  payload     String?
  occurred_at DateTime @default(now())
}
```

### `user_attributes` — 使用者屬性

```prisma
model UserAttribute {
  id      Int      @id @default(autoincrement())
  user_id String   @db.VarChar(64)
  key     String   @db.VarChar(100)
  value   String?
  set_at  DateTime @default(now())
}
```

**Unique Constraint**: `(user_id, key)`

---

## 🎨 Rich Menu 與 Scenario

### `line_oa_rich_menu_template` — Rich Menu 模板

```prisma
model LineOARichMenuTemplate {
  id                Int      @id @default(autoincrement())
  oa_id             Int
  name              String   @db.VarChar(200)
  zones             Json
  line_rich_menu_id String?  @db.VarChar(100)
  is_active         Boolean  @default(false)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

### `coblocks_scenarios` — 對話流程情境

```prisma
model CoBlocksScenario {
  id         String   @id @default(cuid())
  oa_id      Int
  name       String
  flow_nodes Json     @default("[]")
  flow_edges Json     @default("[]")
  is_active  Boolean  @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

### `enrollments` — 使用者註冊情境

```prisma
model Enrollment {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  scenario_id String   @db.VarChar(30)
  enrolled_at DateTime @default(now())
  status      String   @default("active") @db.VarChar(20)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Unique Constraint**: `(user_id, scenario_id)`

---

## 🧘 女性療癒室專屬表格

### `diary_entries` — 日記記錄

```prisma
model DiaryEntry {
  id          String   @id @default(cuid())
  user_id     String   @db.VarChar(64)
  date        DateTime @db.Date
  mood        Int
  sleep       Int
  diary       String?  @db.Text
  ai_feedback String?  @db.Text
  created_at  DateTime @default(now())
}
```

**Unique Constraint**: `(user_id, date)`

### `relief_sessions` — 放鬆練習紀錄

```prisma
model ReliefSession {
  id           String     @id @default(cuid())
  user_id      String     @db.VarChar(64)
  type         ReliefType                             // BREATHING, BODY_SCAN, SLEEP_QUOTES
  duration_sec Int
  completed_at DateTime   @default(now())
}
```

### `assessment_results` — 評估結果

```prisma
model AssessmentResult {
  id           String   @id @default(cuid())
  user_id      String   @db.VarChar(64)
  result_type  String   @db.VarChar(1)
  scores       Json
  ai_analysis  Json
  face_insight String?  @db.Text
  created_at   DateTime @default(now())
}
```

---

## 🔧 其他系統表

### `modules` — 模組管理

```prisma
model Module {
  id           String   @id @db.VarChar(50)
  name_zh      String?  @db.VarChar(100)
  name_en      String?  @db.VarChar(100)
  description  String?
  is_active    Boolean  @default(true)
  sort_order   Int      @default(0)
  external_url String?
  icon_type    String?  @db.VarChar(50)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}
```

### `user_menu_assignments` — 使用者 Menu 指派

```prisma
model UserMenuAssignment {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  oa_id       Int
  template_id Int?
  source      String   @db.VarChar(20)
  assigned_at DateTime @default(now())
}
```

**Unique Constraint**: `(user_id, oa_id)`

### `message_deliveries` — 訊息發送去重

```prisma
model MessageDelivery {
  id           Int      @id @default(autoincrement())
  user_id      String   @db.VarChar(64)
  scenario_id  String   @db.VarChar(30)
  node_id      String   @db.VarChar(100)
  delivered_at DateTime @default(now())
}
```

**Unique Constraint**: `(user_id, scenario_id, node_id)`

---

## 📊 重要 Indexes 總覽

```sql
-- Users
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_admins_deleted_at ON admins(deleted_at);

-- Supplements & Check-ins
CREATE INDEX idx_supplements_user ON supplements(user_id);
CREATE INDEX idx_checkins_user_date ON check_ins(user_id, date);

-- Wounds
CREATE INDEX idx_wounds_user ON wounds(user_id);
CREATE INDEX idx_wound_logs_user_date ON wound_logs(user_id, date);

-- Foot care
CREATE INDEX idx_foot_assessments_user_date ON foot_assessments(user_id, date);
CREATE INDEX idx_foot_images_user ON foot_images(user_id);
CREATE INDEX idx_shoe_images_user ON shoe_images(user_id);

-- Period tracking
CREATE INDEX idx_periods_user ON menstrual_periods(user_id);
CREATE INDEX idx_periods_start_date ON menstrual_periods(start_date);
CREATE INDEX idx_daily_logs_user ON menstrual_daily_logs(user_id);

-- LINE OA
CREATE INDEX idx_line_oa_destination ON line_oa(line_destination_id);
CREATE INDEX idx_line_oa_product ON line_oa(product_id);

-- Missions
CREATE INDEX idx_mission_templates_product ON mission_templates(product_id);
CREATE INDEX idx_mission_assignments_user_status ON mission_assignments(user_id, status);
CREATE INDEX idx_mission_daily_log_user_date ON mission_daily_logs(user_id, date);

-- Messages
CREATE INDEX idx_message_log_oa_time ON message_log(oa_id, created_at);
CREATE INDEX idx_message_log_user_time ON message_log(user_id, created_at);
CREATE INDEX idx_unmatched_intents_oa_created ON unmatched_intents(oa_id, created_at DESC);
```

---

## 🔗 主要 Relations 關係圖

```
users 1:N supplements
users 1:N check_ins
users 1:N wounds
users 1:N wound_logs
users 1:N foot_assessments
users 1:N periods
users 1:1 menstrual_cycle
users 1:N daily_logs
users 1:N mission_assignments
users 1:N mission_daily_logs
users 1:N user_badges
users 1:N message_logs
users 1:N unmatched_intents

supplements 1:N check_ins
wounds 1:N wound_logs

line_oa N:N products (via oa_products)
line_oa 1:N user_oa_sessions
products 1:N content_items
products 1:N intent_rules
products 1:N mission_templates
products 1:N badge_templates
products 1:N journey_templates
products 1:N questionnaires

mission_templates 1:N mission_assignments
mission_templates 1:N mission_daily_logs
badge_templates 1:N user_badges
questionnaires 1:N questionnaire_responses
coblocks_scenarios 1:N enrollments
```

---

## 📝 Migration 管理

使用 Prisma Migrate 管理 schema 變更：

```bash
# 建立新 migration
pnpm --filter backend prisma migrate dev --name <migration_name>

# 套用 migration 到 production
pnpm --filter backend prisma migrate deploy

# 重置開發資料庫
pnpm --filter backend prisma migrate reset

# 產生 Prisma Client
pnpm --filter backend prisma generate
```

---

## 🔒 資料保護

- **Soft Delete**: `users` 與 `admins` 表使用 `deleted_at` 標記軟刪除
- **Cascade Delete**: 所有使用者相關表格設定 `onDelete: Cascade`，刪除使用者時自動清除所有相關資料
- **PII Compliance**: 使用者刪除時會清除所有追蹤資料

詳見 `backend/src/lib/userDeletion.ts` 的完整流程。
