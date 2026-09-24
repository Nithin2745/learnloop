# LearnLoop

**Turn any syllabus into a day-by-day study plan — then actually learn and revise it.**

LearnLoop is an AI-powered study workspace. Give it your topics — type them or
upload a syllabus PDF — and your exam date, and it builds three connected modes
around them:

- 📅 **Plan** — a day-by-day schedule to your exam date: topics are spread out,
  weighted by difficulty, given review and buffer days, and paired with
  auto-generated practice questions.
- 📖 **Learn** — plain-language explanations for each topic at the depth you ask
  for (easy / medium / hard), with analogies, key points, worked steps, and
  simple concept diagrams.
- 🔁 **Revise** — flip-card flashcards plus the important Q&A for every topic.

No sign-up required. PDFs are parsed **in your browser** — only the extracted
text is ever sent to the server, never the file.

## Features

- **Three modes from one setup** — enter your topics + exam date once, then
  switch between Plan, Learn, and Revise without re-entering anything.
- **Syllabus PDF import** — upload a PDF; LearnLoop extracts the text locally and
  the AI structures it into a Subject → Unit → Topic tree you pick from.
- **Per-topic depth** — request a topic at multiple levels with
  `Topic(easy, medium, hard)` syntax; Learn mode renders each level.
- **Difficulty-aware scheduling** — harder topics get more hours; the plan adds
  review passes and buffer days before the exam.
- **Concept visuals** — Learn mode can render flow / hierarchy / comparison
  diagrams for a topic.
- **Calendar export** — download the plan as an `.ics` file.
- **Study-progress tracking** and quick **GeeksforGeeks resource links**.
- **Automatic LLM fallback** — if one free provider is rate-limited or down, the
  request transparently falls through to the next configured provider.

## Tech stack

| Layer    | Tech                                                              |
| -------- | ---------------------------------------------------------------- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Framer Motion, pdfjs-dist      |
| Backend  | Node.js (ESM), Express 4, express-rate-limit, official OpenAI SDK |
| AI       | Pluggable free-tier LLMs — Gemini, Groq, NVIDIA NIM, OpenRouter  |
| Storage  | None (stateless) — everything lives in browser session state    |

The backend uses the official `openai` SDK purely as a generic **OpenAI-wire**
client: every provider above exposes an OpenAI-compatible `/chat/completions`
endpoint, so switching providers is just a base-URL + API-key change.

## Architecture

```
Browser (React + Vite, :5173)
   │  topics / exam date, or a syllabus PDF (parsed client-side)
   ▼  /api/*  (Vite dev proxy → :3001)
Express API (stateless, :3001)
   │  validate → build prompt → request one JSON object
   ▼
Provider chain:  Gemini → Groq → NVIDIA → OpenRouter
   (falls through on rate-limit / error; uses whichever keys are set)
```

- **Stateless backend** — no database, no sessions. Generated plans, lessons,
  and flashcards are held in the browser only.
- **Client-side PDF parsing** — the binary never leaves the browser; only
  extracted text (in ≤60k-char chunks) is POSTed to `/api/extract-topics`.

## Project structure

```
LearnLoop/
├── backend/                    # Express API (stateless)
│   ├── src/
│   │   ├── server.js           # routes, CORS, rate limiting, error mapping
│   │   ├── config.js           # provider registry + fallback order
│   │   ├── llmClient.js        # per-provider OpenAI-wire clients (cached)
│   │   ├── llmJson.js          # JSON completion + retry + provider fallback
│   │   ├── validation.js       # input validation for every endpoint
│   │   ├── *Prompt.js          # prompt builders (plan / learn / revise / extract)
│   │   └── *Service.js         # one service per endpoint
│   └── README.md               # full backend + API reference
└── frontend/                   # React + Vite UI
    ├── src/
    │   ├── App.jsx             # 3-mode workspace (Setup → Plan / Learn / Revise)
    │   ├── api.js              # fetch wrappers for the 4 endpoints
    │   ├── components/         # SetupScreen, ModeNav, Results, LearnMode, …
    │   ├── hooks/              # useProgress (study tracking)
    │   └── lib/                # pdf.js (client parsing), ics.js (calendar), topics.js
    └── README.md               # full frontend structure
```

## Prerequisites

- **Node.js 18+** (uses native `fetch` and `node --watch`)
- **npm**
- At least one free LLM API key. Gemini is the recommended default — the most
  generous free tier, no credit card. Sign-up links are in
  [`backend/.env.example`](backend/.env.example).

