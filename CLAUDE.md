# Vitera Monorepo — AI Development Guidelines

## 📝 自動更新文件規則（Documentation Auto-Update Rules）

> **重要原則**：AI 修改程式碼後，必須主動更新相關文件，無需等待使用者要求。

### 1. 資料庫 Schema 變更

**觸發條件**：修改 `backend/prisma/schema.prisma`

**必須更新的文件**：
- `docs/reference/database-schema.md` — 更新受影響的資料表定義
- `docs/reference/er-diagrams.md` — 如果新增或移除資料表
- `docs/reference/er-diagram-*.md` — 更新對應模組的 ER 圖（core/platform/gamification/women-healing）

**檢查清單**：
- [ ] 新增的欄位是否已加入文件說明？
- [ ] 關係變更是否反映在 ER 圖中？
- [ ] Unique constraints 和 Indexes 是否記錄？

---

### 2. API Endpoints 變更

**觸發條件**：
- 新增或修改 `backend/src/routes/*.routes.ts` 中的 API
- 修改 `backend/src/controllers/*.controller.ts` 的端點邏輯
- 修改 `backend/src/services/*.service.ts` 影響 API 行為

**必須更新的文件**：
- `docs/reference/api-endpoints.md` — 新增或更新 API 端點說明
  - 包含：Method、Path、說明、Request Body、Response、認證要求

**檢查清單**：
- [ ] 新端點是否已加入對應的模組區塊？
- [ ] Request/Response 範例是否正確？
- [ ] 認證要求是否標註清楚？
- [ ] 錯誤回應是否說明？

---

### 3. 新增 App 或模組

**觸發條件**：
- 在 `apps/` 下新增應用程式
- 新增重大功能模組

**必須更新的文件**：
- `docs/tutorials/01-local-setup.md` — 新增啟動指令、port 對照表
- `docs/reference/module-versions.md` — 新增模組版本記錄（V1.0 + 發布日期）
- `docs/reference/database-schema.md` — 如果有新的資料表
- `docs/explanation/architecture-overview.md` — 更新架構說明（如適用）

**檢查清單**：
- [ ] 啟動指令（`pnpm dev:xxx`）是否加入？
- [ ] Port 是否加入對照表？
- [ ] 環境變數設定是否說明？
- [ ] 模組初始版本是否記錄？

---

### 4. 認證流程變更

**觸發條件**：
- 修改 `backend/src/middleware/auth.ts`
- 修改 `backend/src/routes/auth.routes.ts`
- 修改 `packages/lib/src/auth/` 或 `packages/client-auth/`

**必須更新的文件**：
- `docs/reference/auth-flow.md` — 更新認證流程說明
- `docs/reference/api-endpoints.md` — 更新認證相關 API

**檢查清單**：
- [ ] 認證流程圖是否更新？
- [ ] JWT payload 變更是否記錄？
- [ ] Cookie 屬性變更是否說明？

---

### 5. LLM/AI 架構變更

**觸發條件**：
- 修改 `backend/src/lib/ai.ts` (Gemini direct)
- 修改 `backend/src/lib/adk.ts` (AI Skill Platform)
- 修改 `backend/src/lib/llmFallback.ts`
- 變更 AI 模型列表或 fallback 策略

**必須更新的文件**：
- `docs/reference/llm-architecture.md` — 更新 AI 架構說明

**檢查清單**：
- [ ] 新增的 AI 呼叫路徑是否加入流程圖？
- [ ] 模型列表是否更新？
- [ ] 新的使用情境是否加入「When to use which」表格？

---

### 6. 重大架構變更

**觸發條件**：
- 框架升級（Next.js、Fastify、Prisma 等）
- 新增重大依賴或服務
- Monorepo 結構調整

**必須更新的文件**：
- `docs/explanation/architecture-overview.md` — 更新系統架構說明
- `docs/reference/module-versions.md` — 記錄架構演進
- `docs/tutorials/01-local-setup.md` — 如果影響本地開發流程

**檢查清單**：
- [ ] 技術棧變更是否記錄？
- [ ] 新的開發工作流程是否說明？
- [ ] 遷移步驟是否提供？

---

### 7. 套件或依賴變更

**觸發條件**：
- 在 `packages/` 下新增共用套件
- 修改 `@vitera/*` 套件的 API

**必須更新的文件**：
- `docs/reference/auth-flow.md` — 如果是認證相關套件
- `docs/tutorials/01-local-setup.md` — 如果影響前端環境變數
- README（如果套件有獨立 README）

