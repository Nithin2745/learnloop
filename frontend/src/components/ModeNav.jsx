const MODES = [
  { id: 'plan', label: 'Plan', icon: '🗓️' },
  { id: 'learn', label: 'Learn', icon: '💡' },
  { id: 'revise', label: 'Revise', icon: '🔁' },
];

/** Plan / Learn / Revise segmented switch, styled like the Results tabs. */
export default function ModeNav({ mode, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Workspace mode"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
              active
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span aria-hidden="true">{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
