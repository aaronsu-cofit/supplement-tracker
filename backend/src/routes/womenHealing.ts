// backend/src/routes/womenHealing.ts
import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getTodayDiary,
  upsertDiaryEntry,
  getDiaryEntries,
  saveAssessmentResult,
  saveReliefSession,
} from '../lib/womenHealingDb.js';
import type { HonoEnv } from '../types.js';

const router = new Hono<HonoEnv>();
router.use('*', authMiddleware);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = 'gemini-2.0-flash';

// ─── Diary ────────────────────────────────────────────────────────────────────

// GET /api/women/diary/today
router.get('/diary/today', async (c) => {
  const userId = c.get('userId');
  const entry = await getTodayDiary(userId);
  return c.json(entry ?? null);
});

// GET /api/women/diary?page=1&limit=20
router.get('/diary', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = parseInt(c.req.query('limit') ?? '20', 10);
  const result = await getDiaryEntries(userId, page, Math.min(limit, 50));
  return c.json(result);
});

// POST /api/women/diary — upsert today's entry + generate AI feedback
router.post('/diary', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ mood: number; sleep: number; diary?: string }>();

  if (
    typeof body.mood !== 'number' || body.mood < 1 || body.mood > 5 ||
    typeof body.sleep !== 'number' || body.sleep < 1 || body.sleep > 5
  ) {
    return c.json({ error: 'mood 和 sleep 必須為 1–5 的整數' }, 400);
  }

  const moodLabels = ['', '極差', '偏低', '普通', '不錯', '極佳'];
  const sleepLabels = ['', '極差', '難入眠', '普通', '穩定', '深層'];

  let aiFeedback: string;
  try {
    const prompt = `你是「女人療心室」的 AI 心理支持助理，專門陪伴前更年期女性走過情緒波動、睡眠困擾與身體不適。

【今日用戶數據】
- 情緒評分：${body.mood}/5（${moodLabels[body.mood]}）
- 睡眠評分：${body.sleep}/5（${sleepLabels[body.sleep]}）
- 日記內容：「${body.diary || '（今天沒有額外文字記錄）'}」

請根據以上資訊，以溫柔、貼心、非評判性的語氣，用繁體中文撰寫一段 80-120 字的回應。
要讓她感到被真正理解與支持，並針對她的具體情況給一個溫和、可行的小建議。
使用自然的段落，不要條列式。不要過於制式化，要像朋友般真誠。`;

    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    aiFeedback = result.response.text();
  } catch {
    aiFeedback = localFallback(body.diary ?? '', body.mood, body.sleep);
  }

  const entry = await upsertDiaryEntry(userId, {
    mood: body.mood,
    sleep: body.sleep,
    diary: body.diary,
    aiFeedback,
  });

  return c.json(entry);
});

// ─── Assessment ───────────────────────────────────────────────────────────────

// POST /api/women/assessment/scan
router.post('/assessment/scan', async (c) => {
  const _userId = c.get('userId');
  const body = await c.req.json<{ imageBase64?: string }>();
  if (body.imageBase64 && body.imageBase64.length > 2_000_000) {
    return c.json({ insight: '' }, 200);
  }

  try {
    const prompt = `你是一位身心健康分析師，專門協助前更年期女性了解自身狀態。
請觀察這張臉部照片，從以下角度進行健康觀察（這是健康輔助工具，非醫療診斷）：
- 眼周氣色與暗沉程度
- 整體膚況與均勻度
- 面部肌肉張力（如眉間、嘴角）
- 整體氣色與精神狀態

請用溫柔、專業的繁體中文，撰寫一段 80-100 字的自然段落描述，不要使用條列式。
若圖片不清晰或無法辨識臉部，請根據前更年期女性常見壓力表徵提供一般性描述。`;

    const model = genAI.getGenerativeModel({ model: MODEL });
    const parts = body.imageBase64
      ? [prompt, { inlineData: { mimeType: 'image/jpeg' as const, data: body.imageBase64 } }]
      : [prompt];

    const result = await model.generateContent(parts);
    return c.json({ insight: result.response.text() });
  } catch (err) {
    console.error('Scan error:', err);
    return c.json({ insight: '' }, 200);
  }
});

