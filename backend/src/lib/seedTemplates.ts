/**
 * Pre-built product configuration templates. Each template is applied
 * via `POST /api/products/:id/seed` and populates the product with a
 * coherent set of content / missions / badges / journey / intents so
 * the full platform stack can be demoed end-to-end without hand-
 * authoring every entity.
 *
 * Templates are idempotent at the key level — re-running skips items
 * whose key already exists in the target product rather than erroring.
 */

import type {
  CreateContentItemInput,
  CreateMissionTemplateInput,
  CreateBadgeTemplateInput,
  CreateJourneyTemplateInput,
  CreateIntentRuleInput,
} from '../types.js';

export interface SeedTemplate {
  key: string;
  name: string;
  description: string;
  content: CreateContentItemInput[];
  missions: CreateMissionTemplateInput[];
  badges: CreateBadgeTemplateInput[];
  journeys: CreateJourneyTemplateInput[];
  intents: CreateIntentRuleInput[];
}

const WELLNESS_21D: SeedTemplate = {
  key: 'wellness_21d',
  name: '21 天健康習慣',
  description: '示範產品：涵蓋 content / mission / badge / journey / intent 各層的配置，可直接對 LINE 用戶測試。',

  content: [
    {
      key: 'welcome_msg',
      type: 'text',
      body: '歡迎加入 21 天健康習慣計畫！我會陪伴你建立小但持續的好習慣 💪 傳「開始」來啟動旅程吧。',
    },
    {
      key: 'onboard_confirm',
      type: 'text',
      body: '太棒了！你已經開始 Day 1 的任務了。輸入「任務」隨時查看今天要做的事 📋',
    },
    {
      key: 'mission_done',
      type: 'flex',
      title: '任務完成',
      body: JSON.stringify({
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical',
          contents: [
            { type: 'text', text: '🎉 任務完成', weight: 'bold', color: '#1DB446', size: 'lg' },
            { type: 'text', text: '給自己一個鼓勵！繼續保持。', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ],
        },
      }),
    },
    {
      key: 'streak_cheer',
      type: 'text',
      body: '🔥 今天也打卡了！堅持就是勝利。',
    },
    {
      key: 'seven_day_card',
      type: 'flex',
      title: '7 日戰士',
      body: JSON.stringify({
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical',
          contents: [
            { type: 'text', text: '🏆 恭喜取得徽章', weight: 'bold', size: 'lg' },
            { type: 'text', text: '7 日戰士', weight: 'bold', size: 'xxl', color: '#EC1976', margin: 'md' },
            { type: 'text', text: '連續打卡 7 天！接下來的日子繼續保持，14 日挑戰也不遠了。', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ],
        },
      }),
    },
    {
      key: 'graduation_card',
      type: 'flex',
      title: '畢業',
      body: JSON.stringify({
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical',
          contents: [
            { type: 'text', text: '🎓 畢業了！', weight: 'bold', size: 'xxl' },
            { type: 'text', text: '21 天健康習慣計畫', size: 'sm', color: '#aaaaaa', margin: 'xs' },
            { type: 'separator', margin: 'md' },
            { type: 'text', text: '你完成了所有挑戰，建立了新的日常節奏。這不是終點，而是新的起點 💚', size: 'sm', color: '#444444', wrap: true, margin: 'md' },
          ],
        },
      }),
    },
    {
      key: 'help_tip',
      type: 'text',
      body: '可以試試這些指令：\n• 「任務」— 查看今日任務\n• 「打卡」— 記錄連續天數\n• 「我今天喝 X 杯水」— 記錄進度',
    },
    {
      key: 'mood_saved',
      type: 'text',
      body: '感謝分享！我已經記下你今天的狀態 🌱',
    },
  ],

  missions: [
    {
      key: 'drink_water_day1',
      name: '今日喝 3 杯水',
      description: '每天補水是基礎中的基礎。分三次回報即可。',
      progress_target: 3,
      on_complete_actions: [
        { type: 'increment_streak', streak_key: 'daily_checkin' },
      ],
      notify_content_key: 'mission_done',
    },
    {
      key: 'walk_10min',
      name: '散步 10 分鐘',
      description: '午後或傍晚都可以，走一走讓心跳稍微加快。',
      progress_target: 1,
      on_complete_actions: [
        { type: 'increment_streak', streak_key: 'daily_checkin' },
      ],
      notify_content_key: 'mission_done',
    },
    {
      key: 'mood_survey',
      name: '分享今天的心情',
      description: '設定 primary_concern 屬性時自動完成（示範屬性自動完成）。',
      progress_target: 1,
      auto_complete_on_attribute: { attribute_key: 'primary_concern' },
      notify_content_key: 'mood_saved',
    },
  ],

  badges: [
    {
      key: 'seven_day_streak',
      name: '7 日戰士',
      description: '連續打卡 7 天',
      icon: '🔥',
      criteria: { type: 'streak_reached', streak_key: 'daily_checkin', threshold: 7 },
      notify_content_key: 'seven_day_card',
    },
    {
      key: 'first_task_done',
      name: '首戰告捷',
      description: '完成第一個任務',
      icon: '🏅',
      criteria: { type: 'mission_completed', mission_key: 'drink_water_day1' },
    },
  ],

  journeys: [
    {
      key: 'wellness_21',
      name: '21 天旅程',
      description: '使用者在此產品中的階段狀態',
      phases: [
        { key: 'onboarding', name: '起始', icon: '🌱' },
        { key: 'active', name: '進行中', icon: '🚀' },
        { key: 'completed', name: '完訓', icon: '🎓' },
      ],
      transitions: [
        // Entry: 使用者表達願意開始 → 設定 onboarded=yes → 進入 onboarding
        { to_phase: 'onboarding', trigger: { type: 'attribute_equals', attribute_key: 'onboarded', value: 'yes' } },
        // 完成第一個任務就從 onboarding 推進到 active
        { from_phase: 'onboarding', to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'drink_water_day1' } },
        // 取得 7 日戰士徽章就推進到 completed（可改為 21 天徽章）
        { from_phase: 'active', to_phase: 'completed', trigger: { type: 'badge_earned', badge_key: 'seven_day_streak' } },
      ],
    },
  ],

  intents: [
    {
      name: '歡迎打招呼',
      priority: 10,
      match_type: 'keyword',
      patterns: ['你好', '嗨', 'hi', 'hello', '哈囉'],
      action_type: 'reply_content',
      action_config: { content_key: 'welcome_msg' },
    },
    {
      name: '開始旅程',
      priority: 20,
      match_type: 'keyword',
      patterns: ['開始', '我準備好', '我要開始'],
      action_type: 'set_attribute',
      action_config: { key: 'onboarded', value: 'yes', reply_content_key: 'onboard_confirm' },
    },
    {
      name: '查看任務清單',
      priority: 30,
      match_type: 'keyword',
      patterns: ['任務', 'checklist', '清單', '今天做什麼'],
      action_type: 'send_mission_checklist',
      action_config: {},
    },
    {
      name: '每日打卡',
      priority: 30,
      match_type: 'keyword',
      patterns: ['打卡', '簽到', 'checkin'],
      action_type: 'increment_streak',
      action_config: { streak_key: 'daily_checkin', reply_content_key: 'streak_cheer' },
    },
    {
      name: '喝水進度 +1',
      priority: 40,
      match_type: 'keyword',
      patterns: ['喝水', '喝完了', '水'],
      action_type: 'increment_mission_progress',
      action_config: { mission_key: 'drink_water_day1', step: 1 },
    },
    {
      name: '散步完成',
      priority: 40,
      match_type: 'keyword',
      patterns: ['散步', '走路', '走了'],
      action_type: 'complete_mission',
      action_config: { mission_key: 'walk_10min', reply_content_key: 'mission_done' },
    },
    {
      name: '心情打卡',
      priority: 50,
      match_type: 'keyword',
      patterns: ['心情不好', '壓力大', '焦慮'],
      action_type: 'set_attribute',
      action_config: { key: 'primary_concern', value: 'anxiety', reply_content_key: 'mood_saved' },
    },
    {
      name: '求助',
      priority: 90,
      match_type: 'keyword',
      patterns: ['幫助', 'help', '怎麼用', '指令'],
      action_type: 'reply_content',
      action_config: { content_key: 'help_tip' },
    },
  ],
};

