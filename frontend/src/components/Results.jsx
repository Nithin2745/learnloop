import { useMemo, useState } from 'react';
import ScheduleTab from './ScheduleTab.jsx';
import PracticeQuestionsTab from './PracticeQuestionsTab.jsx';
import { useProgress } from '../hooks/useProgress.js';
import { downloadIcs } from '../lib/ics.js';

export default function Results({ plan, practiceCache, onGeneratePractice, onReset, onGraded }) {
  const [tab, setTab] = useState('schedule');
  const progress = useProgress(plan);

  // Topics eligible for practice questions. New plans carry a flat `topics`
  // list (questions are fetched per topic on demand); older saved plans only
  // have `practiceQuestions` (baked in). Fall back to the schedule's topic
  // names so any plan shape yields a usable list.
  const practiceTopics = useMemo(() => {
    if (Array.isArray(plan.topics) && plan.topics.length) return plan.topics;
    if (Array.isArray(plan.practiceQuestions) && plan.practiceQuestions.length) {
      return plan.practiceQuestions.map((g) => g.topic).filter(Boolean);
    }
    const seen = new Set();
    for (const day of plan.schedule || []) {
      for (const t of day.topics || []) {
        if (t?.name) seen.add(t.name);
      }
    }
    return [...seen];
  }, [plan]);

  const tabs = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'practice', label: 'Practice Questions' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your study plan</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {plan.totalDays} day{plan.totalDays === 1 ? '' : 's'} ·{' '}
            {practiceTopics.length} topic
            {practiceTopics.length === 1 ? '' : 's'} with practice questions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadIcs(plan)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600"
          >
            <span aria-hidden="true">📅</span> Add to calendar
          </button>
          <button
            onClick={onReset}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            New plan
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Study plan sections"
        className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? (
        <ScheduleTab schedule={plan.schedule} progress={progress} />
      ) : (
        <PracticeQuestionsTab
          topics={practiceTopics}
          cache={practiceCache}
          onGenerate={onGeneratePractice}
          onGraded={onGraded}
        />
      )}
    </div>
  );
}
