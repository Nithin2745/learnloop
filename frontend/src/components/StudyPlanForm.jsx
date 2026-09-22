import { useState } from 'react';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StudyPlanForm({ onSubmit, error }) {
  const [topics, setTopics] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const min = todayStr();

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      topics: topics.trim(),
      examDate,
      hoursPerDay: Number(hoursPerDay),
    });
  }

  const canSubmit = topics.trim() && examDate && Number(hoursPerDay) > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Turn your syllabus into a plan
        </h2>
        <p className="mt-2 text-slate-500">
          Paste your topics and exam date. We'll map out what to study each day,
          plus practice questions per topic.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <label
            htmlFor="topics"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Syllabus / topics
          </label>
          <textarea
            id="topics"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            rows={7}
            placeholder={
              'One topic per line or comma-separated, e.g.\n\nCalculus\nLinear Algebra (hard)\nProbability, Statistics'
            }
            className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Tip: add hints like "(hard)" next to a topic to weight it.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="examDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Exam date
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              min={min}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label
              htmlFor="hoursPerDay"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Study hours per day
            </label>
            <input
              id="hoursPerDay"
              type="number"
              min={1}
              max={24}
              step={1}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-600 hover:to-sky-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Build my study plan
        </button>
      </form>
    </div>
  );
}
