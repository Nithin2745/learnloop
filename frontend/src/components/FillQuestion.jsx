import { useState } from 'react';

/** Normalize for lenient local matching: lowercase, collapse spaces, drop punctuation. */
function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"()]/g, '');
}

/**
 * Fill-in-the-blank graded instantly in the browser against the answer plus any
 * accepted synonyms (case/space/punctuation-insensitive). Renders only the
 * input + feedback; the parent renders the prompt. `onAnswered(correct)` feeds
 * spaced repetition the same way the AI grader does for open questions.
 */
export default function FillQuestion({ answer = '', acceptable = [], onAnswered }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null); // null | { ok }
  const answered = result !== null;
  const canCheck = value.trim().length > 0 && !answered;

  function check() {
    if (!canCheck) return;
    const accepted = [answer, ...acceptable].filter(Boolean);
    const ok = accepted.some((a) => norm(a) === norm(value));
    setResult({ ok });
    onAnswered?.(ok);
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') check();
          }}
          disabled={answered}
          placeholder="Fill in the blank…"
          aria-label="Your answer"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
        />
        {!answered && (
          <button
            type="button"
            onClick={check}
            disabled={!canCheck}
            className="inline-flex items-center rounded-lg bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check
          </button>
        )}
      </div>
      {answered && (
        <div
          role="status"
          className={`rounded-xl px-3 py-2 text-sm ring-1 ring-inset ${
            result.ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'
          }`}
        >
          <span className="font-semibold">{result.ok ? 'Correct' : 'Not quite'}</span>
          {!result.ok && (
            <span className="text-slate-600">
              {' '}
              — the answer is <span className="font-medium text-slate-800">{answer}</span>.
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setValue('');
            }}
            className="ml-2 text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
