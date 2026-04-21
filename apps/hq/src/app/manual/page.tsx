export const metadata = {
  title: '操作手冊 | HQ',
};

export default function ManualPage() {
  return (
    <div className="hq-fade-in max-w-3xl">
      <div className="hq-header">
        <h2>操作手冊</h2>
        <p>從零到一把一個 LINE OA 串起來的流程，以及各功能的用法。</p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">🏁 快速開始（完整流程）</h3>
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-sm text-slate-700">
            <li>
              <strong>建立 LINE OA</strong>：到 <code className="bg-slate-100 px-1 rounded">/oa</code> →「+ 新增 OA」，填名稱 + Channel Access Token + Channel Secret。
            </li>
            <li>
              <strong>確認 webhook destination</strong>：進 OA 的「設定」tab → 按「↻ 抓取」→ 畫面會顯示 bot user ID。
            </li>
            <li>
              <strong>設定 LINE Console</strong>：把設定頁顯示的 Webhook URL 貼到 LINE Developers Console → Messaging API → Use webhook ON → 按 Verify 確認成功。關掉 Auto-reply。
            </li>
            <li>
              <strong>建 Rich Menu</strong>：OA 的「選單」tab → 點「進入完整編輯介面」→ 建 template、填 4 個 zone 的 LIFF URI、上傳 2500×1686 圖片、部署到 LINE、設為啟用。
            </li>
            <li>
              <strong>填 AI Skill Platform</strong>：設定 tab 填 Default Agent ID + Platform URL + API Key → 儲存 → 按「↻ 測連線」。
            </li>
            <li>
              <strong>建 scenario</strong>：OA 的「劇本」tab → 「+ New」→ 拖 Day / PushMessage / MenuChange / AI Skill 節點連起來 → Cmd+S 存檔 → 點 ● 啟用。
            </li>
            <li>
              <strong>Enrol 測試使用者</strong>：用沒 follow 過的 LINE 帳號加這個 OA → 自動建 user + enrol + 歡迎訊息。
            </li>
            <li>
              <strong>驗證推播</strong>：系統總覽 → 執行推播 → 看 Day N 對應的 push-message-node / ai-skill-node 有沒有發出去（LINE 收到 + 活動紀錄更新）。
            </li>
          </ol>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">🗂 各 tab 做什麼</h3>
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <div>
              <strong>劇本（預設）</strong>：Wizard 畫布。Day 節點代表時間軸，Push Message / AI Skill / Menu Change 是各 Day 要觸發的動作。連線方式：Day → Action。
            </div>
            <div>
              <strong>選單</strong>：這個 OA 的 Rich Menu templates + 使用者目前被分到哪個 menu（近 50 筆）。詳細模板編輯請到完整編輯介面。
            </div>
            <div>
              <strong>概覽</strong>：這個 OA 範圍的活躍 enrollments、最近推播、最近互動事件。判斷系統「動不動」的儀表板。
            </div>
            <div>
              <strong>設定</strong>：OA 所有配置集中地 — LINE 憑證、webhook destination、AI Skill Platform URL / API key / default agent id。
            </div>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">🤖 AI Skill 節點兩種用途</h3>
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <div>
              <strong>對話路由（per-phase routing）</strong>：使用者在 Day N 傳訊息，backend 會找最近「≤ N」的 Day 有連到 AI Skill 節點，用那個 <code>agent_id</code> 取代 OA 預設 agent。
              <br />
              例：Day 0 → AiSkill(onboarding_bot)，Day 7 → AiSkill(coach_bot)，使用者 Day 3 傳訊息走 onboarding_bot，Day 8 走 coach_bot。
            </div>
            <div>
              <strong>排程推播（AI-generated push）</strong>：scheduler 到達 Day N 時，會呼叫連在該 Day 的 AI Skill 節點（agent 自己決定要生什麼 push 給使用者）。Agent 以 <code>client_id</code> 為 key 管對話記憶，不用我們塞 prompt。
            </div>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">📅 推播排程</h3>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <p>
              Backend 內建 cron，預設每天 <code className="bg-slate-100 px-1 rounded">Asia/Taipei 09:00</code> 觸發一次：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>把所有符合條件（Day 對到）的 push-message-node / ai-skill-node 送出去</li>
              <li>重新評估所有 active enrollment 的 menu（rule → AI → fallback 三層）</li>
            </ul>
            <p>
              可用 env 覆蓋：<code className="bg-slate-100 px-1 rounded">SCHEDULER_CRON</code>（cron 表達式）、<code className="bg-slate-100 px-1 rounded">SCHEDULER_TZ</code>、<code className="bg-slate-100 px-1 rounded">SCHEDULER_CRON=off</code> 關閉。
            </p>
            <p>
              想立刻觸發：系統總覽 → 「執行推播」按鈕。idempotent — 同一個 (user, scenario, node) 不會送兩次。
            </p>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">👥 Enrollment（訂閱）</h3>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>新 follow 自動 enrol</strong>：加好友當下就訂閱該 OA 的所有 active scenario，<code>enrolled_at = 加好友時間</code>。</li>
              <li><strong>Scenario 啟用時不動現有使用者</strong>（避免回頭塞一堆歷史訂閱）。要批量 enrol 呼叫 <code className="bg-slate-100 px-1 rounded">POST /api/wizard/scenarios/:id/enroll-all</code>。</li>
              <li><strong>Day N 用使用者 timezone 算</strong>：不是 server UTC。User.timezone 欄位預設 Asia/Taipei，可依個案改。</li>
              <li><strong>移除訂閱</strong>：系統總覽的活躍 Enrollments 區塊每筆都有 ✕ 按鈕。</li>
            </ul>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">🔀 Rich Menu 評估三層</h3>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <ol className="list-decimal pl-5 flex flex-col gap-1">
              <li>
                <strong>Layer 1（rule）</strong>：scenario 裡有 <code>menu-change-node</code> 的 <code>menuName</code> 對得上某個 deployed template.name → 用它。
              </li>
              <li>
                <strong>Layer 2（AI）</strong>：Layer 1 沒中 → 呼叫 ADK <code>rich-menu-selector</code> agent，讓 AI 依使用者狀態挑。
              </li>
              <li>
                <strong>Layer 3（fallback）</strong>：AI 也沒中 → 用 OA 的啟用預設 template。
              </li>
            </ol>
            <p>
              評估時機：follow 當下 + scheduler 每天重跑（<code>evaluateAllActiveUsers</code>）。
            </p>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">🛠 常見問題</h3>
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <div>
              <strong>Q：LINE Console Verify 回 404？</strong>
              <br />
              A：OA 的 <code>line_destination_id</code> 沒抓到，或 webhook URL 錯。去設定 tab 按「↻ 抓取」，確認 Webhook URL 是 backend（<code>vitera-api-*</code>）不是 HQ 前端。
            </div>
            <div>
              <strong>Q：Verify 回 403 / Invalid signature？</strong>
              <br />
              A：DB 裡的 Channel Secret 跟 LINE Console 上那個不一樣。設定 tab 重貼一次 Channel Secret 儲存。
            </div>
            <div>
              <strong>Q：傳訊息沒 AI 回應？</strong>
              <br />
              A：檢查 OA 的 Platform URL + API Key 有沒有填、「↻ 測連線」是否 200。沒問題的話看 backend log <code>[webhook/line] agent=...</code> 錯誤訊息。
            </div>
            <div>
              <strong>Q：執行推播說 <code>enrollmentsConsidered: 0</code>？</strong>
              <br />
              A：沒有活躍 enrollment。可能 LINE_OA_ID env 卡到舊 OA，或該 OA 沒人 follow / 沒 active scenario。
            </div>
            <div>
              <strong>Q：Wizard 節點選了但輸入卡住？</strong>
              <br />
              A：之前有這個 bug，現在已修（ConfigPanel 從 live 的 nodes 陣列讀取而不是 snapshot）。若仍發生 hard refresh。
            </div>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">📚 更多資料</h3>
          <ul className="list-disc pl-5 text-sm text-slate-700 flex flex-col gap-1">
            <li>Plan docs：<code className="bg-slate-100 px-1 rounded">docs/superpowers/plans/</code>（plan 3–13 + Phase 1+2）</li>
            <li>測試計畫：<code className="bg-slate-100 px-1 rounded">docs/how-to/2026-04-20-phase-1-2-test-plan.md</code></li>
            <li>ClickUp：<code className="bg-slate-100 px-1 rounded">86exaexav</code>（AI Skill ↔ LINE 串接 spec）</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
