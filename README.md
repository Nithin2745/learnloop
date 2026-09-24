# LearnLoop

**Turn any syllabus into a day-by-day study plan — then actually learn and revise it.**

LearnLoop is an AI-powered study workspace. Give it your topics — type them or
upload a syllabus PDF — and your exam date, and it builds three connected modes
around them:

- 📅 **Plan** — a day-by-day schedule to your exam date: topics are spread out,
  weighted by difficulty, given review and buffer days, and paired with
  auto-generated practice questions.
- 📖 **Learn** — plain-language explanations for each topic at the depth you ask
  for (easy / medium / hard), with analogies, key points, worked steps,
  prerequisites, fully worked examples, common misconceptions, and simple
  concept diagrams.
- 🔁 **Revise** — flip-card flashcards plus the important Q&A for every topic.

Practice and revision questions are **actively graded**: type your answer, get a
0–100 score with what you got right and what to fix, and every graded topic is
scheduled for **spaced repetition** so it resurfaces in a "Due today" queue right
when you're about to forget it.

**Sign in with Google** (Supabase Auth) to start — your plans, study history, and
spaced-repetition schedule sync to the cloud and follow you across devices. PDFs
are parsed **in your browser** — only the extracted text is ever sent to the
server, never the file.

## Features

- **Three modes from one setup** — enter your topics + exam date once, then
  switch between Plan, Learn, and Revise without re-entering anything.
- **Google sign-in** — accounts via Supabase Auth (Google OAuth); every study
  endpoint is protected, so only signed-in users can generate content.
- **Active-recall grading** — type an answer to any practice/revision question
  and get an AI-graded score with targeted "what to fix" feedback.
- **Spaced repetition (SM-2)** — grading a topic schedules it on an SM-2 curve; a
  "Due today" queue surfaces exactly what to review, spaced across days.
