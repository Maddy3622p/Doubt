import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateMeme } from './services/geminiService.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

// CORS configuration for production
const corsOptions = {
  origin: function(origin, callback) {
    // Allowed origins: local dev and production frontend
    const allowedOrigins = [
      'http://localhost:5173',     // Vite dev server
      'http://localhost:5000',     // Local backend
      'https://doubttomeme.vercel.app',  // Production Vercel frontend (explicit)
      process.env.FRONTEND_URL      // Also allow from env variable if different
    ].filter(Boolean); // Remove undefined/empty values
    
    // Log for debugging
    console.log('[CORS] Request origin:', origin);
    console.log('[CORS] Allowed origins:', allowedOrigins);
    console.log('[CORS] FRONTEND_URL env:', process.env.FRONTEND_URL || 'NOT SET');
    
    // Allow requests with no origin (like mobile apps, curl, etc.) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('[CORS] ✅ ALLOWED:', origin);
      callback(null, true);
    } else {
      console.error('[CORS] ❌ REJECTED:', origin);
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
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
    console.log('[Backend] Image generated:', result.imageGenerated);
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
  console.log(`FRONTEND_URL env: ${process.env.FRONTEND_URL || 'NOT SET'}`);
  console.log(`Allowed CORS origins:`);
  console.log(`  - http://localhost:5173 (dev)`);
  console.log(`  - http://localhost:5000 (local backend)`);
  console.log(`  - https://doubttomeme.vercel.app (PRODUCTION)`);
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'https://doubttomeme.vercel.app') {
    console.log(`  - ${process.env.FRONTEND_URL} (env variable)`);
  }
  console.log(`GEMINI_API_KEY set: ${process.env.GEMINI_API_KEY ? '✅ YES' : '❌ NO'}`);
  console.log(`========================================\n`);
});
