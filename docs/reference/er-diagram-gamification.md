# ER 圖：遊戲化系統與問卷系統

## 遊戲化系統（Missions + Badges + Journeys）

```mermaid
erDiagram
    %% 產品（來自平台模組）
    Product {
        string id PK
        string name
        string description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    User {
        string id PK
        string email
        string display_name
        string auth_provider
        string role
        string timezone
        datetime created_at
    }

    %% 任務系統
    MissionTemplate {
        string id PK
        string product_id FK
        string key
        string name
        string description
        int progress_target
        json auto_complete_on_attribute
        json on_complete_actions
        string notify_content_key
        string mission_type
        string frequency
        int daily_target
        string unit
        int step_value
        json subtasks
        string category
        string action_url
        json reminder
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    MissionAssignment {
        string id PK
        string user_id FK
        string template_id FK
        string status
        int progress_current
        int progress_target
        datetime assigned_at
        datetime completed_at
    }

    MissionDailyLog {
        int id PK
        string user_id FK
        string template_id FK
        date date
        boolean completed
        boolean skipped
        int value
        json subtask_state
        string note
        datetime completed_at
        datetime updated_at
    }

    UserMissionSetting {
        int id PK
        string user_id FK
        string template_id FK
        int daily_target
        boolean reminder_enabled
        string reminder_time
        datetime updated_at
    }

    UserStreak {
        int id PK
        string product_id FK
        string user_id FK
        string streak_key
        int count_current
        int count_best
        date last_occurred_on
        datetime updated_at
    }

    %% 徽章系統
    BadgeTemplate {
        string id PK
        string product_id FK
        string key
        string name
        string description
        string icon
        json criteria
        string notify_content_key
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    UserBadge {
        int id PK
        string user_id FK
        string template_id FK
        datetime earned_at
    }

    %% 旅程系統
    JourneyTemplate {
        string id PK
        string product_id FK
        string key
        string name
        string description
        json phases
        json transitions
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    UserJourneyPhase {
        int id PK
        string product_id FK
        string user_id FK
        string journey_key
        string phase_key
        datetime entered_at
        datetime updated_at
    }

    %% 問卷系統
    Questionnaire {
        string id PK
        string product_id FK
        string key
        string name
        string description
        json spec
        json on_submit_actions
        string liff_url
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    QuestionnaireResponse {
        string id PK
        string questionnaire_id FK
        string user_id FK
        string anonymous_id
        json answers
        json scores
        json interpretation
        json triggered_actions
        datetime started_at
        datetime completed_at
    }

    %% 關係：任務系統
    Product ||--o{ MissionTemplate : "定義"
    MissionTemplate ||--o{ MissionAssignment : "指派給"
    MissionTemplate ||--o{ MissionDailyLog : "記錄"
    MissionTemplate ||--o{ UserMissionSetting : "自訂"
    User ||--o{ MissionAssignment : "擁有"
    User ||--o{ MissionDailyLog : "打卡"
    User ||--o{ UserMissionSetting : "設定"
    Product ||--o{ UserStreak : "追蹤"
    User ||--o{ UserStreak : "擁有"

    %% 關係：徽章系統
    Product ||--o{ BadgeTemplate : "定義"
    BadgeTemplate ||--o{ UserBadge : "獲得"
    User ||--o{ UserBadge : "擁有"

    %% 關係：旅程系統
    Product ||--o{ JourneyTemplate : "定義"
    Product ||--o{ UserJourneyPhase : "追蹤"
    User ||--o{ UserJourneyPhase : "處於"

    %% 關係：問卷系統
    Product ||--o{ Questionnaire : "定義"
    Questionnaire ||--o{ QuestionnaireResponse : "回覆"
    User ||--o{ QuestionnaireResponse : "填寫"
```

## 說明

### 任務系統（Missions）
- **MissionTemplate**: 任務藍圖（定義任務規則）
  - 支援 4 種任務類型：`one_shot`、`binary_daily`、`quantitative_daily`、`checklist_daily`
  - 頻率：once、daily、weekly、monthly
  - 完成後可觸發動作（`on_complete_actions`）
- **MissionAssignment**: 使用者任務實例
  - 狀態：pending、completed、abandoned
  - 追蹤進度：`progress_current` / `progress_target`
- **MissionDailyLog**: 每日習慣打卡紀錄
  - 支援數值型（value）、子任務型（subtask_state）
  - 防重複：unique constraint on (user_id, template_id, date)
- **UserMissionSetting**: 使用者自訂設定（目標、提醒）
- **UserStreak**: 連續打卡紀錄（current streak、best streak）

### 徽章系統（Badges）
- **BadgeTemplate**: 徽章藍圖
  - 條件判斷：`criteria` JSON（如：連續打卡 7 天）
  - 圖示：emoji、URL 或 data URI
- **UserBadge**: 已獲得的徽章
  - 防重複：unique constraint on (user_id, template_id)

### 旅程系統（Journeys）
- **JourneyTemplate**: 旅程藍圖
  - `phases`: 階段定義（如：新手、進階、專家）
  - `transitions`: 轉換規則（觸發條件）
- **UserJourneyPhase**: 使用者當前所在階段
  - 追蹤進入時間和更新時間

### 問卷系統（Questionnaires）
- **Questionnaire**: 問卷定義
  - `spec`: 問卷結構（question_sets）
  - `on_submit_actions`: 提交後觸發動作（如：指派任務、設定屬性）
  - 支援 LIFF 嵌入（`liff_url`）
- **QuestionnaireResponse**: 問卷回覆
  - 支援匿名填寫（`anonymous_id`）
  - 自動計分和詮釋（`scores`、`interpretation`）

### 關鍵設計
- **Product-Scoped**: 所有模板都 scope 在 Product 層級，可跨 OA 共享
- **User-Specific**: 所有實例（Assignment、Badge、Phase、Response）都關聯到 User
- **自動化觸發**: 完成任務、獲得徽章、提交問卷都可觸發自動化動作
- **遊戲化機制**: 結合任務、徽章、連續打卡、旅程階段，提升使用者參與度
