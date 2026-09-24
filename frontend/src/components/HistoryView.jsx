/** Format an ISO timestamp or a 'YYYY-MM-DD' date string for display. */
function formatDate(value) {
  if (!value) return '';
  // Parse date-only strings as local time to avoid a timezone off-by-one.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Data Structures, Algorithms, Graphs +2 more" */
function topicsSummary(topics) {
  const list = Array.isArray(topics) ? topics : [];
  if (list.length === 0) return 'Untitled session';
  const shown = list.slice(0, 3).join(', ');
  const extra = list.length - 3;
  return extra > 0 ? `${shown} +${extra} more` : shown;
}

/**
 * Study history list. Sessions are saved after each generated plan; clicking
 * "Open" reloads that plan into the app so the user can pick up where they left
 * off (across reloads and devices, via Supabase).
 */
export default function HistoryView({ sessions, loading, onOpen, onDelete }) {
  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No saved sessions yet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Build a study plan and it&apos;ll show up here so you can pick up where you left off.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Your study history</h2>
      <ul className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{topicsSummary(s.topics)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Saved {formatDate(s.created_at)}
                {s.exam_date ? ` · exam ${formatDate(s.exam_date)}` : ''}
                {s.hours_per_day ? ` · ${s.hours_per_day} h/day` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(s)}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-600"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              aria-label="Delete session"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
