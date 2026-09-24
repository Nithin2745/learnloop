# LearnLoop — Frontend

React + Vite + Tailwind UI for LearnLoop — a study workspace with three modes: **Plan** (day-by-day schedule), **Learn** (concepts by level, with analogies), and **Revise** (flashcards + Q&A). Topics can be typed or pulled from a syllabus PDF.

## Setup

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The dev server proxies `/api/*` to the backend at `http://localhost:3001`
(see `vite.config.js`), so run the backend first. To point at a different
backend, set `VITE_API_BASE_URL` (see `.env.example`).

## Structure

- `src/App.jsx` — 3-mode workspace: shared Setup → Plan / Learn / Revise, with each mode's generated content cached in session state
- `src/api.js` — fetch wrappers: `generatePlan()`, `extractTopics()`, `generateLearning()`, `generateRevision()`
- `src/components/SetupScreen.jsx` — shared setup: topics (typed or picked from a PDF) + exam date + hours/day
- `src/components/TopicPicker.jsx` + `SubjectTree.jsx` — upload a syllabus PDF (parsed in-browser) and pick topics from a Subject → Unit tree
- `src/lib/pdf.js` — client-side PDF text extraction + page chunking (pdfjs-dist)
- `src/components/ModeNav.jsx` — Plan / Learn / Revise switch
- `src/components/Results.jsx` + `ScheduleTab.jsx` + `DayCard.jsx` — Plan mode: day-by-day timeline
- `src/components/PracticeQuestionsTab.jsx` — Plan mode: practice Q&A grouped by topic
- `src/components/LearnMode.jsx` + `ConceptCard.jsx` + `ConceptVisual.jsx` — Learn mode: topics grouped by level, with analogy + key points + steps + a small concept diagram (flow / hierarchy / compare)
- `src/components/RevisionMode.jsx` + `FlashcardDeck.jsx` + `Flashcard.jsx` — Revise mode: flip-card deck + important Q&A
- `src/components/Accordion.jsx` — shared show/hide list (Practice + Revision Q&A)
- `src/components/DifficultyTag.jsx` — easy/medium/hard pill
- `src/components/LoadingState.jsx` — loading / spinner view
- `src/hooks/useProgress.js` — study progress tracking
- `src/lib/ics.js` — calendar (`.ics`) export
- `src/lib/resources.js` — GeeksforGeeks search links