// ─── 生理週期 28 天課程 ─────────────────────────────────────────────────────
// 設計：identity transformation + 3 個 keystone habit（補/流/靜），
// phase 切換完全由使用者主動回報（「月經來了」「結束了」「PMS」）。
// 每個 phase 進入時靠 intent rule 的 reply_content_key 立即推 day_1
// （之後加 evaluateJourneys hook 再改更乾淨）。

const PERIOD_BUBBLE_DAY_1: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [
    { type: 'text', text: '🩸 經期 Day 1', weight: 'bold', size: 'sm', color: '#831843' },
  ] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '妳的身體正在做一場大掃除。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '為什麼會這麼累？', size: 'sm', color: '#666666', weight: 'bold', margin: 'md' },
    { type: 'text', text: '雌激素跟黃體素同時掉到谷底，身體用最多能量在子宮內膜剝離。妳沒有不勤勞，是真的不該勤勞。', size: 'sm', wrap: true, color: '#444444' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '今天 keystone：', size: 'xs', color: '#06c755', weight: 'bold', margin: 'md' },
    { type: 'text', text: '🍂 補 — 鐵質很重要，紅肉/肝臟最好吸收', size: 'sm', wrap: true },
    { type: 'text', text: '💧 流 — 紅糖薑茶 8 杯，溫的最好', size: 'sm', wrap: true },
    { type: 'text', text: '🌙 靜 — 9 點上床，好好哭一場也行', size: 'sm', wrap: true },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#831843', action: { type: 'uri', label: '看補鐵組合', uri: 'https://example.com/iron' } },
    { type: 'button', style: 'secondary', action: { type: 'postback', label: '🌙 我已完成今晚 wind-down', data: 'act=complete_mission&key=period_wind_down&reply_content=period_wind_down_done' } },
  ] },
};

