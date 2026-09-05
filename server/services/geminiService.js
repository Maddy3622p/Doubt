import { GoogleGenAI } from '@google/genai';

const TEXT_MODEL = 'gemini-3.5-flash-lite';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 45000;

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
    imagePrompt: { type: 'string' },
  },
  required: ['concept', 'simpleExplanation', 'keyPoint', 'memeSetup', 'memePunchline', 'memeCaption', 'hashtags', 'imagePrompt'],
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
    contents: `You are an expert teacher and friendly meme creator for college students. Explain the academic doubt accurately in beginner-friendly language, then create safe, relatable meme copy. Return JSON only matching the schema.

The imagePrompt must be a concise but specific prompt for an image model. Include the educational concept, funny situation, characters, environment, visual actions, meme-style humor, and a short readable caption only if useful. Keep the scene simple, student-appropriate, original, and free of logos or copyrighted characters. Do not rely on the image model to render long paragraphs of text.

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
    new Promise((_, reject) => setTimeout(() => reject(new Error('Image generation timed out')), timeoutMs)),
  ]);
}

async function generateMemeImage(imagePrompt) {
  try {
    const response = await withTimeout(getClient().models.generateContent({
      model: IMAGE_MODEL,
      contents: imagePrompt,
      config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
    }), IMAGE_TIMEOUT_MS);
    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart) return null;
    const { data, mimeType = 'image/png' } = imagePart.inlineData;
    return `data:${mimeType};base64,${data}`;
  } catch (error) {
    console.warn('[Gemini] Image generation unavailable:', error.message);
    return null;
  }
}

export async function generateMeme({ doubt, subject, difficulty, style }) {
  const textContent = await generateTextContent({ doubt, subject, difficulty, style });
  const image = await generateMemeImage(textContent.imagePrompt);
  return {
    concept: textContent.concept,
    simpleExplanation: textContent.simpleExplanation,
    keyPoint: textContent.keyPoint,
    memeSetup: textContent.memeSetup,
    memePunchline: textContent.memePunchline,
    memeCaption: textContent.memeCaption,
    hashtags: textContent.hashtags,
    image,
    imageGenerated: Boolean(image),
    imagePrompt: textContent.imagePrompt,
    fallback: !image,
  };
}