import { PrismaClient } from '@prisma/client';
import { callGemini, callGeminiText, parseGeminiJson } from '../lib/ai.js';
import {
  getTodayDiary, upsertDiaryEntry, getDiaryEntries,
  saveAssessmentResult, saveReliefSession, type SaveReliefInput,
} from '../lib/womenHealingDb.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

/**
 * Women Healing Service - Business Logic & Validation
 *
 * 負責所有女性療心室的業務邏輯、驗證、AI 調用和資料庫操作
 */
export class WomenHealingService {
  constructor(private prisma: PrismaClient) {}

  // ─── Validation Methods ─────────────────────────────────────────

  /**
   * 驗證日記輸入數據
   */
  validateDiaryInput(body: Record<string, unknown>): string | null {
    if (typeof body.mood !== 'number' || body.mood < 1 || body.mood > 5) {
      return 'mood 必須為 1–5 的整數';
    }
    if (typeof body.sleep !== 'number' || body.sleep < 1 || body.sleep > 5) {
      return 'sleep 必須為 1–5 的整數';
    }
    return null;
  }

  /**
   * 驗證評估分析輸入
   */
  validateAssessmentAnalysisInput(body: Record<string, unknown>): string | null {
    if (!body.scores || typeof body.scores !== 'object') {
      return '缺少 scores 欄位';
    }
    const scores = body.scores as Record<string, unknown>;
    if (typeof scores.A !== 'number' || typeof scores.B !== 'number' || typeof scores.C !== 'number') {
      return 'scores 需包含 A、B、C 三個數值欄位';
    }
    return null;
  }

  /**
   * 驗證救濟療程輸入
   */
  validateReliefSessionInput(body: Record<string, unknown>): string | null {
    if (!body.type || typeof body.type !== 'string') {
      return '缺少 type 欄位';
    }
    return null;
  }

  // ─── Business Logic Methods ─────────────────────────────────────

  /**
   * 生成日記的 AI 反饋
   */
  async generateDiaryFeedback(mood: number, sleep: number, diary: string): Promise<string> {
    const moodLabels = ['', '極差', '偏低', '普通', '不錯', '極佳'];
    const sleepLabels = ['', '極差', '難入眠', '普通', '穩定', '深層'];

    try {
      const prompt = `你是「女人療心室」的 AI 心理支持助理，專門陪伴前更年期女性走過情緒波動、睡眠困擾與身體不適。

【今日用戶數據】
- 情緒評分：${mood}/5（${moodLabels[mood]}）
- 睡眠評分：${sleep}/5（${sleepLabels[sleep]}）
- 日記內容：「${diary || '（今天沒有額外文字記錄）'}」

請根據以上資訊，以溫柔、貼心、非評判性的語氣，用繁體中文撰寫一段 80-120 字的回應。
要讓她感到被真正理解與支持，並針對她的具體情況給一個溫和、可行的小建議。
使用自然的段落，不要條列式。不要過於制式化，要像朋友般真誠。`;

      return await callGeminiText(GEMINI_API_KEY, prompt);
    } catch {
      return '謝謝妳願意分享這些心裡的聲音。每一天的觀察與書寫，都能幫助妳更拿回情緒的主導權。今晚好好睡一覺吧，晚安。';
    }
  }

  /**
   * 掃描並分析臉部影像
   */
  async scanFaceInsight(imageBase64?: string): Promise<string> {
    if (imageBase64 && imageBase64.length > 2_000_000) {
      return '';
    }

    const prompt = `你是一位身心健康分析師，專門協助前更年期女性了解自身狀態。
請觀察這張臉部照片，從以下角度進行健康觀察（這是健康輔助工具，非醫療診斷）：
- 眼周氣色與暗沉程度
- 整體膚況與均勻度
- 面部肌肉張力（如眉間、嘴角）
- 整體氣色與精神狀態

請用溫柔、專業的繁體中文，撰寫一段 80-100 字的自然段落描述，不要使用條列式。
若圖片不清晰或無法辨識臉部，請根據前更年期女性常見壓力表徵提供一般性描述。`;

    try {
      return imageBase64
        ? await callGemini(GEMINI_API_KEY, imageBase64, 'image/jpeg', prompt)
        : await callGeminiText(GEMINI_API_KEY, prompt);
    } catch {
      return '';
    }
  }

  /**
   * 根據評分判斷評估類型
   */
  determineAssessmentType(scores: { A: number; B: number; C: number }): 'A' | 'B' | 'C' {
    if (scores.B > scores.A && scores.B > scores.C) return 'B';
    if (scores.C > scores.A && scores.C > scores.B) return 'C';
    return 'A';
  }

  /**
   * 獲取評估類型的標籤和說明
   */
  getAssessmentTypeLabels(): Record<string, string> {
    return {
      A: '神經緊繃型（腦袋停不下來）',
      B: '情緒波動型（心情起伏大）',
      C: '身心失衡型（生理不適明顯）',
    };
  }

  /**
   * 清理和格式化答案文本（防止注入）
   */
  sanitizeAnswerText(text: string, maxLen: number = 200): string {
    return String(text).replace(/[<>]/g, '').slice(0, maxLen);
  }

  /**
   * 生成評估分析結果
   */
  async generateAssessmentAnalysis(
    resultType: 'A' | 'B' | 'C',
    scores: { A: number; B: number; C: number },
    answers: any[],
    scanInsight: string
  ): Promise<any> {
    const typeLabels = this.getAssessmentTypeLabels();
    const answersText = answers
      .slice(0, 30)
      .map((a: any, i: number) => {
        const q = this.sanitizeAnswerText(a.question);
        const s = this.sanitizeAnswerText(a.selected);
        return `Q${i + 1}: ${q}\n→ ${s}`;
      })
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

    try {
      const text = await callGeminiText(GEMINI_API_KEY, prompt);
      return parseGeminiJson(text);
    } catch (error) {
      console.error('Assessment analysis error:', error);
      throw error;
    }
  }

  // ─── Database Access Methods ───────────────────────────────────

  /**
   * 取得今日日記
   */
  getTodayDiary(userId: string) {
    return getTodayDiary(userId);
  }

  /**
   * 取得日記列表（分頁）
   */
  getDiaryEntries(userId: string, page: number, limit: number) {
    return getDiaryEntries(userId, page, limit);
  }

  /**
   * 新增或更新日記
   */
  upsertDiaryEntry(userId: string, data: {
    mood: number;
    sleep: number;
    diary?: string;
    aiFeedback: string;
  }) {
    return upsertDiaryEntry(userId, data);
  }

  /**
   * 儲存評估結果
   */
  saveAssessmentResult(userId: string, data: {
    resultType: 'A' | 'B' | 'C';
    scores: { A: number; B: number; C: number };
    aiAnalysis: object;
    faceInsight?: string;
  }) {
    return saveAssessmentResult(userId, data);
  }

  /**
   * 儲存救濟療程會話
   */
  saveReliefSession(userId: string, data: SaveReliefInput) {
    return saveReliefSession(userId, data);
  }
}
