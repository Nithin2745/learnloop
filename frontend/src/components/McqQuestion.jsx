import { useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Multiple-choice question graded instantly in the browser (no LLM call).
 * Renders only the option buttons + feedback; the parent renders the prompt.
 * `onAnswered(correct: boolean)` fires once when the student picks, feeding
 * spaced repetition (correct → high score, wrong → low) exactly like the AI
 * grader does for open questions.
 */
export default function McqQuestion({ options = [], correctIndex = 0, explanation = '', onAnswered }) {
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;
  const isRight = answered && picked === correctIndex;

  function choose(i) {
    if (answered) return;
    setPicked(i);
    onAnswered?.(i === correctIndex);
  }

  return (
    <div className="mt-3 space-y-2">
      <ul className="space-y-1.5">
        {options.map((opt, i) => {
          const correct = i === correctIndex;
          const chosen = i === picked;
          let cls = 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50';
          let badge = 'bg-slate-100 text-slate-500';
          if (answered) {
            if (correct) {
              cls = 'border-emerald-400 bg-emerald-50 text-emerald-800';
              badge = 'bg-emerald-500 text-white';
            } else if (chosen) {
              cls = 'border-rose-300 bg-rose-50 text-rose-700';
              badge = 'bg-rose-500 text-white';
            } else {
              cls = 'border-slate-200 bg-white text-slate-400';
            }
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                aria-pressed={chosen}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-default ${cls}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
                  {answered && correct ? '✓' : answered && chosen ? '✕' : LETTERS[i] ?? i + 1}
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div
          role="status"
          className={`rounded-xl px-3 py-2 text-sm ring-1 ring-inset ${
            isRight ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'
          }`}
        >
          <span className="font-semibold">{isRight ? 'Correct' : 'Not quite'}</span>
          {explanation ? (
            <span className="text-slate-600"> — {explanation}</span>
          ) : (
            !isRight && (
              <span className="text-slate-600"> — the correct answer is {LETTERS[correctIndex] ?? correctIndex + 1}.</span>
            )
          )}
        </div>
      )}
    </div>
  );
}
