# ER 圖：核心使用者與健康照護模組

## 核心使用者 + 健康照護模組

```mermaid
erDiagram
    %% 核心使用者
    User {
        string id PK
        string email UK
        string password_hash
        string display_name
        string picture_url
        string auth_provider
        string role
        string timezone
        datetime created_at
        datetime deleted_at
    }

    Admin {
        string id PK
        string email UK
        string password_hash
        string display_name
        string picture_url
        string auth_provider
        string role
        string timezone
        datetime created_at
        datetime deleted_at
    }

    %% 保健品模組
    Supplement {
        int id PK
        string user_id FK
        string name
        string dosage
        string frequency
        string time_of_day
        string notes
        datetime created_at
        datetime updated_at
    }

    CheckIn {
        int id PK
        string user_id FK
        int supplement_id FK
        datetime checked_at
        date date
    }

    %% 傷口照護模組
    Wound {
        int id PK
        string user_id FK
        string name
        string location
        date date_of_injury
        string wound_type
        string body_location
        string status
        datetime created_at
        datetime updated_at
    }

    WoundLog {
        int id PK
        int wound_id FK
        string user_id FK
        string image_data
        int nrs_pain_score
        string symptoms
        string ai_assessment_summary
        string ai_status_label
        datetime logged_at
        date date
    }

    %% 足部照護模組
    FootAssessment {
        int id PK
        string user_id FK
        string pain_locations
        int nrs_pain_score
        int steps_count
        float standing_hours
        date date
    }

    FootImage {
        int id PK
        string user_id FK
        string image_data
        string ai_severity
        string ai_summary
        json ai_details
        datetime logged_at
    }

    ShoeImage {
        int id PK
        string user_id FK
        string image_data
        string ai_risk_level
        string ai_wear_pattern
        string ai_summary
        json ai_details
        datetime logged_at
    }

    %% 親密健康模組
    IntimacyAssessment {
        int id PK
        string user_id FK
        string gender
        string primary_concern
        json assessment_data
        string ai_summary
        datetime created_at
    }

    %% 經期追蹤模組
    MenstrualCycle {
        string id PK
        string user_id FK,UK
        int cycle_length
        int period_length
        boolean onboarding_done
        datetime created_at
        datetime updated_at
    }

    Period {
        string id PK
        string user_id FK
        datetime start_date
        datetime end_date
        string notes
        datetime created_at
        datetime updated_at
    }

    DailyLog {
        string id PK
        string user_id FK
        datetime date
        json data
        datetime created_at
        datetime updated_at
    }

    %% 關係
    User ||--o{ Supplement : "擁有"
    User ||--o{ CheckIn : "打卡"
    User ||--o{ Wound : "擁有"
    User ||--o{ WoundLog : "記錄"
    User ||--o{ FootAssessment : "評估"
    User ||--o{ FootImage : "上傳"
    User ||--o{ ShoeImage : "上傳"
    User ||--o{ IntimacyAssessment : "評估"
    User ||--|| MenstrualCycle : "設定"
    User ||--o{ Period : "記錄"
    User ||--o{ DailyLog : "記錄"

    Supplement ||--o{ CheckIn : "包含"
    Wound ||--o{ WoundLog : "包含"
```

## 說明

### 核心使用者
- **User**: 病患使用者，支援 LINE 與 Email 雙重認證
- **Admin**: 管理員使用者，用於後台 HQ 系統

### 健康照護模組
1. **保健品追蹤**: Supplement（保健品）+ CheckIn（打卡記錄）
2. **傷口照護**: Wound（傷口）+ WoundLog（照護日誌，含 AI 分析）
3. **足部照護**: FootAssessment（評估）+ FootImage（AI 影像分析）+ ShoeImage（鞋子磨損分析）
4. **親密健康**: IntimacyAssessment（評估問卷）
5. **經期追蹤**: MenstrualCycle（設定）+ Period（經期記錄）+ DailyLog（每日詳細記錄）

### 關鍵設計
- 所有模組都關聯到 `User`
- 支援軟刪除（`deleted_at`）
- AI 分析結果儲存在各模組的 Log 表中
