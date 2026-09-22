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

export default function DayCard({ day }) {
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
            <span className="text-xs font-medium text-slate-400">
              ~{totalHours}h
            </span>
          )
        )}
      </div>

      {day.topics.length ? (
        <ul className="space-y-2">
          {day.topics.map((t, i) => (
            <li
              key={`${t.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/70 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {t.name}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {Number(t.estimatedHours) > 0 && (
                  <span className="text-xs text-slate-400">
                    {t.estimatedHours}h
                  </span>
                )}
                <DifficultyTag difficulty={t.difficulty} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-slate-400">Light review / rest.</p>
      )}
    </div>
  );
}
