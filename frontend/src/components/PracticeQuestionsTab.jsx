import { useEffect } from 'react';
import Accordion from './Accordion.jsx';
import AnswerGrader from './AnswerGrader.jsx';
import McqQuestion from './McqQuestion.jsx';
import FillQuestion from './FillQuestion.jsx';
import { gfgSearchUrl } from '../lib/resources.js';

function QuestionItem({ index, item, topic, onGraded }) {
  // Tolerate a bare string, a legacy { question, answer } object, or a typed
  // { type, ... } object (mcq | fill | open).
  const question = typeof item === 'string' ? item : item?.question ?? '';
  if (!question) return null;
  const type = typeof item === 'object' && item ? item.type : undefined;

  // mcq/fill grade locally (a boolean); map correct→100 / wrong→0 into the same
  // { topic, score } hook the AI grader feeds, so every question type schedules
  // the topic for spaced review via onGraded.
  const onAnswered = onGraded ? (correct) => onGraded({ topic, score: correct ? 100 : 0 }) : undefined;

  return (
    <li className="rounded-xl bg-slate-50/70 p-3 text-sm">
      <div className="flex gap-2">
        <span className="font-medium text-slate-400">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <p className="text-slate-700">{question}</p>
          {type === 'mcq' ? (
            <McqQuestion
              options={item.options}
              correctIndex={item.correctIndex}
              explanation={item.explanation}
              onAnswered={onAnswered}
            />
          ) : type === 'fill' ? (
            <FillQuestion answer={item.answer} acceptable={item.acceptable} onAnswered={onAnswered} />
          ) : (
            /* Active recall: type an answer and get it AI-graded (the stored
               answer, when present, is the reference the grader marks against). */
            <AnswerGrader
              topic={topic}
              question={question}
              referenceAnswer={typeof item === 'string' ? '' : item?.answer ?? ''}
              onGraded={onGraded ? (r) => onGraded({ topic, score: r.score }) : undefined}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * One topic's panel body. Questions are fetched lazily: this mounts only when
 * its accordion panel is open (Accordion renders render() when open), so the
 * first open triggers onGenerate for that topic. The cache entry (loading /
 * ready / error) drives what is shown; App's ref-guard blocks duplicate fetches.
 */
function PanelBody({ topic, entry, onGenerate, onGraded }) {
  useEffect(() => {
    if (!entry) onGenerate(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const state = entry?.state ?? 'loading';

  return (
    <>
      <a
        href={gfgSearchUrl(topic)}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        <span aria-hidden="true">📚</span>
        Review “{topic}” on GeeksforGeeks
        <span aria-hidden="true">↗</span>
      </a>

      {state === 'loading' && (
        <div className="flex items-center gap-3 py-6 text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          Writing practice questions…
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
          <p className="text-rose-700">{entry?.error || 'Could not load this topic.'}</p>
          <button
            type="button"
            onClick={() => onGenerate(topic)}
            className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'ready' &&
        (entry.data?.questions?.length ? (
          <ol className="space-y-3">
            {entry.data.questions.map((q, qi) => (
              <QuestionItem key={qi} index={qi} item={q} topic={topic} onGraded={onGraded} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No practice questions for this topic.</p>
        ))}
    </>
  );
}

/**
 * Practice Questions tab. `topics` is the flat topic list; each topic's
 * questions are fetched on demand when its panel is first opened. `cache` maps
 * topic -> { state:'loading'|'ready'|'error', data:{ topic, questions }, error }.
 */
export default function PracticeQuestionsTab({ topics, cache, onGenerate, onGraded }) {
  if (!topics?.length) {
    return <p className="text-slate-500">No topics to practice.</p>;
  }

  const items = topics.map((topic, i) => {
    const entry = cache?.[topic];
    const count = entry?.state === 'ready' ? entry.data?.questions?.length ?? 0 : null;
    return {
      id: `${topic}-${i}`,
      title: topic,
      meta: count === null ? '' : `${count} question${count === 1 ? '' : 's'}`,
      render: () => (
        <PanelBody topic={topic} entry={entry} onGenerate={onGenerate} onGraded={onGraded} />
      ),
    };
  });

  return <Accordion items={items} mode="single" defaultOpen={0} />;
}
