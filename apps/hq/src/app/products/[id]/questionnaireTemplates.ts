// 30 ready-to-load questionnaire templates organised by category.
// Each demonstrates a specific combo of calc types, branching, hooks,
// and post-processors so ops can scan "原來系統支援這些功能" at a glance.
//
// Loaded into the HQ editor via the "從範本載入" dropdown (TemplateLoader
// component) — picking one fills the form, ops can then customise.
//
// To add more: append an entry. Don't worry about types — the spec is
// a plain JS object the editor JSON-stringifies before save.

export type TemplateCategory =
  | '心理健康'
  | '身體健康'
  | '生活風格'
  | '個性 / 類型'
  | '關係'
  | '工作 / 學習'
  | '女性健康'
  | '行銷 / 偏好';

export interface QuestionnaireTemplate {
  id: string;
  label: string;
  description: string;
  feature_tags: string[];
  category: TemplateCategory;
  template: {
    key: string;
    name: string;
    description: string;
    spec: Record<string, unknown>;
    on_submit_actions: unknown[];
  };
}

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireTemplate[] = [
  // ═════════════════════════════════════════════════════════════
  // 心理健康
  // ═════════════════════════════════════════════════════════════

  {
    id: 'phq9',
    label: 'PHQ-9 憂鬱症篩檢',
    description: '9 題標準量表 · sum_up · 5 級嚴重度 · 自動寫使用者屬性',
    feature_tags: ['sum_up', 'interpretation_bands', 'set_attribute'],
    category: '心理健康',
    template: {
      key: 'phq9_demo',
      name: 'PHQ-9 憂鬱症自評量表',
      description: '過去兩週的情況，9 題各 0-3 分。',
      spec: {
        question_sets: [
          {
            key: 'phq9',
            name: 'PHQ-9 總分',
            calculation_type: 'sum_up',
            questions: phq9Questions(),
            interpretation_bands: [
              { min: 0, max: 4, label: '無或極輕度憂鬱' },
              { min: 5, max: 9, label: '輕度憂鬱' },
              { min: 10, max: 14, label: '中度憂鬱' },
              { min: 15, max: 19, label: '中重度憂鬱' },
              { min: 20, max: 27, label: '重度憂鬱' },
            ],
          },
        ],
      },
      on_submit_actions: [
        { type: 'set_attribute', key: 'phq9_last_score', value: '{{scores.phq9}}' },
      ],
    },
  },

  {
    id: 'gad7',
    label: 'GAD-7 焦慮自評',
    description: '7 題焦慮量表 · sum_up · 4 級解讀',
    feature_tags: ['sum_up', 'interpretation_bands'],
    category: '心理健康',
    template: {
      key: 'gad7_demo',
      name: 'GAD-7 廣泛性焦慮自評',
      description: '過去兩週的焦慮狀況。',
      spec: {
        question_sets: [
          {
            key: 'gad7',
            name: 'GAD-7 總分',
            calculation_type: 'sum_up',
            questions: gad7Questions(),
            interpretation_bands: [
              { min: 0, max: 4, label: '無焦慮' },
              { min: 5, max: 9, label: '輕度焦慮' },
              { min: 10, max: 14, label: '中度焦慮' },
              { min: 15, max: 21, label: '重度焦慮' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'mh_overall',
    label: '心理健康總覽（多向度）',
    description: '4 個子量表 · avg_of_sub_question_set_scores · 跨向度分類規則 · 自動指派 mission',
    feature_tags: [
      'avg_of_sub_question_set_scores',
      'classification_rules',
      'assign_mission',
    ],
    category: '心理健康',
    template: {
      key: 'mh_overall_demo',
      name: '心理健康總覽',
      description: '同時評估焦慮、憂鬱、睡眠困擾，輸出整體分與建議。',
      spec: {
        question_sets: [
          {
            key: 'anxiety',
            name: '焦慮',
            calculation_type: 'sum_up',
            questions: simpleScale('anx', '焦慮相關感受', frequency4(), 3),
          },
          {
            key: 'depression',
            name: '憂鬱',
            calculation_type: 'sum_up',
            questions: simpleScale('dep', '憂鬱相關感受', frequency4(), 3),
          },
          {
            key: 'sleep',
            name: '睡眠困擾',
            calculation_type: 'sum_up',
            questions: simpleScale('slp', '睡眠相關困擾', frequency4(), 3),
          },
          {
            key: 'overall',
            name: '整體分數',
            calculation_type: 'avg_of_sub_question_set_scores',
            sub_set_keys: ['anxiety', 'depression', 'sleep'],
            interpretation_bands: [
              { min: 0, max: 3, label: '狀況良好' },
              { min: 4, max: 6, label: '輕度壓力' },
              { min: 7, max: 9, label: '中度壓力' },
              { min: 10, max: 30, label: '高度壓力' },
            ],
          },
        ],
        classification_rules: [
          {
            output_key: 'referral',
            output_label: '建議轉介心理諮商',
            conditions: [
              { score_key: 'anxiety', op: 'gte', value: 6 },
              { score_key: 'depression', op: 'gte', value: 6 },
            ],
          },
        ],
      },
      on_submit_actions: [
        { type: 'assign_mission', mission_key: 'breathing_practice' },
      ],
    },
  },

  {
    id: 'who5',
    label: 'WHO-5 福祉量表',
    description: '5 題 0-5 分 · sum_up（× 4 = 0-100 概念用 bands 對應） · WHO 標準篩檢',
    feature_tags: ['sum_up', 'interpretation_bands'],
    category: '心理健康',
    template: {
      key: 'who5_demo',
      name: 'WHO-5 福祉指數',
      description: '過去兩週你有多常感受到以下狀態？',
      spec: {
        question_sets: [
          {
            key: 'who5',
            name: 'WHO-5 總分',
            calculation_type: 'sum_up',
            questions: [
              '我感到愉快、心情好',
              '我感到平靜、放鬆',
              '我感到精力充沛',
              '我醒來時感到神清氣爽',
              '我的日常生活充滿讓我感興趣的事',
            ].map((text, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text,
              choices: [
                { id: 'a', label: '完全沒有', score: 0 },
                { id: 'b', label: '偶爾', score: 1 },
                { id: 'c', label: '少於一半', score: 2 },
                { id: 'd', label: '一半以上', score: 3 },
                { id: 'e', label: '大部分', score: 4 },
                { id: 'f', label: '一直', score: 5 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 12, label: '福祉偏低，建議關注' },
              { min: 13, max: 18, label: '中等' },
              { min: 19, max: 25, label: '福祉良好' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'pss10',
    label: 'PSS-10 知覺壓力量表',
    description: '10 題 · sum_up · 4 個反向題示範 · score_max 必填',
    feature_tags: ['sum_up', 'reverse_scored', 'score_max'],
    category: '心理健康',
    template: {
      key: 'pss10_demo',
      name: 'PSS-10 知覺壓力量表',
      description: '過去一個月你有多常出現以下感受？',
      spec: {
        question_sets: [
          {
            key: 'pss10',
            name: 'PSS-10 總分',
            calculation_type: 'sum_up',
            questions: pss10Questions(),
            interpretation_bands: [
              { min: 0, max: 13, label: '低壓力' },
              { min: 14, max: 26, label: '中度壓力' },
              { min: 27, max: 40, label: '高壓力' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'net_emotion',
    label: '淨情緒指數（自訂公式）',
    description: 'arithmetic_expression · 正向 - 負向 · 觸發 journey transition',
    feature_tags: ['arithmetic_expression', 'transition_journey'],
    category: '心理健康',
    template: {
      key: 'net_emotion_demo',
      name: '淨情緒指數',
      description: '近 7 天的正向 / 負向感受。',
      spec: {
        question_sets: [
          {
            key: 'positive',
            name: '正向情緒',
            calculation_type: 'sum_up',
            questions: simpleScale('pos', '感到', frequency4(), 3, 4, [
              '平靜',
              '愉快',
              '充滿能量',
              '感激',
            ]),
          },
          {
            key: 'negative',
            name: '負向情緒',
            calculation_type: 'sum_up',
            questions: simpleScale('neg', '感到', frequency4(), 3, 4, [
              '焦躁',
              '低落',
              '疲憊',
              '孤獨',
            ]),
          },
          {
            key: 'net',
            name: '淨情緒分',
            calculation_type: 'arithmetic_expression',
            expression: 'positive - negative',
            interpretation_bands: [
              { min: -12, max: -4, label: '負向偏高，建議放慢腳步' },
              { min: -3, max: 3, label: '平穩' },
              { min: 4, max: 12, label: '正向，狀態良好' },
            ],
          },
        ],
      },
      on_submit_actions: [
        {
          type: 'transition_journey',
          journey_key: 'wellness_path',
          phase_key: 'maintenance',
        },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 身體健康
  // ═════════════════════════════════════════════════════════════

  {
    id: 'sleep_quality',
    label: '睡眠品質量表（含反向題）',
    description: '6 題 · weighted（mean × 20 = 0-100）· 反向計分示範',
    feature_tags: ['weighted', 'reverse_scored', 'score_max'],
    category: '身體健康',
    template: {
      key: 'sleep_psqi_demo',
      name: '睡眠品質量表（簡化版）',
      description: '5 題正向 + 1 題反向，百分制睡眠分數。',
      spec: {
        question_sets: [
          {
            key: 'sleep_quality',
            name: '睡眠品質百分制',
            calculation_type: 'weighted',
            questions: [
              {
                id: 'q1',
                kind: 'single_selection',
                text: '入睡難易度（越易越好）',
                score_max: 4,
                choices: [
                  { id: 'a', label: '非常容易', score: 4 },
                  { id: 'b', label: '容易', score: 3 },
                  { id: 'c', label: '普通', score: 2 },
                  { id: 'd', label: '困難', score: 1 },
                  { id: 'e', label: '非常困難', score: 0 },
                ],
              },
              {
                id: 'q2',
                kind: 'single_selection',
                text: '夜間醒來次數',
                reverse_scored: true,
                score_max: 4,
                choices: [
                  { id: 'a', label: '幾乎不會', score: 0 },
                  { id: 'b', label: '1 次', score: 1 },
                  { id: 'c', label: '2-3 次', score: 2 },
                  { id: 'd', label: '4-5 次', score: 3 },
                  { id: 'e', label: '5 次以上', score: 4 },
                ],
              },
              ...simpleScale('s', '其他睡眠相關', ['很好', '尚可', '不太好', '差'], 4, 4),
            ],
            interpretation_bands: [
              { min: 0, max: 40, label: '睡眠品質差' },
              { min: 41, max: 70, label: '一般' },
              { min: 71, max: 100, label: '良好' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'hormone_body',
    label: '賀爾蒙身型分析',
    description: '多選 · sum_of_multiple_selection · 輸出像 "3L 2P 1A"',
    feature_tags: ['sum_of_multiple_selection', 'choice.category'],
    category: '身體健康',
    template: {
      key: 'hormone_body_demo',
      name: '賀爾蒙身型分析',
      description: '勾選符合自己身體狀況的描述。',
      spec: {
        question_sets: [
          {
            key: 'body_type',
            name: '身型類別分佈',
            calculation_type: 'sum_of_multiple_selection',
            questions: [
              {
                id: 'q1',
                kind: 'multiple_selection',
                text: '最近 3 個月有的狀況（可複選）',
                choices: [
                  { id: 'a', label: '腹部容易堆積脂肪', category: 'L' },
                  { id: 'b', label: '下半身水腫', category: 'L' },
                  { id: 'c', label: '經前胸悶易怒', category: 'P' },
                  { id: 'd', label: '皮膚冒痘', category: 'A' },
                  { id: 'e', label: '夜間盜汗', category: 'A' },
                ],
              },
              {
                id: 'q2',
                kind: 'multiple_selection',
                text: '飲食習慣（可複選）',
                choices: [
                  { id: 'a', label: '愛吃甜食', category: 'L' },
                  { id: 'b', label: '喝冰飲', category: 'L' },
                  { id: 'c', label: '咖啡因攝取多', category: 'A' },
                  { id: 'd', label: '加工食品', category: 'P' },
                ],
              },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'eq5d',
    label: 'EQ-5D 健康相關生活品質',
    description: '5 個面向 · average · 不是 sum',
    feature_tags: ['average', 'interpretation_bands'],
    category: '身體健康',
    template: {
      key: 'eq5d_demo',
      name: 'EQ-5D 生活品質',
      description: '5 個面向各一題，平均分越低越健康。',
      spec: {
        question_sets: [
          {
            key: 'eq5d',
            name: 'EQ-5D 平均分',
            calculation_type: 'average',
            questions: [
              ['行動能力', '我沒有任何問題', '我有些問題', '我臥床無法移動'],
              ['自我照顧', '我沒有任何問題', '我有些問題', '我無法自己處理'],
              ['日常活動', '我沒有任何問題', '我有些問題', '我無法執行'],
              ['疼痛 / 不適', '沒有', '中度', '極度'],
              ['焦慮 / 沮喪', '沒有', '中度', '極度'],
            ].map(([title, ...labels], i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: title,
              choices: labels.map((label, j) => ({ id: `c${j}`, label, score: j })),
            })),
            interpretation_bands: [
              { min: 0, max: 0.4, label: '生活品質良好' },
              { min: 0.41, max: 1.2, label: '中等' },
              { min: 1.21, max: 2, label: '需積極介入' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'pain_nrs',
    label: 'NRS 疼痛強度（單題 score）',
    description: '1 題 · score kind 數值輸入 · 示範 score / text / date 三種 metadata kind',
    feature_tags: ['score', 'text', 'date', 'sum_up'],
    category: '身體健康',
    template: {
      key: 'pain_nrs_demo',
      name: '疼痛強度記錄',
      description: '請輸入此刻的疼痛數值（0-10），並描述位置。',
      spec: {
        question_sets: [
          {
            key: 'pain',
            name: '疼痛分數',
            calculation_type: 'sum_up',
            questions: [
              {
                id: 'date',
                kind: 'date',
                text: '今天日期',
              },
              {
                id: 'pain_score',
                kind: 'score',
                text: '此刻疼痛強度（0 = 無，10 = 最劇烈）',
                score_max: 10,
              },
              {
                id: 'location',
                kind: 'text',
                text: '疼痛位置描述',
              },
            ],
            interpretation_bands: [
              { min: 0, max: 3, label: '輕度' },
              { min: 4, max: 6, label: '中度' },
              { min: 7, max: 10, label: '重度，建議就醫' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'fatigue_fas',
    label: 'FAS 疲勞自評',
    description: '10 題 · sum_up · 含反向題',
    feature_tags: ['sum_up', 'reverse_scored', 'score_max'],
    category: '身體健康',
    template: {
      key: 'fatigue_fas_demo',
      name: 'FAS 疲勞自評量表',
      description: '評估過去一週的整體疲勞狀況。',
      spec: {
        question_sets: [
          {
            key: 'fas',
            name: 'FAS 總分',
            calculation_type: 'sum_up',
            questions: [
              { text: '我常常感到疲倦', reverse: false },
              { text: '我容易很快感到疲累', reverse: false },
              { text: '我幾乎沒有什麼力氣做事', reverse: false },
              { text: '我休息後感覺有恢復精神', reverse: true },
              { text: '我體力上感覺疲乏', reverse: false },
              { text: '我精神上感覺疲乏', reverse: false },
              { text: '我覺得自己活力充沛', reverse: true },
              { text: '思考事情時容易感到費力', reverse: false },
              { text: '提不起勁去做我喜歡的事', reverse: false },
              { text: '集中注意力沒有困難', reverse: true },
            ].map((item, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: item.text,
              reverse_scored: item.reverse || undefined,
              score_max: 4,
              choices: [
                { id: 'a', label: '從不', score: 0 },
                { id: 'b', label: '偶爾', score: 1 },
                { id: 'c', label: '有時', score: 2 },
                { id: 'd', label: '經常', score: 3 },
                { id: 'e', label: '總是', score: 4 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 21, label: '無疲勞' },
              { min: 22, max: 34, label: '輕到中度疲勞' },
              { min: 35, max: 40, label: '極度疲勞' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'odi_back',
    label: 'ODI 腰背痛功能障礙（權重）',
    description: '10 題 · weighted_sum · 每題自己有權重',
    feature_tags: ['weighted_sum', 'weight'],
    category: '身體健康',
    template: {
      key: 'odi_back_demo',
      name: 'ODI 腰背痛障礙簡版',
      description: '不同題目對總分影響不同（生活影響大的題目權重高）。',
      spec: {
        question_sets: [
          {
            key: 'odi',
            name: 'ODI 加權總分',
            calculation_type: 'weighted_sum',
            questions: [
              { text: '疼痛強度', weight: 2 },
              { text: '個人衛生（如洗澡）', weight: 1.5 },
              { text: '提起物品', weight: 1.5 },
              { text: '行走', weight: 1 },
              { text: '坐姿', weight: 1 },
              { text: '站立', weight: 1 },
              { text: '睡眠', weight: 2 },
              { text: '性生活', weight: 1 },
              { text: '社交活動', weight: 1 },
              { text: '旅行 / 移動', weight: 1 },
            ].map((item, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: item.text,
              weight: item.weight,
              choices: [
                { id: 'a', label: '無影響', score: 0 },
                { id: 'b', label: '輕微影響', score: 1 },
                { id: 'c', label: '中等影響', score: 2 },
                { id: 'd', label: '嚴重影響', score: 3 },
                { id: 'e', label: '完全無法做', score: 4 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 8, label: '輕微障礙' },
              { min: 9, max: 20, label: '中度障礙' },
              { min: 21, max: 50, label: '重度障礙' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 生活風格
  // ═════════════════════════════════════════════════════════════

  {
    id: 'lifestyle_risk',
    label: '生活風險篩檢',
    description: 'count_above_threshold · 算「達標題數」· 高風險自動派 mission',
    feature_tags: ['count_above_threshold', 'assign_mission', 'interpretation_bands'],
    category: '生活風格',
    template: {
      key: 'lifestyle_risk_demo',
      name: '生活風險快篩',
      description: '回答 8 個 yes/no 題，算「不健康習慣」題數。',
      spec: {
        question_sets: [
          {
            key: 'risk_count',
            name: '風險因子數',
            calculation_type: 'count_above_threshold',
            threshold: 1,
            questions: yesNoQuestions([
              '每週吸菸天數 ≥ 3 天',
              '每週飲酒 ≥ 3 次',
              '每天睡眠 < 6 小時',
              '每週運動 < 1 次',
              '每天久坐 ≥ 8 小時',
              '每週外食 ≥ 5 餐',
              '常感覺壓力大難以放鬆',
              '健檢從未做過或 ≥ 3 年沒做',
            ]),
            interpretation_bands: [
              { min: 0, max: 2, label: '低風險' },
              { min: 3, max: 5, label: '中度風險' },
              { min: 6, max: 8, label: '高度風險，建議介入' },
            ],
          },
        ],
      },
      on_submit_actions: [
        { type: 'assign_mission', mission_key: 'lifestyle_starter_pack' },
      ],
    },
  },

  {
    id: 'chronic_risk',
    label: '慢性病風險評估',
    description: 'count_above_threshold · threshold = 2 變體',
    feature_tags: ['count_above_threshold', 'threshold'],
    category: '生活風格',
    template: {
      key: 'chronic_risk_demo',
      name: '慢性病風險快篩',
      description: '達到「中度以上」的項目數。',
      spec: {
        question_sets: [
          {
            key: 'chronic',
            name: '慢性病風險數',
            calculation_type: 'count_above_threshold',
            threshold: 2,
            questions: [
              '家族有高血壓或心臟病史',
              '我的腰圍超過建議值（男 ≥ 90，女 ≥ 80 cm）',
              '我的 BMI ≥ 27',
              '我有空腹血糖偏高紀錄',
              '我長期使用 3 種以上慢病藥物',
            ].map((text, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text,
              choices: [
                { id: 'no', label: '不符合', score: 0 },
                { id: 'mild', label: '稍微', score: 1 },
                { id: 'yes', label: '明確符合', score: 2 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 1, label: '低風險' },
              { min: 2, max: 5, label: '建議就醫評估' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'diet_habit',
    label: '飲食習慣分類',
    description: 'sum_of_multiple_selection · 食物類別分佈',
    feature_tags: ['sum_of_multiple_selection', 'choice.category'],
    category: '生活風格',
    template: {
      key: 'diet_habit_demo',
      name: '飲食習慣分類',
      description: '勾選平日常吃的食物。',
      spec: {
        question_sets: [
          {
            key: 'diet',
            name: '飲食類別分佈',
            calculation_type: 'sum_of_multiple_selection',
            questions: [
              {
                id: 'q1',
                kind: 'multiple_selection',
                text: '早餐常吃（可複選）',
                choices: [
                  { id: 'a', label: '燕麥 / 全穀', category: 'whole' },
                  { id: 'b', label: '蛋類 / 豆漿', category: 'protein' },
                  { id: 'c', label: '蔬菜水果', category: 'plant' },
                  { id: 'd', label: '麵包 / 糕點', category: 'refined' },
                  { id: 'e', label: '含糖飲料', category: 'sugar' },
                ],
              },
              {
                id: 'q2',
                kind: 'multiple_selection',
                text: '午晚餐常吃（可複選）',
                choices: [
                  { id: 'a', label: '深色蔬菜', category: 'plant' },
                  { id: 'b', label: '糙米 / 雜糧飯', category: 'whole' },
                  { id: 'c', label: '魚類', category: 'protein' },
                  { id: 'd', label: '油炸食物', category: 'refined' },
                  { id: 'e', label: '加工食品（火腿、香腸）', category: 'refined' },
                ],
              },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'exercise_pref',
    label: '運動偏好類型',
    description: 'dominant_category · 心肺 / 重訓 / 柔軟 / 球類 主導',
    feature_tags: ['dominant_category', 'choice.category'],
    category: '生活風格',
    template: {
      key: 'exercise_pref_demo',
      name: '運動偏好類型',
      description: '6 題單選，找出你的主要運動傾向。',
      spec: {
        question_sets: [
          {
            key: 'exercise',
            name: '運動主類別',
            calculation_type: 'dominant_category',
            questions: [
              ['流汗最爽快的方式？', ['跑步 / 騎車', 'cardio'], ['舉鐵 / 自重訓練', 'strength'], ['伸展 / 瑜伽', 'flex'], ['打球 / 對戰', 'sport']],
              ['空閒時間 30 分鐘想做什麼？', ['快走或慢跑', 'cardio'], ['做幾組訓練', 'strength'], ['做拉筋放鬆', 'flex'], ['揪人打球', 'sport']],
              ['你比較看重什麼？', ['持久體力', 'cardio'], ['肌肉線條', 'strength'], ['身體柔軟', 'flex'], ['競技樂趣', 'sport']],
              ['挫折時你最想做？', ['出去跑一跑', 'cardio'], ['練到爆汗', 'strength'], ['好好伸展', 'flex'], ['和人對打', 'sport']],
              ['假日休閒？', ['騎單車郊遊', 'cardio'], ['上健身房', 'strength'], ['瑜伽課', 'flex'], ['球場揪團', 'sport']],
              ['哪一種運動心情最好？', ['有節奏感的', 'cardio'], ['有阻力的', 'strength'], ['有伸展感的', 'flex'], ['有互動的', 'sport']],
            ].map((row, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: row[0] as string,
              choices: (row.slice(1) as Array<[string, string]>).map(([label, category], j) => ({
                id: `c${j}`,
                label,
                category,
              })),
            })),
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'sleep_diary',
    label: '睡眠日記（記錄型，無計分）',
    description: 'score + text + date 混合 · 沒有 interpretation · 純資料蒐集',
    feature_tags: ['score', 'text', 'date', 'data_capture'],
    category: '生活風格',
    template: {
      key: 'sleep_diary_demo',
      name: '每日睡眠日記',
      description: '睡前 / 起床後填一次。',
      spec: {
        question_sets: [
          {
            key: 'diary',
            name: '睡眠日記',
            calculation_type: 'sum_up',
            questions: [
              { id: 'date', kind: 'date', text: '日期' },
              { id: 'bedtime', kind: 'text', text: '上床時間（HH:MM）' },
              { id: 'sleep_score', kind: 'score', text: '睡眠品質自評（1-10）', score_max: 10 },
              { id: 'wakes', kind: 'score', text: '夜間醒來次數', score_max: 10 },
              { id: 'notes', kind: 'text', text: '備註（喝咖啡、運動、壓力源等）' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'smoking_stage',
    label: '戒菸意願階段',
    description: 'sum_up · 階段化 bands · 寫 attribute 給其他流程讀',
    feature_tags: ['sum_up', 'interpretation_bands', 'set_attribute'],
    category: '生活風格',
    template: {
      key: 'smoking_stage_demo',
      name: '戒菸準備度評估',
      description: '評估目前戒菸意願階段（改變階段論）。',
      spec: {
        question_sets: [
          {
            key: 'stage',
            name: '戒菸階段分',
            calculation_type: 'sum_up',
            questions: [
              {
                text: '我有沒有打算 6 個月內戒菸？',
                choices: [
                  { id: 'no', label: '完全沒打算', score: 0 },
                  { id: 'maybe', label: '考慮中', score: 1 },
                  { id: 'yes', label: '想要', score: 2 },
                ],
              },
              {
                text: '過去一週我有沒有減少抽菸？',
                choices: [
                  { id: 'no', label: '沒有', score: 0 },
                  { id: 'try', label: '有嘗試', score: 1 },
                  { id: 'yes', label: '明顯減少', score: 2 },
                ],
              },
              {
                text: '我是否已採取具體行動（門診、口香糖、戒菸班）？',
                choices: [
                  { id: 'no', label: '沒有', score: 0 },
                  { id: 'plan', label: '計畫中', score: 1 },
                  { id: 'doing', label: '正在做', score: 2 },
                ],
              },
            ].map((q, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: q.text,
              choices: q.choices,
            })),
            interpretation_bands: [
              { min: 0, max: 1, label: '懵懂期 — 尚未準備好' },
              { min: 2, max: 3, label: '思考期 — 開始動心' },
              { min: 4, max: 5, label: '準備期 — 有意行動' },
              { min: 6, max: 6, label: '行動期 — 已在做' },
            ],
          },
        ],
      },
      on_submit_actions: [
        { type: 'set_attribute', key: 'smoking_stage', value: '{{interpretation.stage}}' },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 個性 / 類型
  // ═════════════════════════════════════════════════════════════

  {
    id: 'disc',
    label: 'DISC 性格分類',
    description: 'sum_of_single_selection · sequence_of_score 補零',
    feature_tags: ['sum_of_single_selection', 'sequence_of_score'],
    category: '個性 / 類型',
    template: {
      key: 'disc_demo',
      name: 'DISC 性格量表（簡化版）',
      description: '8 題單選，輸出 D/I/S/C 各類分佈。',
      spec: {
        question_sets: [
          {
            key: 'disc',
            name: 'DISC 分佈',
            calculation_type: 'sum_of_single_selection',
            sequence_of_score: ['D', 'I', 'S', 'C'],
            questions: discQuestions(),
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'mbti',
    label: 'MBTI 簡化版（4 維度）',
    description: '4 個獨立 dominant_category 題組 · 各自輸出 E/I、S/N、T/F、J/P',
    feature_tags: ['dominant_category', 'multi_set'],
    category: '個性 / 類型',
    template: {
      key: 'mbti_simple_demo',
      name: 'MBTI 簡化版',
      description: '4 個維度各 3 題。',
      spec: {
        question_sets: [
          mbtiSet('ei', '外向 vs 內向', [['和人相處充電', 'E'], ['獨處充電', 'I']]),
          mbtiSet('sn', '實感 vs 直覺', [['先看細節事實', 'S'], ['先看大方向可能性', 'N']]),
          mbtiSet('tf', '思考 vs 情感', [['用邏輯判斷', 'T'], ['用感受判斷', 'F']]),
          mbtiSet('jp', '判斷 vs 感知', [['喜歡計畫', 'J'], ['喜歡彈性', 'P']]),
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'big_five',
    label: 'Big Five 五大向度簡版',
    description: '5 個獨立 sub-set + sum_of_sub_question_set_scores 總合（多向度示範）',
    feature_tags: ['sum_of_sub_question_set_scores', 'multi_set'],
    category: '個性 / 類型',
    template: {
      key: 'big_five_demo',
      name: 'Big Five 五大人格簡版',
      description: '每個向度 2 題，並聚合總分。',
      spec: {
        question_sets: [
          tipiSet('openness', '開放性', ['我傾向嘗試新體驗', '我喜歡反思與想像']),
          tipiSet('conscientiousness', '責任心', ['我做事有計畫', '我能堅持完成目標']),
          tipiSet('extraversion', '外向性', ['我享受社交場合', '我容易和陌生人交談']),
          tipiSet('agreeableness', '親和性', ['我容易信任他人', '我會主動幫忙別人']),
          tipiSet('neuroticism', '神經質', ['我容易感到焦慮', '我情緒容易起伏']),
          {
            key: 'total',
            name: '人格特質總分（示範用）',
            calculation_type: 'sum_of_sub_question_set_scores',
            sub_set_keys: [
              'openness',
              'conscientiousness',
              'extraversion',
              'agreeableness',
              'neuroticism',
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'learning_vak',
    label: 'VAK 學習風格',
    description: 'dominant_category · 視 / 聽 / 動覺',
    feature_tags: ['dominant_category'],
    category: '個性 / 類型',
    template: {
      key: 'learning_vak_demo',
      name: 'VAK 學習風格快評',
      description: '6 題，輸出主導感官（V/A/K）。',
      spec: {
        question_sets: [
          {
            key: 'vak',
            name: '主導學習風格',
            calculation_type: 'dominant_category',
            questions: [
              [
                '學新東西時最快進入狀況的方式？',
                ['看圖文示範', 'V'],
                ['聽人講解', 'A'],
                ['直接動手做', 'K'],
              ],
              ['記住資訊靠什麼？', ['畫面記憶', 'V'], ['聲音口訣', 'A'], ['動作感受', 'K']],
              [
                '看不懂指示時你會？',
                ['再找圖示對照', 'V'],
                ['念出來給自己聽', 'A'],
                ['先做做看', 'K'],
              ],
              [
                '無聊時你會？',
                ['翻書或看影片', 'V'],
                ['聽 podcast', 'A'],
                ['動身體做點什麼', 'K'],
              ],
              [
                '與人講話時你看著？',
                ['表情', 'V'],
                ['語氣語調', 'A'],
                ['對方的動作', 'K'],
              ],
              ['你形容地點傾向？', ['畫面細節', 'V'], ['聲音 / 氣氛', 'A'], ['身體感受', 'K']],
            ].map((row, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: row[0] as string,
              choices: (row.slice(1) as Array<[string, string]>).map(([label, cat], j) => ({
                id: `c${j}`,
                label,
                category: cat,
              })),
            })),
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'values',
    label: '價值觀傾向',
    description: 'sum_of_multiple_selection · 各價值面向投票',
    feature_tags: ['sum_of_multiple_selection', 'choice.category'],
    category: '個性 / 類型',
    template: {
      key: 'values_demo',
      name: '價值觀傾向',
      description: '勾選你最重視的事物。',
      spec: {
        question_sets: [
          {
            key: 'values',
            name: '價值面向分佈',
            calculation_type: 'sum_of_multiple_selection',
            questions: [
              {
                id: 'q1',
                kind: 'multiple_selection',
                text: '近期心力放在哪幾件事？（可複選）',
                choices: [
                  { id: 'a', label: '升職 / 工作成就', category: 'career' },
                  { id: 'b', label: '家人時光', category: 'family' },
                  { id: 'c', label: '健康改善', category: 'health' },
                  { id: 'd', label: '理財 / 投資', category: 'wealth' },
                  { id: 'e', label: '進修 / 學新東西', category: 'growth' },
                  { id: 'f', label: '靈性 / 內在', category: 'spirit' },
                ],
              },
              {
                id: 'q2',
                kind: 'multiple_selection',
                text: '希望明年明顯進步的領域（可複選）',
                choices: [
                  { id: 'a', label: '事業 / 收入', category: 'career' },
                  { id: 'b', label: '感情 / 親密關係', category: 'family' },
                  { id: 'c', label: '體能 / 外型', category: 'health' },
                  { id: 'd', label: '財務自由', category: 'wealth' },
                  { id: 'e', label: '專業技能', category: 'growth' },
                  { id: 'f', label: '心靈平靜', category: 'spirit' },
                ],
              },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 關係
  // ═════════════════════════════════════════════════════════════

  {
    id: 'csi_intimacy',
    label: '親密關係滿意度 CSI',
    description: 'average · 跨向度 classification_rules',
    feature_tags: ['average', 'classification_rules'],
    category: '關係',
    template: {
      key: 'csi_intimacy_demo',
      name: 'CSI 親密關係滿意度',
      description: '5 題，平均分越高越滿意。',
      spec: {
        question_sets: [
          {
            key: 'satisfaction',
            name: '滿意度',
            calculation_type: 'average',
            questions: [
              '整體上，我對這段關係感到滿意',
              '我和伴侶之間的溝通順暢',
              '我們在重要決策上能取得共識',
              '我們有足夠的親密時光',
              '我感覺被理解',
            ].map((text, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text,
              choices: [
                { id: 'a', label: '非常不同意', score: 0 },
                { id: 'b', label: '不同意', score: 1 },
                { id: 'c', label: '普通', score: 2 },
                { id: 'd', label: '同意', score: 3 },
                { id: 'e', label: '非常同意', score: 4 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 1.5, label: '需要積極修補' },
              { min: 1.51, max: 2.5, label: '中等' },
              { min: 2.51, max: 4, label: '滿意' },
            ],
          },
        ],
        classification_rules: [
          {
            output_key: 'distress',
            output_label: '建議諮詢專業關係諮商',
            conditions: [{ score_key: 'satisfaction', op: 'lt', value: 1.5 }],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'family_apgar',
    label: 'Family APGAR 家庭支持度',
    description: 'sum_up · 5 題 · 經典家醫篩檢',
    feature_tags: ['sum_up', 'interpretation_bands'],
    category: '關係',
    template: {
      key: 'family_apgar_demo',
      name: 'Family APGAR 家庭支持度',
      description: '評估家庭功能（Adaptation / Partnership / Growth / Affection / Resolve）。',
      spec: {
        question_sets: [
          {
            key: 'apgar',
            name: 'APGAR 總分',
            calculation_type: 'sum_up',
            questions: [
              '遇到困難時，我能從家人那裡得到幫助',
              '我對家人之間如何討論事情、分享問題的方式感到滿意',
              '家人接受並支持我新想法的程度',
              '家人表達對我情感的方式',
              '家人和我共度時間的方式',
            ].map((text, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text,
              choices: [
                { id: 'a', label: '幾乎沒有', score: 0 },
                { id: 'b', label: '有時候', score: 1 },
                { id: 'c', label: '經常', score: 2 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 3, label: '家庭功能嚴重失調' },
              { min: 4, max: 6, label: '中度失調' },
              { min: 7, max: 10, label: '家庭功能良好' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 工作 / 學習
  // ═════════════════════════════════════════════════════════════

  {
    id: 'procrastination',
    label: '拖延傾向自評',
    description: 'sum_up + 反向題 · 簡短版 TPS',
    feature_tags: ['sum_up', 'reverse_scored', 'score_max'],
    category: '工作 / 學習',
    template: {
      key: 'procrastination_demo',
      name: '拖延自評（TPS 簡版）',
      description: '評估近一個月的拖延傾向。',
      spec: {
        question_sets: [
          {
            key: 'tps',
            name: '拖延分',
            calculation_type: 'sum_up',
            questions: [
              { text: '我常常把該做的事拖到最後一刻', reverse: false },
              { text: '我能在期限前從容完成任務', reverse: true },
              { text: '我會花很多時間做不重要的事', reverse: false },
              { text: '即使任務簡單，我也會找理由延後', reverse: false },
              { text: '我習慣排好時程並按表操課', reverse: true },
              { text: '我常因為拖延而懊悔', reverse: false },
            ].map((item, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: item.text,
              reverse_scored: item.reverse || undefined,
              score_max: 4,
              choices: [
                { id: 'a', label: '非常不同意', score: 0 },
                { id: 'b', label: '不同意', score: 1 },
                { id: 'c', label: '普通', score: 2 },
                { id: 'd', label: '同意', score: 3 },
                { id: 'e', label: '非常同意', score: 4 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 8, label: '拖延傾向低' },
              { min: 9, max: 16, label: '中度' },
              { min: 17, max: 24, label: '拖延傾向高，建議介入' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'burnout_mbi',
    label: '工作倦怠 MBI 簡版',
    description: '3 個子向度 · avg_of_sub_question_set_scores · 高耗竭 + 高去人格 → 警示',
    feature_tags: [
      'avg_of_sub_question_set_scores',
      'classification_rules',
      'multi_set',
    ],
    category: '工作 / 學習',
    template: {
      key: 'burnout_mbi_demo',
      name: 'MBI 工作倦怠簡版',
      description: '情緒耗竭 / 去人格化 / 個人成就（反向）三向度。',
      spec: {
        question_sets: [
          {
            key: 'exhaustion',
            name: '情緒耗竭',
            calculation_type: 'sum_up',
            questions: simpleScale(
              'ex',
              '工作讓我感到',
              ['幾乎沒有', '偶爾', '時常', '幾乎每天'],
              3,
              3,
              ['情緒耗盡', '一早起來就疲累', '快撐不住'],
            ),
          },
          {
            key: 'depersonalization',
            name: '去人格化',
            calculation_type: 'sum_up',
            questions: simpleScale(
              'dp',
              '對工作對象 / 同事',
              ['幾乎沒有', '偶爾', '時常', '幾乎每天'],
              3,
              3,
              ['我變得冷漠', '不太關心他們', '想保持距離'],
            ),
          },
          {
            key: 'accomplishment',
            name: '個人成就（反向）',
            calculation_type: 'sum_up',
            questions: [
              '我在工作上很有效率',
              '我感覺自己有貢獻',
              '我能應付工作要求',
            ].map((text, i) => ({
              id: `ac${i + 1}`,
              kind: 'single_selection',
              text,
              reverse_scored: true,
              score_max: 3,
              choices: [
                { id: 'a', label: '幾乎沒有', score: 0 },
                { id: 'b', label: '偶爾', score: 1 },
                { id: 'c', label: '時常', score: 2 },
                { id: 'd', label: '幾乎每天', score: 3 },
              ],
            })),
          },
          {
            key: 'overall',
            name: '整體倦怠分',
            calculation_type: 'avg_of_sub_question_set_scores',
            sub_set_keys: ['exhaustion', 'depersonalization', 'accomplishment'],
          },
        ],
        classification_rules: [
          {
            output_key: 'high_burnout',
            output_label: '高度倦怠，建議休假 / 求助',
            conditions: [
              { score_key: 'exhaustion', op: 'gte', value: 6 },
              { score_key: 'depersonalization', op: 'gte', value: 6 },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 女性健康
  // ═════════════════════════════════════════════════════════════

  {
    id: 'menstrual',
    label: '月經困擾簡評（含跳題）',
    description: 'sum_up · visible_if 條件跳題',
    feature_tags: ['sum_up', 'visible_if', 'interpretation_bands'],
    category: '女性健康',
    template: {
      key: 'menstrual_demo',
      name: '月經困擾簡評',
      description: '近 3 次月經週期的困擾程度。',
      spec: {
        question_sets: [
          {
            key: 'menstrual',
            name: '困擾總分',
            calculation_type: 'sum_up',
            questions: [
              {
                id: 'has_period',
                kind: 'single_selection',
                text: '是否仍有月經？',
                choices: [
                  { id: 'y', label: '是', score: 0 },
                  { id: 'n', label: '否', score: 0 },
                ],
              },
              ...['經痛強度', '經血量', '經前情緒波動', '經期長度（過長或過短）'].map(
                (text, i) => ({
                  id: `q${i + 1}`,
                  kind: 'single_selection',
                  text,
                  visible_if: { has_period: 'y' },
                  choices: [
                    { id: 'a', label: '幾乎沒影響', score: 0 },
                    { id: 'b', label: '輕微', score: 1 },
                    { id: 'c', label: '中等', score: 2 },
                    { id: 'd', label: '明顯影響生活', score: 3 },
                  ],
                }),
              ),
            ],
            interpretation_bands: [
              { min: 0, max: 3, label: '困擾低' },
              { min: 4, max: 7, label: '中度困擾' },
              { min: 8, max: 12, label: '建議就醫評估' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'kupperman',
    label: '更年期 KMI 量表',
    description: 'weighted_sum · 各症狀權重不同',
    feature_tags: ['weighted_sum', 'weight', 'interpretation_bands'],
    category: '女性健康',
    template: {
      key: 'kupperman_demo',
      name: '更年期症狀 KMI 量表',
      description: '11 種症狀各 0-3 分，乘權重後加總。',
      spec: {
        question_sets: [
          {
            key: 'kmi',
            name: 'KMI 加權分',
            calculation_type: 'weighted_sum',
            questions: [
              { text: '潮熱 / 盜汗', weight: 4 },
              { text: '感覺異常（麻、刺、灼）', weight: 2 },
              { text: '失眠', weight: 2 },
              { text: '神經質 / 易怒', weight: 2 },
              { text: '憂鬱 / 情緒低落', weight: 1 },
              { text: '眩暈', weight: 1 },
              { text: '疲倦', weight: 1 },
              { text: '關節痛 / 肌肉痛', weight: 1 },
              { text: '頭痛', weight: 1 },
              { text: '心悸', weight: 1 },
              { text: '皮膚 / 黏膜乾燥', weight: 1 },
            ].map((item, i) => ({
              id: `q${i + 1}`,
              kind: 'single_selection',
              text: item.text,
              weight: item.weight,
              choices: [
                { id: 'a', label: '無', score: 0 },
                { id: 'b', label: '輕微', score: 1 },
                { id: 'c', label: '中等', score: 2 },
                { id: 'd', label: '嚴重', score: 3 },
              ],
            })),
            interpretation_bands: [
              { min: 0, max: 14, label: '症狀輕微' },
              { min: 15, max: 29, label: '中度症狀' },
              { min: 30, max: 70, label: '重度，建議就醫' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  // ═════════════════════════════════════════════════════════════
  // 行銷 / 偏好
  // ═════════════════════════════════════════════════════════════

  {
    id: 'preference_branching',
    label: '產品偏好（含跳題）',
    description: 'visible_if 多條件 AND · 年齡 / 性別決定問題',
    feature_tags: ['visible_if', 'NumericCondition', 'sum_up'],
    category: '行銷 / 偏好',
    template: {
      key: 'pref_demo',
      name: '產品偏好調查',
      description: '示範 visible_if — 不同族群只看到自己相關的題目。',
      spec: {
        question_sets: [
          {
            key: 'preference',
            name: '產品傾向',
            calculation_type: 'sum_up',
            questions: [
              { id: 'age', kind: 'score', text: '你的年齡', score_max: 100 },
              {
                id: 'gender',
                kind: 'single_selection',
                text: '性別',
                choices: [
                  { id: 'f', label: '女性' },
                  { id: 'm', label: '男性' },
                ],
              },
              {
                id: 'menopause',
                kind: 'single_selection',
                text: '是否有更年期相關困擾？',
                visible_if: { all: [{ gender: 'f' }, { age: { gte: 40 } }] },
                choices: [
                  { id: 'no', label: '沒有', score: 0 },
                  { id: 'mild', label: '輕微', score: 1 },
                  { id: 'severe', label: '明顯', score: 2 },
                ],
              },
              {
                id: 'energy',
                kind: 'single_selection',
                text: '是否常感覺體力下降？',
                visible_if: { age: { gte: 30 } },
                choices: [
                  { id: 'no', label: '不會', score: 0 },
                  { id: 'sometimes', label: '偶爾', score: 1 },
                  { id: 'often', label: '經常', score: 2 },
                ],
              },
              {
                id: 'fitness',
                kind: 'single_selection',
                text: '是否想增加肌力訓練？',
                visible_if: { age: { lt: 40 } },
                choices: [
                  { id: 'no', label: '沒興趣', score: 0 },
                  { id: 'maybe', label: '考慮中', score: 1 },
                  { id: 'yes', label: '很想', score: 2 },
                ],
              },
            ],
            interpretation_bands: [
              { min: 0, max: 1, label: '目前需求不明顯' },
              { min: 2, max: 4, label: '建議了解相關產品' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },

  {
    id: 'nps',
    label: 'NPS 推薦淨值（自訂公式）',
    description: 'average + arithmetic_expression · 推薦 - 批評者比例',
    feature_tags: ['average', 'arithmetic_expression'],
    category: '行銷 / 偏好',
    template: {
      key: 'nps_demo',
      name: 'NPS 推薦淨值簡版',
      description: '經典的 0-10 評分，自動分類推薦 / 中立 / 批評。',
      spec: {
        question_sets: [
          {
            key: 'recommend',
            name: '0-10 推薦分數',
            calculation_type: 'average',
            questions: [
              {
                id: 'nps_score',
                kind: 'score',
                text: '0-10 分，你會推薦這個產品給朋友嗎？',
                score_max: 10,
              },
            ],
            interpretation_bands: [
              { min: 0, max: 6, label: '批評者（Detractor）' },
              { min: 7, max: 8, label: '中立者（Passive）' },
              { min: 9, max: 10, label: '推薦者（Promoter）' },
            ],
          },
        ],
      },
      on_submit_actions: [],
    },
  },
];

// ═════════════════════════════════════════════════════════════════
// Category accessor — used by TemplateLoader to render optgroups.
// ═════════════════════════════════════════════════════════════════

export const CATEGORY_ORDER: TemplateCategory[] = [
  '心理健康',
  '身體健康',
  '生活風格',
  '個性 / 類型',
  '關係',
  '工作 / 學習',
  '女性健康',
  '行銷 / 偏好',
];

// ═════════════════════════════════════════════════════════════════
// Helpers — keep the templates above readable.
// ═════════════════════════════════════════════════════════════════

function frequency4() {
  return ['完全沒有', '幾天', '一半以上', '幾乎每天'];
}

function phq9Questions() {
  const items = [
    '做事提不起興趣或樂趣',
    '感到心情低落、沮喪或絕望',
    '入睡困難、睡不安穩或睡太多',
    '感覺疲倦或無精打采',
    '食慾不振或吃太多',
    '覺得自己很糟，是個失敗者，或讓家人失望',
    '專注力差，例如閱讀報紙或看電視時',
    '行動或說話遲緩讓人察覺，或相反地坐立難安',
    '有不如死掉或用某種方式傷害自己的念頭',
  ];
  return items.map((text, i) => ({
    id: `q${i + 1}`,
    kind: 'single_selection',
    text,
    choices: [
      { id: 'a', label: '完全沒有', score: 0 },
      { id: 'b', label: '幾天', score: 1 },
      { id: 'c', label: '一半以上時間', score: 2 },
      { id: 'd', label: '幾乎每天', score: 3 },
    ],
  }));
}

function gad7Questions() {
  const items = [
    '感到緊張、不安或煩躁',
    '無法停止或控制憂慮',
    '對各種事情過度憂慮',
    '不容易放鬆',
    '坐立難安、靜不下來',
    '變得容易心煩或易怒',
    '感覺害怕，好像有可怕的事要發生',
  ];
  return items.map((text, i) => ({
    id: `q${i + 1}`,
    kind: 'single_selection',
    text,
    choices: [
      { id: 'a', label: '完全沒有', score: 0 },
      { id: 'b', label: '幾天', score: 1 },
      { id: 'c', label: '一半以上時間', score: 2 },
      { id: 'd', label: '幾乎每天', score: 3 },
    ],
  }));
}

// 10 items, items 4 / 5 / 7 / 8 are positive (reverse-scored).
function pss10Questions() {
  const items = [
    { text: '因為意外的事情而感到難過', reverse: false },
    { text: '覺得無法掌控生活中重要的事', reverse: false },
    { text: '感到緊張或壓力大', reverse: false },
    { text: '對處理瑣事的能力感到有自信', reverse: true },
    { text: '事情都照我的方式進行', reverse: true },
    { text: '無法處理所有該做的事', reverse: false },
    { text: '能掌控生活中的煩心事', reverse: true },
    { text: '感覺自己游刃有餘', reverse: true },
    { text: '對無法掌控的事感到憤怒', reverse: false },
    { text: '困難多到我無法克服', reverse: false },
  ];
  return items.map((item, i) => ({
    id: `q${i + 1}`,
    kind: 'single_selection',
    text: item.text,
    reverse_scored: item.reverse || undefined,
    score_max: 4,
    choices: [
      { id: 'a', label: '從不', score: 0 },
      { id: 'b', label: '幾乎沒有', score: 1 },
      { id: 'c', label: '有時候', score: 2 },
      { id: 'd', label: '相當常', score: 3 },
      { id: 'e', label: '非常常', score: 4 },
    ],
  }));
}

function simpleScale(
  prefix: string,
  prompt: string,
  labels: string[],
  maxScore: number,
  count = 4,
  subjects?: string[],
) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    kind: 'single_selection',
    text: subjects ? `${prompt}「${subjects[i]}」` : `${prompt} #${i + 1}`,
    choices: labels.map((label, j) => ({ id: `c${j}`, label, score: j })),
  }));
}

function yesNoQuestions(items: string[]) {
  return items.map((text, i) => ({
    id: `q${i + 1}`,
    kind: 'single_selection',
    text,
    choices: [
      { id: 'no', label: '否', score: 0 },
      { id: 'yes', label: '是', score: 1 },
    ],
  }));
}

function discQuestions() {
  const sets = [
    ['我喜歡掌控局面', '我喜歡與人互動', '我喜歡穩定步調', '我喜歡精準分析'],
    ['面對挑戰會直接行動', '面對挑戰會找人討論', '面對挑戰會謹慎評估', '面對挑戰會收集資料'],
    ['決策快速果斷', '決策樂觀有彈性', '決策保守一致', '決策依據事實'],
    ['我善於設定目標', '我善於激勵他人', '我善於支持團隊', '我善於確認細節'],
    ['壓力下更積極', '壓力下找人傾訴', '壓力下尋求穩定', '壓力下退回流程'],
    ['不喜歡浪費時間', '不喜歡被忽略', '不喜歡突然改變', '不喜歡不準確'],
    ['追求結果', '追求認同', '追求和諧', '追求正確'],
    ['偏好直接的溝通', '偏好熱絡的氣氛', '偏好溫和的步調', '偏好結構化的方式'],
  ];
  return sets.map((opts, i) => ({
    id: `q${i + 1}`,
    kind: 'single_selection',
    text: `第 ${i + 1} 題：最像你的描述？`,
    choices: opts.map((label, j) => ({
      id: ['d', 'i', 's', 'c'][j],
      label,
      category: ['D', 'I', 'S', 'C'][j],
    })),
  }));
}

function mbtiSet(key: string, name: string, polarity: Array<[string, string]>) {
  return {
    key,
    name,
    calculation_type: 'dominant_category',
    questions: Array.from({ length: 3 }, (_, i) => ({
      id: `${key}_q${i + 1}`,
      kind: 'single_selection',
      text: `${name} ${i + 1}：你比較傾向？`,
      choices: polarity.map(([label, category], j) => ({
        id: `c${j}`,
        label,
        category,
      })),
    })),
  };
}

// Big Five — TIPI-style: each trait = 2 items, 7-point scale.
function tipiSet(key: string, name: string, items: string[]) {
  return {
    key,
    name,
    calculation_type: 'sum_up',
    questions: items.map((text, i) => ({
      id: `${key}_q${i + 1}`,
      kind: 'single_selection',
      text,
      score_max: 6,
      choices: [
        { id: 'a', label: '非常不同意', score: 0 },
        { id: 'b', label: '不同意', score: 1 },
        { id: 'c', label: '略不同意', score: 2 },
        { id: 'd', label: '中立', score: 3 },
        { id: 'e', label: '略同意', score: 4 },
        { id: 'f', label: '同意', score: 5 },
        { id: 'g', label: '非常同意', score: 6 },
      ],
    })),
  };
}
