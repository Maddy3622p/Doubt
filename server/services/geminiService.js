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
    imagePrompt: { type: 'string' },
  },
  required: ['concept', 'simpleExplanation', 'keyPoint', 'memeSetup', 'memePunchline', 'memeCaption', 'hashtags', 'imagePrompt'],
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

async function generateTextContent({ doubt, subject, difficulty, style }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `You are an expert teacher and meme creator for engineering students. Understand the academic doubt first, then explain it accurately in beginner-friendly language and make a safe, relatable joke. Never use offensive, hateful, sexual, discriminatory, or dangerous humor. 

Also, create a detailed visual prompt for AI image generation that describes a humorous scene representing this doubt. The image should be:
- Funny and relatable
- Student/programmer/academic themed
- Visually clear and understandable
- Without copyrighted characters or logos
- Minimal or no text inside the image
- Suitable for a meme/edutainment website

Return JSON only matching the schema. Keep the simple explanation to 2-4 sentences, the key point to one sentence, and make the meme punchline concise.

Doubt: ${doubt}
Subject: ${subject}
Difficulty: ${difficulty}
Meme style: ${style}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema, temperature: 0.9 },
  });
  
  const result = parseJson(response.text || '');
  for (const field of responseSchema.required) if (!(field in result)) throw new Error('Gemini response was incomplete');
  return { ...result, hashtags: Array.isArray(result.hashtags) ? result.hashtags.slice(0, 5) : [] };
}

async function generateMemeImage(imagePrompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    console.log('[Gemini] Generating meme image with prompt:', imagePrompt.slice(0, 100) + '...');
    
    const response = await ai.interactions.create({
      model: 'gemini-3.1-flash-lite-image',
      input: imagePrompt,
      response_modalities: ['image'],
    });
    
    if (response.outputs && response.outputs.length > 0) {
      const imageOutput = response.outputs.find(output => output.type === 'image');
      if (imageOutput && imageOutput.data) {
        console.log('[Gemini] ✅ Image generated successfully');
        return `data:${imageOutput.mime_type || 'image/png'};base64,${imageOutput.data}`;
      }
    }
    
    console.warn('[Gemini] ⚠️ No image output found in response');
    return null;
  } catch (error) {
    console.error('[Gemini] ❌ Image generation failed:', error.message);
    return null;
  }
}

export async function generateMeme({ doubt, subject, difficulty, style }) {
  console.log('[Gemini] Starting meme generation for doubt:', doubt.slice(0, 50) + '...');
  
  // Step 1: Generate text content and image prompt
  const textContent = await generateTextContent({ doubt, subject, difficulty, style });
  console.log('[Gemini] ✅ Text content generated');
  
  // Step 2: Generate image (with fallback if it fails)
  let image = null;
  let imageGenerated = false;
  
  if (textContent.imagePrompt) {
    image = await generateMemeImage(textContent.imagePrompt);
    imageGenerated = !!image;
  }
  
  // Return complete response
  return {
    concept: textContent.concept,
    simpleExplanation: textContent.simpleExplanation,
    keyPoint: textContent.keyPoint,
    memeSetup: textContent.memeSetup,
    memePunchline: textContent.memePunchline,
    memeCaption: textContent.memeCaption,
    hashtags: textContent.hashtags,
    image: image || null,
    imageGenerated: imageGenerated,
    imagePrompt: textContent.imagePrompt,
    fallback: !imageGenerated,
  };
}
