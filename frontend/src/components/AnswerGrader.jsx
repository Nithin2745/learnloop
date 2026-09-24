import { useState } from 'react';
import { gradeAnswer } from '../api.js';

const VERDICT = {
  correct: { label: 'Correct', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-600/20', bar: 'bg-emerald-500' },
  partial: { label: 'Partially correct', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-600/20', bar: 'bg-amber-500' },
  incorrect: { label: 'Needs work', text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-600/20', bar: 'bg-rose-500' },
};

/**
 * Type-your-answer → submit → AI-graded feedback for a single question.
 * Reused by Plan practice questions and Revise Q&A. `referenceAnswer` is
 * optional (the backend grades against the standard answer when it is empty).
 * `onGraded(result)` is an optional hook for spaced-repetition scheduling.
 */
export default function AnswerGrader({ topic, question, referenceAnswer = '', onGraded }) {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('idle'); // idle | grading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canSubmit = answer.trim().length > 0 && status !== 'grading';

  async function submit() {
    if (!canSubmit) return;
    setStatus('grading');
    setError('');
    try {
      const r = await gradeAnswer({
        topic,
        question,
        referenceAnswer,
        studentAnswer: answer.trim(),
      });
      setResult(r);
      setStatus('done');
      onGraded?.(r);
    } catch (err) {
      setError(err.message || 'Could not grade your answer. Please try again.');
      setStatus('error');
    }
  }

  function tryAgain() {
    setResult(null);
    setStatus('idle');
    setError('');
  }

  const v = result ? VERDICT[result.verdict] ?? VERDICT.partial : null;

  return (
    <div className="mt-3 space-y-3">
      {status !== 'done' && (
        <div className="space-y-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
            }}
            rows={3}
            placeholder="Type your answer, then check it…"
            aria-label={`Your answer to: ${question}`}
            disabled={status === 'grading'}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'grading' ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Grading…
                </>
              ) : (
                'Check my answer'
              )}
            </button>
            <span className="text-xs text-slate-400">⌘/Ctrl + Enter</span>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
      {status === 'done' && result && v && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 ring-1 ring-inset ${v.bg} ${v.ring}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`text-lg font-bold ${v.text}`}>
                {result.score}
                <span className="text-xs font-medium text-slate-400">/100</span>
              </span>
              <span className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold ${v.text}`}>
                {v.label}
              </span>
            </div>
            <button
              type="button"
              onClick={tryAgain}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
            >
              Try again
            </button>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
            <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${result.score}%` }} />
          </div>
          {result.gotRight.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.gotRight.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>
                  <span className="leading-relaxed">{g}</span>
                </li>
              ))}
            </ul>
          )}
          {result.toFix.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.toFix.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-amber-600" aria-hidden="true">→</span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          )}
          {result.modelAnswer && (
            <div className="mt-3 rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Model answer
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{result.modelAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
