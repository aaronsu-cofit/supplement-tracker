const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

async function callGeminiRaw(apiKey, body) {
  let lastError = null;
  for (const model of MODELS) {
    for (const apiVersion of ["v1beta", "v1"]) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
          lastError = `${model}/${apiVersion}: ${res.status} - ${errData.error?.message || "Unknown error"}`;
        }
      } catch (e) {
        lastError = `${model}/${apiVersion}: ${e.message}`;
      }
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

export function callGemini(apiKey, base64Data, mimeType, prompt) {
  return callGeminiRaw(apiKey, {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: "medium" },
    },
  });
}

export function callGeminiText(apiKey, prompt) {
  return callGeminiRaw(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
  });
}

export function parseGeminiJson(text) {
  const jsonStr = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON: ${e.message}\nRaw: ${jsonStr.slice(0, 200)}`);
  }
}
