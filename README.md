# Vitera

**Vitera** 是 [Cofit](https://cofit.health) 旗下的醫療 DTX 工具平台，專為 B2B2C 場景設計。

醫師（骨科、婦產科、外科等）透過 Vitera 平台選擇並指派數位健康小工具給病患，病患透過 LINE LIFF 使用，無需下載 App。

---

## 快速開始

```bash
pnpm install
cp backend/.env.example backend/.env   # 填入環境變數
pnpm dev                                # 啟動所有服務
```

詳細說明請見 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 服務一覽

| App | 說明 | Port |
|-----|------|------|
| `apps/portal` | 病患入口（模組導航） | 3000 |
| `apps/wounds` | 傷口智慧追蹤 | 3001 |
| `apps/supplements` | 保健品 / 藥物管理 | 3002 |
| `apps/bones` | 骨骼關節照護（AI 拇趾外翻檢測） | 3003 |
| `apps/intimacy` | 親密健康評估 | 3004 |
| `apps/hq` | 後台管理（模組、管理員） | 3005 |
| `backend` | Hono.js API（GCP Cloud Run） | 8080 |

---

## 技術棧

- **Frontend**: Next.js 16 · pnpm Workspaces · Turborepo · Vercel
- **Backend**: Hono.js · Node 20 · GCP Cloud Run · Docker
- **Database**: Neon PostgreSQL
- **AI**: Google Gemini（圖像分析）
- **通訊**: LINE LIFF · LINE Bot SDK
- **Packages**: `@vitera/lib`（共用邏輯）· `@vitera/ui`（共用元件）