const PERIOD_BUBBLE_DAY_3: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🩸 經期 Day 3', weight: 'bold', size: 'sm', color: '#831843' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '最辛苦的兩天過了。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '能量會慢慢回來，但別急。妳的身體還在修復內膜，這是接下來一個月精氣神的地基。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '今天 keystone：', size: 'xs', color: '#06c755', weight: 'bold', margin: 'md' },
    { type: 'text', text: '🍂 補 — 桂圓紅棗茶補氣血', size: 'sm', wrap: true },
    { type: 'text', text: '💧 流 — 仍是溫飲為主，避開冰', size: 'sm', wrap: true },
    { type: 'text', text: '🌙 靜 — 試試貓牛式放鬆骨盆', size: 'sm', wrap: true },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#831843', action: { type: 'uri', label: '看溫補茶飲', uri: 'https://example.com/warm-tea' } },
  ] },
};

const PERIOD_BUBBLE_DAY_7: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🩸 經期 Day 7', weight: 'bold', size: 'sm', color: '#831843' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '清理接近尾聲。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '雌激素開始回升，妳會發現專注力跟皮膚狀態都在改善。經期結束時，傳「月經結束了」告訴我，我們就轉換頻道。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#831843', action: { type: 'message', label: '月經結束了', text: '月經結束了' } },
  ] },
};

const FOLLICULAR_BUBBLE_DAY_1: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🌱 濾泡期 Day 1', weight: 'bold', size: 'sm', color: '#16a34a' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '黃金週開始。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '為什麼這幾天特別有衝勁？', size: 'sm', color: '#666666', weight: 'bold', margin: 'md' },
    { type: 'text', text: '雌激素一路爬升到巔峰。腦袋反應最快、體力代謝最高、社交慾望最強。把要動腦、要運動、要約人的事，都排在這 7-10 天。', size: 'sm', wrap: true, color: '#444444' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '今天 keystone：', size: 'xs', color: '#06c755', weight: 'bold', margin: 'md' },
    { type: 'text', text: '🍂 補 — 抗氧化（藍莓、維他命 C）', size: 'sm', wrap: true },
    { type: 'text', text: '💧 流 — 可以接受冷飲、補電解質', size: 'sm', wrap: true },
    { type: 'text', text: '🌙 靜 — 有體力做 HIIT，但晚上仍要降溫', size: 'sm', wrap: true },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#16a34a', action: { type: 'uri', label: '看抗氧化組合', uri: 'https://example.com/antioxidant' } },
  ] },
};

const FOLLICULAR_BUBBLE_DAY_5: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🌱 濾泡期 Day 5（接近排卵）', weight: 'bold', size: 'sm', color: '#16a34a' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '排卵期前的高光時刻。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '基礎體溫即將拉高，黃體素開始準備接班。妳的吸引力跟語言感染力會在這幾天達到巔峰，是大膽說、大膽做的時候。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
};

const FOLLICULAR_BUBBLE_DAY_10: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🌱 濾泡期 Day 10', weight: 'bold', size: 'sm', color: '#16a34a' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '黃金週末段。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '能量還在但開始要收。如果妳今天感受到體溫升高、乳房微脹，那就是進入黃體期的訊號。傳「PMS」告訴我，我會切換到陪伴模式。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#16a34a', action: { type: 'message', label: 'PMS', text: 'PMS' } },
  ] },
};

const LUTEAL_BUBBLE_DAY_1: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🍂 黃體期 Day 1', weight: 'bold', size: 'sm', color: '#c2410c' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '步調開始向內。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '黃體素接管後，妳會比較想獨處、容易被細節煩擾。這不是妳變難搞，是身體在替「萬一懷孕」的可能性做準備，整個系統都在保溫、保留。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '今天 keystone：', size: 'xs', color: '#06c755', weight: 'bold', margin: 'md' },
    { type: 'text', text: '🍂 補 — Omega-3、鎂可以開始補', size: 'sm', wrap: true },
    { type: 'text', text: '💧 流 — 改回溫飲，少咖啡因', size: 'sm', wrap: true },
    { type: 'text', text: '🌙 靜 — 提前半小時上床，補鎂幫助睡眠', size: 'sm', wrap: true },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#c2410c', action: { type: 'uri', label: '看黃體期保健組', uri: 'https://example.com/luteal' } },
  ] },
};