// POST /api/women/assessment/analyze
router.post('/assessment/analyze', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    scores: { A: number; B: number; C: number };
    scanInsight: string;
    answers: Array<{ question: string; selected: string; type: string }>;
  }>();

  const { scores, scanInsight, answers } = body;

  // Ties default to A (anxiety type); B and C require a strict majority.
  function determineType(s: { A: number; B: number; C: number }): 'A' | 'B' | 'C' {
    if (s.B > s.A && s.B > s.C) return 'B';
    if (s.C > s.A && s.C > s.B) return 'C';
    return 'A';
  }
  const resultType = determineType(scores);

  const typeLabels: Record<string, string> = {
    A: '神經緊繃型（腦袋停不下來）',
    B: '情緒波動型（心情起伏大）',
    C: '身心失衡型（生理不適明顯）',
  };

  const sanitize = (s: string) => String(s).replace(/[<>]/g, '').slice(0, 200);
  const answersText = answers
    .slice(0, 30)
    .map((a, i) => `Q${i + 1}: ${sanitize(a.question)}\n→ ${sanitize(a.selected)}`)
    .join('\n\n');

  try {
    const prompt = `你是一位專業的前更年期身心健康顧問，請根據以下資訊，為這位女性生成個人化的健康評估報告。

【評估類型】${typeLabels[resultType]}
【各維度得分】A型: ${scores.A}分 / B型: ${scores.B}分 / C型: ${scores.C}分

【問卷作答詳情】
${answersText}

【臉部觀察分析】
${scanInsight || '（本次未進行臉部掃描）'}

請以 JSON 格式回覆，包含以下欄位，使用溫柔、具支持感的繁體中文：
{
  "type": "${resultType}",
  "title": "類型名稱（15字以內，要有特色）",
  "description": "根據她的具體作答，描述她目前的身心狀態（120-150字，要有個人化細節）",
  "advice": "針對她的狀況給出具體的生活建議（80-100字）",
  "faceInsight": "整合臉部分析與類型特徵的說明（60-80字）",
  "nutrition": "針對此類型的營養素補充建議（60-80字，要有具體的補充品名稱與說明）",
  "courseTitle": "最適合她的課程名稱（可參考：好眠正念課、情緒安定課、荷爾蒙重整課）"
}`;

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());

    // Save to DB (fire-and-forget)
    saveAssessmentResult(userId, {
      resultType,
      scores,
      aiAnalysis: analysis,
      faceInsight: scanInsight,
    }).catch(console.error);

    return c.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    return c.json({ error: '分析失敗' }, 500);
  }
});

// ─── Relief ───────────────────────────────────────────────────────────────────

// POST /api/women/relief
router.post('/relief', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ type: 'BREATHING' | 'BODY_SCAN' | 'SLEEP_QUOTES'; durationSec: number }>();
  if (!body.type) return c.json({ error: '缺少 type 欄位' }, 400);
  const session = await saveReliefSession(userId, {
    type: body.type,
    durationSec: body.durationSec ?? 0,
  });
  return c.json(session, 201);
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

function localFallback(text: string, mood: number, sleep: number): string {
  const keywords = {
    grief: ['狗', '貓', '寵物', '走', '離', '離世', '過世', '死', '不見', '痛', '想念'],
    burnout: ['累', '疲', '煩', '壓力', '忙', '喘不過氣', '無力', '工作'],
    anger: ['氣', '怒', '不爽', '討厭', '恨', '生氣', '火', '爆炸'],
    body: ['熱', '汗', '痛', '不舒服', '病', '暈', '燥', '盜汗', '心悸'],
  };
  if (keywords.grief.some((k) => text.includes(k)))
    return '面對摯愛的離開，那種深沉的痛與失落是無法用言語簡單形容的。允許自己悲傷，不需要急著好起來... 這段時間請溫柔地陪著自己。';
  if (keywords.burnout.some((k) => text.includes(k)))
    return '看來最近真的承擔了太多壓力呢。大腦和身體都在發出罷工的警訊，今天的妳已經足夠努力了，現在請把重擔暫時放下。';
  if (keywords.anger.some((k) => text.includes(k)))
    return '感到生氣和煩躁是完全可以被接受的！目前荷爾蒙波動讓神經系統變得異常敏感，試著透過深呼吸，把體內的濁氣吐出來。';
  if (keywords.body.some((k) => text.includes(k)))
    return '身體的種種不適，確實會讓人感到沮喪無力。請給她多一點耐心與包容，等一下去喝杯溫熱的水，做點輕柔的伸展吧。';
  if (mood <= 2)
    return '今天的心情似乎有些低落。能誠實地記錄下來，就是照顧自己最好的第一步！偶爾在谷底休息一下也是必要的，想哭就哭吧。';
  if (sleep <= 2)
    return '昨晚沒睡好，今天白天一定特別疲憊吧... 今晚試著去「線上舒緩區」使用引導工具，給自己一個不受打擾的睡眠儀式。';
  return '謝謝妳願意分享這些心裡的聲音。每一天的觀察與書寫，都能幫助妳更拿回情緒的主導權。今晚好好睡一覺吧，晚安。';
}

export default router;
