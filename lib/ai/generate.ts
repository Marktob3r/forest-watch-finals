const GEMINI_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta2';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/text-bison-001';

export async function callGemini(prompt: string, maxTokens = 600) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const endpoint = `${GEMINI_BASE}/${GEMINI_MODEL}:generateText`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: maxTokens }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.output?.[0]?.content || null;
    return text;
  } catch (e) {
    return null;
  }
}

export default callGemini;