**檢查清單**：
- [ ] 新套件的用途是否說明？
- [ ] 使用範例是否提供？
- [ ] 依賴關係是否清楚？

---

### 8. 模組版本升級

**觸發條件**：
- 完成重大功能開發（Epic）
- 發布新版本到 staging/production

**必須更新的文件**：
- `docs/reference/module-versions.md` — 新增版本記錄

**版本號規則**：
- **Major (V3.0)**：重大架構變更或新增核心功能
- **Minor (V2.1)**：功能增強或重要特性添加
- **Patch**：bug fixes（不記錄在文件中，使用 git commit）

**檢查清單**：
- [ ] 版本號是否正確？
- [ ] 發布日期是否填寫？
- [ ] 重點更新內容是否列出？

---

## Backend Rules

### Prisma ORM Best Practices

#### 1. 避免 N+1 查詢問題

**❌ 錯誤：逐個查詢關聯資料**
```typescript
// 這會產生 1 + N 次查詢（N = users 數量）
const users = await db.user.findMany();
for (const user of users) {
  const enrollments = await db.enrollment.findMany({
    where: { user_id: user.id }
  });
}
```

**✅ 正確：使用 include 一次查詢**
```typescript
// 只產生 1 次查詢（使用 JOIN）
const users = await db.user.findMany({
  include: {
    enrollments: true
  }
});
```

**✅ 更好：只選取需要的欄位**
```typescript
const users = await db.user.findMany({
  select: {
    id: true,
    display_name: true,
    enrollments: {
      select: {
        id: true,
        scenario_id: true,
        enrolled_at: true
      }
    }
  }
});
```

#### 2. 批量操作

**❌ 錯誤：迴圈中逐個插入**
```typescript
for (const data of dataArray) {
  await db.user.create({ data });
}
```

**✅ 正確：使用 createMany**
```typescript
await db.user.createMany({
  data: dataArray,
  skipDuplicates: true // 遇到唯一約束衝突時跳過
});
```

**批量更新範例**
```typescript
// 使用交易批量更新
await db.$transaction(
  dataArray.map(item =>
    db.user.update({
      where: { id: item.id },
      data: { status: item.status }
    })
  )
);
```

#### 3. 交易處理

**使用情境**：多個資料表操作需要保證原子性

```typescript
// ✅ 使用 $transaction 確保一致性
await db.$transaction(async (tx) => {
  const enrollment = await tx.enrollment.create({
    data: {
      user_id: userId,
      scenario_id: scenarioId
    }
  });

  await tx.messageDelivery.create({
    data: {
      user_id: userId,
      scenario_id: scenarioId,
      node_id: 'welcome-node'
    }
  });

  // 如果任何一步失敗，整個交易都會 rollback
});
```

#### 4. 查詢優化

**善用 where + include 組合**
```typescript
// ✅ 在資料庫層面過濾，而非拿到應用層再過濾
const activeEnrollments = await db.enrollment.findMany({
  where: {
    status: 'active',
    scenario: {
      is_active: true
    }
  },
  include: {
    user: {
      select: {
        id: true,
        display_name: true,
        timezone: true
      }
    },
    scenario: {
      select: {
        id: true,
        name: true,
        flow_nodes: true,
        flow_edges: true
      }
    }
  }
});
```

**使用 cursor-based pagination 處理大量資料**
```typescript
// ❌ offset 在大數據時效能差
const items = await db.item.findMany({
  skip: 1000,
  take: 50
});

// ✅ cursor 效能更好
const items = await db.item.findMany({
  take: 50,
  cursor: lastItemId ? { id: lastItemId } : undefined,
  orderBy: { created_at: 'desc' }
});
```

#### 5. 檢查點清單

實作 Prisma 查詢時，檢查以下事項：

- [ ] **避免 N+1**：關聯資料是否使用 `include` 或 `select`？
- [ ] **只選必要欄位**：是否使用 `select` 限制回傳欄位？
- [ ] **批量操作**：迴圈中的 create/update 是否可改用 `createMany` 或 `$transaction`？
- [ ] **索引支援**：where 條件的欄位是否有建立索引（見 schema.prisma 的 `@@index`）？
- [ ] **交易保護**：多步驟操作是否需要用 `$transaction` 包裹？
- [ ] **分頁機制**：大量資料查詢是否使用 cursor-based pagination？

