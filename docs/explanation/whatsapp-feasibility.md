# WhatsApp 整合可行性評估

> **狀態：** 未排程，僅評估記錄
> **寫於：** 2026-05-18
> **目的：** 評估 Vitera 平台是否能加上 WhatsApp 推播通道、改動範圍、與
> 不該踩的雷。等到有客戶 / 業務需求時可以拿這份回來決策。

## 結論先講

**技術上可行**，但商業 / 營運層的限制比工程難度嚴重很多。

| 層面 | 評估 |
|---|---|
| 工程改動 | 8-12 dev days 做乾淨的多通路抽象（不算大工程） |
| **WhatsApp 24h window 規則** | **跟 Vitera 最強的「每日階段內容推播」設計**正面衝突 |
| **Template 審核** | 每個 content_key 要送 Meta 審 1-7 天，可能被拒 |
| Opt-in / opt-out | 比 LINE「加好友 = 同意」嚴格很多，要設計專門流程 |
| 識別模型 | 電話號碼為主，跟現在 `User.id = LINE userId` 假設衝突 |
| 視覺豐富度 | 沒有 rich menu 等價物；flex message 大多無法自動轉換 |

「該不該做」三種情境：

- **客戶要求** → MVP 走起，了解現實阻力後再決定要不要做完整抽象
- **為了平台擴充自由度** → **暫緩**，每張內容雙寫成本太高
- **只做 onboarding / 客服回覆** → 完全可行（都在 24h window 內）

---

## Vitera 現況回顧

### Outbound message 出口（4 個）

整個系統會發訊息出去的地方：

1. **`backend/src/lib/scheduler.ts:193,237`** — 排程推播（push-message-node、ai-skill-node）
2. **`backend/src/lib/phaseDailyPush.ts:122`** — 階段內容每日推播（每天 09:00 之類）
3. **`backend/src/routes/webhook.routes.ts`** — 回覆 inbound 訊息（intent rule / AI agent）
4. **`backend/src/routes/notify.routes.ts`** — ops 手動推

### Channel-coupled 的部分

- DB schema：`LineOA`、`LineOARichMenuTemplate` 是 channel-specific
- `UserOaSession` 名字帶 OA，但其實邏輯通用
- `ContentItem.type` 包含 `'flex'`（LINE Flex JSON）
- `User.id` 對 LINE 使用者來說 = LINE userId
- `auth_provider: 'email' | 'line'` 假設一個使用者一個 auth provider

### Channel-agnostic 的部分（好消息）

- User、Product、MissionTemplate、Questionnaire、Journey、Intent rule 都跟通路無關
- 算分、hooks、attribute、mission state 全在 channel 抽象之上

---

## WhatsApp 的硬規則

### 1. 24-hour customer service window

WhatsApp 規定：使用者**主動傳訊給商家**之後 24 小時內，商家可以自由回覆任何內容。**超過 24 小時，只能發預先審核過的 template message。**

對 Vitera 的 4 個 push 出口：

| Push 出口 | 24h 內？ | WhatsApp 限制 |
|---|---|---|
| Webhook 回覆 intent / AI | ✅ 是（reply to inbound） | 自由發送 |
| Scheduled push（scheduler.ts） | ❌ 否（push 通常是排定時間） | 必須是 template |
| Phase daily push | ❌ 否（設計就是每天 09:00 推） | 必須是 template |
| Ops manual push | 大多否 | 通常是 template |

→ **Vitera 最強的價值主張（phase-driven daily content）對 WhatsApp = 大量 template**。

### 2. Template approval

每個 template 要送 Meta 審：

- 提交 → 審核 1-7 天
- 不合格內容會被拒（特別是行銷意圖、誇大療效、不必要的個人化）
- 一個 product 的 30 個 questionnaire templates + period_cycle 內容庫 + mission/badge 通知，**全部變成需審核的模板**
- Template 變數有限（`{{1}}`、`{{2}}` 那種），複雜的個人化要拆成多個模板

### 3. Opt-in mechanics

- LINE：使用者加好友 = 預設同意
- WhatsApp：需要**明確 opt-in**（網頁表單 / 初次模板訊息確認 / QR code 流程）
- 沒 opt-in 就推 → Meta 直接封號，沒寬限

### 4. 沒有 rich menu

- WhatsApp 的近似：quick reply buttons + list / button messages
- Quick reply 點完按鈕就消失，不像 LINE rich menu 一直在
- 整個 menu-driven UX 要重設計，不是「微調 layout」可以解決

### 5. 識別模型

- WhatsApp 使用者用電話號碼（E.164 格式）識別
- 跟 LINE userId 完全不同空間
- 同一個人可能 LINE + WhatsApp 都用，需要帳號合併機制

---

