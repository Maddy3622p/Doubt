import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateMeme } from './services/geminiService.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.post('/api/generate-meme', async (request, response) => {
  const { doubt, subject, difficulty, style } = request.body || {};
  if (typeof doubt !== 'string' || doubt.trim().length < 8 || doubt.length > 500) {
    return response.status(400).json({ error: 'Please provide a doubt between 8 and 500 characters.' });
  }
  if (![subject, difficulty, style].every((value) => typeof value === 'string' && value.trim())) {
    return response.status(400).json({ error: 'Please complete the subject, difficulty, and meme style fields.' });
  }
  try {
    const result = await generateMeme({ doubt: doubt.trim(), subject, difficulty, style });
    return response.json(result);
  } catch (error) {
    console.error('Gemini request failed:', error.message);
    const status = error.message.includes('GEMINI_API_KEY') ? 503 : 502;
    return response.status(status).json({ error: status === 503 ? 'Gemini is not configured yet. Add your API key on the server.' : 'Oops. Gemini could not translate that right now. Please try again.' });
  }
});
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.listen(port, '0.0.0.0', () => console.log(`Doubt to Meme API listening on port ${port}`));