## Quick start

Run the backend and frontend in two terminals.

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env      # then edit .env and add at least one provider key
npm run dev               # http://localhost:3001 (auto-reloads)
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the
backend, so no frontend `.env` is needed in development.

## Configuration

All configuration is backend-side via `backend/.env` (copied from
`.env.example`). Keys are read from the environment — never hard-code them.

| Variable             | Default                         | Purpose                                          |
| -------------------- | ------------------------------- | ------------------------------------------------ |
| `GEMINI_API_KEY`     | —                               | Google AI Studio key (recommended primary)       |
| `GROQ_API_KEY`       | —                               | Groq key (fastest; small free tokens/min window) |
| `NVIDIA_API_KEY`     | —                               | NVIDIA NIM key                                   |
| `OPENROUTER_API_KEY` | —                               | OpenRouter key (`:free` models, often throttled) |
| `LLM_PROVIDER_ORDER` | `gemini,groq,nvidia,openrouter` | comma list — the fallback order                  |
| `LLM_MAX_TOKENS`     | `8000`                          | max completion tokens per request                |
| `PORT`               | `3001`                          | backend port                                     |
| `CORS_ORIGIN`        | `http://localhost:5173`         | comma-separated allowed frontend origins         |

Only providers whose key is set are used; the rest are skipped. Per-provider
model overrides (`GEMINI_MODEL`, `GROQ_MODEL`, …) are also supported — see
[`backend/.env.example`](backend/.env.example) for the full list.

**Recommended order:** `gemini → groq → nvidia → openrouter`. Gemini is the most
reliable free tier, Groq is fastest but has a small per-minute budget, NVIDIA is
a solid backup, and OpenRouter's free models are best kept last (frequently
rate-limited upstream).

For production, set `VITE_API_BASE_URL` in the frontend to your deployed backend
origin (see [`frontend/.env.example`](frontend/.env.example)).

## API

Four JSON endpoints (plus health). All generation endpoints are `POST` with a
JSON body and are rate-limited to 100 requests / 15 min per IP. See
[`backend/README.md`](backend/README.md) for full request/response shapes.

| Endpoint                   | Body                                | Returns                                        |
| -------------------------- | ----------------------------------- | ---------------------------------------------- |
| `GET  /api/health`         | —                                   | `{ ok, service }`                              |
| `POST /api/generate-plan`  | `{ topics, examDate, hoursPerDay }` | day-by-day `schedule` + `practiceQuestions`    |
| `POST /api/extract-topics` | `{ text }`                          | `subjects → units → topics` tree               |
| `POST /api/learn`          | `{ topics: string[] }`              | leveled explanations (+ visuals) per topic     |
| `POST /api/revise`         | `{ topics: string[] }`              | `flashcards` + important `questions` per topic |

Errors are always JSON (`{ "error": "…" }`): `400` invalid input, `429` AI rate
limited, `500` server misconfigured (no valid key), `502` AI call failed or
returned unparseable output.

## How it works

1. **Setup** — you enter topics (typed or picked from a PDF) + exam date +
   hours/day. A syllabus PDF is parsed in-browser and structured via
   `/api/extract-topics`.
2. **Plan** is generated on confirm — the AI only *rates* each topic (difficulty
   + weight) and writes its practice questions; the day-by-day calendar is then
   built **server-side** in code, so it stays fast even for a distant exam.
   **Learn** is generated up front the first
   time you open it (one batch for all topics). **Revise** is generated lazily
   per topic as you open it. Results are cached in session state, so switching
   modes is instant and doesn't re-hit the API.
3. Each generation asks the LLM for a **single JSON object**, tolerates code
   fences, retries once with a nudge on bad JSON, and **falls through to the
   next provider** on a rate-limit / server / auth error.

## Security notes

- API keys live only in the server's environment and are never sent to the
  browser or committed (`.env` is git-ignored; `.env.example` documents it).
- The AI endpoints are **unauthenticated** — the only guard is per-IP rate
  limiting. Add authentication before exposing this publicly (see roadmap).
- Uploaded PDFs are parsed client-side; only extracted text reaches the server.

## Roadmap

- ✅ **Phase 1** — Plan / Learn / Revise, syllabus PDF import, multi-provider
  fallback, concept visuals, calendar export. *(shipped)*
- ⏳ **Phase 2** — user accounts and persistence: save plans and progress across
  devices via Supabase (Postgres + row-level security) and Google OAuth.

## License

No license has been chosen yet — add a `LICENSE` file before publishing.
