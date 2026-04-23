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

export const SEED_TEMPLATES: Record<string, SeedTemplate> = {
  wellness_21d: WELLNESS_21D,
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