const LUTEAL_BUBBLE_DAY_7: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🍂 黃體期 Day 7（PMS 高峰）', weight: 'bold', size: 'sm', color: '#c2410c' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '可能會煩躁、想吃甜的、容易流淚。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '這是激素波動，不是個性問題。允許自己今天少社交、晚上吃一塊 70% 黑巧克力安撫多巴胺。重點不是熬過去，是不要把這天的情緒當成定論。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
};

const LUTEAL_BUBBLE_DAY_14: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🍂 黃體期 Day 14', weight: 'bold', size: 'sm', color: '#c2410c' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '清理即將開始。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '把黑褲子、暖暖包、止痛藥放好。下次月經來時，傳「月經來了」我們就進入下一輪。妳已經完成第一個 cycle，不論做了多少 keystone，妳已經比上個月更認識自己一點點。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
  footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    { type: 'button', style: 'primary', color: '#c2410c', action: { type: 'message', label: '月經來了', text: '月經來了' } },
  ] },
};

const ONBOARDING_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🌱 歡迎', weight: 'bold', size: 'sm', color: '#4f46e5' }] },
  body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '接下來 28 天，跟身體節奏和解。', weight: 'bold', size: 'lg', wrap: true },
    { type: 'text', text: '這不是教妳「管控」月經，而是讓妳辨認週期裡每個階段的訊號，順著節奏照顧自己。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '我會陪妳練 3 件事：', size: 'xs', color: '#06c755', weight: 'bold', margin: 'md' },
    { type: 'text', text: '🍂 補 — 對的階段補對的營養', size: 'sm' },
    { type: 'text', text: '💧 流 — 每天的補水節奏', size: 'sm' },
    { type: 'text', text: '🌙 靜 — 每晚 wind-down 儀式', size: 'sm' },
    { type: 'text', text: '請在月經來的那天，傳「月經來了」給我，我們就開始。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
  ] },
};

