import { GoogleGenAI } from '@google/genai';

const TEXT_MODEL = 'gemini-3.5-flash-lite';
const TEXT_TIMEOUT_MS = 30000;

const responseSchema = {
  type: 'object',
  properties: {
    explanation: { type: 'string' },
    memeTitle: { type: 'string' },
    scene: { type: 'string' },
    visualConcept: { type: 'string' },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          emoji: { type: 'string' },
          role: { type: 'string' },
          expression: { type: 'string' },
          dialogue: { type: 'string' },
           position: { type: 'string' },
        },
          required: ['name', 'emoji', 'role', 'expression', 'dialogue', 'position'],
      },
    },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          emoji: { type: 'string' },
          position: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['name', 'emoji', 'position', 'action'],
      },
    },
    caption: { type: 'string' },
    educationalTakeaway: { type: 'string' },
  },
  required: ['explanation', 'memeTitle', 'scene', 'visualConcept', 'characters', 'objects', 'caption', 'educationalTakeaway'],
};

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart < 0 || objectEnd <= objectStart) throw new Error('Gemini returned invalid JSON');
    return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
  }
}

async function generateTextContent({ doubt, subject, difficulty, style }) {
  const response = await withTimeout(getClient().models.generateContent({
    model: TEXT_MODEL,
    contents: `You are an expert teacher and friendly meme creator for college students. Explain the academic doubt accurately, then design a distinct visual meme scene that a browser can render with SVG shapes, emojis, colors, and text. Return JSON only matching the schema.

  The visualConcept must summarize the actual visual metaphor for this specific doubt. Choose characters, objects, actions, positions, and expressions that are relevant to the doubt, subject, difficulty, and meme style. Use character positions such as left, right, center, top, or bottom, and object positions such as left, right, center, top, or bottom. Do not reuse a generic classroom composition. The scene should be funny, educational, visually clear, student-friendly, original, and free of logos or copyrighted characters. Use 1-4 characters and 1-6 objects. Keep the caption short and readable.

Doubt: ${doubt}
Subject: ${subject}
Difficulty: ${difficulty}
Meme style: ${style}`,
    config: { responseMimeType: 'application/json', responseSchema, temperature: 0.85 },
  }), TEXT_TIMEOUT_MS);

  const result = parseJson(response.text || '');
  for (const field of responseSchema.required) {
    if (!(field in result) || (typeof result[field] === 'string' && !result[field].trim())) {
      throw new Error('Gemini response was incomplete');
    }
  }
  return { ...result, hashtags: Array.isArray(result.hashtags) ? result.hashtags.slice(0, 5) : [] };
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs)),
  ]);
}

export async function generateMeme({ doubt, subject, difficulty, style }) {
  const textContent = await generateTextContent({ doubt, subject, difficulty, style });
  const meme = {
    title: textContent.memeTitle,
    scene: textContent.scene,
    visualConcept: textContent.visualConcept,
    characters: Array.isArray(textContent.characters) ? textContent.characters.slice(0, 4) : [],
    objects: Array.isArray(textContent.objects) ? textContent.objects.slice(0, 6) : [],
    caption: textContent.caption,
    educationalTakeaway: textContent.educationalTakeaway,
  };
  return {
    success: true,
    explanation: textContent.explanation,
    meme,
    concept: textContent.memeTitle,
    simpleExplanation: textContent.explanation,
    keyPoint: textContent.educationalTakeaway,
    memeSetup: textContent.scene,
    memePunchline: textContent.caption,
    memeCaption: textContent.caption,
    hashtags: [],
  };
}