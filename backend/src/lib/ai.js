const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
];

export async function callGemini(apiKey, base64Data, mimeType, prompt) {
  let lastError = null;

  for (const model of MODELS) {
    for (const apiVersion of ['v1beta', 'v1']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`Gemini success: ${model}/${apiVersion}`);
            return text.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = `${model}/${apiVersion}: ${res.status} - ${errData.error?.message || 'Unknown error'}`;
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

export function parseGeminiJson(text) {
  const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

// Text-only Gemini call (no image)
export async function callGeminiText(apiKey, prompt) {
  let lastError = null;
  for (const model of MODELS) {
    for (const apiVersion of ['v1beta', 'v1']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = `${model}/${apiVersion}: ${res.status} - ${errData.error?.message || 'Unknown'}`;
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
