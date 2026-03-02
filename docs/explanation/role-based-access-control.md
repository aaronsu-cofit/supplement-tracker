# 角色與權限控制 (Role-Based Access Control)

本文檔說明了 Supplement Tracker (含四大核心模組) 的權限分級架構，以便開發人員在實作後台 (Admin Panel) 或 API 時進行防護。

## 1. 角色定義 (Roles)

本系統將使用者 (存在於 `users` 資料表的 `role` 欄位) 分為三個等級：

### 🧑‍💻 Super Admin (最高權限管理員)
- **職責**：系統擁有者、最高指揮官。
- **權限範圍**：
  - 擁有系統中所有資源的讀寫與刪除權限。
  - 唯一允許進入 `/hq` 總樞紐中心。
  - 唯一允許執行 `/api/line/richmenu/*` 等系統級、影響全體使用者的操作。
  - 唯一允許透過 `/hq/admins` 變更他人權限。

### 🩺 Admin (一般管理員)
- **職責**：醫師、護理師、客服人員或小編。
- **權限範圍**：
  - 允許進入各子模組的專屬後台，例如 `/wounds/admin`、`/bones/history`。
  - 可以查看所有病患的紀錄、照片與 AI 分析結果。
  - 可以編輯或註記病患資料。
  - **禁止** 進入 `/hq` 改變系統架構或變更他人權限。

### 👤 User (一般病患/消費者)
- **職責**：透過 LINE LIFF 來使用服務的最末端用戶。
- **權限範圍**：
  - 僅能查看與操作「與自己綁定 (依據 `user_id`)」的健康資料。
  - 僅允許進入前端路由 (如 `/wounds`、`/supplements`)。
  - **禁止** 進入任何 `/hq` 或 `/*/admin` 結尾的後台路由，否則將被強制拒絕或跳轉。

---

## 2. API 防護實作 (Middleware & API Route)

### API 層級檢查範例
在開發需要防護的 API (如 Serverless Function) 時，應於程式碼開頭呼叫權限確認。

```javascript
import { getUserId } from '@/app/lib/userId';
import { findUserById } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const currentUserId = await getUserId();
    if (!currentUserId) return NextResponse.json({ error: '未登入' }, { status: 401 });

    const currentUser = await findUserById(currentUserId);
    
    // 檢查是否為 Super Admin
    if (currentUser?.role !== 'superadmin') {
        return NextResponse.json({ error: '權限不足 (Forbidden)' }, { status: 403 });
    }

    // ... 執行後續高權限邏輯 ...
}
```

## 3. 升級/遷移指南 (Migrations)

- V2 之前的舊版專案預設沒有 `role` 欄位。
- 在 `src/app/lib/db.js` 的 `initializeDatabase` 中，系統會在啟動時透過 `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'` 自動補齊結構。
- **初始 Super Admin 建立方法**：由於系統沒有預設帳號，第一位最高權限者需要透過資料庫 GUI (例如 Neon Console) 將自己的 `role` 欄位手動從 `user` 修改為 `superadmin`。之後便能在 HQ 介面中將其他人升級。
