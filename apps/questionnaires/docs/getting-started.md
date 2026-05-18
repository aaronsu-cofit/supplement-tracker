# 第一張問卷端到端教學

這份文件帶你完整走過一次「在 HQ 建問卷 → vibe code LIFF 頁面 → 部署 →
從 LINE 測試 → 看後台數據」的流程。走完之後你會：

- 在 staging 有一張真的可以填的 LINE 問卷
- 答題後分數會自動寫進使用者屬性
- 後台看得到每筆回應跟觸發的動作
- 知道下次怎麼自己加一張

整段時間預估 **30-60 分鐘**，看 vibe code 時花多少心力設計 UI。

---

## 0. 系統長怎樣（先有大圖再走細節）

```
   HQ 後台                Backend                       LIFF（前端）
┌────────────┐          ┌─────────────┐              ┌─────────────────┐
│ ops 在這裡 │          │ 收答案、算分│              │ 使用者在 LINE   │
│ 建問卷、   │  GET     │ 觸發 hooks  │  GET spec    │ 點 rich menu /  │
│ 改 spec、  │ /spec ◀──┤ 寫資料庫    ├────────────▶ │ 訊息連結進來    │
│ 看回應     │          │             │              │ 看見題目、作答  │
│            │  POST    │             │  POST        │                 │
│            │ ──┐      │             │  /responses  │                 │
│            │   └──────┤             │ ◀────────────┤                 │
└────────────┘          └─────────────┘              └─────────────────┘
```

三方靠 API 串起來。HQ 編 spec，後端管演算法跟資料庫，LIFF 只負責畫
題目跟收答案。vibe code 的範圍**只有 LIFF 那一塊的 UI 視覺**——其他
東西全部已經幫你接好了。

---

## 1. 規劃（5 分鐘）

走例子的時候用真實的東西最有感。本教學用的是 **PMS 經前症候群快評**——
一份你接下來可以實際推給使用者用的問卷。

### 設計

| 項目 | 設定 |
|---|---|
| key | `pms_quick` |
| 名稱 | PMS 經前症候群快評 |
| 用途 | 評估近 3 次月經週期前 1 週的不適嚴重度 |
| 題數 | 5 |
| 算分 | `average`（題目都 0-3 分，平均分越高越嚴重） |
| 解讀 | 3 段 interpretation_bands |
| 答完做什麼 | 寫 `pms_level` attribute，高分時派 mission `pms_self_care` |

### 題目（每題 4 個選項：沒有 0 / 偶爾 1 / 經常 2 / 幾乎每次 3）

近 3 次月經來潮前 1 週，你有多常出現以下狀況？

1. 情緒煩躁或低落
2. 乳房脹痛
3. 腹脹或水腫
4. 疲倦、能量明顯下降
5. 頭痛或關節肌肉痠痛

### 解讀（interpretation_bands）

| 分數 | 標籤 |
|---|---|
| 0 – 1.0 | 輕微 |
| 1.01 – 2.0 | 中度 |
| 2.01 – 3.0 | 顯著 |

### 為什麼選 `average`？

`sum_up`、`average`、`weighted` 三個都是處理數值分數，差別：

- `sum_up`：總分（題數會影響上限）
- `average`：平均（題數變了也好比較，適合「嚴重度」這種概念）
- `weighted`：mean × 20 變百分制（適合需要對外溝通分數的情境）

PMS 想表達的是「整體有多嚴重」，題數可能未來會調整，所以 `average`
最穩定。

> **小決策練習**：如果你的問卷想算「累積過多少風險因子」，應該用
> 哪個？答：`count_above_threshold`（算「達標題數」）。

---

## 2. 在 HQ 建問卷（10 分鐘）

> 走到這邊先暫停讀文件，**換到 HQ 操作**。下方步驟邊做邊核對。
> 完成這節後再繼續往下讀。

(待補：用 HQ 操作截圖 + 注意事項，下個段落由 [你的名字] 邊做邊
回填)

### 2.1 進入問卷 tab

到 HQ：

`/products/<你的 productId>` → 點上方的「**問卷**」tab

### 2.2 「新增問卷」開啟編輯器

### 2.3 用範本快速產生 80% 的內容

下拉選「**WHO-5 福祉量表**」 → 點「載入」。

**為什麼選 WHO-5**：它有 5 題、`sum_up`、interpretation_bands。
跟我們要做的 PMS 結構幾乎一樣，只是 calc_type 要從 sum_up 改成 average。
與其從零打 5 題 JSON，從這個改最快。

### 2.4 改 key、name、description

| 欄位 | 改成 |
|---|---|
| key | `pms_quick` |
| name | PMS 經前症候群快評 |
| 說明 | 評估近 3 次月經週期前 1 週的不適嚴重度 |

