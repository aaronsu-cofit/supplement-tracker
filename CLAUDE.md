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

## Frontend Rules

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
