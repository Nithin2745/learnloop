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

export default function PracticeQuestionsTab({ groups, onGraded }) {
  if (!groups?.length) {
    return <p className="text-slate-500">No practice questions were generated.</p>;
  }

  const items = groups.map((group, i) => {
    const count = group.questions?.length ?? 0;
    return {
      id: `${group.topic}-${i}`,
      title: group.topic,
      meta: `${count} question${count === 1 ? '' : 's'}`,
      render: () => (
        <>
          <a
            href={gfgSearchUrl(group.topic)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <span aria-hidden="true">📚</span>
            Review “{group.topic}” on GeeksforGeeks
            <span aria-hidden="true">↗</span>
          </a>
          <ol className="space-y-3">
            {(group.questions || []).map((q, qi) => (
              <QuestionItem
                key={qi}
                index={qi}
                item={q}
                topic={group.topic}
                onGraded={onGraded}
              />
            ))}
          </ol>
        </>
      ),
    };
  });

  return <Accordion items={items} mode="single" defaultOpen={0} />;
}
