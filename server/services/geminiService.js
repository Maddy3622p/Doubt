import { GoogleGenAI } from '@google/genai';

const responseSchema = {
  type: 'object',
  properties: {
    concept: { type: 'string' },
    simpleExplanation: { type: 'string' },
    keyPoint: { type: 'string' },
    memeSetup: { type: 'string' },
    memePunchline: { type: 'string' },
    memeCaption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: ['concept', 'simpleExplanation', 'keyPoint', 'memeSetup', 'memePunchline', 'memeCaption', 'hashtags'],
};

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart < 0 || objectEnd <= objectStart) throw new Error('Gemini returned invalid JSON');
    return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
  }
}

export async function generateMeme({ doubt, subject, difficulty, style }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You are an expert teacher and meme creator for engineering students. Understand the academic doubt first, then explain it accurately in beginner-friendly language and make a safe, relatable joke. Never use offensive, hateful, sexual, discriminatory, or dangerous humor. Return JSON only matching the schema. Keep the simple explanation to 2-4 sentences, the key point to one sentence, and make the meme punchline concise.\n\nDoubt: ${doubt}\nSubject: ${subject}\nDifficulty: ${difficulty}\nMeme style: ${style}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema, temperature: 0.9 },
  });
  const result = parseJson(response.text || '');
  for (const field of responseSchema.required) if (!(field in result)) throw new Error('Gemini response was incomplete');
  return { ...result, hashtags: Array.isArray(result.hashtags) ? result.hashtags.slice(0, 5) : [] };
}
