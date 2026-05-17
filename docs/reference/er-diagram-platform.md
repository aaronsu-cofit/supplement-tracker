# ER 圖：LINE OA 平台與內容管理

## LINE OA 平台 + 產品 + 內容管理

```mermaid
erDiagram
    %% LINE OA 與產品
    LineOA {
        int id PK
        string name
        string description
        string channel_access_token
        string channel_secret
        string line_destination_id
        string default_agent_id
        string ai_skill_platform_url
        string ai_skill_platform_api_key
        string product_id FK
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Product {
        string id PK
        string name
        string description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    OaProduct {
        int oa_id FK
        string product_id FK
        boolean is_default
        int sort_order
        datetime created_at
    }

    UserOaSession {
        string user_id FK
        int oa_id FK
        string current_product_id FK
        datetime last_active_at
    }

    %% 內容管理
    ContentItem {
        string id PK
        string product_id FK
        string key
        string type
        string title
        string body
        json metadata
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    IntentRule {
        string id PK
        string product_id FK
        string name
        int priority
        string match_type
        json patterns
        string action_type
        json action_config
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    %% Rich Menu 與 Scenario
    LineOARichMenuTemplate {
        int id PK
        int oa_id FK
        string name
        json zones
        string line_rich_menu_id
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CoBlocksScenario {
        string id PK
        int oa_id FK
        string name
        json flow_nodes
        json flow_edges
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Enrollment {
        int id PK
        string user_id FK
        string scenario_id FK
        datetime enrolled_at
        string status
        datetime created_at
        datetime updated_at
    }

    MessageDelivery {
        int id PK
        string user_id FK
        string scenario_id FK
        string node_id
        datetime delivered_at
    }

    %% 訊息與互動
    MessageLog {
        int id PK
        int oa_id FK
        string user_id FK
        string direction
        string type
        string content_text
        json content_json
        string source
        string source_ref
        datetime created_at
    }

    UnmatchedIntent {
        int id PK
        string user_id FK
        int oa_id FK
        string product_id FK
        string agent_id
        string message
        string reply
        string skill_key
        string model
        int latency_ms
        string error
        boolean resolved
        datetime created_at
        datetime updated_at
    }

    UserAttribute {
        int id PK
        string user_id FK
        string key
        string value
        datetime set_at
    }

    EngagementEvent {
        int id PK
        string user_id FK
        string event_type
        string payload
        datetime occurred_at
    }

    %% 關係
    LineOA ||--o{ OaProduct : "綁定"
    Product ||--o{ OaProduct : "被綁定"
    LineOA ||--o{ UserOaSession : "session"
    Product ||--o{ UserOaSession : "當前產品"

    Product ||--o{ ContentItem : "包含"
    Product ||--o{ IntentRule : "包含"

    LineOA ||--o{ LineOARichMenuTemplate : "擁有"
    LineOA ||--o{ CoBlocksScenario : "擁有"
    CoBlocksScenario ||--o{ Enrollment : "註冊"
    CoBlocksScenario ||--o{ MessageDelivery : "發送"

    LineOA ||--o{ MessageLog : "記錄"
    LineOA ||--o{ UnmatchedIntent : "未匹配"
    Product ||--o{ UnmatchedIntent : "關聯"
```

## 說明

### LINE OA 平台架構
- **LineOA**: LINE 官方帳號，包含 channel token、AI agent 設定
- **Product**: 可共享的配置包（內容庫、任務、意圖規則等）
- **OaProduct**: N:N 關聯表，一個 OA 可綁定多個 Product
- **UserOaSession**: 使用者在特定 OA 中的當前產品上下文

### 內容管理系統
- **ContentItem**: 可分享的內容項目（文字、Flex、卡片）
- **IntentRule**: 意圖規則（關鍵詞匹配、正則表達式）
- 所有內容都 scope 在 Product 層級，可跨 OA 共享

### Rich Menu 與對話流程
- **LineOARichMenuTemplate**: LINE Rich Menu 模板
- **CoBlocksScenario**: 對話流程情境（節點+邊）
- **Enrollment**: 使用者註冊情境
- **MessageDelivery**: 訊息發送去重機制（防止重複推播）

### 訊息與互動追蹤
- **MessageLog**: 完整對話紀錄（inbound/outbound）
- **UnmatchedIntent**: 未匹配的使用者訊息（AI fallback）
- **UserAttribute**: 使用者屬性（key-value pairs）
- **EngagementEvent**: 語義事件追蹤

### 關鍵設計
- **多租戶架構**: 一個系統支援多個 LINE OA
- **配置共享**: Product 作為配置包，可被多個 OA 綁定
- **上下文管理**: UserOaSession 追蹤使用者當前使用的產品
