# Database Schema Reference

本專案使用 Neon Serverless Postgres 作為關聯式資料庫。
資料庫連接在部署環境中透過 Vercel 注入 `DATABASE_URL`，在本地開發中可使用 in-memory fallback（詳見本地開發教學）。

所有 DDL 都在 `src/app/lib/db.js` 的 `initializeDatabase()` 函式中以 `CREATE TABLE IF NOT EXISTS` 自動管理。

---

## 總覽 ER 圖概念

- **users** `1` : `N` **supplements**, **wounds**
- **supplements** `1` : `N` **check_ins**
- **wounds** `1` : `N` **wound_logs**

---

## 1. `users` — 用戶帳號表

儲存透過 LINE 或 Email 註冊的使用者實體。

```sql
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,          -- UUID (信箱註冊) 或 LINE userId
    email VARCHAR(200) UNIQUE,           
    password_hash VARCHAR(200),          -- bcrypt hash
    display_name VARCHAR(200),           -- 用戶名稱 (LINE name)
    picture_url TEXT,                    -- 用戶頭像 (LINE pic)
    auth_provider VARCHAR(20) NOT NULL,  -- 'email' 或 'line'
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. `wounds` — 傷口管理表

管理使用者的傷口清單，支援多傷口。

```sql
CREATE TABLE wounds (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    name VARCHAR(200),                           -- 傷口名稱 (例: 機車犁田)
    wound_type VARCHAR(50) DEFAULT 'other',      -- 傷口種類 (abrasion, surgical, ...)
    body_location VARCHAR(50),                   -- 受傷位置 (left_arm, right_leg, other...)
    status VARCHAR(20) DEFAULT 'active',         -- 狀態 (active: 治療中, archived: 已封存)
    date_of_injury DATE DEFAULT CURRENT_DATE,    -- 受傷日期
    created_at TIMESTAMP DEFAULT NOW(),
    display_name VARCHAR(200),                   -- Legacy: 保留給未整合 users 時期的名稱
    picture_url TEXT                             -- Legacy
);
```

## 3. `wound_logs` — 傷口照護日誌表

紀錄每一次的回診/掃描紀錄。與 `wounds` 表關聯。

```sql
CREATE TABLE wound_logs (
    id SERIAL PRIMARY KEY,
    wound_id INTEGER REFERENCES wounds(id),
    user_id VARCHAR(200),
    image_data TEXT,                           -- base64 encoded JPEG (建議未來移至 S3)
    nrs_pain_score INTEGER,                    -- 0-10 NRS 疼痛量表分數
    symptoms TEXT,                             -- 逗號分隔的症狀字串: '局部發熱,有異味'
    ai_assessment_summary TEXT,                -- AI 根據圖文生成的分析摘要
    ai_status_label VARCHAR(100),              -- 嚴重紅綠燈狀態 (如: '預期進度', '需多加留意')
    logged_at TIMESTAMP DEFAULT NOW(),         -- 紀錄時間
    date DATE DEFAULT CURRENT_DATE             -- 紀錄日期
);
```

## 4. `supplements` — 保健品表

紀錄使用者正在服用的保健品與藥品。

```sql
CREATE TABLE supplements (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    time_of_day VARCHAR(50),                   -- 建議服藥時間 ('morning', 'afternoon', 'evening')
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. `check_ins` — 打卡歷史表

紀錄使用者哪一天有按時服用某種保健品。

```sql
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(200),
    supplement_id INTEGER REFERENCES supplements(id),
    date DATE DEFAULT CURRENT_DATE,            -- 打卡當日日期
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 6. 資料庫 Indexes (效能優化)

```sql
CREATE INDEX idx_supplements_user ON supplements(user_id);
CREATE INDEX idx_checkins_user_date ON check_ins(user_id, date);
CREATE INDEX idx_wounds_user ON wounds(user_id);
CREATE INDEX idx_wound_logs_user_date ON wound_logs(user_id, date);
```
