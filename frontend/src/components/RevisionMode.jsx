import { useEffect, useState } from 'react';
import FlashcardDeck from './FlashcardDeck.jsx';
import Accordion from './Accordion.jsx';
import { gfgSearchUrl } from '../lib/resources.js';

/**
 * Revision mode: pick a topic, revise with a flip-card deck, then test recall
 * with an accordion of important Q&A. Content is generated per topic on select
 * (lazily, via onGenerate) and cached by App.
 * `cache` maps topic -> { state:'loading'|'ready'|'error', data, error }.
 */
export default function RevisionMode({ topics, cache, onGenerate }) {
  const [selected, setSelected] = useState(topics[0] ?? null);

  // Generate the selected topic's content the first time it is shown.
  useEffect(() => {
    if (selected && !cache[selected]) onGenerate(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const entry = selected ? cache[selected] : null;
  const state = entry?.state ?? 'idle';
  const data = entry?.data;

  // Richer Q&A: a full answer, optional key points, and an optional example.
  const qaItems = (data?.questions || []).map((q, i) => ({
    id: i,
    title: q.question,
    render: () => (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-slate-600">{q.answer}</p>
        {q.keyPoints?.length > 0 && (
          <ul className="space-y-1.5">
            {q.keyPoints.map((pt, j) => (
              <li key={j} className="flex gap-2 text-sm text-slate-600">
                <span className="mt-1 text-indigo-400" aria-hidden="true">
                  ◆
                </span>
                <span className="leading-relaxed">{pt}</span>
              </li>
            ))}
          </ul>
        )}
        {q.example && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{q.example}</p>
          </div>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Revise</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Flip through flashcards, then check yourself against the important questions.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {topics.map((t) => {
          const active = selected === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(t)}
              className={`max-w-full truncate rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {state === 'loading' && (
        <div className="flex items-center gap-3 py-10 text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          Building flashcards and questions…
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
          <p className="text-rose-700">{entry?.error || 'Could not load this topic.'}</p>
          <button
            type="button"
            onClick={() => onGenerate(selected)}
            className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'ready' && data && (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Flashcards
              </h3>
              <a
                href={gfgSearchUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                <span aria-hidden="true">📚</span> Review on GeeksforGeeks{' '}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="mx-auto max-w-md">
              <FlashcardDeck key={selected} cards={data.flashcards || []} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Important questions
            </h3>
            {qaItems.length ? (
              <Accordion items={qaItems} mode="multi" />
            ) : (
              <p className="text-sm text-slate-500">No questions for this topic.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
