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
        const { image, mode } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
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
        }

        return NextResponse.json({ error: 'Invalid mode. Use "label" or "checkin"' }, { status: 400 });
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json({ error: error.message || 'Failed to analyze image' }, { status: 500 });
    }
}
