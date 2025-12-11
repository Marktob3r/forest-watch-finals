type SearchItem = {
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
};

const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';
const YT_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const GEMINI_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta2';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/text-bison-001';

async function searchBing(query: string): Promise<SearchItem[]> {
  const key = process.env.BING_API_KEY;
  if (!key) return [];
  const url = `${BING_ENDPOINT}?q=${encodeURIComponent(query)}&count=6`;
  const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } });
  if (!res.ok) return [];
  const data = await res.json();
  const items: SearchItem[] = [];
  if (data.webPages?.value) {
    for (const v of data.webPages.value) {
      items.push({ title: v.name, url: v.url, snippet: v.snippet, source: 'web' });
    }
  }
  if (data.videos?.value) {
    for (const v of data.videos.value) {
      items.push({ title: v.name, url: v.url, snippet: v.description, source: 'video' });
    }
  }
  return items;
}

async function searchYouTube(query: string): Promise<SearchItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const url = `${YT_ENDPOINT}?key=${key}&part=snippet&type=video&maxResults=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const items: SearchItem[] = [];
  for (const it of data.items || []) {
    const title = it.snippet?.title || 'Video';
    const vidId = it.id?.videoId;
    const url = vidId ? `https://www.youtube.com/watch?v=${vidId}` : undefined;
    items.push({ title, url, snippet: it.snippet?.description, source: 'youtube' });
  }
  return items;
}

async function callGemini(prompt: string) {
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
      body: JSON.stringify({
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 800,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.output?.[0]?.content || null;
    return text;
  } catch (e) {
    return null;
  }
}

export async function discoverResources(query: string, types: string[] = ['articles', 'videos', 'guides']) {
  if (!query) return [];
  let items: SearchItem[] = [];
  if (types.includes('videos')) {
    const yt = await searchYouTube(query);
    items = items.concat(yt);
  }
  const bing = await searchBing(query);
  items = items.concat(bing);

  const seen = new Set<string>();
  const unique: SearchItem[] = [];
  for (const it of items) {
    const k = it.url || it.title;
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(it);
  }

  // If no external search results are available, first attempt to generate
  // recommendations directly using Gemini (if the key is present). This lets
  // developers with only an LLM key get real, model-generated recommendations.
  if (unique.length === 0) {
    const geminiOnly = await generateFromGeminiOnly(query);
    if (Array.isArray(geminiOnly) && geminiOnly.length > 0) return geminiOnly;

    // Fallback small built-in sample for purely offline/dev use.
    return [
      {
        title: 'Reforestation Best Practices',
        url: 'https://example.com/reforestation-best-practices',
        snippet: 'Practical steps and case studies for successful reforestation projects.',
        source: 'example',
      },
      {
        title: 'Using NDVI for Forest Monitoring',
        url: 'https://example.com/ndvi-forest-monitoring',
        snippet: 'Introduction to NDVI and how to use satellite imagery for vegetation health.',
        source: 'example',
      },
      {
        title: 'Satellite Monitoring: From Space to Action',
        url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
        snippet: 'A short video on detecting deforestation with satellite data.',
        source: 'youtube',
      },
    ];
  }

  const sampleList = unique.slice(0, 8).map((it, idx) => `${idx + 1}. ${it.title}${it.url ? ' — ' + it.url : ''}${it.snippet ? ' | ' + it.snippet : ''}`).join('\n');
  const prompt = `You are an assistant that inspects a list of online learning resources (articles, videos, guides).\n\nQuery: ${query}\n\nResources:\n${sampleList}\n\nFor each item, provide a short JSON array where each element has: title, url (if available), shortSummary (<=30 words), estimatedRating (0.0-5.0 number) and confidence (low/medium/high). Only output valid JSON.`;

  const geminiOutput = await callGemini(prompt);
  if (!geminiOutput) {
      return unique.slice(0, 12);
  }

  try {
    const jsonStart = geminiOutput.indexOf('[');
    const jsonText = jsonStart >= 0 ? geminiOutput.slice(jsonStart) : geminiOutput;
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (e) {
    return unique.slice(0, 12);
  }
}

  // If no external search results and Gemini key exists, generate recommendations
  // directly from the query so devs with only an LLM key still get real results.
  async function generateFromGeminiOnly(query: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const prompt = `Generate up to 8 learning resources (articles, videos, or guides) for the query: "${query}". Return a JSON array where each element is an object with: title, url (optional), shortSummary (<=30 words), estimatedRating (0.0-5.0), confidence (low|medium|high). Only output valid JSON.`;
    const out = await callGemini(prompt);
    if (!out) return null;
    try {
      const start = out.indexOf('[');
      const text = start >= 0 ? out.slice(start) : out;
      const parsed = JSON.parse(text);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  export default discoverResources;