#### 6. 常見陷阱

**陷阱 1：忘記處理 null**
```typescript
// ❌ 可能拋出錯誤
const user = await db.user.findUnique({ where: { id } });
console.log(user.display_name); // user 可能是 null

// ✅ 先檢查
const user = await db.user.findUnique({ where: { id } });
if (!user) throw new Error('User not found');
console.log(user.display_name);
```

**陷阱 2：在 include 中過度嵌套**
```typescript
// ❌ 太深的嵌套會導致查詢複雜且慢
const data = await db.user.findMany({
  include: {
    enrollments: {
      include: {
        scenario: {
          include: {
            lineOa: {
              include: {
                templates: true
              }
            }
          }
        }
      }
    }
  }
});

// ✅ 只 include 真正需要的層級，或分次查詢
```

**陷阱 3：誤用 findFirst 當作唯一查詢**
```typescript
// ❌ findFirst 不保證唯一性
const user = await db.user.findFirst({
  where: { email: 'test@example.com' }
});

// ✅ 如果 email 有 unique constraint，用 findUnique
const user = await db.user.findUnique({
  where: { email: 'test@example.com' }
});
```

---

### Database Design Conventions

新增或修改資料表時，**必須**遵守 [DB Conventions](./backend/docs/db-conventions.md) 中定義的跨資料表慣例。

#### 快速參考

**1. 生命週期管理**
- **`is_active: Boolean`** → 用於可切換的開關狀態（OA、Template、Scenario 等）
- **`status: VarChar(20)`** → 用於多狀態生命週期（Enrollment: 'active' | 'completed' | 'abandoned'）
- **`deleted_at: DateTime?`** → 只用於 `User` 資料表（PII 合規的軟刪除）

**2. UserAttribute 命名規則**
- 產品專屬屬性必須加前綴：`period_*`, `nutri_*`, `wounds_*`
- 跨產品共享屬性無前綴：`life_stage`, `primary_concern`, `timezone`

**3. 外鍵級聯刪除（PII 合規）**

所有 per-user 資料表必須宣告 `onDelete: Cascade`：

```prisma
model UserAttribute {
  id      String @id @default(cuid())
  user_id String @db.VarChar(64)
  key     String @db.VarChar(100)
  value   String

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("user_attributes")
}
```

同時在 `model User` 中加入 back-relation：

```prisma
model User {
  // ... 其他欄位
  user_attributes UserAttribute[]
}
```

**4. 索引策略**

新增索引的時機：
- ✅ 過濾欄位（`is_active`, `deleted_at`, `status`）
- ✅ JOIN 欄位（外鍵會自動建立，但可明確宣告）
- ✅ 排序 + LIMIT 組合（建立複合索引）
- ❌ 小資料表（< 10k rows）可省略

**5. 實作檢查清單**

新增資料表時檢查：
- [ ] 生命週期管理：是用 `is_active`、`status` 還是 `deleted_at`？
- [ ] UserAttribute keys：是否需要產品前綴？
- [ ] 外鍵級聯：per-user 資料表是否宣告 `onDelete: Cascade`？
- [ ] Back-relation：`model User` 是否加入對應的 relation？
- [ ] 索引：過濾/排序的欄位是否建立索引？
- [ ] 遵守命名慣例：使用 snake_case，資料表名稱用複數（見 [db-conventions.md](./backend/docs/db-conventions.md)）

---

## Frontend Rules


### 1. 數據與邏輯限制 (Data & Logic)

#### 內容解耦

- 所有文案、選單、模擬數據必須統一存放於 `src/data/mockData.ts`
- UI 組件內僅允許引用數據變數

#### 真實感模擬

- 涉及數據加載時，必須實作 800ms 的延遲模擬
- 必須展示 Skeleton Screen (骨架屏)，而非簡單的 "Loading..." 文字

#### 動態跳轉

- 使用狀態管理模擬分頁切換或彈窗開啟

---

### 2. 視覺與風格限制 (Visuals & Aesthetics)

#### 現代審美

- 遵守 8px 網格系統，注重 Typography (Inter 字體) 與色彩層次感

#### 動態素材 (保證可用)

