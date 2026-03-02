import { NextResponse } from 'next/server';
import { getUserId, withUserCookie } from '@/app/lib/userId';
import { getSupplements } from '@/app/lib/db';

const MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
];

async function callGemini(apiKey, base64Data, mimeType, prompt) {
    let lastError = null;

    for (const model of MODELS) {
        for (const apiVersion of ['v1beta', 'v1']) {
            try {
                const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: mimeType, data: base64Data } },
                            ],
                        }],
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 1024,
                        },
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        console.log(`Gemini success with model: ${model}, apiVersion: ${apiVersion}`);
                        return text.trim();
                    }
                } else {
                    const errData = await res.json().catch(() => ({}));
                    lastError = `${model}/${apiVersion}: ${res.status} - ${errData.error?.message || 'Unknown error'}`;
                    console.log(`Gemini attempt failed: ${lastError}`);
                    // If 404, try next api version or model
                    // If 429 (quota), try next model
                    continue;
                }
            } catch (e) {
                lastError = `${model}/${apiVersion}: ${e.message}`;
                continue;
            }
        }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

export async function POST(request) {
    try {
        const reqBody = await request.json();
        const { image, mode = 'wound', prompt: customPrompt } = reqBody; // Default to wound if not specified

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        // Extract base64 data and mime type
        const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        if (mode === 'label') {
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
- For dosage, combine the amount with the unit
- If you cannot identify the supplement clearly, set name to the most visible product text
- Return ONLY the JSON object, nothing else`;

            const text = await callGemini(apiKey, base64Data, mimeType, prompt);

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            return NextResponse.json({ success: true, supplement: parsed });

        } else if (mode === 'checkin') {
            const userId = await getUserId();
            const supplements = await getSupplements(userId);

            if (supplements.length === 0) {
                return NextResponse.json({ error: 'No supplements to match against' }, { status: 400 });
            }

            const supplementList = supplements
                .map((s) => `ID:${s.id} | Name:${s.name} | Dosage:${s.dosage || 'N/A'}`)
                .join('\n');

            const prompt = `You are analyzing a photo of supplement capsules, pills, or tablets.
The user has the following supplements in their tracker:

${supplementList}

Based on the appearance (color, shape, size, markings) of the capsules/pills in the photo, identify which supplement(s) from the list above are most likely shown.

Return valid JSON only (no markdown, no code fences):
{
  "matches": [
    { "id": <supplement_id>, "name": "<supplement_name>", "confidence": "high/medium/low" }
  ],
  "description": "brief description of what you see in the photo"
}

Guidelines:
- Match based on visual characteristics: capsule color, tablet shape, any visible text/markings
- If uncertain, include multiple possibilities with lower confidence
- If nothing matches, return empty matches array
- Return ONLY the JSON object`;

            const text = await callGemini(apiKey, base64Data, mimeType, prompt);

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            const response = NextResponse.json({ success: true, result: parsed });
            return withUserCookie(response, userId);

        } else if (mode === 'wound') {
            const userId = await getUserId();
            // In wound mode, the user passes a customPrompt that includes symptoms and NRS score
            const prompt = `${customPrompt || "這是一張傷口照片。請分析傷口的復原狀況。"}
            
            請以「資深傷口護理師」的溫暖口吻，對這張傷口照片提供客觀的狀態描述。
            【重要原則】
            1. 絕對不可直接給出「感染(Infected)」等絕對醫療診斷字眼。
            2. 僅描述客觀視覺特徵（如：肉芽組織生長中、邊緣有些微紅腫、有黃色滲出液等）。
            3. 若綜合判斷狀態異常，請強烈建議「尋求專業醫師評估」；若狀態穩定，請給予鼓勵。

            Return valid JSON only (no markdown, no code fences):
            {
              "analysis": "護理師口吻的詳細客觀狀態描述，整合患者的症狀與疼痛指數分析 (大約 50-80 字)",
              "ai_status_label": "復原進度符合預期 | 需多加留意觀察 | 建議諮詢專業醫護人員" 
            }
            `;

            const text = await callGemini(apiKey, base64Data, mimeType, prompt);

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            const response = NextResponse.json({ success: true, ...parsed });
            return withUserCookie(response, userId);
        } else if (mode === 'hallux_valgus') {
            const userId = await getUserId();
            const prompt = `You are an orthopedic foot specialist and AI computer vision model analyzing a top-down photo of a patient's bare feet.
Determine the severity of Hallux Valgus (bunion) present in the big toe joints.
Also, accurately detect the big toe joint (First Metatarsophalangeal Joint / MTP joint) on both the left and right foot if visible.

Return valid JSON only (no markdown, no code fences):
{
  "ai_severity": "normal" | "mild" | "moderate" | "severe",
  "ai_summary": "Brief objective description of the hallux valgus appearance (around 30-50 words in Traditional Chinese).",
  "left_toe": {
    "detected": true/false,
    "severity": "normal" | "mild" | "moderate" | "severe",
    "angle_degrees": 18,
    "box": { "ymin": 0.45, "xmin": 0.20, "ymax": 0.55, "xmax": 0.35 }
  },
  "right_toe": {
    "detected": true/false,
    "severity": "normal" | "mild" | "moderate" | "severe",
    "angle_degrees": 25,
    "box": { "ymin": 0.45, "xmin": 0.65, "ymax": 0.55, "xmax": 0.80 }
  }
}

Guidelines for severity and angles:
- normal: No obvious deviation of the big toe (angle < 15 degrees).
- mild: Slight outward deviation of the big toe (angle 15-20 degrees).
- moderate: Clear deviation, visible bony bump at the base (angle 20-40 degrees).
- severe: Significant deviation, big toe may overlap with or underlap the second toe (angle > 40 degrees).
- The "ai_severity" should be the worse of the two feet.
- For boxes, use normalized coordinates between 0.0 and 1.0 relative to the image size.
- Ensure 'ymin' < 'ymax' and 'xmin' < 'xmax'. The box should tightly enclose the big toe MTP joint (the bunion bump).
- Return ONLY the JSON object.`;

            const text = await callGemini(apiKey, base64Data, mimeType, prompt);

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            const response = NextResponse.json({ success: true, ...parsed });
            return withUserCookie(response, userId);
        } else if (mode === 'sexual_health') {
            const userId = await getUserId();
            const prompt = `${customPrompt || "這是一份性健康與親密關係評估問卷。"}
            
            請以「頂級性學權威與婦產/泌尿科醫師」的溫婉、包容、且極具醫療專業的口吻，綜合評估上述的問卷狀況。
            【重要原則】
            1. 絕對不可批判，用語必須柔軟且充滿同理心，消除患者的羞恥感與表現焦慮。
            2. 給予 2~3 點具體且有科學根據的建議（包含生活作息調整、伴侶溝通建議或復健運動如凱格爾運動）。
            3. 評估是否需要進一步醫療介入或使用輔助產品（例如潤滑液、保險套、或是尋求實體醫療協助）。
            
            Return valid JSON only (no markdown, no code fences):
            {
              "ai_summary": "醫師口吻的綜合評估與溫暖建議 (大約 100-150 字)",
              "severity": "mild" | "moderate" | "severe",
              "recommended_action": "kegel_training" | "consult_doctor" | "use_lubricant" | "stress_reduction"
            }
            `;

            // For text-only questionnaires, we might not have an image, but this API structure expects base64Data.
            // If image is just a dummy blank image passed from frontend, Gemini will still process the text prompt.
            const text = await callGemini(apiKey, base64Data, mimeType, prompt);

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            const response = NextResponse.json({ success: true, ...parsed });
            return withUserCookie(response, userId);
        }

        return NextResponse.json({ error: 'Invalid mode. Use "label", "checkin", "wound", "hallux_valgus", or "sexual_health"' }, { status: 400 });
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json({ error: error.message || 'Failed to analyze image' }, { status: 500 });
    }
}