## 如果要整合，工程需要改什麼

### 7 個主要改動（按優先序）

| # | 改動 | Effort | 仍解不到的部分 |
|---|---|---|---|
| 1 | 新 `Channel` 抽象（`backend/src/lib/channels/`），`LineChannel` / `WhatsAppChannel` 實作 `send(userId, message)`。替換 4 個 push 出口的直接 `@line/bot-sdk` 呼叫 | 2 天 | 內容格式轉換仍要每個出口處理 |
| 2 | Schema 加 `channel_type` 到 `LineOA` 或重新命名為 `Channel`；`channel_access_token` 變 type-aware | 1 天 + migration | HQ UI 「LINE OA」字樣要全部 conditional |
| 3 | `ContentItem.type` 加 `whatsapp_template`；寫 `flex → whatsapp interactive list` translator（盡力，多數場景沒對應）。或 v1 限定純文字 | 1-2 天 | 有損轉換，rich menu 流程死掉 |
| 4 | WhatsApp webhook + 簽章驗證（Meta `X-Hub-Signature-256`），對接到既有 intent / AI pipeline | 1 天 | Opt-in 流程另算 |
| 5 | `UserChannelIdentity { user_id, channel_type, channel_user_id, opt_in_at }`。`User.id` 不再雙重含義；既有 LINE 使用者遷移成 channel identity row | 1 天 schema + 2 天 code | 跨 product phone collision、帳號合併另算 |
| 6 | 24h-window-aware push gate：每個 push wrapper 檢查 last-inbound 時間；超過 24h 只允許 `whatsapp_template` 內容 | 1 天 | Template 還是要審 |
| 7 | Opt-in / double-opt-in 流程（電話收集 + WA 確認）| 2 天 | 法務 / 政策另議 |

**現實 floor：8-12 dev days** 做乾淨抽象。

---

## 階段建議

### MVP（1-2 週）— 推薦

- 一個 product 加 WhatsApp，**不重構 LINE**
- 4 個 push 出口加 `if channel === 'whatsapp'` 分支
- 5 個最常用內容送 Meta 審成 template
- 驗證：opt-in 轉換率、template 審核耗時、Meta Cloud API 月費
- 不做架構抽象

### Full channel-agnostic platform（4-6 週）

- 上面 7 個改動全做完
- 只在 MVP 驗證「WhatsApp 值得擴大」之後才動工
- 不要為了「乾淨」先重構

### 為什麼不一開始就重構

opt-in 轉換 + template 審核這兩個營運層阻力在沒實際試過前是黑盒。先花 2 週做完美抽象，結果發現使用者根本不 opt-in，等於投資失敗。

---

## 不要踩的雷（fork research 整理）

1. **不要假設 flex → WhatsApp interactive list 自動轉換**
   多數場景沒對應，計畫雙寫內容比較實際

2. **不要用 BSP（Twilio / MessageBird）為了「比較好接」**
   多 per-message margin + lock-in，Meta Cloud API 是現在的合理預設

3. **不要當天送審當天上線**
   假設審核 24-48h，被拒就再一輪。把「template 審核」加進 release checklist

4. **不要硬塞 LINE rich menu UX 到 WhatsApp**
   Quick reply 一次性按鈕跟 LINE rich menu 完全不同，重新設計選單範式

5. **不要讓使用者選通路**
   多數使用者不會選。每個 product 預設一個主通路，另一個當 opt-in 升級

6. **不要跳過 opt-in 流程**
   沒明確同意推 → Meta 封號 → 沒寬限

7. **不要把 `User.id` 改成電話號碼**
   既有 LINE 使用者會壞掉。`User.id` 變成不可解讀的 cuid，channel-specific 識別放新表 `UserChannelIdentity`

---

## 如果以後決定動工，從哪裡開始讀

- 4 個 push 出口：上面「Vitera 現況回顧」段落有檔案 / 行號
- LINE SDK 用在哪裡：`grep -rn "@line/bot-sdk" backend/src/`
- 識別模型 entry point：`backend/src/lib/db.ts` 的 `findOrCreateLineUser`
- Channel 抽象的目標形狀：可以看 `apps/questionnaires/src/hooks/` — questionnaire 系統那層的 channel 解耦做得不錯，可以借鏡

---

## 補充：對 product 設計的影響

如果要走 WhatsApp，**問卷 / questionnaire 系統幾乎不用改**：

- Spec 跟算分都 channel-agnostic
- LIFF 頁面是 web，WhatsApp 可以發連結進來
- 唯一要動：問卷完成後的 `on_submit_actions` 如果有 push 訊息，要走新的 channel 抽象

→ Questionnaire 是最早能跨通路驗證的 feature，可以拿來當 WhatsApp MVP 的入口。
