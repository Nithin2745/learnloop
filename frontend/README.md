# LearnLoop — Frontend

React + Vite + Tailwind UI for LearnLoop — a study workspace with three modes: **Plan** (day-by-day schedule), **Learn** (concepts by level, with analogies), and **Revise** (flashcards + Q&A). Topics can be typed or pulled from a syllabus PDF. Users **sign in with Google** (Supabase Auth); plans are saved to a synced **history**, and graded answers feed an SM-2 **spaced-repetition** queue.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **required** (the app needs
them to sign in) — both are public, browser-safe values. The dev server proxies
`/api/*` to the backend at `http://localhost:3001` (see `vite.config.js`), so run
the backend first. To point at a different backend, set `VITE_API_BASE_URL` (see
`.env.example`).

## Structure

### Auth & persistence

- `src/lib/supabase.js` — Supabase client (from `VITE_SUPABASE_URL` + anon key)
- `src/auth/AuthProvider.jsx` — session context (`useAuth`: session, user, `signInWithGoogle`, `signOut`)
- `src/components/Login.jsx` — Google sign-in screen (shown until authenticated)
- `src/api.js` — fetch wrappers (`generatePlan`, `extractTopics`, `expandTopics`, `generateLearning`, `generateRevision`, `gradeAnswer`); injects the session's `Authorization: Bearer <jwt>`
- `src/lib/store.js` + `src/hooks/useHistory.js` + `src/components/HistoryView.jsx` — study history: local-first cache over Supabase, list + reload past plans
- `src/lib/sm2.js` + `src/lib/reviewStore.js` + `src/hooks/useReviews.js` + `src/components/DueToday.jsx` — SM-2 spaced repetition: schedule graded topics, surface a "Due today" queue
- `src/components/AnswerGrader.jsx` — type an answer → `/api/grade` → scored feedback (used in Plan practice + Revise)

### Workspace & modes

- `src/App.jsx` — workspace: auth gate + Setup → Plan / Learn / Revise, History view, "Due today" queue; each mode's content cached in session state
- `src/components/SetupScreen.jsx` — shared setup: topics (typed or picked from a PDF) + exam date + hours/day
- `src/components/TopicPicker.jsx` + `SubjectTree.jsx` — upload a syllabus PDF (parsed in-browser) and pick topics from a Subject → Unit tree
- `src/lib/pdf.js` — client-side PDF text extraction + page chunking (pdfjs-dist)
- `src/components/ModeNav.jsx` — Plan / Learn / Revise switch
- `src/components/Results.jsx` + `ScheduleTab.jsx` + `DayCard.jsx` — Plan mode: day-by-day timeline
- `src/components/PracticeQuestionsTab.jsx` — Plan mode: practice Q&A grouped by topic
- `src/components/LearnMode.jsx` + `ConceptCard.jsx` + `ConceptVisual.jsx` — Learn mode: topics grouped by level, with analogy + key points + steps + prerequisites + worked example + misconceptions + a small concept diagram (flow / hierarchy / compare)
- `src/components/RevisionMode.jsx` + `FlashcardDeck.jsx` + `Flashcard.jsx` — Revise mode: flip-card deck + important Q&A
- `src/components/Accordion.jsx` — shared show/hide list (Practice + Revision Q&A)
- `src/components/DifficultyTag.jsx` — easy/medium/hard pill
- `src/components/LoadingState.jsx` — loading / spinner view
- `src/hooks/useProgress.js` — study progress tracking
- `src/lib/ics.js` — calendar (`.ics`) export
- `src/lib/resources.js` — GeeksforGeeks search links