- 頭像：[https://i.pravatar.cc/150?u=[id]](https://i.pravatar.cc/150?u=[id])
- 情境圖：[https://picsum.photos/seed/[seed]/800/600](https://picsum.photos/seed/[seed]/800/600)

#### 互動反饋

- 所有 Button/Link 必須包含 `hover:`, `active:`, `transition-all` 樣式

---

### 3. 工程品質限制 (Engineering Quality)

#### 組件化架構

- 單一檔案不得超過 150 行，超過則強制拆分

#### 目錄結構

```text
/components
/pages
/hooks
/data
```

#### 響應式

- 預設採 Mobile-first 開發模式

### Styling Convention: Tailwind CSS v4

All apps in this monorepo use **Tailwind CSS v4**. Follow these rules when writing or modifying UI code.

#### Setup (already in place for all apps)

Every app has:
- `postcss.config.mjs` with `@tailwindcss/postcss` plugin
- `@import "tailwindcss"` at the top of `globals.css`
- `tailwindcss` and `@tailwindcss/postcss` in `devDependencies`

To add to a new app:
```bash
pnpm add tailwindcss @tailwindcss/postcss --filter @vitera/<app-name> --save-dev
```

#### Core Rules

1. **Never use inline `style={{}}` props** unless the value is genuinely dynamic at runtime and cannot be expressed as a static Tailwind class.
2. **Never use `const styles = {}`** JavaScript style objects. Replace with Tailwind `className` strings.
3. **Never inject `<style>` tags** in JSX for keyframe animations or static rules. Put them in `globals.css` under `@layer utilities` or `@keyframes`.

#### Tailwind v4 CSS Configuration

Tailwind v4 is **CSS-first** — no `tailwind.config.js`. All custom tokens go in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-purple: #7c5cfc;
  --color-brand-teal: #5ce0d8;
}

@layer utilities {
  .bg-brand-gradient {
    background: linear-gradient(135deg, #7c5cfc, #5ce0d8);
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

Colors defined in `@theme` automatically enable opacity modifier syntax: `bg-brand-purple/30`, `text-brand-teal/60`.

#### Handling Dynamic Values

**When to use Tailwind classes (preferred):**
- Conditional state: use a ternary in `className`
  ```jsx
  className={`px-4 py-2 rounded ${isActive ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60'}`}
  ```
- Discrete lookup maps (e.g., severity levels, status labels):
  ```js
  const SEVERITY_CLASSES = {
    normal:   'bg-[rgba(168,255,120,0.1)] text-[#a8ff78] border-[#a8ff78]',
    moderate: 'bg-[rgba(255,154,158,0.1)] text-[#ff9a9e] border-[#ff9a9e]',
  };
  // Usage: className={SEVERITY_CLASSES[item.severity]}
  ```

**When inline styles are acceptable (rare exceptions):**
- `accentColor` on `<input type="range">` (no Tailwind equivalent)
- `radial-gradient()` or `conic-gradient()` with runtime color variables
- `animationDelay` with computed values (e.g., `style={{ animationDelay: `${index * 0.1}s` }}`)
- `WebkitTransform` for GPU acceleration on video elements
- Complex SVG `filter` values (`drop-shadow` with dynamic color)
- CSS transitions with `cubic-bezier` + `delay` that Tailwind can't express statically

#### Arbitrary Values

Use Tailwind's `[...]` syntax for non-standard values:
```jsx
className="bg-[#a8ff78] text-[#1a3630] border-[rgba(168,255,120,0.3)]"
className="shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
className="w-[280px] h-[400px]"
```

#### App-Specific Color Tokens (wounds app)

The wounds app defines named colors in its `globals.css` `@theme` block:
- `w-pink`, `w-coral`, `w-blue`, `w-green`, `w-orange`, `w-red`
- Use like: `bg-w-pink`, `text-w-green/60`, `border-w-pink/30`

#### Existing CSS Class Systems

Apps `supplements`, `hq`, `bones`, `intimacy`, `portal` have a shared CSS class system in `globals.css` (`.page-container`, `.spinner`, `.btn-primary`, `.glass-card`, etc.). These CSS classes remain valid — Tailwind and the existing CSS coexist. Continue using those classes where appropriate, and use Tailwind for new code and for replacing inline styles.

#### Workflow for Removing Inline Styles

1. Read the file first
2. Identify all `style={{}}` props
3. For static values → replace with Tailwind `className`
4. For conditional values → use ternary in `className` or a lookup map
5. For truly dynamic values → keep as inline `style`
6. Remove any `const styles = {}` objects after migration
7. Remove `<style>` tags and move rules to `globals.css`
