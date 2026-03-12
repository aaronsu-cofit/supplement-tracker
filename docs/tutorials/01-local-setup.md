# 新人快速上手教學

這篇教學會指引您如何在本地端將 **Vitera** 專案跑起來，並了解 Git 工作流程。

---

## 1. 前置需求

- Node.js v20+
- pnpm v9（`npm install -g pnpm@9`）
- Git

---

## 2. 快速啟動

```bash
git clone https://github.com/weichun1008/vitera.git
cd vitera

# 安裝所有 workspace 依賴
pnpm install

# 複製環境變數（根目錄與各 app 可能各有 .env）
cp .env.example .env.local

# 啟動特定模組（擇一）
pnpm dev:wounds       # 傷口照護
pnpm dev:bones        # 骨骼模組
pnpm dev:supplements  # 保健品
pnpm dev:hq           # 後台管理
pnpm dev:intimacy     # 親密健康
pnpm dev:portal       # 入口 + 後端
pnpm dev              # 啟動全部（較吃資源）
```

各 app 預設 port：

| App          | Port |
|--------------|------|
| portal       | 3000 |
| wounds       | 3001 |
| supplements  | 3002 |
| bones        | 3003 |
| intimacy     | 3004 |
| hq           | 3005 |

---

## 3. 環境變數設定

### 必填變數

| 變數名 | 說明 | 取得方式 |
|--------|------|---------|
| `DATABASE_URL` | Neon Postgres 連線字串 | Neon Console |
| `GEMINI_API_KEY` | Google AI Studio API Key | https://aistudio.google.com/ |
| `JWT_SECRET` | JWT 簽名密鑰 | `openssl rand -base64 32` |

### LINE 相關（選填）

| 變數名 | 說明 |
|--------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS` | LIFF App ID (保健品) |

如果你沒有 LINE Developer 帳號：不設定 LIFF ID 即可，前端會自動 fallback 到 Email 登入，LINE 推播功能會靜默失敗不影響其他功能。

---

## 4. 目錄結構

```text
vitera/
├── apps/
│   ├── portal/          # 入口 & 登入 (port 3000)
│   ├── wounds/          # 傷口照護模組 (port 3001)
│   ├── supplements/     # 保健品追蹤模組 (port 3002)
│   ├── bones/           # 骨骼模組 (port 3003)
│   ├── intimacy/        # 親密健康模組 (port 3004)
│   └── hq/              # 後台管理 (port 3005)
├── backend/             # 共用後端 API (Next.js API Routes)
├── packages/
│   ├── lib/             # 共用函式庫：auth、apiFetch、providers
│   └── ui/              # 共用 UI 元件
├── docs/                # 開發者文件
├── pnpm-workspace.yaml  # pnpm monorepo 設定
└── turbo.json           # Turborepo pipeline 設定
```

每個 app 都是獨立的 Next.js 專案，共享 `@vitera/lib` 與 `@vitera/ui`。

---

## 5. Git 工作流程

### Branch 架構

```
main            ← 正式環境（Production），只有確認穩定後才 merge 進來
└── staging     ← 測試環境（Staging），有 CI/CD 自動部署，主要工作在這裡進行
    ├── aaron_develop
    ├── bob_develop
    └── alice_develop   ← 每位開發者自己的開發 branch
```

### 日常開發流程

**1. 第一次加入專案時，建立自己的 develop branch：**

```bash
git checkout staging
git pull origin staging
git checkout -b yourname_develop
```

**2. 每次開工前，先同步最新的 staging：**

```bash
git checkout staging
git pull origin staging
git checkout yourname_develop
git merge staging
```

**3. 開發完成後，推到自己的 branch 並發 PR 到 staging：**

```bash
git add .
git commit -m "feat: 你的功能描述"
git push origin yourname_develop
# 在 GitHub 上開 Pull Request，base 選 staging
```

**4. PR merge 進 staging 後，CI/CD 會自動部署到測試環境。** 確認測試環境沒問題後，再由負責人 merge staging → master 發正式版。

### 重要規則

- **不要直接 push 到 `master` 或 `staging`**，一律透過 PR
- `staging` merge 進 `master` 前需確認測試環境功能正常
- PR 的 base branch 請選 `staging`，不是 `master`
