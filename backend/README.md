# LearnLoop — Backend

Stateless Express API behind LearnLoop's study modes. It turns topics into a
day-by-day **Plan** (schedule + practice questions), leveled **Learn**
explanations, and **Revise** flashcards; structures raw syllabus text into a
Subject → Unit → Topic tree; and **grades** a student's typed answer against a
question. Every generation route is gated behind a valid Supabase JWT — the
backend itself keeps no database or session state.

For a plan the LLM's job is deliberately small: it only *rates* each topic
(difficulty + a 1–5 weight) and writes practice questions. The day-by-day
calendar — dates, spaced-repetition sessions, buffer days — is expanded **in
code** (`src/scheduleBuilder.js`), so model output stays small and constant-size
no matter how far off the exam is, and generation never truncates on a distant
exam date.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # add ≥1 provider key + SUPABASE_URL (see Authentication)
npm run dev            # starts on http://localhost:3001 (auto-reload)
```

You need **at least one** LLM API key. **Gemini is the recommended default**
(most generous free tier, no credit card). Sign-up links for every provider are
in `.env.example`.

## Environment

The chain is driven by `LLM_PROVIDER_ORDER`; only providers whose key is set are
used — the rest are skipped silently.

| Variable             | Default                         | Notes                                                        |
| -------------------- | ------------------------------- | ------------------------------------------------------------ |
| `LLM_PROVIDER_ORDER` | `gemini,groq,nvidia,openrouter` | comma list — the fallback order (takes priority)             |
| `LLM_PROVIDER`       | —                               | legacy single selector; pinned first, then the default order |
| `GEMINI_API_KEY`     | —                               | Google AI Studio key (recommended primary)                   |
| `GROQ_API_KEY`       | —                               | Groq key (fastest; small free tokens/min window)             |
| `NVIDIA_API_KEY`     | —                               | NVIDIA NIM key                                               |
| `OPENROUTER_API_KEY` | —                               | OpenRouter key (`:free` models, often throttled)             |
| `<PROVIDER>_MODEL`   | per-provider default            | model override, e.g. `GEMINI_MODEL`, `GROQ_MODEL`            |
| `LLM_MODEL`          | primary's default               | override the **primary** provider's model                    |
| `LLM_BASE_URL`       | primary's default               | override the **primary** provider's base URL                 |
| `LLM_MAX_TOKENS`     | `12000`                         | max completion tokens per request                            |
| `SUPABASE_URL`       | —                               | **required** — Supabase project URL (JWT verification)       |
| `SUPABASE_JWT_SECRET`| —                               | optional; only for legacy HS256 Supabase projects            |
| `PORT`               | `3001`                          | backend port                                                 |
| `CORS_ORIGIN`        | `http://localhost:5173`         | comma-separated allowed origins (the frontend)               |

Default models are per-provider (see `src/config.js` / `.env.example`): Gemini
`gemini-2.5-flash`, Groq `qwen/qwen3.8-27b`, NVIDIA
`nvidia/nemotron-3.5-lightning-30b-a3b`, OpenRouter `qwen/qwen3.8-27b:free`.

### Automatic provider fallback

There's no manual failover step. Each request walks `LLM_PROVIDER_ORDER` and, on
a rate-limit / auth / server error from one provider, transparently falls
through to the next one that has a key (`src/llmJson.js`, ~2 attempts each).
Every provider is reached over the same OpenAI-compatible client
(`src/llmClient.js`), each request bounded by a 60s timeout so a hung provider
fails fast instead of holding the request open.

## Authentication

