export const metadata = {
  title: '操作手冊 | HQ',
};

export default function ManualPage() {
  return (
    <div className="hq-fade-in max-w-4xl">
      <div className="hq-header">
        <h2>操作手冊</h2>
        <p>Vitera 平台功能總覽 — 從第一個 OA 到設定好一支完整 DTx 產品的所有步驟，每節附驗收條件（AC）。</p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">目錄</h3>
          <ol className="list-decimal pl-5 text-sm text-slate-700 flex flex-col gap-1">
            <li><a className="underline" href="#quickstart">快速開始：從零建一支產品</a></li>
            <li><a className="underline" href="#seed">範本一鍵套用（Seed Templates）</a></li>
            <li><a className="underline" href="#concepts">平台核心概念</a></li>
            <li><a className="underline" href="#product">產品（Product）與 OA 綁定</a></li>
            <li><a className="underline" href="#content">內容庫（Content Library）</a></li>
            <li><a className="underline" href="#mission">任務（Mission）</a></li>
            <li><a className="underline" href="#badge">連續天數 + 徽章（Streak + Badge）</a></li>
            <li><a className="underline" href="#intent">意圖規則（Intent Rule）</a></li>
            <li><a className="underline" href="#journey">Journey 狀態機（含每日推送排程）</a></li>
            <li><a className="underline" href="#scenario">劇本（Scenario）與排程</a></li>
            <li><a className="underline" href="#llm">LLM Fallback（AI Skill Platform）</a></li>
            <li><a className="underline" href="#flex">Flex 訊息（卡片）</a></li>
            <li><a className="underline" href="#flex-checklist">任務勾選 Checklist（Postback）</a></li>
            <li><a className="underline" href="#observe">排程觀察、預覽、lint</a></li>
            <li><a className="underline" href="#user">使用者狀態檢視</a></li>
            <li><a className="underline" href="#conversations">對話紀錄、手動推送、即時編輯</a></li>
            <li><a className="underline" href="#richmenu">Rich Menu 評估</a></li>
            <li><a className="underline" href="#help">區塊內建「?」說明</a></li>
            <li><a className="underline" href="#faq">常見問題</a></li>
          </ol>
        </section>

        <section id="quickstart" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🏁 快速開始：從零建一支產品</h3>
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-sm text-slate-700">
            <li>
              <strong>建立產品</strong>：到 <code className="bg-slate-100 px-1 rounded">/products</code> →「+ 新增產品」。產品是共用配置包（內容、任務、徽章、意圖、Journey），一份定義可被多個 OA 共用。
            </li>
            <li>
              <strong>填產品的配置</strong>：進產品詳情頁，依序建立：
              <ul className="list-disc pl-5 mt-1 flex flex-col gap-0.5">
                <li>內容庫：可重用的訊息文字/Flex 卡片（key 供其他地方引用）</li>
                <li>任務：用戶要完成的事（可鏈結、多步、屬性自動完成）</li>
                <li>徽章：連續天數達標或完成任務時自動頒發</li>
                <li>Journey：命名的使用者階段與轉換規則</li>
                <li>意圖規則：使用者傳訊時比對關鍵字觸發動作</li>
              </ul>
            </li>
            <li>
              <strong>建立 LINE OA</strong>：到 <code className="bg-slate-100 px-1 rounded">/oa</code> → 新增 → 填 Channel Access Token + Secret。
            </li>
            <li>
              <strong>綁定產品到 OA</strong>：進 OA 設定 tab →「綁定產品」選剛建的產品 → 儲存。
            </li>
            <li>
              <strong>設定 LINE webhook</strong>：設定 tab →「↻ 抓取」→ 複製 Webhook URL 貼到 LINE Console → Verify。
            </li>
            <li>
              <strong>（選配）Rich Menu</strong>：選單 tab → 建 template、部署、啟用。
            </li>
            <li>
              <strong>建劇本</strong>：劇本 tab → 新劇本 → 每個 Day 加動作（訊息、指派任務、連續 +1、設屬性、Flex 卡片等）→ 儲存 → 啟用。
            </li>
            <li>
              <strong>預覽 + 測試</strong>：「預覽」按鈕模擬某 user 在某天會收到什麼 →「立即執行排程」實際觸發一次。
            </li>
          </ol>
        </section>

        <section id="seed" className="hq-card">
          <h3 className="text-lg font-bold mb-2">📦 範本一鍵套用（Seed Templates）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              不想從零建內容/任務/徽章/Journey/意圖規則？產品詳情頁「基本」tab 最下方有「<strong>範本（一鍵填入示範資料）</strong>」卡片。
            </p>
            <p>
              點任一範本旁的「套用範本」→ 一秒內把整套配置（5 種資源）建到該產品。冪等：再點一次相同 key 的會跳過保留你既有編輯，<strong>但 Journey 例外為 upsert</strong>（每次套用會更新成範本最新版，吃進新加的 phase / schedule 等改動）。
            </p>
            <p>
              <strong>目前可用範本</strong>：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><code>wellness_21d</code> 21 天健康習慣 — 通用 demo（喝水、散步、心情打卡 + 7 日戰士徽章 + 3 phase journey + 6 條意圖規則）</li>
              <li><code>period_cycle_demo</code> 生理週期 28 天 — 11 個 ContentItem（onboarding + 9 phase day cards + 3 keystone habit）+ 3 條意圖規則 + period_cycle Journey 含 phase × day 排程</li>
            </ul>
            <p>
              新範本要加在 <code>backend/src/lib/seedTemplates.ts</code>，登錄到 <code>SEED_TEMPLATES</code> 後 HQ 自動列出來。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 範本套用</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>產品詳情「基本」tab 最下方看到「範本」卡片，列出可用範本</li>
                <li>套用範本後，內容庫 / 任務 / 徽章 / Journey / 意圖規則 各 tab 都看到對應資料</li>
                <li>重新套用 — ContentItem / Mission / Badge 自動 skip（保留 ops 編輯）</li>
                <li>重新套用 — Journey 自動 upsert（更新成範本最新版）</li>
                <li>套用結果區顯示 +N 建立 / N skipped 統計</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="concepts" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🧱 平台核心概念</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              把 Vitera 理解為三層：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>資產層</strong>（產品內）：ContentItem、MissionTemplate、BadgeTemplate、IntentRule、JourneyTemplate — 藍圖，key 供引用</li>
              <li><strong>狀態層</strong>（每使用者）：UserAttribute、MissionAssignment、UserStreak、UserBadge、UserJourneyPhase — 每位使用者的當下狀態</li>
              <li><strong>驅動層</strong>：劇本（按日排程）+ 意圖規則（訊息進來）+ 各動作 hook 互觸 — 資產作用在狀態</li>
            </ul>
            <p>
              關鍵互動：意圖命中 → 執行 action → 可能動到屬性/任務/連續 → 觸發 badge 評估、journey 轉換、mission 自動完成。都透過同一條冪等管線。
            </p>
          </div>
        </section>

        <section id="product" className="hq-card">
          <h3 className="text-lg font-bold mb-2">📦 產品（Product）與 OA 綁定</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              產品是「內容 + 規則的包」。一個 OA 綁一個產品；多個 OA 可綁同一個產品（配置寫一次、多通道部署）。沒綁產品的 OA 仍能跑（只是意圖/任務/連續/屬性等平台動作會被跳過並記錄警告）。
            </p>
            <p>
              綁定位置：OA 工作區 → 設定 tab →「綁定產品」下拉。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 產品綁定</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>產品列表可新增 / 刪除 / 停用 / 編輯名稱說明</li>
                <li>OA 設定頁下拉可選擇「未綁定」或任何已建的產品</li>
                <li>產品詳情頁「綁定的 LINE OA」區塊會列出所有綁定此產品的 OA</li>
                <li>刪除產品前若仍有 OA 綁定應被擋下</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="content" className="hq-card">
          <h3 className="text-lg font-bold mb-2">📚 內容庫（Content Library）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              產品層級可重用的訊息。支援 <code>text</code>（純文字）和 <code>flex</code>（LINE 卡片）。用 key 引用：劇本推播節點的「引用內容」下拉、意圖回覆的 <code>content_key</code>、任務/徽章完成時的 <code>notify_content_key</code>。
            </p>
            <p>
              改內容即時生效：發送時才從 DB 抓，不用改劇本/意圖規則。
            </p>
            <p>
              <strong>Flex 編輯器</strong>：點「選用範例（12 個）」開啟範例選擇器，涵蓋四大類（商務、生活、問卷、DTx/健康），包含任務完成、PHQ-9 量表、今日小提醒等常用 DTx 卡片。選一個直接插入再客製化即可。附即時 JSON 格式驗證和 LINE Flex Simulator 外連。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 內容庫</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>可在產品詳情頁新增 text 或 flex 類型</li>
                <li>Flex 類型編輯器有即時 JSON 格式驗證 + 12 個範例 picker</li>
                <li>Flex 範例涵蓋餐廳/收據/新聞/旅遊/飯店/活動/付款/商品 carousel/心情打卡/任務完成/PHQ-9/每日提醒</li>
                <li>key 同產品內唯一（重複新增應回 409）</li>
                <li>停用後，引用此 key 的推播會被跳過（但 OA 還能運作；錯誤訊息會顯示在排程 error log）</li>
                <li>用 <code>lint</code> 看劇本時，引用不存在或停用的 key 會標 ⚠</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="mission" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🎯 任務（Mission）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              任務藍圖定義一件使用者要完成的事。五種能力：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>多步進度</strong>：設 <code>progress_target = N</code> + 意圖動作 <code>increment_mission_progress</code>，計數到 N 自動完成。例：「今天喝 3 杯水」target=3。
              </li>
              <li>
                <strong>屬性自動完成</strong>：設 <code>auto_complete_on_attribute</code>（可選 <code>match_value</code>），當該屬性被設到特定值時自動完成此任務。適合問卷型任務。
              </li>
              <li>
                <strong>完成後動作陣列（on_complete_actions）</strong>：任務完成時依序跑 <code>set_attribute</code>、<code>assign_mission</code>（鏈結下一個任務）、<code>increment_streak</code>。鏈結深度上限 5 防無限迴圈。
              </li>
              <li>
                <strong>完成時自動推播（notify_content_key）</strong>：填產品內容庫的 key，任務完成時自動 push 對應內容（text 或 flex）給使用者。所有完成路徑都會觸發，推播走使用者最近互動的 OA。
              </li>
              <li>
                <strong>指派路徑</strong>：意圖動作 <code>assign_mission</code>、劇本 <code>mission-assign-node</code>、其他任務的 on_complete 鏈結，或從對話頁右欄、<code>/admins/[id]</code> 手動指派。
              </li>
            </ul>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 任務</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>新增任務、設 progress_target &gt; 1 可用</li>
                <li>設 auto_complete_on_attribute 後，手動從 <code>/admins/[id]</code> 設該屬性 → 任務應變 completed</li>
                <li>on_complete 含 assign_mission → 完成任務 A 後使用者應出現待辦任務 B</li>
                <li>設 notify_content_key → 任務完成時使用者 LINE 應收到對應訊息（text 或 flex）</li>
                <li>重複對同一使用者指派同任務應冪等（不會多一份 pending）</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="badge" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🔥 連續天數 + 徽章（Streak + Badge）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              <strong>Streak</strong>：<code>(product, user, streak_key)</code> 的連續天數計數。同日呼叫不重算、隔日 +1、斷天重置為 1；<code>count_best</code> 永遠保留最高紀錄。用使用者 timezone 判定今天/昨天。
            </p>
            <p>
              <strong>Badge</strong>：產品層級藍圖。兩種 criteria：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><code>streak_reached</code>：streak_key 達 N 天時自動頒發</li>
              <li><code>mission_completed</code>：完成特定任務 key 時自動頒發</li>
            </ul>
            <p>
              每人每徽章只得一次（unique）；頒發記在 <code>user_badges</code>，會寫入 <code>badge_earned</code> engagement event。
            </p>
            <p>
              <strong>Icon 三種格式</strong>：編輯器自動偵測並渲染：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><code>emoji</code>：如 🏆、🔥、⭐</li>
              <li><code>URL</code>：<code>https://...</code> 的圖床連結</li>
              <li><code>base64 data URI</code>：按「📁 上傳」選本機圖會自動轉成 data URI（20 KB 上限）</li>
            </ul>
            <p>
              <strong>取得時自動推播（notify_content_key）</strong>：和任務一樣，填產品內容庫的 key，徽章頒發當下自動 push 給使用者。適合搭配「任務完成通知」、「PHQ-9 量表結果」等 flex 範例做成慶祝卡片。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — Streak + Badge</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>使用者觸發 <code>increment_streak</code> → <code>/admins/[id]</code> 看到連續天數出現</li>
                <li>同日重複觸發 → 連續不變（但不算錯誤）</li>
                <li>連續達徽章 threshold → 徽章自動出現在該使用者頁</li>
                <li>完成任務 → 對應 mission_completed 徽章自動頒發（若有）</li>
                <li>重複頒發同徽章應冪等（不會多出幾筆）</li>
                <li>設 notify_content_key → 徽章頒發時使用者 LINE 應收到對應訊息</li>
                <li>icon 填 emoji / URL / 上傳 data URI 三種都能正確渲染</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="intent" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🧭 意圖規則（Intent Rule）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              使用者傳文字訊息進來時，先依 priority 順序比對意圖規則。第一個命中的規則執行 action，不再落到 AI 顧問。未命中則交給 AI。
            </p>
            <p>
              比對類型：<code>keyword</code>（包含即中，大小寫不敏感）/ <code>exact</code>（完全相等）/ <code>regex</code>（正則）。
            </p>
            <p>
              動作類型：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><code>reply_content</code>：直接回覆某 content key（text 或 flex 都可）</li>
              <li><code>set_attribute</code>：設 user attribute，可帶 <code>reply_content_key</code> 同時回覆</li>
              <li><code>assign_mission</code> / <code>complete_mission</code>：指派或完成任務，可同時回覆</li>
              <li><code>increment_mission_progress</code>：多步任務 +1</li>
              <li><code>increment_streak</code>：連續天數 +1</li>
              <li><code>change_menu</code>：切換使用者的 Rich Menu（<code>menu_name</code> 需與 OA 已部署的模板名稱一致）</li>
            </ul>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 意圖規則</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>使用者講中規則的 keyword → 應收到 reply_content 對應的 text 或 flex</li>
                <li>命中後不會再落到 AI 顧問（後台 log 看得出）</li>
                <li>priority 數字小者優先，相同則看新增順序</li>
                <li>規則停用後即時不再比對</li>
                <li>引用不存在的 mission_key / content_key / menu_name 應在 log 顯示警告但不 crash</li>
                <li>change_menu 命中後使用者的 Rich Menu 立即切換；OA「選單」tab 的 recent assignments 可驗證</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="journey" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🗺️ Journey 狀態機（含每日推送排程）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              Journey 定義一串命名 phase（如 onboarding → active → completed）和轉換規則。使用者 phase 在完成任務、設屬性、取得徽章時自動推進。
            </p>
            <p>
              觸發器：<code>mission_completed</code>、<code>attribute_equals</code>、<code>badge_earned</code>。<code>from_phase</code> 省略代表「任何 phase 含新使用者」—— 這是新使用者第一次落入某個 phase 的方式。
            </p>
            <p>
              同 journey 內每事件只觸發一次轉換（依規則宣告順序第一個命中者勝）。
            </p>
            <p>
              <strong>每日推送排程（Phase × Day）</strong>：每個 phase 可定義一組「day_in_phase → 時間 → ContentItem」的排程。後端有一支每 5 分鐘 tick 的 cron <code>runPhaseDailyPush</code>，依使用者時區計算 day_in_phase（calendar-day 基準），對到 schedule 的時間窗（±5 min）就 push 對應內容。
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>day_1 不在這裡設</strong> — 由 phase 切換的 intent rule <code>reply_content_key</code> 即時推送，cron 跳過 day=1 避免雙發</li>
              <li><strong>content_key 留空</strong> = 用命名約定 <code>{`${'${phase}'}_day_${'${N}'}`}</code> 自動找對應 ContentItem</li>
              <li><strong>沒設 schedule 的天</strong> = 該天無 push（不會 fallback）</li>
              <li><strong>idempotency</strong>：每天 × 每個 day_in_phase 只送一次（message_log unique on <code>source=phase_daily_push</code> + <code>journey:phase:day_N:date</code>）</li>
              <li><strong>HQ 編輯</strong>：Journey tab 編輯每個 phase 卡片下方有「每日推送排程」表，可逐筆設 day / 時間 / content_key（下拉自動列出該產品內容庫）</li>
              <li>關閉：<code>PHASE_DAILY_PUSH_CRON=off</code> env</li>
            </ul>
            <p>
              <strong>典型流程</strong>（搭配 intent rule）：
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-1">
              <li>使用者主動傳「月經來了」 → intent rule set_attribute period_state=menstrual + reply_content_key=menstrual_day_1（即時推 day_1）</li>
              <li>set_attribute 自動觸發 evaluateJourneys → Journey 切到 menstrual phase（記 entered_at）</li>
              <li>隔天 09:00 cron tick → 對到 menstrual.schedule[day=2 或 3] → push menstrual_day_3</li>
              <li>循環直到使用者說「月經結束了」 → 切到 follicular phase，schedule 重新從 day_1 起算</li>
            </ol>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — Journey + 每日推送</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>新使用者觸發入口規則（from_phase 省略）→ <code>/admins/[id]</code> Journey 現況出現 phase</li>
                <li>完成指定任務 / 設指定屬性值 / 取得指定徽章 → phase 前進</li>
                <li>engagement events 看到 <code>journey_transition</code> 類型紀錄</li>
                <li>在已達目標 phase 再次觸發 → phase 不變（不會回頭）</li>
                <li>Phase 切換後當天 / 隔天 cron tick 會依 schedule 推 day_2+</li>
                <li>對話紀錄 cron 推的訊息有 🌗「Phase 每日推送」紫色 badge</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="scenario" className="hq-card">
          <h3 className="text-lg font-bold mb-2">📅 劇本（Scenario）與排程</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              劇本 = 以「Day N（自 enrolled_at 起算）」排程的動作集合。List view 為主要編輯器（OA 工作區「劇本」tab）；需要分支/繪圖可點「流程圖」切到 Wizard。兩邊資料格式相同、可互切。
            </p>
            <p>
              每個 Day 可加多個動作節點：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>📨 訊息（text / image / sticker / flex；可引用內容庫 key）</li>
              <li>🤖 AI 技能（agentId，也影響該 Day 後使用者傳訊息時的 agent 路由）</li>
              <li>📋 切換選單</li>
              <li>🎯 指派任務（mission_key）</li>
              <li>🔥 連續天數 +1（streak_key）</li>
              <li>🏷️ 設定屬性（attribute_key=value）</li>
            </ul>
            <p>
              排程器內建 cron，預設 <code>Asia/Taipei 09:00</code> 每日觸發。env 可覆蓋 <code>SCHEDULER_CRON</code>、<code>SCHEDULER_TZ</code>，設 <code>off</code> 關閉。使用者 Day N 用使用者 timezone 計算，不是 server UTC。
            </p>
            <p>
              冪等：同 <code>(user, scenario, node)</code> 不會送兩次，由 <code>message_deliveries</code> unique constraint 保證。Push 失敗會 release 等下次重送。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 劇本 + 排程</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>List view 可新增 Day、新增六種動作、編輯、刪除、儲存</li>
                <li>儲存後在 /wizard 開同劇本，看到等價的 nodes/edges</li>
                <li>劇本啟用後「全體加入」 → 所有 LINE 使用者出現 active enrollment</li>
                <li>「立即執行排程」在使用者 Day N 當天會送出該 Day 的所有動作</li>
                <li>重複執行 → 各動作只觸發一次（冪等）</li>
                <li>劇本停用 → 下次排程不送</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="llm" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🤖 LLM Fallback（AI Skill Platform）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              使用者傳訊沒中任何意圖規則時，會 fallback 到外部 AI Skill Platform（內部部署在 GCP Cloud Run），由 platform 上的 agent 回覆。每筆 fallback 都會記到 <code>unmatched_intents</code> 表，供 ops review 並轉成正式意圖規則。
            </p>
            <p>
              <strong>OA 設定</strong>：到該 OA 的「設定」tab，「AI Skill Platform」區塊填三欄：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Default Agent ID</strong>：fallback 預設用哪個 agent（例 <code>nutrition_analyst</code>）</li>
              <li><strong>Platform URL</strong>：base URL（不含 <code>/vitera/run</code>，程式自己接）</li>
              <li><strong>Bearer Token</strong>：在 warehouse 端用 <code>Token.tokenize(member)</code> 產出的 JWT。Vitera 不簽 token，原封轉發到 platform 的 <code>Authorization: Bearer</code> header</li>
            </ul>
            <p>
              填完按「↻ 測連線」— 會用 OA 的設定走真 adkRun，綠燈代表使用者真的會收到回覆。
            </p>
            <p>
              <strong>Fast-path / Slow-path</strong>：webhook 9 秒內收到 LLM 回應 → 用 replyToken 同步回覆（免費、有 reply 樣式）。超過 9 秒 → webhook 200 ack 後背景等，回來改用 pushText（會計入 push 配額）。對話紀錄 outbound 訊息源頭會顯示 🤖 紫色「AI Fallback」badge，慢回應會額外標 🐢、錯誤會標 ⚠。
            </p>
            <p>
              更詳細的操作 / 排查見 <a className="underline" href="https://github.com/Cofit/Vitera/blob/main/docs/how-to/operating-llm-fallback.md" target="_blank" rel="noreferrer"><code>docs/how-to/operating-llm-fallback.md</code></a>。
            </p>
          </div>
        </section>

        <section id="flex-checklist" className="hq-card">
          <h3 className="text-lg font-bold mb-2">☑️ 任務勾選 Checklist（Postback 模式）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              LINE Flex 沒有原生 checkbox（訊息一旦送出不可更改）。用「button + postback」可模擬：
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-1">
              <li>Flex 卡片每列放一個 <strong>postback button</strong>，data 填 <code className="bg-slate-100 px-1 rounded">act=complete_mission&amp;key=&lt;mission_key&gt;&amp;reply_content=&lt;content_key&gt;</code></li>
              <li>使用者點按鈕 → webhook 收到 postback → 直接走 <code>completeMissionByKey</code> 完成任務</li>
              <li>若該任務的 <code>notify_content_key</code> 有設，系統會自動 push 完成通知</li>
              <li>若 postback data 帶 <code>reply_content</code>，會立即以 reply token 回覆指定內容（通常是更新過的 checklist 卡片）</li>
            </ol>
            <p>
              內容庫 picker 的「任務 Checklist（按鈕勾選）」範例即是這個 pattern — 複製後把 <code>key=</code> 改成實際的 mission_key。
            </p>
            <p>
              進階：也支援 <code className="bg-slate-100 px-1 rounded">act=increment_mission&amp;key=&lt;mission_key&gt;&amp;step=1</code> 用於多步任務（每按一次 +1 進度）。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 任務 Checklist</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>使用者收到 flex 卡片、點「✓ 完成」按鈕 → 該任務在 <code>/admins/[id]</code> 變成 completed</li>
                <li>點按鈕不會在聊天記錄中產生使用者訊息（displayText 只顯示在聊天中，不觸發 intent）</li>
                <li>OA 未綁定產品時 postback 被忽略、log 顯示警告</li>
                <li>多步任務的 increment_mission postback 每點一次 +1、抵達 target 自動完成</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="flex" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🎴 Flex 訊息（卡片）</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              LINE 的 Flex 卡片（bubble 或 carousel）可用在三條路徑：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>內容庫 type=flex 的內容 → 被劇本 push 節點或意圖 reply_content 引用</li>
              <li>劇本 push 節點類型選 flex，直接內嵌 JSON（適合一次性、不複用）</li>
              <li>意圖 reply_content 指向 type=flex 的內容 → 使用者傳訊時回覆 flex</li>
            </ul>
            <p>
              編輯器有 JSON 即時驗證 + 範例 bubble + LINE Flex Simulator 連結。<code>altText</code> 來自內容庫的「標題」欄位或 push 節點的 message 欄位，無則預設「Flex message」。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — Flex</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>內容庫新增 flex content，貼入 valid JSON → 儲存成功</li>
                <li>貼入 invalid JSON → 編輯器即時紅字阻止儲存</li>
                <li>意圖 reply_content 指向 flex content → LINE 實際收到卡片</li>
                <li>劇本 push 節點內嵌 flex → 排程發送收到卡片</li>
                <li>Dry-run 對 flex 節點顯示「Flex: altText」描述</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="observe" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🔍 排程觀察、預覽、lint</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              三個工具可在實際部署前或除錯時驗證：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Lint</strong>（劇本編輯器內建）：自動檢查引用的 mission_key / content_key 是否存在於綁定產品，以及 flex JSON 是否合法。警告標在動作節點旁。
              </li>
              <li>
                <strong>Dry-run</strong>（劇本編輯器「預覽」按鈕）：輸入 user_id + 日期 → 回傳排程會觸發的每個動作描述。不實際發送、不改 DB。已交付的動作標 grey（實際排程會跳過）。
              </li>
              <li>
                <strong>立即執行排程</strong>（OA 概覽 tab）：真的觸發一次 runDailyCycle，顯示 sent/skipped/errors + 每筆 delivery 的類型、動作摘要、使用者、劇本。
              </li>
            </ul>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 觀察工具</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>引用不存在的 mission_key → 劇本編輯器顯示警告</li>
                <li>預覽顯示的「推播 →」、「指派任務」等描述跟實際執行結果一致</li>
                <li>立即執行後概覽活動列表立即更新</li>
                <li>重跑時 deliveries 顯示為「已交付，實際排程會跳過」</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="user" className="hq-card">
          <h3 className="text-lg font-bold mb-2">👤 使用者狀態檢視</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              <code>/admins</code> 列表點使用者名字進 <code>/admins/[userId]</code> 看：屬性、任務、連續天數、徽章、Journey 現況、最近 engagement events、跨 OA 的對話紀錄。
            </p>
            <p>
              屬性可在此頁直接編輯，走的是和意圖相同的 hook 路徑（會觸發 mission 自動完成、journey 轉換）。徽章用可重用元件渲染，不管 icon 是 emoji / URL / data URI 都能正確顯示。
            </p>
            <p>
              任務、徽章、屬性的「編輯／刪除／指派」現在也可以直接在 OA 對話頁右欄做（見下節），不必跳到此頁。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 使用者狀態</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>七個區塊（屬性/任務/連續/徽章/Journey/事件/對話）同時載入</li>
                <li>在此頁手動新增屬性 → 若有對應 auto_complete 任務應自動完成</li>
                <li>在此頁設屬性 → 若有對應 attribute_equals journey 規則應觸發轉換</li>
                <li>engagement events 顯示近 50 筆、按時間倒序</li>
                <li>對話紀錄含雙向訊息（inbound / outbound）和 source 標記</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="conversations" className="hq-card">
          <h3 className="text-lg font-bold mb-2">💬 對話紀錄、手動推送、即時編輯</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              OA 工作區「對話」tab（<code>/oa/[id]?tab=conversations</code>）三欄佈局：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>左欄</strong>：此 OA 的使用者列表，顯示 LINE display_name + 大頭貼，依最近活動排序、可名字 / user_id 搜尋。新訊息在頁面最上面（DESC），到底有「↓ 載入更早訊息」分頁按鈕</li>
              <li><strong>中欄</strong>：訊息泡泡（outbound 綠色靠右、inbound 白色靠左），flex 可展開看完整 JSON，每則附 <strong>來源 badge</strong>（見下表）。中欄頂端有「<strong>🚀 手動推送</strong>」按鈕：選 ContentItem → 立刻推給該使用者，不需透過 LINE 或 cron</li>
              <li><strong>右欄</strong>：選中使用者的即時狀態 — Journey、連續天數、進行中任務、徽章、屬性</li>
            </ul>
            <p>
              <strong>來源 badge 速查</strong>（每則 outbound 訊息底下）：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>🎯 <strong>意圖規則</strong>（綠）— 命中某條 intent rule，後面顯示規則名稱（hover 看 rule_id）</li>
              <li>🤖 <strong>AI Fallback</strong>（紫）— 沒中 intent，走 LLM。後面顯示 agent。可附 🐢 慢回應 / ⚠ 錯誤</li>
              <li>🌗 <strong>Phase 每日推送</strong>（紫）— Journey schedule cron 推的</li>
              <li>🚀 <strong>手動推送</strong>（橘）— ops 從這個 tab 手動送的</li>
              <li>⏰ <strong>習慣提醒</strong>（琥珀）— habit reminder cron</li>
              <li>排程推播 / 任務通知 / 徽章通知 / 加好友歡迎 / Postback 回覆 — 各有對應顏色與 icon</li>
            </ul>
            <p>
              <strong>右欄可直接編輯（客服場景最常用）</strong>：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>屬性：每筆 ✎ 編輯 / ✕ 刪除；底部 <code>key = value [+]</code> 新增</li>
              <li>任務：每筆 ✕ 標記放棄（保留歷史、非硬刪）；「+ 指派」按鈕打開產品可指派任務清單</li>
              <li>徽章：每個徽章尾端 ✕ 撤回（硬刪 user_badge row）</li>
            </ul>
            <p>
              所有編輯都走跟意圖/排程一樣的 hook 路徑 — 手動設屬性會觸發 mission 自動完成、journey 轉換；指派任務走 idempotent 的 assignMission。換言之，在對話頁點的每個動作，效果都跟「使用者自己透過 LINE 觸發」一模一樣。
            </p>
            <p>
              <strong>訊息來源追蹤</strong>：outbound 訊息都帶 source，常見有 <code>follow_reply</code>（加好友歡迎）、<code>intent</code>（意圖回覆）、<code>ai_agent</code>（AI 顧問回覆）、<code>scheduler_push</code>（排程推播）、<code>mission_notify</code>（任務完成推播）、<code>badge_notify</code>（徽章取得推播）。
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1">
              <strong>AC — 對話與編輯</strong>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>使用者清單按最近活動排序，可搜尋</li>
                <li>切換使用者時訊息與右欄狀態都同步更新</li>
                <li>Flex 訊息展開可看完整 JSON，text/image/sticker 各自有對應樣式</li>
                <li>右欄新增屬性後，列表立即反映</li>
                <li>右欄放棄任務後，該任務消失於「進行中」區段、狀態改為 abandoned</li>
                <li>撤回徽章後該徽章消失；之後若符合 criteria 可再次頒發（不重複寫入）</li>
                <li>OA 未綁定產品時，「+ 指派任務」按鈕 disabled</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="richmenu" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🧩 Rich Menu 評估與切換</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              <strong>三層自動評估（follow 時 + scheduler 每日）</strong>：
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-1">
              <li>
                <strong>Layer 1（rule）</strong>：劇本裡有 <code>menu-change-node</code> 的 <code>menuName</code> 對得上某個 deployed template.name → 用它。
              </li>
              <li>
                <strong>Layer 2（AI）</strong>：Layer 1 沒中 → 呼叫 ADK <code>rich-menu-selector</code> agent。
              </li>
              <li>
                <strong>Layer 3（fallback）</strong>：AI 也沒中 → 用 OA 的啟用預設 template。
              </li>
            </ol>
            <p>
              <strong>立即切換（manual）</strong>：意圖規則的 <code>change_menu</code> 動作會直接切換使用者的 Rich Menu，不走三層評估。<code>UserMenuAssignment.source</code> 記為 <code>manual</code>，和 rule/ai/fallback 區分。但之後 scheduler 的每日 menu 重評估仍會覆蓋，若要「黏住」需要在劇本 menu-change-node 也設相同名稱。
            </p>
          </div>
        </section>

        <section id="help" className="hq-card">
          <h3 className="text-lg font-bold mb-2">❓ 區塊內建「?」說明</h3>
          <div className="text-sm text-slate-700 flex flex-col gap-2">
            <p>
              產品詳情頁的每個設定 section — 內容庫、任務、徽章、Journey、意圖規則 — 標題旁都有一個小「?」圖示。點開會彈出該功能的快速說明：
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Key 命名規則 + 語意化建議</li>
              <li>此設定會被哪些其他模組引用（改名前看影響範圍）</li>
              <li>必填 vs 選填欄位</li>
              <li>行為細節（冪等、時區、連動）</li>
              <li>一個可貼著抄的範例</li>
            </ul>
            <p>
              <strong>意圖規則的 help modal 特別有用</strong>：列出動作觸發後的所有連帶效應（設屬性可能觸發任務自動完成、任務完成可能觸發徽章/Journey 轉換…），第一次看的人能掌握「按一個 action 會連動多少東西」。
            </p>
          </div>
        </section>

        <section id="faq" className="hq-card">
          <h3 className="text-lg font-bold mb-2">🛠 常見問題</h3>
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <div>
              <strong>Q：LINE Console Verify 回 404？</strong>
              <br />
              A：OA 的 <code>line_destination_id</code> 沒抓到，或 webhook URL 錯。設定 tab 按「↻ 抓取」，確認 Webhook URL 是 backend（<code>vitera-api-*</code>）不是 HQ 前端。
            </div>
            <div>
              <strong>Q：Verify 回 403 / Invalid signature？</strong>
              <br />
              A：DB 裡的 Channel Secret 跟 LINE Console 上那個不一樣。設定 tab 重貼一次 Channel Secret 儲存。
            </div>
            <div>
              <strong>Q：意圖命中但沒回訊息？</strong>
              <br />
              A：規則的 reply_content_key 指向的 content 不存在或已停用。到產品的內容庫確認；backend log 會有警告。
            </div>
            <div>
              <strong>Q：劇本新增任務動作，排程跑了但沒指派？</strong>
              <br />
              A：OA 未綁定產品，或 mission_key 不存在於綁定產品。檢查劇本頁的 ⚠ 警告、立即執行排程看 error log。
            </div>
            <div>
              <strong>Q：使用者連續天數一直沒動？</strong>
              <br />
              A：Streak 用使用者 timezone 判定日；確認 <code>User.timezone</code> 正確。同日呼叫多次不重算是正常行為。
            </div>
            <div>
              <strong>Q：Journey phase 不會前進？</strong>
              <br />
              A：Journey 是產品層級，必須 OA 綁產品才會評估。另外 attribute_equals 需要精確 match <code>value</code>；log 會寫「journey_transition」事件、無事件代表根本沒命中。
            </div>
            <div>
              <strong>Q：Flex 訊息在 LINE 上沒顯示？</strong>
              <br />
              A：JSON 格式通過編輯器驗證不等於 LINE 會接受。最外層需 bubble/carousel，內部結構可用 LINE Flex Simulator 預覽。也請確認 <code>altText</code> 有填（會當作通知文案）。建議直接用內建 12 個範例再客製化。
            </div>
            <div>
              <strong>Q：設了 notify_content_key 但使用者沒收到推播？</strong>
              <br />
              A：三個可能原因。(1) 使用者和任何 OA 都沒互動過（無 message_log 紀錄）— log 會顯示 <code>no OA context for user</code>。(2) content_key 指向的內容已停用或刪除。(3) 使用者最近互動的 OA 沒設 channel_access_token。去對話 tab 找該使用者看 source=<code>mission_notify</code>/<code>badge_notify</code> 有無出現。
            </div>
            <div>
              <strong>Q：change_menu 動作沒有切換選單？</strong>
              <br />
              A：(1) <code>menu_name</code> 需與 OA 選單 tab 下已部署（<code>line_rich_menu_id</code> 非空）的模板名稱一字不差。(2) Rich Menu 必須先部署過才會有 line_rich_menu_id。log 會顯示 <code>no deployed template named "..."</code>。
            </div>
            <div>
              <strong>Q：徽章 icon 放圖片顯示壞掉？</strong>
              <br />
              A：URL 圖片需要可公開訪問的 https 來源，且瀏覽器能載入（注意 CORS / 憑證）。base64 data URI 上傳限 20 KB 內，壓縮後的 PNG/WebP 小圖 ok，大圖建議改用外部 URL。
            </div>
          </div>
        </section>

        <section className="hq-card">
          <h3 className="text-lg font-bold mb-2">📚 更多資料</h3>
          <ul className="list-disc pl-5 text-sm text-slate-700 flex flex-col gap-1">
            <li>Plan docs：<code className="bg-slate-100 px-1 rounded">docs/superpowers/plans/</code></li>
            <li>後端 schema：<code className="bg-slate-100 px-1 rounded">backend/prisma/schema.prisma</code></li>
            <li>後端動作單元測試：<code className="bg-slate-100 px-1 rounded">pnpm test</code>（於 backend 目錄）</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