- **Study history** — every generated plan is saved and reloadable, synced to
  your account (local-first, so it's instant and works offline).
- **Deeper Learn content** — prerequisites, a fully worked example, and common
  misconceptions (myth → reality) alongside each explanation.
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

| Layer    | Tech                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Framer Motion, pdfjs-dist, supabase-js      |
| Backend  | Node.js (ESM), Express 4, express-rate-limit, official OpenAI SDK, jose (JWT) |
| Auth     | Supabase Auth (Google OAuth); JWTs verified against the public JWKS           |
| AI       | Pluggable free-tier LLMs — Gemini, Groq, NVIDIA NIM, OpenRouter               |
| Storage  | Supabase (Postgres + row-level security); local-first browser cache in front  |

The backend uses the official `openai` SDK purely as a generic **OpenAI-wire**
client: every provider above exposes an OpenAI-compatible `/chat/completions`
endpoint, so switching providers is just a base-URL + API-key change.

## Architecture

```
Browser (React + Vite, :5173)
   │  ├─ Supabase Auth (Google OAuth) ──────────────► Supabase
   │  │     JWT (access token)                         (Postgres + RLS:
   │  │                                                  study_sessions,
   │  ├─ history / review state (local-first) ◄──────►  review_state)
   │  │
   │  └─ topics / exam date, or a syllabus PDF (parsed client-side)
   ▼        /api/*  with  Authorization: Bearer <jwt>   (Vite dev proxy → :3001)
Express API (:3001)
   │  requireAuth (verify JWT via JWKS) → per-user rate limit
   │  → validate → build prompt → request one JSON object
   ▼
Provider chain:  Gemini → Groq → NVIDIA → OpenRouter
   (falls through on rate-limit / error; uses whichever keys are set)
```

- **Auth-gated API** — every `/api/*` generation route requires a valid Supabase
  JWT; the token is verified against the project's public JWKS, so the backend
  holds **no** auth secret. `GET /api/health` stays public.
- **Local-first persistence** — the browser talks to Supabase directly (anon key
  + the user's JWT, RLS-protected) and mirrors rows in a `localStorage` cache for
  instant paint and offline resilience. The Express API itself stays stateless.
- **Client-side PDF parsing** — the binary never leaves the browser; only
  extracted text (in ≤60k-char chunks) is POSTed to `/api/extract-topics`.

## Project structure

```
LearnLoop/
├── backend/                    # Express API
│   ├── src/
│   │   ├── server.js           # routes, auth gate, CORS, rate limiting, errors
│   │   ├── auth.js             # requireAuth — verify Supabase JWT via JWKS
│   │   ├── config.js           # provider registry + fallback order + authConfig
│   │   ├── llmClient.js        # per-provider OpenAI-wire clients (cached)
│   │   ├── llmJson.js          # JSON completion + retry + provider fallback
│   │   ├── scheduleBuilder.js  # expands topic ratings into the dated calendar
│   │   ├── validation.js       # input validation for every endpoint
│   │   ├── *Prompt.js          # prompt builders (plan/learn/revise/extract/expand/grade)
│   │   └── *Service.js         # one service per endpoint
│   └── README.md               # full backend + API reference
├── frontend/                   # React + Vite UI
│   ├── src/
│   │   ├── App.jsx             # workspace: Setup → Plan / Learn / Revise + History
│   │   ├── api.js              # fetch wrappers (auth header injected here)
│   │   ├── auth/              # AuthProvider (Supabase session context)
│   │   ├── components/         # SetupScreen, Results, LearnMode, AnswerGrader,
│   │   │                       #   Login, HistoryView, DueToday, …
│   │   ├── hooks/              # useProgress, useHistory, useReviews
│   │   └── lib/                # supabase.js, store.js (history), reviewStore.js,
│   │                           #   sm2.js, pdf.js, ics.js, topics.js
│   └── README.md               # full frontend structure
└── supabase/
    └── migrations/             # 0001_study_sessions.sql, 0002_review_state.sql
```

## Prerequisites

- **Node.js 18+** (uses native `fetch` and `node --watch`)
- **npm**
- At least one free LLM API key. Gemini is the recommended default — the most
  generous free tier, no credit card. Sign-up links are in
  [`backend/.env.example`](backend/.env.example).
- A **Supabase project** (free tier) with the **Google** auth provider enabled.
  You'll need its Project URL and `anon` public key, and you'll run two SQL
  migrations — see [Supabase setup](#supabase-setup) below.

## Quick start

### Supabase setup

LearnLoop requires sign-in, so set up Supabase first:

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **Authentication → Providers → Google**: enable it, paste your Google OAuth
   client ID + secret (created in the Google Cloud console), and add the redirect
   URL `http://localhost:5173` for local dev. The Google client secret stays in
   Supabase — it never touches this repo.
3. **SQL Editor**: run both migrations from `supabase/migrations/`, in order —
   `0001_study_sessions.sql` (history) then `0002_review_state.sql` (spaced
   repetition). Each creates one table with row-level-security policies.
4. From **Project Settings → API**, copy your **Project URL** and **anon public
   key** — you'll wire them into the env files below.

The `anon` key is safe to expose in the browser (it's protected by RLS). Never
put the service-role key or JWT secret in the frontend or in git.

### Run it

Run the backend and frontend in two terminals.

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env      # add ≥1 provider key + SUPABASE_URL
npm run dev               # http://localhost:3001 (auto-reloads)
```

**2. Frontend**

```bash
cd frontend
npm install
cp .env.example .env      # add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173** and sign in with Google. The Vite dev server
proxies `/api/*` to the backend.

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
| `LLM_MAX_TOKENS`     | `12000`                         | max completion tokens per request                |
| `SUPABASE_URL`       | —                               | **required** — your Supabase project URL (auth)  |
| `SUPABASE_JWT_SECRET`| —                               | optional; only for legacy HS256 projects         |
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
origin (see [`frontend/.env.example`](frontend/.env.example)). The frontend also
needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (both public, browser-safe)
in `frontend/.env` — these are required even in development.

## API

Six JSON endpoints (plus health). Every generation endpoint is `POST`, takes a
JSON body, and **requires an `Authorization: Bearer <supabase-jwt>` header**;
anonymous requests get `401`. They're rate-limited to 100 requests / 15 min
**per user**. `GET /api/health` is public. See
[`backend/README.md`](backend/README.md) for full request/response shapes.

| Endpoint                   | Body                                                   | Returns                                                |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `GET  /api/health`         | —                                                      | `{ ok, service }` (public)                             |
| `POST /api/generate-plan`  | `{ topics, examDate, hoursPerDay }`                    | day-by-day `schedule` + `practiceQuestions`            |
| `POST /api/extract-topics` | `{ text }`                                             | `subjects → units → topics` tree                       |
| `POST /api/expand-topics`  | `{ topics, level? }`                                   | disambiguated `subjects → units → topics` tree         |
| `POST /api/learn`          | `{ topics: string[] }`                                 | leveled explanations (+ visuals) per topic             |
| `POST /api/revise`         | `{ topics: string[] }`                                 | `flashcards` + important `questions` per topic         |
| `POST /api/grade`          | `{ topic, question, referenceAnswer?, studentAnswer }` | `{ score, verdict, gotRight[], toFix[], modelAnswer }` |

Errors are always JSON (`{ "error": "…" }`): `400` invalid input, `401` missing/
invalid token, `429` AI (or user) rate limited, `500` server misconfigured (no
valid key), `502` AI call failed or returned unparseable output.

## How it works

1. **Sign in** with Google (Supabase Auth). The session's JWT is attached to
   every API call, gating the paid endpoints per user.
2. **Setup** — you enter topics (typed or picked from a PDF) + exam date +
   hours/day. A syllabus PDF is parsed in-browser and structured via
   `/api/extract-topics`; each saved plan is written to your study **history**.
3. **Plan** is generated on confirm — the AI only *rates* each topic (difficulty
   + weight) and writes its practice questions; the day-by-day calendar is then
   built **server-side** in code, so it stays fast even for a distant exam.
   **Learn** is generated up front the first time you open it (one batch for all
   topics). **Revise** is generated lazily per topic as you open it. Results are
   cached in session state, so switching modes is instant and doesn't re-hit the
   API.
4. **Answer & grade** — typing an answer to a practice/revision question hits
   `/api/grade` for a 0–100 score, then feeds an **SM-2** scheduler: the topic's
   next due date is stored in `review_state` and resurfaces in the "Due today"
   queue (all dates in your local timezone).
5. Each generation asks the LLM for a **single JSON object**, tolerates code
   fences, retries once with a nudge on bad JSON, and **falls through to the
   next provider** on a rate-limit / server / auth error.

## Security notes

- LLM API keys live only in the server's environment and are never sent to the
  browser or committed (`.env` is git-ignored; `.env.example` documents it).
- **All AI endpoints require a valid Supabase JWT** — the backend verifies it
  against the project's public JWKS (no server-side auth secret), then
  rate-limits per user. Anonymous traffic is rejected before it can spend LLM
  quota.
- **Row-level security** (`auth.uid() = user_id`) on every table means users read
  and write only their own rows; the browser talks to Supabase directly with the
  public `anon` key + the user's JWT.
- The Supabase `anon` key is public by design. The **service-role key, JWT
  secret, and Google client secret must never** enter the repo or the frontend —
  they belong in Supabase or a git-ignored `backend/.env`.
- Uploaded PDFs are parsed client-side; only extracted text reaches the server.

## Roadmap

- ✅ **Phase 1** — Plan / Learn / Revise, syllabus PDF import, multi-provider
  fallback, concept visuals, calendar export. *(shipped)*
- ✅ **Phase 2** — Google sign-in + per-user auth, cloud persistence (Supabase
  Postgres + RLS), study history, interactive AI grading, SM-2 spaced repetition,
  and deeper Learn content (prerequisites / worked examples / misconceptions).
  *(shipped)*
- ⏳ **Next** — analytics on recall over time, shareable plans, and richer
  "weak-spot" review queues.

## License

No license has been chosen yet — add a `LICENSE` file before publishing.
