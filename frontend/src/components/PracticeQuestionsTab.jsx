import { useState } from 'react';
import Accordion from './Accordion.jsx';
import { gfgSearchUrl } from '../lib/resources.js';

function QuestionItem({ index, item }) {
  const [show, setShow] = useState(false);
  // Tolerate either a bare string or a { question, answer } object.
  const question = typeof item === 'string' ? item : item?.question ?? '';
  const answer = typeof item === 'string' ? '' : item?.answer ?? '';

  return (
    <li className="rounded-xl bg-slate-50/70 p-3 text-sm">
      <div className="flex gap-2">
        <span className="font-medium text-slate-400">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <p className="text-slate-700">{question}</p>
          {answer && (
            <>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-expanded={show}
                className="mt-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
              >
                {show ? 'Hide answer' : 'Show answer'}
              </button>
              {show && (
                <p className="mt-1.5 rounded-lg bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-100">
                  {answer}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PracticeQuestionsTab({ groups }) {
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
              <QuestionItem key={qi} index={qi} item={q} />
            ))}
          </ol>
        </>
      ),
    };
  });

  return <Accordion items={items} mode="single" defaultOpen={0} />;
}
