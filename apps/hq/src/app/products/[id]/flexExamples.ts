/**
 * Curated Flex message templates derived from the LINE Flex Simulator
 * showcase, adapted to zh-TW copy and tuned for DTx/health use cases.
 * Each example is valid Flex JSON (verified against the Messaging API
 * spec) — paste result should render in LINE Flex Simulator unchanged.
 *
 * Image URLs use LINE's own sample CDN (scdn.line-apps.com) which is
 * always reachable. Replace with your own URLs in production.
 */

export interface FlexExample {
  id: string;
  title: string;
  category: '商務' | '生活' | 'DTx / 健康' | '問卷';
  description: string;
  json: string;
}

// Small helper so we can keep the JSON readable in source.
const stringify = (obj: unknown): string => JSON.stringify(obj, null, 2);

export const FLEX_EXAMPLES: FlexExample[] = [
  {
    id: 'restaurant',
    title: '餐廳介紹',
    category: '商務',
    description: 'Hero 圖 + 星級 + 地點時間 + 聯絡按鈕',
    json: stringify({
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'Brown Cafe', weight: 'bold', size: 'xl' },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
              { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
              { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
              { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
              { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png' },
              { type: 'text', text: '4.0', size: 'sm', color: '#999999', margin: 'md', flex: 0 },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '地點', color: '#aaaaaa', size: 'sm', flex: 1 },
                  { type: 'text', text: '台北市中山區', wrap: true, color: '#666666', size: 'sm', flex: 5 },
                ],
              },
              {
                type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '時間', color: '#aaaaaa', size: 'sm', flex: 1 },
                  { type: 'text', text: '10:00 - 23:00', wrap: true, color: '#666666', size: 'sm', flex: 5 },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '撥打電話', uri: 'https://line.me' } },
          { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '網站', uri: 'https://line.me' } },
        ],
        flex: 0,
      },
    }),
  },
  {
    id: 'receipt',
    title: '收據',
    category: '商務',
    description: '垂直排版的消費明細 + 小計',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '收據', weight: 'bold', color: '#1DB446', size: 'sm' },
          { type: 'text', text: 'Brown Store', weight: 'bold', size: 'xxl', margin: 'md' },
          { type: 'text', text: '台北市中山區南京東路三段 1 號', size: 'xs', color: '#aaaaaa', wrap: true },
          { type: 'separator', margin: 'xxl' },
          {
            type: 'box', layout: 'vertical', margin: 'xxl', spacing: 'sm',
            contents: [
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '拿鐵', size: 'sm', color: '#555555', flex: 0 },
                { type: 'text', text: 'NT$120', size: 'sm', color: '#111111', align: 'end' },
              ] },
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '可頌', size: 'sm', color: '#555555', flex: 0 },
                { type: 'text', text: 'NT$80', size: 'sm', color: '#111111', align: 'end' },
              ] },
              { type: 'separator', margin: 'xxl' },
              { type: 'box', layout: 'horizontal', margin: 'xxl', contents: [
                { type: 'text', text: '合計', size: 'sm', color: '#555555' },
                { type: 'text', text: 'NT$200', size: 'sm', color: '#111111', align: 'end' },
              ] },
            ],
          },
        ],
      },
    }),
  },
  {
    id: 'news',
    title: '新聞摘要',
    category: '商務',
    description: '頭圖 + 分類標籤 + 標題 + 摘要 + 時間',
    json: stringify({
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_5_news.png',
        size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
      },
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '全球頭條', weight: 'bold', color: '#EC1976', size: 'sm' },
          { type: 'text', text: '健康早晨：7 個簡單習慣讓你更有活力', weight: 'bold', size: 'md', margin: 'md', wrap: true },
          { type: 'text', text: '研究指出，規律的作息與適量運動是保持精神的關鍵，配合充足水份與日曬…', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          { type: 'text', text: '2026-04-22 · 3 分鐘閱讀', size: 'xs', color: '#aaaaaa', margin: 'lg' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: '閱讀全文', uri: 'https://line.me' } },
        ],
      },
    }),
  },
  {
    id: 'travel',
    title: '旅遊行程',
    category: '生活',
    description: '多日行程重點條列',
    json: stringify({
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_2_travel.png',
        size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '京都 3 天 2 夜', weight: 'bold', size: 'xl' },
          {
            type: 'box', layout: 'vertical', spacing: 'sm',
            contents: [
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: 'Day 1', size: 'sm', color: '#aaaaaa', flex: 1 },
                { type: 'text', text: '清水寺 · 祇園', size: 'sm', color: '#666666', flex: 4 },
              ] },
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: 'Day 2', size: 'sm', color: '#aaaaaa', flex: 1 },
                { type: 'text', text: '嵐山 · 金閣寺', size: 'sm', color: '#666666', flex: 4 },
              ] },
              { type: 'box', layout: 'baseline', contents: [
                { type: 'text', text: 'Day 3', size: 'sm', color: '#aaaaaa', flex: 1 },
                { type: 'text', text: '伏見稻荷大社', size: 'sm', color: '#666666', flex: 4 },
              ] },
            ],
          },
        ],
      },
    }),
  },
  {
    id: 'hotel',
    title: '飯店訂房',
    category: '商務',
    description: '飯店圖 + 星級 + 入退房時間 + 預訂按鈕',
    json: stringify({
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_6_hotel.png',
        size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
      },
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: 'L&L Hotel', weight: 'bold', size: 'xl' },
          { type: 'box', layout: 'baseline', margin: 'md', contents: [
            { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
            { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
            { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
            { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png' },
            { type: 'icon', size: 'sm', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png' },
            { type: 'text', text: '4.0', size: 'sm', color: '#999999', margin: 'md' },
          ] },
          { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: [
            { type: 'box', layout: 'baseline', contents: [
              { type: 'text', text: '入住', color: '#aaaaaa', size: 'sm', flex: 1 },
              { type: 'text', text: '5 月 1 日 15:00', color: '#666666', size: 'sm', flex: 4 },
            ] },
            { type: 'box', layout: 'baseline', contents: [
              { type: 'text', text: '退房', color: '#aaaaaa', size: 'sm', flex: 1 },
              { type: 'text', text: '5 月 3 日 11:00', color: '#666666', size: 'sm', flex: 4 },
            ] },
          ] },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: '預訂', uri: 'https://line.me' } },
        ],
      },
    }),
  },
  {
    id: 'event',
    title: '活動通知',
    category: '生活',
    description: '標題 + 說明 + 時間地點 + 報名按鈕',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '健康講座', weight: 'bold', size: 'xl' },
          { type: 'text', text: '學習如何在忙碌生活中維持健康', size: 'sm', color: '#666666', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: [
            { type: 'box', layout: 'baseline', contents: [
              { type: 'text', text: '📅', flex: 0 },
              { type: 'text', text: '2026-05-15 (六) 14:00', size: 'sm', color: '#444444', margin: 'md' },
            ] },
            { type: 'box', layout: 'baseline', contents: [
              { type: 'text', text: '📍', flex: 0 },
              { type: 'text', text: '台北市信義區松高路 1 號', size: 'sm', color: '#444444', margin: 'md', wrap: true },
            ] },
          ] },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: '我要報名', uri: 'https://line.me' } },
        ],
      },
    }),
  },
  {
    id: 'payment',
    title: '付款成功',
    category: '商務',
    description: '大字金額 + 交易明細 + 時間',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '付款成功', weight: 'bold', color: '#1DB446', size: 'md' },
          { type: 'text', text: 'NT$1,200', weight: 'bold', size: '3xl', margin: 'md' },
          { type: 'text', text: '2026-04-22 14:35', size: 'xs', color: '#aaaaaa', margin: 'sm' },
          { type: 'separator', margin: 'xxl' },
          { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'xxl', contents: [
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: '收款', size: 'sm', color: '#aaaaaa', flex: 2 },
              { type: 'text', text: 'Brown Store', size: 'sm', color: '#111111', flex: 5, align: 'end' },
            ] },
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: '交易編號', size: 'sm', color: '#aaaaaa', flex: 2 },
              { type: 'text', text: '#202604220001', size: 'sm', color: '#111111', flex: 5, align: 'end' },
            ] },
          ] },
        ],
      },
    }),
  },
  {
    id: 'shopping_carousel',
    title: '商品 Carousel',
    category: '商務',
    description: '3 張商品卡橫向滑動（carousel 範例）',
    json: stringify({
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          hero: { type: 'image', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_4_news.png', size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
          body: { type: 'box', layout: 'vertical', contents: [
            { type: 'text', text: '商品 A', weight: 'bold', size: 'lg' },
            { type: 'text', text: 'NT$399', color: '#EC1976', weight: 'bold', size: 'lg', margin: 'md' },
            { type: 'text', text: '經典款式，熱銷中', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ] },
          footer: { type: 'box', layout: 'vertical', contents: [
            { type: 'button', style: 'primary', action: { type: 'uri', label: '加入購物車', uri: 'https://line.me' } },
          ] },
        },
        {
          type: 'bubble',
          hero: { type: 'image', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_4_news.png', size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
          body: { type: 'box', layout: 'vertical', contents: [
            { type: 'text', text: '商品 B', weight: 'bold', size: 'lg' },
            { type: 'text', text: 'NT$599', color: '#EC1976', weight: 'bold', size: 'lg', margin: 'md' },
            { type: 'text', text: '新上架，限量供應', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ] },
          footer: { type: 'box', layout: 'vertical', contents: [
            { type: 'button', style: 'primary', action: { type: 'uri', label: '加入購物車', uri: 'https://line.me' } },
          ] },
        },
        {
          type: 'bubble',
          hero: { type: 'image', url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_4_news.png', size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
          body: { type: 'box', layout: 'vertical', contents: [
            { type: 'text', text: '商品 C', weight: 'bold', size: 'lg' },
            { type: 'text', text: 'NT$899', color: '#EC1976', weight: 'bold', size: 'lg', margin: 'md' },
            { type: 'text', text: '職人手工，精選材料', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ] },
          footer: { type: 'box', layout: 'vertical', contents: [
            { type: 'button', style: 'primary', action: { type: 'uri', label: '加入購物車', uri: 'https://line.me' } },
          ] },
        },
      ],
    }),
  },
  {
    id: 'mood_check',
    title: '問卷選項（心情打卡）',
    category: '問卷',
    description: '三個選項按鈕，點擊會自動傳訊（可被意圖規則接）',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '你今天感覺如何？', weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: '選一個最貼近的描述，我會根據你的狀態給建議。', size: 'sm', color: '#666666', wrap: true },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'message', label: '😊 很好', text: '我今天感覺很好' } },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '😐 普通', text: '我今天感覺普通' } },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '😴 疲憊', text: '我今天感覺疲憊' } },
        ],
      },
    }),
  },
  {
    id: 'mission_complete',
    title: '任務完成通知',
    category: 'DTx / 健康',
    description: '達標慶祝卡 + 連續天數 + 下個里程碑',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '🎉 任務完成', weight: 'bold', color: '#1DB446', size: 'lg' },
          { type: 'text', text: '今日喝水挑戰', weight: 'bold', size: 'xl', margin: 'md' },
          { type: 'text', text: '你已經達成連續 7 天目標！', size: 'sm', color: '#666666', margin: 'md', wrap: true },
          { type: 'separator', margin: 'xxl' },
          { type: 'box', layout: 'vertical', margin: 'xxl', spacing: 'sm', contents: [
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: '連續天數', size: 'sm', color: '#aaaaaa' },
              { type: 'text', text: '7 天 🔥', size: 'sm', color: '#111111', align: 'end' },
            ] },
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: '下一個里程碑', size: 'sm', color: '#aaaaaa' },
              { type: 'text', text: '14 天', size: 'sm', color: '#111111', align: 'end' },
            ] },
          ] },
        ],
      },
    }),
  },
  {
    id: 'phq9_result',
    title: '量表結果（PHQ-9）',
    category: 'DTx / 健康',
    description: '分數大字 + 分級解釋 + 建議 + 動作按鈕',
    json: stringify({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '健康檢測結果', weight: 'bold', size: 'lg' },
          { type: 'text', text: 'PHQ-9 心情量表', size: 'xs', color: '#aaaaaa', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '7 分', weight: 'bold', size: '3xl', margin: 'lg', color: '#1DB446' },
          { type: 'text', text: '輕度（0-9 為輕度以下）', size: 'sm', color: '#666666', margin: 'sm' },
          { type: 'box', layout: 'vertical', margin: 'xl', spacing: 'sm', contents: [
            { type: 'text', text: '建議', size: 'sm', weight: 'bold' },
            { type: 'text', text: '持續觀察情緒變化，維持規律運動和作息。如果症狀持續兩週以上，建議與專業人員討論。', size: 'xs', color: '#666666', wrap: true },
          ] },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: '查看歷史趨勢', uri: 'https://line.me' } },
          { type: 'button', style: 'link', action: { type: 'message', label: '重做量表', text: '我想重新做 PHQ-9 量表' } },
        ],
      },
    }),
  },
  {
    id: 'daily_tip',
    title: '今日小提醒（簡單卡）',
    category: 'DTx / 健康',
    description: '每日推播用：一行標題 + 短內文，kilo 小尺寸',
    json: stringify({
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '今日小提醒', size: 'xs', color: '#aaaaaa' },
          { type: 'text', text: '每天 8 杯水 💧', weight: 'bold', size: 'xl', margin: 'sm', wrap: true },
          { type: 'text', text: '身體的每一個細胞都需要水份。別忘了時時補充。', size: 'sm', color: '#666666', margin: 'md', wrap: true },
        ],
      },
    }),
  },
];