const PERIOD_CYCLE_DEMO: SeedTemplate = {
  key: 'period_cycle_demo',
  name: '生理週期 28 天 (Demo)',
  description: '使用者主動回報、phase-driven 內容、3 個 keystone（補/流/靜）。3 個 phase × 各取 3 個錨點日 = 9 張卡，可端到端跑完整循環。',

  content: [
    {
      key: 'period_follow_welcome',
      type: 'text',
      body: '歡迎妳！我會陪妳跟身體節奏和解 28 天。\n\n請在月經來的那天，傳「月經來了」給我，我們就開始。',
    },
    {
      key: 'period_wind_down_done',
      type: 'text',
      body: '🌙 今晚 wind-down 完成。\n睡前的儀式感是給自己的禮物。',
    },
    {
      key: 'period_onboarding',
      type: 'flex',
      title: '歡迎你的 28 天週期之旅',
      body: JSON.stringify(ONBOARDING_BUBBLE),
    },
    { key: 'menstrual_day_1',  type: 'flex', title: '🩸 經期 Day 1',          body: JSON.stringify(PERIOD_BUBBLE_DAY_1) },
    { key: 'menstrual_day_3',  type: 'flex', title: '🩸 經期 Day 3',          body: JSON.stringify(PERIOD_BUBBLE_DAY_3) },
    { key: 'menstrual_day_7',  type: 'flex', title: '🩸 經期 Day 7（尾聲）',  body: JSON.stringify(PERIOD_BUBBLE_DAY_7) },
    { key: 'follicular_day_1', type: 'flex', title: '🌱 濾泡 Day 1',          body: JSON.stringify(FOLLICULAR_BUBBLE_DAY_1) },
    { key: 'follicular_day_5', type: 'flex', title: '🌱 濾泡 Day 5（接近排卵）', body: JSON.stringify(FOLLICULAR_BUBBLE_DAY_5) },
    { key: 'follicular_day_10', type: 'flex', title: '🌱 濾泡 Day 10',         body: JSON.stringify(FOLLICULAR_BUBBLE_DAY_10) },
    { key: 'luteal_day_1',     type: 'flex', title: '🍂 黃體 Day 1',          body: JSON.stringify(LUTEAL_BUBBLE_DAY_1) },
    { key: 'luteal_day_7',     type: 'flex', title: '🍂 黃體 Day 7（PMS 高峰）', body: JSON.stringify(LUTEAL_BUBBLE_DAY_7) },
    { key: 'luteal_day_14',    type: 'flex', title: '🍂 黃體 Day 14',         body: JSON.stringify(LUTEAL_BUBBLE_DAY_14) },
  ],

  missions: [
    {
      key: 'period_supplement_log',
      name: '🍂 日補',
      description: '對的階段補對的營養。經期補鐵、濾泡補抗氧化、黃體補鎂。',
      mission_type: 'binary_daily',
      frequency: 'daily',
      category: 'period_keystone',
      reminder: { enabled: true, time: '09:00' },
    },
    {
      key: 'period_hydration_log',
      name: '💧 日流',
      description: '依階段不同的補水節奏。經期溫飲、濾泡電解質、黃體溫補。',
      mission_type: 'quantitative_daily',
      frequency: 'daily',
      daily_target: 8,
      unit: '杯',
      step_value: 1,
      category: 'period_keystone',
    },
    {
      key: 'period_wind_down',
      name: '🌙 日靜',
      description: '每晚的 wind-down 儀式。11pm 前關手機、黃體期補鎂幫助入睡。',
      mission_type: 'binary_daily',
      frequency: 'daily',
      category: 'period_keystone',
      reminder: { enabled: true, time: '21:30' },
    },
  ],

  // 第一輪 cycle 完成的徽章 — 黃體期最後一天觸發 luteal→menstrual transition 即視為一個 cycle 完成。
  // 暫無乾淨的 trigger 對應，先用 mission_completed 對 supplement_log（會在習慣養成滿一週時自然觸發）。
  badges: [],

  journeys: [
    {
      key: 'period_cycle',
      name: '生理週期',
      description: '經期 → 濾泡 → 黃體 三階段，由使用者主動回報切換。',
      phases: [
        {
          key: 'menstrual', name: '🩸 經期', icon: '🩸',
          // day_1 由 intent rule reply_content_key 即時推；day_2+ 由 cron。
          // 經期早晨 09:00 推，溫和提醒不打擾。
          schedule: [
            { day: 3, time: '09:00', content_key: 'menstrual_day_3' },
            { day: 7, time: '09:00', content_key: 'menstrual_day_7' },
          ],
        },
        {
          key: 'follicular', name: '🌱 濾泡期', icon: '🌱',
          // 濾泡能量好，中午 12:00 推（不會打斷早起運動）。
          schedule: [
            { day: 5, time: '12:00', content_key: 'follicular_day_5' },
            { day: 10, time: '12:00', content_key: 'follicular_day_10' },
          ],
        },
        {
          key: 'luteal', name: '🍂 黃體期', icon: '🍂',
          // 黃體較內斂，黃昏 20:00 推，搭配 wind-down 時段。
          schedule: [
            { day: 7, time: '20:00', content_key: 'luteal_day_7' },
            { day: 14, time: '20:00', content_key: 'luteal_day_14' },
          ],
        },
      ],
      transitions: [
        { to_phase: 'menstrual',  trigger: { type: 'attribute_equals', attribute_key: 'period_state', value: 'menstrual' } },
        { to_phase: 'follicular', trigger: { type: 'attribute_equals', attribute_key: 'period_state', value: 'follicular' } },
        { to_phase: 'luteal',     trigger: { type: 'attribute_equals', attribute_key: 'period_state', value: 'luteal' } },
      ],
    },
  ],

  intents: [
    {
      name: '月經來了',
      priority: 10,
      match_type: 'keyword',
      patterns: ['月經來了', '月經來', '來了', 'mc來', 'MC來', '經期開始', '生理期來'],
      action_type: 'set_attribute',
      // attribute_equals trigger fires Journey transition；reply_content_key 同步推 day_1 卡作為「進入 phase 立刻推」的暫時方案
      action_config: { key: 'period_state', value: 'menstrual', reply_content_key: 'menstrual_day_1' },
    },
    {
      name: '月經結束了',
      priority: 10,
      match_type: 'keyword',
      patterns: ['月經結束', '結束了', '乾淨了', 'mc結束', 'MC結束', '生理期結束'],
      action_type: 'set_attribute',
      action_config: { key: 'period_state', value: 'follicular', reply_content_key: 'follicular_day_1' },
    },
    {
      name: '進入黃體期 (PMS 感)',
      priority: 10,
      match_type: 'keyword',
      patterns: ['PMS', 'pms', '黃體期', '快來月經了', '我快要月經了', '感覺要來了'],
      action_type: 'set_attribute',
      action_config: { key: 'period_state', value: 'luteal', reply_content_key: 'luteal_day_1' },
    },
  ],
};

// ─── 女性保健小課程（28 天）───────────────────────────────────────────────────
// 9 個 LINE 訊息模板（7 flex + 2 text）+ 3 個 IntentRule
// 品牌色 #c2185b（玫瑰粉）；LIFF/電商/預約 URL 為 placeholder，上線前置換
// 需求文件：seed-women-healing-line-templates.md v1.1 / 2026-05-14

const LIFF_BASE   = 'https://liff.example.com/women-healing';
const SHOP_URL    = 'https://shop.cofit.me/women-healing';
const BOOKING_URL = 'https://booking.cofit.me/one-on-one';
const BRAND_PINK  = '#c2185b';

const WH_WELCOME_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🌸 女性保健小課程', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '歡迎加入 28 天女性保健小課程！', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: '我們將陪伴妳建立屬於自己的女性保健習慣。\n\n第一步，先完成前測問卷，讓我們了解妳的身體狀況 💗', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '前往前測問卷 →', uri: `${LIFF_BASE}/pretest` } },
    ],
  },
};

