# Vitera Backend API 文檔

**版本:** 0.2.0 (Fastify MVC)
**Base URL:** `http://localhost:8081` (開發) | `https://api.vitera.app` (生產)
**日期:** 2026-05-11

---

## 📋 目錄

1. [API 概述](#api-概述)
2. [認證方式](#認證方式)
3. [請求/響應格式](#請求響應格式)
4. [錯誤代碼](#錯誤代碼)
5. [API 端點](#api-端點)
   - [認證 (Auth)](#認證-auth)
   - [補充品 (Supplements)](#補充品-supplements)
   - [傷口管理 (Wounds)](#傷口管理-wounds)
   - [HQ 管理系統 (HQ)](#hq-管理系統-hq)
   - [親密關係評估 (Intimacy)](#親密關係評估-intimacy)
   - [調度器 (Scheduler)](#調度器-scheduler)
   - [AI 服務 (AI)](#ai-服務-ai)
   - [嚮導 (Wizard)](#嚮導-wizard)
   - [足部健康 (Footcare)](#足部健康-footcare)
   - [圖像分析 (Analyze)](#圖像分析-analyze)
   - [打卡記錄 (CheckIns)](#打卡記錄-checkins)
   - [通知推送 (Notify)](#通知推送-notify)
   - [模組管理 (Modules)](#模組管理-modules)
   - [Rich Menu (RichMenu)](#rich-menu-richmenu)
   - [LINE OA (LineOA)](#line-oa-lineoa)
   - [用戶資料 (Me)](#用戶資料-me)
   - [產品管理 (Products)](#產品管理-products)
   - [女性健康 (WomenHealing)](#女性健康-womenhealing)
6. [分頁和篩選](#分頁和篩選)
7. [速率限制](#速率限制)

---

## API 概述

Vitera Backend API 是一個 RESTful API,為 Vitera 健康管理平台提供完整的後端服務支持。API 採用 JSON 格式進行數據交換，支持標準的 HTTP 方法和狀態碼。

### 核心特性

- ✅ **RESTful 設計** - 遵循 REST 架構原則
- ✅ **JWT 認證** - 安全的用戶認證機制
- ✅ **自動驗證** - Schema 驗證確保數據完整性
- ✅ **統一錯誤格式** - 一致的錯誤響應
- ✅ **CORS 支持** - 跨域資源共享
- ✅ **高性能** - Fastify 框架保證低延遲

### 支持的 HTTP 方法

| 方法 | 用途 |
|------|------|
| GET | 獲取資源 |
| POST | 創建資源 |
| PUT | 完整更新資源 |
| PATCH | 部分更新資源 |
| DELETE | 刪除資源 |

### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 請求成功 |
| 201 | 資源創建成功 |
| 204 | 請求成功，無返回內容 |
| 400 | 請求參數錯誤 |
| 401 | 未授權，需要認證 |
| 403 | 禁止訪問 |
| 404 | 資源不存在 |
| 500 | 服務器內部錯誤 |

---

## 認證方式

### JWT Token 認證

Vitera API 使用 **JWT (JSON Web Token)** 進行用戶認證。

#### 獲取 Token

通過登入端點獲取 token:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**響應:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 使用 Token

##### 方式 1: httpOnly Cookie (推薦)

Token 自動存儲在 httpOnly Cookie 中，瀏覽器會自動發送：

```http
GET /api/supplements
Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

##### 方式 2: Authorization Header

```http
GET /api/supplements
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 認證模式

| 模式 | 說明 | 使用場景 |
|------|------|---------|
| **嚴格認證** | 必須提供有效 token | 用戶個人資料、創建/修改操作 |
| **軟認證** | token 可選，支持匿名訪問 | 公開內容 + 個性化內容 |
| **無認證** | 不需要 token | 健康檢查、公開信息 |

---

## 請求響應格式

### 請求格式

#### JSON 請求體

```http
POST /api/supplements
Content-Type: application/json

{
  "name": "Vitamin C",
  "dosage": "1000mg",
  "frequency": 1
}
```

#### URL 參數

```http
GET /api/supplements?skip=0&take=10&sort=created_at
```

#### 路徑參數

```http
GET /api/supplements/123
PUT /api/supplements/123
DELETE /api/supplements/123
```

### 成功響應

#### 單個資源

```json
{
  "id": 123,
  "user_id": "user-123",
  "name": "Vitamin C",
  "dosage": "1000mg",
  "frequency": 1,
  "created_at": "2026-05-11T10:30:00Z",
  "updated_at": "2026-05-11T10:30:00Z"
}
```

#### 資源列表

```json
[
  {
    "id": 123,
    "name": "Vitamin C",
    "dosage": "1000mg"
  },
  {
    "id": 124,
    "name": "Vitamin D",
    "dosage": "2000 IU"
  }
]
```

#### 分頁列表

```json
{
  "data": [
    { "id": 123, "name": "Item 1" },
    { "id": 124, "name": "Item 2" }
  ],
  "pagination": {
    "total": 50,
    "skip": 0,
    "take": 10,
    "hasMore": true
  }
}
```

---

## 錯誤代碼

### 錯誤響應格式

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 常見錯誤類型

#### 400 - Validation Error

**原因:** 請求參數驗證失敗

**範例:**
```json
{
  "error": "Validation Error",
  "message": "Name cannot be empty",
  "statusCode": 400,
  "details": [
    { "field": "name", "message": "Name is required" }
  ]
}
```

#### 401 - Unauthorized

**原因:** 未提供 token 或 token 無效

**範例:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "statusCode": 401
}
```

#### 403 - Forbidden

**原因:** 無權限訪問該資源

**範例:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource",
  "statusCode": 403
}
```

#### 404 - Not Found

**原因:** 資源不存在

**範例:**
```json
{
  "error": "Not Found",
  "message": "Supplement not found",
  "statusCode": 404
}
```

#### 500 - Internal Server Error

**原因:** 服務器內部錯誤

**範例:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## API 端點

### 認證 (Auth)

**Base Path:** `/api/auth`

#### POST /api/auth/login

**描述:** 用戶登入 (Email + Password)

**認證:** 無

**請求體:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**響應 (200):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "line_user_id": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**錯誤:**
- `400` - 缺少必填字段
- `401` - 用戶名或密碼錯誤

---

#### POST /api/auth/register

**描述:** 用戶註冊

**認證:** 無

**請求體:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe"
}
```

**響應 (201):**
```json
{
  "user": {
    "id": "user-124",
    "email": "newuser@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**錯誤:**
- `400` - Email 格式錯誤或密碼太短
- `409` - Email 已被註冊

---

#### POST /api/auth/me

**描述:** LINE LIFF 登入 (靜默登入)

**認證:** 無

**請求體:**
```json
{
  "accessToken": "LINE_ACCESS_TOKEN"
}
```

**響應 (200):**
```json
{
  "user": {
    "id": "user-125",
    "line_user_id": "U1234567890abcdef",
    "name": "LINE User",
    "email": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**錯誤:**
- `400` - 缺少 accessToken
- `401` - LINE token 驗證失敗

---

#### GET /api/auth/me

**描述:** 獲取當前用戶資料

**認證:** 嚴格 (必須登入)

**響應 (200):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "line_user_id": "U1234567890abcdef",
  "created_at": "2026-01-01T00:00:00Z"
}
```

**錯誤:**
- `401` - 未登入或 token 無效

---

#### DELETE /api/auth/me

**描述:** 用戶登出

**認證:** 嚴格 (必須登入)

**響應 (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST /api/auth/admin/login

**描述:** 管理員登入

**認證:** 無

**請求體:**
```json
{
  "email": "admin@vitera.app",
  "password": "admin_password"
}
```

**響應 (200):**
```json
{
  "user": {
    "id": "admin-1",
    "email": "admin@vitera.app",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 補充品 (Supplements)

**Base Path:** `/api/supplements`

#### GET /api/supplements

**描述:** 獲取用戶的補充品列表

**認證:** 軟認證 (支持匿名)

**查詢參數:**
- `skip` (可選): 跳過筆數，默認 0
- `take` (可選): 取得筆數，默認 20

**響應 (200):**
```json
[
  {
    "id": 1,
    "user_id": "user-123",
    "name": "Vitamin C",
    "dosage": "1000mg",
    "frequency": 1,
    "notes": "每日早餐後服用",
    "created_at": "2026-05-01T08:00:00Z",
    "updated_at": "2026-05-01T08:00:00Z"
  },
  {
    "id": 2,
    "user_id": "user-123",
    "name": "Vitamin D",
    "dosage": "2000 IU",
    "frequency": 1,
    "notes": null,
    "created_at": "2026-05-02T09:00:00Z",
    "updated_at": "2026-05-02T09:00:00Z"
  }
]
```

---

#### POST /api/supplements

**描述:** 創建新的補充品記錄

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "name": "Omega-3",
  "dosage": "1000mg",
  "frequency": 2,
  "notes": "早晚餐後各一顆"
}
```

**響應 (201):**
```json
{
  "id": 3,
  "user_id": "user-123",
  "name": "Omega-3",
  "dosage": "1000mg",
  "frequency": 2,
  "notes": "早晚餐後各一顆",
  "created_at": "2026-05-11T10:30:00Z",
  "updated_at": "2026-05-11T10:30:00Z"
}
```

**錯誤:**
- `400` - 缺少必填字段 (name, dosage)
- `401` - 未登入

---

#### PUT /api/supplements/:id

**描述:** 更新補充品記錄

**認證:** 嚴格 (必須登入)

**路徑參數:**
- `id`: 補充品 ID

**請求體:**
```json
{
  "name": "Omega-3 Updated",
  "dosage": "1500mg",
  "frequency": 2,
  "notes": "增加劑量"
}
```

**響應 (200):**
```json
{
  "id": 3,
  "user_id": "user-123",
  "name": "Omega-3 Updated",
  "dosage": "1500mg",
  "frequency": 2,
  "notes": "增加劑量",
  "updated_at": "2026-05-11T11:00:00Z"
}
```

**錯誤:**
- `400` - ID 格式錯誤
- `404` - 補充品不存在或無權限

---

#### DELETE /api/supplements/:id

**描述:** 刪除補充品記錄

**認證:** 嚴格 (必須登入)

**路徑參數:**
- `id`: 補充品 ID

**響應 (200):**
```json
{
  "success": true
}
```

**錯誤:**
- `400` - ID 格式錯誤
- `404` - 補充品不存在或無權限

---

### 傷口管理 (Wounds)

**Base Path:** `/api/wounds`

#### GET /api/wounds

**描述:** 獲取用戶的傷口記錄列表

**認證:** 嚴格 (必須登入)

**響應 (200):**
```json
[
  {
    "id": 1,
    "user_id": "user-123",
    "location": "左膝",
    "type": "擦傷",
    "size": "3cm x 2cm",
    "status": "healing",
    "images": ["image-url-1", "image-url-2"],
    "notes": "已消毒並包紮",
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-11T09:00:00Z"
  }
]
```

---

#### POST /api/wounds

**描述:** 創建新的傷口記錄

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "location": "右手臂",
  "type": "割傷",
  "size": "2cm",
  "notes": "意外割傷"
}
```

**響應 (201):**
```json
{
  "id": 2,
  "user_id": "user-123",
  "location": "右手臂",
  "type": "割傷",
  "size": "2cm",
  "status": "new",
  "images": [],
  "notes": "意外割傷",
  "created_at": "2026-05-11T10:30:00Z"
}
```

---

#### PUT /api/wounds/:id

**描述:** 更新傷口記錄

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "status": "healing",
  "notes": "傷口已開始癒合"
}
```

---

#### POST /api/wounds/:id/images

**描述:** 上傳傷口圖片

**認證:** 嚴格 (必須登入)

**請求體:** multipart/form-data

**響應 (201):**
```json
{
  "imageUrl": "https://storage.googleapis.com/vitera-wounds/image-123.jpg"
}
```

---

#### GET /api/wounds/:id/analysis

**描述:** 獲取 AI 傷口分析結果

**認證:** 嚴格 (必須登入)

**響應 (200):**
```json
{
  "woundId": 1,
  "analysis": {
    "severity": "moderate",
    "healing_stage": "inflammatory",
    "recommendations": [
      "保持傷口清潔乾燥",
      "每日更換敷料",
      "如有紅腫加劇請就醫"
    ],
    "confidence": 0.89
  },
  "analyzed_at": "2026-05-11T10:35:00Z"
}
```

---

### HQ 管理系統 (HQ)

**Base Path:** `/api/hq`

#### GET /api/hq/modules

**描述:** 獲取所有模組列表 (管理員)

**認證:** 嚴格 (管理員)

**響應 (200):**
```json
[
  {
    "id": 1,
    "key": "supplements",
    "name": "補充品管理",
    "description": "追蹤營養補充品攝取",
    "icon": "💊",
    "enabled": true,
    "order": 1
  },
  {
    "id": 2,
    "key": "wounds",
    "name": "傷口管理",
    "description": "智慧傷口追蹤與 AI 分析",
    "icon": "🩹",
    "enabled": true,
    "order": 2
  }
]
```

---

#### POST /api/hq/modules

**描述:** 創建新模組

**認證:** 嚴格 (管理員)

**請求體:**
```json
{
  "key": "exercise",
  "name": "運動追蹤",
  "description": "記錄每日運動量",
  "icon": "🏃",
  "enabled": true,
  "order": 10
}
```

---

#### PATCH /api/hq/modules/:id

**描述:** 更新模組配置

**認證:** 嚴格 (管理員)

---

#### GET /api/hq/users

**描述:** 獲取用戶列表

**認證:** 嚴格 (管理員)

**查詢參數:**
- `skip`: 跳過筆數
- `take`: 取得筆數
- `search`: 搜尋關鍵字 (email/name)

---

#### GET /api/hq/stats

**描述:** 獲取平台統計數據

**認證:** 嚴格 (管理員)

**響應 (200):**
```json
{
  "totalUsers": 1523,
  "activeUsers": 892,
  "totalSupplements": 4521,
  "totalWounds": 234,
  "totalCheckIns": 12456
}
```

---

### 親密關係評估 (Intimacy)

**Base Path:** `/api/intimacy`

#### GET /api/intimacy/assessment

**描述:** 獲取用戶的親密關係評估記錄

**認證:** 嚴格 (必須登入)

---

#### POST /api/intimacy/assessment

**描述:** 提交新的親密關係評估

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "answers": {
    "q1": 4,
    "q2": 3,
    "q3": 5
  }
}
```

**響應 (201):**
```json
{
  "id": 1,
  "user_id": "user-123",
  "score": 72,
  "category": "healthy",
  "recommendations": [
    "繼續保持良好的溝通",
    "定期安排約會時間"
  ],
  "created_at": "2026-05-11T10:30:00Z"
}
```

---

### 調度器 (Scheduler)

**Base Path:** `/api/scheduler`

#### POST /api/scheduler/run-daily-cycle

**描述:** 手動觸發每日排程任務 (管理員/Cron)

**認證:** 嚴格 (管理員)

---

#### GET /api/scheduler/status

**描述:** 獲取調度器狀態

**認證:** 嚴格 (管理員)

---

### AI 服務 (AI)

**Base Path:** `/api/ai`

#### POST /api/ai/analyze-image

**描述:** AI 圖像分析 (通用)

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "type": "wound"
}
```

---

#### POST /api/ai/generate-content

**描述:** AI 內容生成

**認證:** 嚴格 (必須登入)

---

### 嚮導 (Wizard)

**Base Path:** `/api/wizard`

#### GET /api/wizard/onboarding

**描述:** 獲取新用戶引導流程

**認證:** 嚴格 (必須登入)

---

### 足部健康 (Footcare)

**Base Path:** `/api/footcare`

#### GET /api/footcare/assessments

**描述:** 獲取足部健康評估記錄

**認證:** 嚴格 (必須登入)

---

#### POST /api/footcare/assessments

**描述:** 創建足部健康評估

**認證:** 嚴格 (必須登入)

---

### 圖像分析 (Analyze)

**Base Path:** `/api/analyze`

#### POST /api/analyze

**描述:** 多用途圖像分析端點

**認證:** 嚴格 (必須登入)

**請求體:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "analysisType": "wound" | "label" | "hallux_valgus"
}
```

---

### 打卡記錄 (CheckIns)

**Base Path:** `/api/checkins`

#### GET /api/checkins

**描述:** 獲取打卡記錄列表

**認證:** 軟認證

---

#### POST /api/checkins

**描述:** 創建打卡記錄

**認證:** 嚴格 (必須登入)

---

#### DELETE /api/checkins

**描述:** 刪除打卡記錄

**認證:** 嚴格 (必須登入)

---

### 通知推送 (Notify)

**Base Path:** `/api/notify`

#### POST /api/notify/send

**描述:** 發送通知 (管理員)

**認證:** 嚴格 (管理員)

---

### 模組管理 (Modules)

**Base Path:** `/api/modules`

#### GET /api/modules

**描述:** 獲取可用模組列表

**認證:** 軟認證

**響應 (200):**
```json
[
  {
    "id": 1,
    "key": "supplements",
    "name": "補充品管理",
    "icon": "💊",
    "enabled": true
  },
  {
    "id": 2,
    "key": "wounds",
    "name": "傷口管理",
    "icon": "🩹",
    "enabled": true
  }
]
```

---

### Rich Menu (RichMenu)

**Base Path:** `/api/richmenu`

#### GET /api/richmenu/templates

**描述:** 獲取 Rich Menu 模板列表

**認證:** 嚴格 (管理員)

---

#### POST /api/richmenu/templates

**描述:** 創建 Rich Menu 模板

**認證:** 嚴格 (管理員)

---

### LINE OA (LineOA)

**Base Path:** `/api/lineoa`

#### GET /api/lineoa

**描述:** 獲取 LINE 官方帳號列表

**認證:** 嚴格 (管理員)

---

#### POST /api/lineoa

**描述:** 創建新的 LINE OA 配置

**認證:** 嚴格 (管理員)

---

### 用戶資料 (Me)

**Base Path:** `/api/me`

#### GET /api/me/profile

**描述:** 獲取當前用戶完整資料

**認證:** 嚴格 (必須登入)

---

#### PATCH /api/me/profile

**描述:** 更新用戶資料

**認證:** 嚴格 (必須登入)

---

### 產品管理 (Products)

**Base Path:** `/api/products`

#### GET /api/products

**描述:** 獲取產品列表

**認證:** 軟認證

---

#### POST /api/products

**描述:** 創建新產品 (管理員)

**認證:** 嚴格 (管理員)

---

### 女性健康 (WomenHealing)

**Base Path:** `/api/womenhealing`

#### GET /api/womenhealing/assessments

**描述:** 獲取女性健康評估記錄

**認證:** 嚴格 (必須登入)

---

#### POST /api/womenhealing/assessments

**描述:** 創建女性健康評估

**認證:** 嚴格 (必須登入)

---

## 分頁和篩選

### 分頁參數

大多數列表端點支持分頁:

```http
GET /api/supplements?skip=0&take=20
```

**參數:**
- `skip`: 跳過的記錄數 (默認 0)
- `take`: 返回的記錄數 (默認 20, 最大 100)

**響應格式 (如果支持):**
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "skip": 0,
    "take": 20,
    "hasMore": true
  }
}
```

### 排序參數

```http
GET /api/supplements?sort=created_at&order=desc
```

**參數:**
- `sort`: 排序字段 (默認 `created_at`)
- `order`: 排序順序 (`asc` | `desc`)

### 篩選參數

根據端點不同支持不同的篩選參數:

```http
GET /api/hq/users?search=john&status=active
```

---

## 速率限制

**當前狀態:** 未實施

**計劃實施:**
- 認證用戶: 1000 req/hour
- 匿名用戶: 100 req/hour
- 管理員: 無限制

**超出限制響應 (429):**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "statusCode": 429,
  "retryAfter": 3600
}
```

---

## 附錄

### 完整端點統計

| 模塊 | 端點數量 | 認證模式 |
|------|---------|---------|
| Auth | 6 | 混合 |
| Supplements | 8 | 軟認證 + 嚴格 |
| Wounds | 12 | 嚴格 |
| HQ | 15 | 嚴格 (管理員) |
| Intimacy | 6 | 嚴格 |
| Scheduler | 4 | 嚴格 (管理員) |
| AI | 5 | 嚴格 |
| Wizard | 3 | 嚴格 |
| Footcare | 5 | 嚴格 |
| Analyze | 4 | 嚴格 |
| CheckIns | 7 | 軟認證 + 嚴格 |
| Notify | 6 | 嚴格 (管理員) |
| Modules | 5 | 軟認證 |
| RichMenu | 4 | 嚴格 (管理員) |
| LineOA | 6 | 嚴格 (管理員) |
| Me | 5 | 嚴格 |
| Products | 6 | 軟認證 + 嚴格 |
| WomenHealing | 5 | 嚴格 |
| **總計** | **112+** | - |

### 測試工具

#### cURL 範例

```bash
# 登入
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 獲取補充品列表 (with cookie)
curl -X GET http://localhost:8081/api/supplements \
  -H "Cookie: auth_token=YOUR_TOKEN"

# 創建補充品
curl -X POST http://localhost:8081/api/supplements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Vitamin C","dosage":"1000mg","frequency":1}'
```

#### Postman Collection

建議使用 Postman 測試 API，可以導入 OpenAPI 規範 (未來提供)。

---

**文檔編制:** Claude (Vitera 架構師)
**最後更新:** 2026-05-11
**版本:** 1.0.0
