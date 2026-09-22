const STYLES = {
  easy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  hard: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export default function DifficultyTag({ difficulty }) {
  const cls = STYLES[difficulty] || STYLES.medium;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      {difficulty}
    </span>
  );
}