const WH_DAILY_TASK_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '📋 今日任務提醒', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '今天的任務還沒完成喔！', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: '每一個小習慣都是妳給身體最好的禮物。點下方按鈕查看今日 Checklist 吧 ✨', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '查看今日任務 →', uri: `${LIFF_BASE}/tasks` } },
    ],
  },
};

const WH_STAGE_D7_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🎉 完成第 1 週！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '妳已經堅持了 7 天，做得很好！', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: '第一週重點在認識自己的週期節律，妳已經踏出最重要的第一步。\n\n第二週我們要深入飲食調整，繼續加油！', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: '下週主題：飲食與激素平衡', size: 'xs', color: BRAND_PINK, weight: 'bold', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '看第 2 週任務 →', uri: `${LIFF_BASE}/tasks?week=2` } },
    ],
  },
};

const WH_STAGE_D14_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🎉 完成第 2 週！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '兩週了，妳是認真的！', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: '飲食習慣的改變需要時間，妳已經在對的道路上。\n\n第三週進入運動與身體活動，讓我們一起動起來！', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: '下週主題：運動與子宮健康', size: 'xs', color: BRAND_PINK, weight: 'bold', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '看第 3 週任務 →', uri: `${LIFF_BASE}/tasks?week=3` } },
    ],
  },
};

const WH_STAGE_D21_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🎉 完成第 3 週！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '三週！妳的身體正在改變中。', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: '運動讓身體充滿活力，妳的堅持令人佩服。\n\n最後一週，我們聚焦在心理調適與整合，迎接完美結業！', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: '下週主題：心理健康與整合', size: 'xs', color: BRAND_PINK, weight: 'bold', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '看第 4 週任務 →', uri: `${LIFF_BASE}/tasks?week=4` } },
    ],
  },
};

const WH_COMPLETION_D28_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🎓 恭喜完課！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '妳完成了 28 天女性保健小課程！', weight: 'bold', size: 'xxl', wrap: true },
      { type: 'text', text: '這 28 天妳給自己的每一份用心，身體都記住了 💗\n\n接下來有三件事可以做：', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: '① 完成後測，看看妳的進步\n② 預約一對一，讓醫師為妳解答\n③ 使用折扣碼 WOMEN0 領取 0 元保健品', size: 'sm', wrap: true, color: '#444444', margin: 'sm' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical', spacing: 'sm',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK,  action: { type: 'uri', label: '前往後測問卷 →',     uri: `${LIFF_BASE}/posttest` } },
      { type: 'button', style: 'secondary',                   action: { type: 'uri', label: '預約一對一諮詢',      uri: BOOKING_URL } },
      { type: 'button', style: 'secondary',                   action: { type: 'uri', label: '領取 0 元保健品',     uri: SHOP_URL } },
    ],
  },
};

const WH_POSTTEST_COMPLETED_BUBBLE: object = {
  type: 'carousel',
  contents: [
    // 卡 1：後測完成確認
    {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: BRAND_PINK,
        contents: [
          { type: 'text', text: '✨ 後測完成！', weight: 'bold', size: 'sm', color: '#ffffff' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '了解自己，是照顧自己的第一步。', weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: '妳已經完成前後對照，數據會讓妳更清楚這 28 天的成果。\n\n記得：保健不是一時的，而是一輩子的選擇 🌸', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
        ],
      },
    },
    // 卡 2：精準保健規劃
    {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: BRAND_PINK,
        contents: [
          { type: 'text', text: '🌿 精準保健規劃', weight: 'bold', size: 'sm', color: '#ffffff' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '為妳量身打造的保健方案', weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: '28 天的數據讓我們更了解妳的身體，讓醫師為妳設計專屬保健規劃。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '預約一對一諮詢 →', uri: BOOKING_URL } },
        ],
      },
    },
    // 卡 3：查看推薦保健品
    {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: BRAND_PINK,
        contents: [
          { type: 'text', text: '💊 推薦保健品', weight: 'bold', size: 'sm', color: '#ffffff' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '適合妳的保健品在這裡', weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: '根據妳的分型與課程紀錄，為妳推薦最適合的保健品組合。', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '查看推薦保健品 →', uri: SHOP_URL } },
        ],
      },
    },
  ],
};

const WH_BADGE_3D_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🌱 徽章解鎖！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '3 日初芽', weight: 'bold', size: 'xxl', color: BRAND_PINK },
      { type: 'text', text: '連續 3 天完成任務了！\n\n小小的堅持，正在為妳的身體打下好基礎 🌿 繼續保持，下一個里程碑是 5 天！', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '查看我的徽章 →', uri: `${LIFF_BASE}/profile` } },
    ],
  },
};

