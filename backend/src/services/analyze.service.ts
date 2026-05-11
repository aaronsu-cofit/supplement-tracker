// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/analyze.service.ts
import { PrismaClient } from '@prisma/client';
import { callGemini, parseGeminiJson } from '../lib/ai.js';
import { getSupplements } from '../lib/db.js';
import type { AnalyzeRequestBody } from '../types.js';

export class AnalyzeService {
  constructor(private prisma: PrismaClient) {}

  async analyzeImage(userId: string, data: AnalyzeRequestBody) {
    const { image, mode = 'wound', prompt: customPrompt } = data;

    if (!image) {
      throw new Error('No image provided');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    if (mode === 'label') {
      return this.analyzeLabel(apiKey, base64Data, mimeType);
    }

    if (mode === 'checkin') {
      return this.analyzeCheckin(apiKey, base64Data, mimeType, userId);
    }

    if (mode === 'wound') {
      return this.analyzeWound(apiKey, base64Data, mimeType, customPrompt);
    }

    if (mode === 'hallux_valgus') {
      return this.analyzeHalluxValgus(apiKey, base64Data, mimeType);
    }

    if (mode === 'sexual_health') {
      return this.analyzeSexualHealth(apiKey, base64Data, mimeType, customPrompt);
    }

    if (mode === 'shoe_wear') {
      return this.analyzeShoeWear(apiKey, base64Data, mimeType);
    }

    throw new Error('Invalid mode. Use "label", "checkin", "wound", "hallux_valgus", "shoe_wear", or "sexual_health"');
  }

  private async analyzeLabel(apiKey: string, base64Data: string, mimeType: string) {
    const prompt = `You are analyzing a supplement/vitamin nutrition label photo.
Extract the following information and return it as valid JSON only (no markdown, no code fences):
{
  "name": "product name in the original language",
  "dosage": "recommended dosage per serving (e.g. '1000mg', '2 capsules')",
  "frequency": "daily",
  "time_of_day": "morning or afternoon or evening (guess based on supplement type)",
  "notes": "key ingredients/nutrients listed, brief summary"
}
Guidelines:
- If the label is in Chinese, keep the name in Chinese
- For time_of_day: vitamins/energy supplements → morning, calcium/magnesium → evening, general → morning
- Return ONLY the JSON object, nothing else`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson(text);
    return { success: true, supplement: parsed };
  }

  private async analyzeCheckin(apiKey: string, base64Data: string, mimeType: string, userId: string) {
    const supplements = await getSupplements(userId);
    if (supplements.length === 0) {
      throw new Error('No supplements to match against');
    }

    const supplementList = supplements.map(s => `ID:${s.id} | Name:${s.name} | Dosage:${s.dosage || 'N/A'}`).join('\n');
    const prompt = `You are analyzing a photo of supplement capsules, pills, or tablets.
The user has the following supplements in their tracker:

${supplementList}

Based on the appearance (color, shape, size, markings) of the capsules/pills in the photo, identify which supplement(s) from the list above are most likely shown.

Return valid JSON only (no markdown, no code fences):
{
  "matches": [{ "id": <supplement_id>, "name": "<supplement_name>", "confidence": "high/medium/low" }],
  "description": "brief description of what you see in the photo"
}
- Return ONLY the JSON object`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson(text);
    return { success: true, result: parsed };
  }

  private async analyzeWound(apiKey: string, base64Data: string, mimeType: string, customPrompt?: string) {
    const prompt = `${customPrompt || '這是一張傷口照片。請分析傷口的復原狀況。'}

請以「資深傷口護理師」的溫暖口吻，對這張傷口照片提供客觀的狀態描述。
【重要原則】
1. 絕對不可直接給出「感染(Infected)」等絕對醫療診斷字眼。
2. 僅描述客觀視覺特徵（如：肉芽組織生長中、邊緣有些微紅腫、有黃色滲出液等）。
3. 若綜合判斷狀態異常，請強烈建議「尋求專業醫師評估」；若狀態穩定，請給予鼓勵。

Return valid JSON only (no markdown, no code fences):
{
  "analysis": "護理師口吻的詳細客觀狀態描述，整合患者的症狀與疼痛指數分析 (大約 50-80 字)",
  "ai_status_label": "復原進度符合預期 | 需多加留意觀察 | 建議諮詢專業醫護人員"
}`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson<Record<string, unknown>>(text);
    return { success: true, ...parsed };
  }

  private async analyzeHalluxValgus(apiKey: string, base64Data: string, mimeType: string) {
    const prompt = `You are an orthopedic foot specialist analyzing a top-down photo of a patient's bare feet.
Determine the severity of Hallux Valgus (bunion) present in the big toe joints.

Return valid JSON only (no markdown, no code fences):
{
  "ai_severity": "normal" | "mild" | "moderate" | "severe",
  "ai_summary": "Brief objective description of the hallux valgus appearance (around 30-50 words in Traditional Chinese).",
  "left_toe": { "detected": true/false, "severity": "normal" | "mild" | "moderate" | "severe", "angle_degrees": 18, "box": { "ymin": 0.45, "xmin": 0.20, "ymax": 0.55, "xmax": 0.35 } },
  "right_toe": { "detected": true/false, "severity": "normal" | "mild" | "moderate" | "severe", "angle_degrees": 25, "box": { "ymin": 0.45, "xmin": 0.65, "ymax": 0.55, "xmax": 0.80 } }
}
- Return ONLY the JSON object.`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson<Record<string, unknown>>(text);
    return { success: true, ...parsed };
  }

  private async analyzeSexualHealth(apiKey: string, base64Data: string, mimeType: string, customPrompt?: string) {
    const prompt = `${customPrompt || '這是一份性健康與親密關係評估問卷。'}

請以「頂級性學權威與婦產/泌尿科醫師」的溫婉、包容、且極具醫療專業的口吻，綜合評估上述的問卷狀況。
【重要原則】
1. 絕對不可批判，用語必須柔軟且充滿同理心，消除患者的羞恥感與表現焦慮。
2. 給予 2~3 點具體且有科學根據的建議。
3. 評估是否需要進一步醫療介入。

Return valid JSON only (no markdown, no code fences):
{
  "ai_summary": "醫師口吻的綜合評估與溫暖建議 (大約 100-150 字)",
  "severity": "mild" | "moderate" | "severe",
  "recommended_action": "kegel_training" | "consult_doctor" | "use_lubricant" | "stress_reduction"
}`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson<Record<string, unknown>>(text);
    return { success: true, ...parsed };
  }

  private async analyzeShoeWear(apiKey: string, base64Data: string, mimeType: string) {
    const prompt = `You are a podiatric biomechanics specialist analyzing a photo of shoe sole(s).
Identify the wear patterns visible to determine gait mechanics and hallux valgus risk.

Return valid JSON only (no markdown, no code fences):
{
  "ai_risk_level": "low" | "moderate" | "high",
  "ai_wear_pattern": "medial_forefoot" | "lateral" | "heel_center" | "toe_asymmetric" | "uniform" | "mixed",
  "ai_summary": "客觀描述磨損模式及對拇趾外翻的潛在影響（約 30-50 字繁體中文）",
  "left_shoe": { "detected": true, "primary_wear": "主要磨損區域描述", "gait_note": "步態特徵簡述" },
  "right_shoe": { "detected": true, "primary_wear": "主要磨損區域描述", "gait_note": "步態特徵簡述" }
}
- Return ONLY the JSON object.`;

    const text = await callGemini(apiKey, base64Data, mimeType, prompt);
    const parsed = parseGeminiJson<Record<string, unknown>>(text);
    return { success: true, ...parsed };
  }
}
