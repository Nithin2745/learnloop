import DifficultyTag from './DifficultyTag.jsx';

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function DayCard({ day, dayIndex, progress }) {
  const totalHours = day.topics.reduce(
    (sum, t) => sum + (Number(t.estimatedHours) || 0),
    0,
  );

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 shadow-sm transition ${
        day.isBufferDay
          ? 'border-indigo-100 bg-indigo-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{day.dayLabel}</p>
          <p className="text-xs text-slate-500">{formatDate(day.date)}</p>
        </div>
        {day.isBufferDay ? (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Revision Day
          </span>
        ) : (
          totalHours > 0 && (
            <span className="text-xs font-medium text-slate-400">~{totalHours}h</span>
          )
        )}
      </div>

      {day.topics.length ? (
        <ul className="space-y-2">
          {day.topics.map((t, i) => {
            const key = `${dayIndex}:${i}`;
            const done = progress?.completed?.has(key);
            return (
              <li
                key={`${t.name}-${i}`}
                className={`flex items-center gap-2 rounded-lg bg-slate-50/70 px-3 py-2 transition ${
                  done ? 'opacity-60' : ''
                }`}
              >
                {progress && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`Mark ${t.name} as done`}
                    onClick={() => progress.toggle(key)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      done
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-300 bg-white hover:border-indigo-400'
                    }`}
                  >
                    {done && <CheckIcon />}
                  </button>
                )}
                <span
                  className={`min-w-0 flex-1 truncate text-sm text-slate-700 ${
                    done ? 'line-through' : ''
                  }`}
                >
                  {t.name}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {t.isReview && (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                      ↻ Review
                    </span>
                  )}
                  {Number(t.estimatedHours) > 0 && (
                    <span className="text-xs text-slate-400">{t.estimatedHours}h</span>
                  )}
                  <DifficultyTag difficulty={t.difficulty} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm italic text-slate-400">Light review / rest.</p>
      )}
    </div>
  );
}
