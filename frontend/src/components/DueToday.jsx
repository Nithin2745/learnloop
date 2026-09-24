import { localDateISO } from '../lib/sm2.js';

/**
 * "Due today" spaced-repetition queue. Lists review items whose due date has
 * arrived (computed in the client's timezone by useReviews) and lets the student
 * jump straight into revising that topic. Renders nothing when nothing is due.
 */
export default function DueToday({ items, onRevise }) {
  if (!items?.length) return null;
  const today = localDateISO();

  return (
    <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-bold text-white">
          {items.length}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
          Due for review today
        </h2>
      </div>
      <ul className="space-y-2">
        {items.map((r) => (
          <li
            key={r.item_key}
            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {r.label || r.item_key}
              </p>
              <p className="text-xs text-slate-400">{meta(r, today)}</p>
            </div>
            <button
              type="button"
              onClick={() => onRevise?.(r.label)}
              disabled={!r.label}
              className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revise
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function meta(r, today) {
  const grade = Number(r.last_grade);
  const g = Number.isFinite(grade) ? ` · last recall ${grade}/5` : '';
  const overdue = r.due_date && r.due_date < today;
  return `${overdue ? `Overdue since ${r.due_date}` : 'Due today'}${g}`;
}
