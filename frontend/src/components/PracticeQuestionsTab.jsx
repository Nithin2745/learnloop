import { useState } from 'react';

export default function PracticeQuestionsTab({ groups }) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!groups?.length) {
    return <p className="text-slate-500">No practice questions were generated.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group, i) => {
        const isOpen = openIndex === i;
        const panelId = `panel-${i}`;
        return (
          <div
            key={`${group.topic}-${i}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{group.topic}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {group.questions.length} question
                  {group.questions.length === 1 ? '' : 's'}
                </span>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>
            {isOpen && (
              <ol
                id={panelId}
                className="list-decimal space-y-2 border-t border-slate-100 px-5 py-4 pl-9 text-sm text-slate-600"
              >
                {group.questions.map((q, qi) => (
                  <li key={qi} className="pl-1">
                    {q}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