const WH_BADGE_5D_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🌸 徽章解鎖！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '5 日開花', weight: 'bold', size: 'xxl', color: BRAND_PINK },
      { type: 'text', text: '5 天了！妳做到了 🎉\n\n研究顯示，連續 5 天養成習慣，大腦已經開始記住這個節奏。下一站：10 天盛放！', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '查看我的徽章 →', uri: `${LIFF_BASE}/profile` } },
    ],
  },
};

const WH_BADGE_10D_BUBBLE: object = {
  type: 'bubble', size: 'mega',
  header: {
    type: 'box', layout: 'vertical',
    backgroundColor: BRAND_PINK,
    contents: [
      { type: 'text', text: '🌺 徽章解鎖！', weight: 'bold', size: 'sm', color: '#ffffff' },
    ],
  },
  body: {
    type: 'box', layout: 'vertical', spacing: 'md',
    contents: [
      { type: 'text', text: '10 日盛放', weight: 'bold', size: 'xxl', color: BRAND_PINK },
      { type: 'text', text: '連續 10 天，真的很厲害！🌺\n\n妳已經跨越習慣養成最難的那道坎。這不只是毅力，是妳對自己身體的愛 💗', size: 'sm', wrap: true, color: '#444444', margin: 'md' },
    ],
  },
  footer: {
    type: 'box', layout: 'vertical',
    contents: [
      { type: 'button', style: 'primary', color: BRAND_PINK, action: { type: 'uri', label: '查看我的徽章 →', uri: `${LIFF_BASE}/profile` } },
    ],
  },
};