### 2.5 改 Spec JSON

(待補：在這裡放最終 spec JSON 的完整內容，等真的建好可以複製貼上)

### 2.6 設定送出後動作

點兩個「+ 新增動作」：

**Action 1（寫使用者屬性）：**
- type: `寫使用者屬性 (set_attribute)`
- attribute key: `pms_level`
- value: `{{interpretation.pms_quick}}`

> ⚠ value 寫 `{{interpretation.pms_quick}}` 的意思是：答完之後，把
> 解讀帶（例如「中度」）原樣存進這個屬性。後端會自動替換。

**Action 2（派任務）：**
- type: `派任務 (assign_mission)`
- mission_key: `pms_self_care`

> 注意：mission_key 必須是這個 product 底下**已存在的** mission。如果
> 還沒建，可以先暫存 actions 為空 array，回頭到「任務」tab 建好
> `pms_self_care` 之後再回來補。

### 2.7 儲存

點「儲存」。應該會看到「已儲存」綠色 banner，下方列表多出一筆
`pms_quick` 問卷。

---

## 3. 拿到 LIFF URL

問卷列表這列下方那段灰色框就是 ops 之後要用的 LIFF URL：

```
https://liff.line.me/2009369966-ZwZuOht2?path=/q/pms_quick&product=<productId>
```

按 **📋 複製** 先存起來，等 step 5 從 LINE 開的時候用。

---

## 4. 建 LIFF 頁面（vibe code）

> 走到這邊**換到工程同事的電腦** / Cursor / Claude Code。

### 4.1 把這段貼給 vibe coder

在 HQ 點「**📘 怎麼建頁面**」開 modal → 複製內建的 prompt → 把最後
一行的 `<填你想要的設計風格>` 換成：

```
柔和粉色與淡橘漸層、有手繪風格的小圖示（月亮 / 花），
按鈕大顆好點、答完顯示結果時用柔和的卡片
```

### 4.2 確認 vibe coder 做了什麼

理論上對方會：
1. 複製 `apps/questionnaires/src/app/q/example/` → `apps/questionnaires/src/app/q/pms_quick/`
2. 重新設計 `page.tsx` 的視覺
3. **沒有改最上方的 PRODUCT_ID / KEY 兩個 hooks**（這兩個是自動推導的）

### 4.3 本地預覽（可選）

```bash
cd apps/questionnaires
pnpm dev
```

開 `http://localhost:3010/q/pms_quick?product=<productId>` 預覽。
（這個 URL 直接用 query 模擬 LIFF 給的 productId）

---

## 5. 部署（5-8 分鐘）

```bash
git add apps/questionnaires/src/app/q/pms_quick
git commit -m "feat(questionnaires): add PMS quick assessment"
git push origin staging
```

GitHub Actions 會自動跑 `Staging Questionnaires CI/CD`：
- Build Docker image
- 推 Artifact Registry
- 更新 K8s repo image tag
- ArgoCD sync
- Slack 通知

跑綠之後 staging 就有新頁面了。

---

## 6. 從 LINE 測試（3 分鐘）

1. 開手機 LINE → 任何聊天視窗（也可以開記事本傳給自己）
2. 把 step 3 複製的 LIFF URL 貼進去 → 送出
3. 點訊息中的連結 → LINE 內建瀏覽器跳開頁面
4. 完整答完 5 題 → 點送出
5. 看到結果畫面顯示分數 + 解讀

(待補：實際測試遇到的問題)

---

## 7. 看後台數據

回到 HQ 問卷列表 → 點 `pms_quick` 那列右邊的「**📊 回應**」按鈕。

每一筆回應展開可以看：
- **scores**：`pms_quick` 的平均分
- **interpretation**：對應的等級（輕微 / 中度 / 顯著）
- **triggered_actions**：當下實際觸發的 hooks 跟成功 / 失敗

### 確認屬性有寫進去

到 `/users/<test-user-id>` → 看 UserAttribute 列表，應該有一筆
`pms_level = 中度`（或你測試出來的值）。

如果有派 mission，到「任務」tab 也應該看到 `pms_self_care` 出現
在 pending 列表。

---

## 常見問題

(空白，邊做邊蒐集)

---

## 進階

### 更新題目 / spec

回 HQ → 編輯該問卷 → 改 spec JSON → 儲存。LIFF 頁面**不用重 build**——
spec 是 LIFF 每次載入時去 API 取的。

### 改 UI

工程同事改 `apps/questionnaires/src/app/q/<key>/page.tsx` → push staging →
等 CI 部署完。

### 改算分結果觸發的動作

回 HQ → 編輯 → 動作編輯器加 / 改 / 刪 row → 儲存。下一次有人答題就生效。
