# Doubt to Meme Translator

Turn academic doubts into simple explanations and relatable memes powered by Google Gemini AI. Built for the Hackwell 2.0 demo.

## Features

- Gemini-powered concept identification, beginner-friendly explanation, key takeaway, meme copy, and generated meme artwork
- Meme-style result card with PNG download, copy, and Web Share support
- Subject, difficulty, and meme energy controls
- Rotating processing state, validation, friendly API errors, and toast feedback
- Demo questions, responsive layout, accessible form controls, and localStorage history
- Gemini API key stays on the Express server

## Tech stack

- Frontend: React, Vite, JavaScript, CSS3, Lucide React, html-to-image
- Backend: Node.js, Express, CORS
- AI: official `@google/genai` SDK with `gemini-2.5-flash-lite` and `gemini-2.5-flash-image`

## Installation

Requires Node.js 18 or newer.

```bash
npm install
npm --prefix client install
npm --prefix server install
```

Copy `.env.example` to `server/.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Never put it in `client/` or commit `.env`.

## Running locally

From the project root:

```bash
npm run dev
```

This starts the Vite client at `http://localhost:5173` and the API at `http://localhost:5000`. The Vite proxy forwards `/api` requests to Express. To create a production client build, run `npm run build`; to run only the API, use `npm start`.

## Project structure

```text
client/src/App.jsx                 Main interactive experience
client/src/index.css               Visual system and responsive layout
server/server.js                   Express API and validation
server/services/geminiService.js   Isolated Gemini integration
```

## API endpoint

`POST /api/generate-meme`

```json
{
  "doubt": "Why does binary search require a sorted array?",
  "subject": "Computer Science",
  "difficulty": "Beginner",
  "style": "Student Life"
}
```

The response contains `success`, `explanation`, and a structured `meme` object with `title`, `scene`, `characters`, `caption`, and `educationalTakeaway`. The frontend renders that structured data locally with React, SVG, and CSS.

## Testing

- Run `npm run build` to verify the client bundle.
- Run `npm run dev`, open the client URL, choose a demo doubt, and submit it.
- Confirm `http://localhost:5000/api/health` returns `{ "status": "ok" }`.
- Without an API key, submission should show a friendly configuration error and never expose a stack trace.

## Deployment

Deploy the client and server as separate Node services, or serve the built `client/dist` from a static host and keep the Express API on a secure server. Configure `GEMINI_API_KEY` and `PORT` as deployment environment variables, then update the frontend proxy/API base URL for the chosen hosting arrangement. Do not commit `.env`.

## Future improvements

User accounts, cloud history, more meme templates, voice input, multi-language support, shareable meme links, and analytics.

## Common fixes

- **Gemini configuration error:** check that `server/.env` exists and contains a valid key, then restart the server.
- **Network error:** make sure both `npm run dev` processes are running and ports 5000/5173 are free.
- **Quota/model error:** check Google AI Studio quota and select a currently available model in `server/services/geminiService.js`.
- **Download blocked:** use a Chromium-based browser or the copy buttons; PNG generation runs entirely in the browser.