const WOMEN_HEALING_COURSE: SeedTemplate = {
  key: 'women_healing_course',
  name: '女性保健小課程',
  description: '28 天女性保健課程：9 個 LINE 訊息模板（Welcome、每日提醒、D7/14/21 回饋、D28 完課、後測完成、月經確認、喚回）+ 3 個 IntentRule（前測入口、查看任務、回報月經開始）。',

  content: [
    // 1. wh_welcome_msg — 加好友第一則訊息 + 前測 CTA
    {
      key: 'wh_welcome_msg',
      type: 'flex',
      title: '歡迎加入女性保健小課程',
      body: JSON.stringify(WH_WELCOME_BUBBLE),
    },
    // 2. wh_daily_task_reminder — 每日任務提醒（用戶在設定時間前未勾任務時的備援推播）
    {
      key: 'wh_daily_task_reminder',
      type: 'flex',
      title: '每日任務提醒',
      body: JSON.stringify(WH_DAILY_TASK_BUBBLE),
    },
    // 3. stage_feedback_d7 — D7 階段回饋 + 看 L2 任務 CTA
    {
      key: 'stage_feedback_d7',
      type: 'flex',
      title: 'D7 階段回饋',
      body: JSON.stringify(WH_STAGE_D7_BUBBLE),
    },
    // 4. stage_feedback_d14 — D14 階段回饋 + 看 L3 任務 CTA
    {
      key: 'stage_feedback_d14',
      type: 'flex',
      title: 'D14 階段回饋',
      body: JSON.stringify(WH_STAGE_D14_BUBBLE),
    },
    // 5. stage_feedback_d21 — D21 階段回饋 + 看 L4 任務 CTA
    {
      key: 'stage_feedback_d21',
      type: 'flex',
      title: 'D21 階段回饋',
      body: JSON.stringify(WH_STAGE_D21_BUBBLE),
    },
    // 6. completion_d28 — 完課訊息 + 後測 + 預約 + 折扣碼
    {
      key: 'completion_d28',
      type: 'flex',
      title: 'D28 完課訊息',
      body: JSON.stringify(WH_COMPLETION_D28_BUBBLE),
    },
    // 7. posttest_completed — 後測完成 + 衛教結語 + 結業 CTA
    {
      key: 'posttest_completed',
      type: 'flex',
      title: '後測完成',
      body: JSON.stringify(WH_POSTTEST_COMPLETED_BUBBLE),
    },
    // 8. period_started_ack — 用戶回報「月經開始」後的確認訊息（text）
    {
      key: 'period_started_ack',
      type: 'text',
      body: '收到 🩸 月經照護模式開啟！\n\n今天的任務清單已自動追加「月經照護」小任務，好好照顧自己 💗',
    },
    // 9. recall_inactive — 喚回 N 天未活躍用戶（text）
    {
      key: 'recall_inactive',
      type: 'text',
      body: '妳好！好久沒見到妳了 🌸\n\n課程還在等妳，今天回來看看任務吧？哪怕只完成一件小事，都是對自己的承諾 💪',
    },
    // 10. wh_badge_3d — 連勝 3 天徽章推播
    {
      key: 'wh_badge_3d',
      type: 'flex',
      title: '徽章：3 日初芽',
      body: JSON.stringify(WH_BADGE_3D_BUBBLE),
    },
    // 11. wh_badge_5d — 連勝 5 天徽章推播
    {
      key: 'wh_badge_5d',
      type: 'flex',
      title: '徽章：5 日開花',
      body: JSON.stringify(WH_BADGE_5D_BUBBLE),
    },
    // 12. wh_badge_10d — 連勝 10 天徽章推播
    {
      key: 'wh_badge_10d',
      type: 'flex',
      title: '徽章：10 日盛放',
      body: JSON.stringify(WH_BADGE_10D_BUBBLE),
    },
  ],

  missions: [],

  // streak_key: 'wh_daily_checkin' — LIFF 打勾 API 呼叫 incrementStreak 時要用同一個 key
  badges: [
    {
      key: 'wh_streak_3d',
      name: '3 日初芽',
      description: '連續 3 天完成任務',
      icon: '🌱',
      criteria: { type: 'streak_reached', streak_key: 'wh_daily_checkin', threshold: 3 },
      notify_content_key: 'wh_badge_3d',
    },
    {
      key: 'wh_streak_5d',
      name: '5 日開花',
      description: '連續 5 天完成任務',
      icon: '🌸',
      criteria: { type: 'streak_reached', streak_key: 'wh_daily_checkin', threshold: 5 },
      notify_content_key: 'wh_badge_5d',
    },
    {
      key: 'wh_streak_10d',
      name: '10 日盛放',
      description: '連續 10 天完成任務',
      icon: '🌺',
      criteria: { type: 'streak_reached', streak_key: 'wh_daily_checkin', threshold: 10 },
      notify_content_key: 'wh_badge_10d',
    },
    {
      key: 'wh_streak_28d',
      name: '28 日圓滿',
      description: '連續 28 天完成任務',
      icon: '🏆',
      criteria: { type: 'streak_reached', streak_key: 'wh_daily_checkin', threshold: 28 },
      notify_content_key: null,
    },
  ],

  journeys: [
    {
      key: 'women_healing_28d',
      name: '28 天女性保健課程',
      description: '用戶在 LIFF 問卷選擇開始日後進入 active phase，D7/14/21/28 自動推階段回饋。D1 基準從 course_start_date attribute 讀取。',
      phases: [
        {
          key: 'active',
          name: '進行中',
          icon: '🌸',
          // D1 由 LIFF 完成問卷時立即推 welcome_msg，cron 從 D7 起。
          // 推播時間 09:00，搭配日補提醒讓用戶早上看到。
          schedule: [
            { day: 7,  time: '09:00', content_key: 'stage_feedback_d7' },
            { day: 14, time: '09:00', content_key: 'stage_feedback_d14' },
            { day: 21, time: '09:00', content_key: 'stage_feedback_d21' },
            { day: 28, time: '09:00', content_key: 'completion_d28' },
          ],
        },
        {
          key: 'completed',
          name: '完課',
          icon: '🎓',
        },
      ],
      transitions: [
        // LIFF 問卷完成後寫入 course_started=yes，觸發進入 active phase
        { to_phase: 'active',   trigger: { type: 'attribute_equals', attribute_key: 'course_started',   value: 'yes' } },
        // D28 推播後用戶完成後測，LIFF 寫入 course_completed=yes
        { from_phase: 'active', to_phase: 'completed', trigger: { type: 'attribute_equals', attribute_key: 'course_completed', value: 'yes' } },
      ],
    },
  ],

  intents: [
    {
      name: '前測入口',
      priority: 20,
      match_type: 'keyword',
      patterns: ['前測', '問卷', '開始課程', '我要開始'],
      action_type: 'reply_content',
      action_config: { content_key: 'wh_welcome_msg' },
    },
    {
      name: '查看任務',
      priority: 30,
      match_type: 'keyword',
      patterns: ['任務', '今日任務', '今天任務', 'checklist'],
      action_type: 'reply_content',
      action_config: { content_key: 'wh_daily_task_reminder' },
    },
    {
      name: '回報月經開始',
      priority: 10,
      match_type: 'keyword',
      patterns: ['月經來了', '月經開始', 'MC來了', 'mc來了', '我月經來了', '生理期來了'],
      action_type: 'set_attribute',
      action_config: { key: 'period_state', value: 'menstrual', reply_content_key: 'period_started_ack' },
    },
  ],
};

export const SEED_TEMPLATES: Record<string, SeedTemplate> = {
  wellness_21d: WELLNESS_21D,
  period_cycle_demo: PERIOD_CYCLE_DEMO,
  women_healing_course: WOMEN_HEALING_COURSE,
};

export const SEED_TEMPLATE_LIST = Object.values(SEED_TEMPLATES).map(t => ({
  key: t.key,
  name: t.name,
  description: t.description,
  counts: {
    content: t.content.length,
    missions: t.missions.length,
    badges: t.badges.length,
    journeys: t.journeys.length,
    intents: t.intents.length,
  },
}));
