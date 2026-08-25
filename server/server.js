import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateMeme } from './services/geminiService.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

// Allow both production and development origins
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    console.log('[CORS] Incoming origin:', origin);
    console.log('[CORS] Allowed origins:', allowedOrigins);
    console.log('[CORS] FRONTEND_URL env:', process.env.FRONTEND_URL);
    
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('[CORS] ✅ Origin allowed');
      callback(null, true);
    } else {
      console.error('[CORS] ❌ Origin rejected:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_request, response) => {
  const corsStatus = {
    status: 'ok',
    frontend_url_env: process.env.FRONTEND_URL || 'NOT SET',
    cors_configured: !!process.env.FRONTEND_URL,
    environment: process.env.NODE_ENV || 'production'
  };
  console.log('[Health] Status check:', corsStatus);
  return response.json(corsStatus);
});
app.post('/api/generate-meme', async (request, response) => {
  console.log('[Backend] POST /api/generate-meme received');
  console.log('[Backend] Request origin:', request.get('origin'));
  
  const { doubt, subject, difficulty, style } = request.body || {};
  console.log('[Backend] Request body received:', { doubt: doubt ? doubt.slice(0, 50) + '...' : undefined, subject, difficulty, style });
  
  if (typeof doubt !== 'string' || doubt.trim().length < 8 || doubt.length > 500) {
    console.log('[Backend] ❌ Validation failed: doubt length');
    return response.status(400).json({ error: 'Please provide a doubt between 8 and 500 characters.' });
  }
  if (![subject, difficulty, style].every((value) => typeof value === 'string' && value.trim())) {
    console.log('[Backend] ❌ Validation failed: missing fields');
    return response.status(400).json({ error: 'Please complete the subject, difficulty, and meme style fields.' });
  }
  try {
    console.log('[Backend] ✅ Validation passed, calling Gemini...');
    const result = await generateMeme({ doubt: doubt.trim(), subject, difficulty, style });
    console.log('[Backend] ✅ Gemini response received successfully');
    return response.json(result);
  } catch (error) {
    console.error('[Backend] ❌ Gemini request failed:', error.message);
    const status = error.message.includes('GEMINI_API_KEY') ? 503 : 502;
    return response.status(status).json({ error: status === 503 ? 'Gemini is not configured yet. Add your API key on the server.' : 'Oops. Gemini could not translate that right now. Please try again.' });
  }
});
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.listen(port, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`Doubt to Meme API listening on port ${port}`);
  console.log(`FRONTEND_URL env: ${process.env.FRONTEND_URL}`);
  console.log(`Allowed CORS origins: http://localhost:5173, http://localhost:5000, ${process.env.FRONTEND_URL}`);
  console.log(`GEMINI_API_KEY set: ${process.env.GEMINI_API_KEY ? '✅ YES' : '❌ NO'}`);
  console.log(`========================================\n`);
});
