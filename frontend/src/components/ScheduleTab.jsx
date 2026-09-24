import { motion, useReducedMotion } from 'framer-motion';
import DayCard from './DayCard.jsx';

function ProgressBar({ progress }) {
  const { done, total, pct, reset } = progress;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Your progress</span>
        <span className="text-sm text-slate-500">
          {done} / {total} sessions{pct ? ` · ${pct}%` : ''}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {done > 0 && (
        <button
          onClick={reset}
          className="mt-2 text-xs text-slate-400 transition hover:text-slate-600"
        >
          Reset progress
        </button>
      )}
    </div>
  );
}

export default function ScheduleTab({ schedule, progress }) {
  const reduce = useReducedMotion();

  if (!schedule?.length) {
    return <p className="text-slate-500">No schedule was generated.</p>;
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 120, damping: 18 },
        },
      };

  return (
    <div className="space-y-6">
      {progress && <ProgressBar progress={progress} />}

      <motion.ol
        variants={container}
        initial="hidden"
        animate="show"
        className="relative"
      >
        {schedule.map((day, i) => {
          const isLast = i === schedule.length - 1;
          return (
            <motion.li
              key={`${day.date}-${i}`}
              variants={item}
              className="relative grid grid-cols-[24px_1fr] gap-4 pb-4 last:pb-0 sm:grid-cols-[32px_1fr]"
            >
              <div className="relative flex justify-center">
                <div
                  className={`absolute left-1/2 top-0 w-px -translate-x-1/2 bg-slate-200 ${
                    isLast ? 'h-6' : 'bottom-0'
                  }`}
                  aria-hidden="true"
                />
                <div
                  className={`relative mt-5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                    day.isBufferDay ? 'bg-indigo-300' : 'bg-indigo-500'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <DayCard day={day} dayIndex={i} progress={progress} />
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}
