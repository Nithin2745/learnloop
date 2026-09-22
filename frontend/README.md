# LearnLoop — Frontend

React + Vite + Tailwind UI for the LearnLoop study plan generator.

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

- `src/App.jsx` — top-level view switch: form → loading → results
- `src/api.js` — `generatePlan()` fetch wrapper
- `src/components/StudyPlanForm.jsx` — the input form
- `src/components/Results.jsx` — tabbed results (Schedule / Practice Questions)
- `src/components/ScheduleTab.jsx` + `DayCard.jsx` — day-by-day timeline cards
- `src/components/PracticeQuestionsTab.jsx` — accordion grouped by topic
- `src/components/DifficultyTag.jsx` — easy/medium/hard pill
