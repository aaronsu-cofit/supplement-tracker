import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserId } from '@/app/lib/userId';
import { getSupplements } from '@/app/lib/db';

function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    return new GoogleGenerativeAI(apiKey);
}

// Analyze a nutrition label photo → extract supplement info
export async function POST(request) {
    try {
        const { image, mode } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
        }

        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imagePart = {
            inlineData: { data: base64Data, mimeType: 'image/jpeg' },
        };

        if (mode === 'label') {
            // Mode 1: Nutrition label → extract supplement info
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

            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text().trim();

            // Parse JSON from response (handle potential markdown wrapping)
            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            return NextResponse.json({ success: true, supplement: parsed });

        } else if (mode === 'checkin') {
            // Mode 2: Capsule/pill photo → identify which supplement
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

            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text().trim();

            let parsed;
            try {
                const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });
            }

            const response = NextResponse.json({ success: true, result: parsed });
            response.cookies.set('supplement_user_id', userId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365 * 5,
            });
            return response;
        }

        return NextResponse.json({ error: 'Invalid mode. Use "label" or "checkin"' }, { status: 400 });
    } catch (error) {
        console.error('AI analysis error:', error);
        const message = error.message?.includes('API_KEY')
            ? 'Gemini API key not configured'
            : 'Failed to analyze image';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
