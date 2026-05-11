import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { callGemini, callGeminiText, parseGeminiJson } from '../lib/ai.js';
import {
  getTodayDiary, upsertDiaryEntry, getDiaryEntries,
  saveAssessmentResult, saveReliefSession,
} from '../lib/womenHealingDb.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function womenHealingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  // GET /api/women/diary/today
  app.get('/diary/today', async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const entry = await getTodayDiary(userId);
      return entry ?? null;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // GET /api/women/diary?page=1&limit=20
  app.get('/diary', async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const { page, limit } = request.query as any;
      const pageNum = parseInt(page ?? '1', 10);
      const limitNum = parseInt(limit ?? '20', 10);
      const result = await getDiaryEntries(userId, pageNum, Math.min(limitNum, 50));
      return result;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/women/diary
  app.post('/diary', async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const body = request.body as any;

      if (
        typeof body.mood !== 'number' || body.mood < 1 || body.mood > 5 ||
        typeof body.sleep !== 'number' || body.sleep < 1 || body.sleep > 5
      ) {
        return reply.code(400).send({ error: 'mood 和 sleep 必須為 1–5 的整數' });
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

        aiFeedback = await callGeminiText(GEMINI_API_KEY, prompt);
      } catch {
        aiFeedback = '謝謝妳願意分享這些心裡的聲音。每一天的觀察與書寫，都能幫助妳更拿回情緒的主導權。今晚好好睡一覺吧，晚安。';
      }

      const entry = await upsertDiaryEntry(userId, {
        mood: body.mood,
        sleep: body.sleep,
        diary: body.diary,
        aiFeedback,
      });

      return entry;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/women/assessment/scan
  app.post('/assessment/scan', async (request, reply) => {
    try {
      const body = request.body as any;

      if (body.imageBase64 && body.imageBase64.length > 2_000_000) {
        return { insight: '' };
      }

      const prompt = `你是一位身心健康分析師，專門協助前更年期女性了解自身狀態。
請觀察這張臉部照片，從以下角度進行健康觀察（這是健康輔助工具，非醫療診斷）：
- 眼周氣色與暗沉程度
- 整體膚況與均勻度
- 面部肌肉張力（如眉間、嘴角）
- 整體氣色與精神狀態

請用溫柔、專業的繁體中文，撰寫一段 80-100 字的自然段落描述，不要使用條列式。
若圖片不清晰或無法辨識臉部，請根據前更年期女性常見壓力表徵提供一般性描述。`;

      const insight = body.imageBase64
        ? await callGemini(GEMINI_API_KEY, body.imageBase64, 'image/jpeg', prompt)
        : await callGeminiText(GEMINI_API_KEY, prompt);

      return { insight };
    } catch (err) {
      console.error('Scan error:', err);
      return { insight: '' };
    }
  });

  // POST /api/women/assessment/analyze
  app.post('/assessment/analyze', async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const body = request.body as any;
      const { scores, scanInsight, answers } = body;

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
        .map((a: any, i: number) => `Q${i + 1}: ${sanitize(a.question)}\n→ ${sanitize(a.selected)}`)
        .join('\n\n');

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

      const text = await callGeminiText(GEMINI_API_KEY, prompt);
      const analysis = parseGeminiJson(text);

      saveAssessmentResult(userId, {
        resultType,
        scores,
        aiAnalysis: analysis as object,
        faceInsight: scanInsight,
      }).catch(console.error);

      return analysis;
    } catch (error) {
      console.error('Analyze error:', error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/women/relief
  app.post('/relief', async (request, reply) => {
    try {
      const userId = (request as any).userId;
      const body = request.body as any;
      if (!body.type) return reply.code(400).send({ error: '缺少 type 欄位' });
      
      const session = await saveReliefSession(userId, {
        type: body.type,
        durationSec: body.durationSec ?? 0,
      });
      return reply.code(201).send(session);
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
