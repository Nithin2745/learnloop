const cbCls = 'h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400';

const subjectTopics = (s) => s.units.flatMap((u) => u.topics);

/**
 * Renders the extracted Subject → Unit → Topic tree with checkboxes and
 * select-all at the subject and unit level. Fully controlled by the parent
 * (TopicPicker), which owns the checked/open sets.
 */
export default function SubjectTree({
  subjects,
  checked,
  openKeys,
  onToggleOpen,
  onToggleTopic,
  onSetMany,
}) {
  if (!subjects?.length) return null;

  const allChecked = (list) => list.length > 0 && list.every((t) => checked.has(t));

  // Global control across every subject/unit, so a big extracted tree can be
  // selected or cleared in one click instead of per subject.
  const allFlat = subjects.flatMap(subjectTopics);
  const everyChecked = allChecked(allFlat);
  const selectedCount = allFlat.filter((t) => checked.has(t)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className={cbCls}
            checked={everyChecked}
            onChange={() => onSetMany(allFlat, !everyChecked)}
            aria-label={everyChecked ? 'Clear all topics' : 'Select all topics'}
          />
          {everyChecked ? 'Clear all' : 'Select all'}
        </label>
        <span className="text-xs text-slate-400">
          {selectedCount} of {allFlat.length} selected
        </span>
      </div>
      {subjects.map((s) => {
        const sKey = `s:${s.name}`;
        const open = openKeys.has(sKey);
        const sTopics = subjectTopics(s);
        const sAll = allChecked(sTopics);
        return (
          <div
            key={sKey}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                className={cbCls}
                checked={sAll}
                onChange={() => onSetMany(sTopics, !sAll)}
                aria-label={`Select all topics in ${s.name}`}
              />
              <button
                type="button"
                onClick={() => onToggleOpen(sKey)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{s.name}</span>
                  {s.code && <span className="text-xs text-slate-400">{s.code}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                  {sTopics.length} topic{sTopics.length === 1 ? '' : 's'}
                  <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                </span>
              </button>
            </div>

            {open && (
              <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                {s.units.map((u) => {
                  const uAll = allChecked(u.topics);
                  return (
                    <div key={`u:${s.name}:${u.name}`}>
                      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className={cbCls}
                          checked={uAll}
                          onChange={() => onSetMany(u.topics, !uAll)}
                        />
                        {u.name}
                      </label>
                      <ul className="ml-6 mt-1.5 space-y-1.5">
                        {u.topics.map((t) => (
                          <li key={t}>
                            <label className="flex items-start gap-2.5 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                className={`mt-0.5 ${cbCls}`}
                                checked={checked.has(t)}
                                onChange={() => onToggleTopic(t)}
                              />
                              <span className="leading-relaxed">{t}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