Every `/api/*` route except `GET /api/health` requires an
`Authorization: Bearer <supabase-jwt>` header. `src/auth.js` (`requireAuth`)
verifies the token against the Supabase project's public JWKS
(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`) using `jose` — an **ES256
asymmetric** flow, so the backend needs **no** signing secret. On success it sets
`req.user = { id, email }`; a missing or invalid token gets `401`. The per-user
rate limiter is then keyed by `req.user.id`.

Set `SUPABASE_URL` in `.env` (see the table above). Legacy HS256 projects can
instead set `SUPABASE_JWT_SECRET`.

## Endpoints

All generation endpoints are `POST`, require an `Authorization: Bearer <jwt>`
header, take a JSON body (max 1 MB), return JSON, and are rate-limited to
**100 requests / 15 min per user**. `GET /api/health` is public.

### `GET /api/health`

```bash
curl http://localhost:3001/api/health
```

```json
{ "ok": true, "service": "learnloop-backend" }
```

### `POST /api/generate-plan`

Request body:

```json
{
  "topics": "Calculus\nLinear Algebra (hard)\nProbability, Statistics",
  "examDate": "2026-10-15",
  "hoursPerDay": 3
}
```

- `topics` — non-empty string (one topic per line works best).
- `examDate` — `YYYY-MM-DD`, a real date at least one day in the future.
- `hoursPerDay` — number 1–24 (default `3`).

```bash
curl -s -X POST http://localhost:3001/api/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"topics":"Calculus\nLinear Algebra (hard)\nProbability, Statistics","examDate":"2026-10-15","hoursPerDay":3}' | jq
```

Successful response (shape) — the schedule spans today through the exam date,
one entry per day, the last day(s) reserved as light-review **buffer days**:

```json
{
  "totalDays": 22,
  "schedule": [
    {
      "date": "2026-09-24",
      "dayLabel": "Day 1",
      "isBufferDay": false,
      "topics": [
        {
          "name": "Linear Algebra",
          "difficulty": "hard",
          "estimatedHours": 1.5,
          "isReview": false
        }
      ]
    }
  ],
  "practiceQuestions": [
    {
      "topic": "Calculus",
      "questions": [
        { "question": "What is a derivative?", "answer": "The instantaneous rate of change…" }
      ]
    }
  ]
}
```

The model returns only a compact per-topic rating; `src/scheduleBuilder.js`
expands it into the dated calendar above. A far-off exam naturally yields many
light "review / rest" days — that's expected, not a bug.

### `POST /api/extract-topics`

Structures raw syllabus text (extracted from a PDF **client-side** — the binary
never reaches the server) into a clean Subject → Unit → Topic outline.

Request body:

```json
{ "text": "UNIT I  Introduction to Operating Systems …" }
```

- `text` — non-empty, up to 60,000 characters.

Response (shape):

```json
{
  "subjects": [
    {
      "name": "Operating Systems",
      "code": "231CS7T01",
      "units": [
        { "name": "Unit I: Introduction", "topics": ["Processes", "Threads"] }
      ]
    }
  ]
}
```

### `POST /api/expand-topics`

Disambiguates and decomposes a list of typed topics into a Subject → Unit → Topic
tree (e.g. `DSA` → a Data Structures & Algorithms subject with its units and
topics). Powers the "Break into subtopics" button in setup.

Request body:

```json
{ "topics": ["DSA", "OS"], "level": "exam" }
```

- `topics` — array of 1–25 non-empty strings, each ≤200 characters.
- `level` — optional depth hint; defaults server-side when omitted.

Returns the same `{ "subjects": [ … ] }` shape as `/api/extract-topics`.

### `POST /api/learn`

Leveled explanations per topic. A topic may request several depths with
`Topic(easy, medium, hard)` syntax; each requested level yields one explanation
entry, including a structured `visual` the UI draws deterministically (never
markup).

Request body:

```json
{ "topics": ["Deadlock(easy, hard)", "Paging"] }
```

- `topics` — array of 1–25 non-empty strings, each ≤200 characters.

Response (shape):

```json
{
  "items": [
    {
      "topic": "Deadlock",
      "importance": "core",
      "explanations": [
        {
          "level": "easy",
          "summary": "…",
          "detail": "…",
          "analogy": "…",
          "keyPoints": ["…"],
          "steps": [ { "title": "…", "detail": "…" } ],
          "visual": {
            "kind": "flow",
            "caption": "…",
            "nodes": [ { "id": "n1", "label": "Request", "note": "…" } ],
            "edges": [ { "from": "n1", "to": "n2", "label": "…" } ]
          }
        }
      ]
    }
  ]
}
```

### `POST /api/revise`

Flashcards plus important Q&A per topic.

Request body:

```json
{ "topics": ["Deadlock", "Paging"] }
```

- `topics` — array of 1–25 non-empty strings, each ≤200 characters.

Response (shape):

```json
{
  "items": [
    {
      "topic": "Deadlock",
      "flashcards": [ { "front": "…", "back": "…" } ],
      "questions": [
        {
          "question": "…",
          "answer": "…",
          "keyPoints": ["…"],
          "example": "…"
        }
      ]
    }
  ]
}
```

### `POST /api/grade`

Grades a student's typed answer to a question (active recall) — the score feeds
the frontend's SM-2 scheduler. The prompt hardens against injection in
`studentAnswer`, which is untrusted input.

Request body:

```json
{
  "topic": "Deadlock",
  "question": "What are the four Coffman conditions?",
  "referenceAnswer": "Mutual exclusion, hold and wait, no preemption, circular wait.",
  "studentAnswer": "mutual exclusion and circular wait"
}
```

- `topic`, `question`, `studentAnswer` — non-empty strings.
- `referenceAnswer` — optional; the model grades without it if omitted.

Response (shape):

```json
{
  "score": 50,
  "verdict": "partial",
  "gotRight": ["Named mutual exclusion and circular wait"],
  "toFix": ["Missing hold-and-wait and no-preemption"],
  "modelAnswer": "The four Coffman conditions are…"
}
```

- `score` — `0`–`100`. `verdict` — `correct` | `partial` | `incorrect`.

### Error responses

| Status | When                                                     |
| ------ | -------------------------------------------------------- |
| `400`  | invalid input (empty topics, bad/past exam date)         |
| `401`  | missing or invalid Supabase JWT                          |
| `429`  | rate limited (per-user cap, or every provider throttled) |
| `500`  | server misconfigured (no valid API key)                  |
| `502`  | LLM call failed or returned unparseable output           |

All errors are JSON: `{ "error": "message", "details"?: [ ... ] }`.
