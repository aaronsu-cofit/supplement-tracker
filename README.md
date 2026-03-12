# Vitera

**Vitera** 是 [Cofit](https://cofit.health) 旗下的醫療 DTX 工具平台，專為 B2B2C 場景設計。

醫師（骨科、婦產科、外科等）透過 Vitera 平台選擇並指派數位健康小工具給病患，病患透過 LINE LIFF 使用，無需下載 App。

---

## 快速開始

```bash
pnpm install

# 設定後端環境變數
cp backend/.env.example backend/.env

# 設定前端本機環境變數（互動式，一次設定全部 app）
./scripts/setup-local-env.sh

# 啟動
pnpm dev
```

只啟動特定模組（推薦）：

```bash
pnpm dev:hq        # hq + backend
pnpm dev:wounds    # wounds + portal + backend
pnpm dev:bones     # bones + portal + backend
```

詳細說明請見 [ARCHITECTURE.md](./ARCHITECTURE.md) 與 [新人快速上手教學](./docs/tutorials/01-local-setup.md)。

---

## 服務一覽

| App | 說明 | Port |
|---|---|---|
| `apps/portal` | 病患入口（模組導航、登入） | 3000 |
| `apps/wounds` | 傷口智慧追蹤 | 3001 |
| `apps/supplements` | 保健品 / 藥物管理 | 3002 |
| `apps/bones` | 骨骼關節照護（AI 拇趾外翻檢測） | 3003 |
| `apps/intimacy` | 親密健康評估 | 3004 |
| `apps/hq` | 後台管理（模組、管理員） | 3005 |
| `backend` | Hono.js API（GCP Cloud Run） | 8080 |

---

## Git 工作流程

```
main            ← 正式環境（Production），穩定後才 merge
└── staging     ← 測試環境（Staging），CI/CD 自動部署，日常主要在這裡整合
    ├── aaron_develop
    ├── bob_develop
    └── yourname_develop   ← 每位開發者自己的 branch
```

**開發流程：**

1. 第一次加入時，從 `staging` 建立自己的 branch：
   ```bash
   git checkout staging && git pull origin staging
   git checkout -b yourname_develop
   ```

2. 每次開工前同步 `staging`：
   ```bash
   git checkout staging && git pull origin staging
   git checkout yourname_develop && git merge staging
   ```

3. 開發完成後推 branch，在 GitHub 開 PR，base 選 **`staging`**（不是 `main`）。

4. PR merge 進 `staging` 後，CI/CD 自動部署到測試環境。

> 不要直接 push 到 `main` 或 `staging`，一律透過 PR。

---

## 技術棧

- **Frontend**: Next.js 16 · React 19 · Tailwind CSS v4 · pnpm Workspaces · Turborepo · GCP Cloud Run · Docker
- **Backend**: Hono.js · Node 20 · GCP Cloud Run · Docker
- **Database**: GCP Cloud SQL (PostgreSQL) · Prisma ORM
- **AI**: Google Gemini（圖像分析）
- **通訊**: LINE LIFF · LINE Bot SDK
- **Packages**: `@vitera/lib`（共用邏輯）· `@vitera/ui`（共用元件）
