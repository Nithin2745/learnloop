import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import DifficultyTag from './DifficultyTag.jsx';
import ConceptVisual from './ConceptVisual.jsx';

const IMPORTANCE = {
  core: { label: 'Core', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  'good-to-know': {
    label: 'Good to know',
    cls: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
};
const LEVEL_ORDER = ['easy', 'medium', 'hard'];
const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const Chevron = ({ open }) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
  >
    <path
      fillRule="evenodd"
      d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
      clipRule="evenodd"
    />
  </svg>
);

function pickDefaultLevel(explanations) {
  if (explanations.some((e) => e.level === 'medium')) return 'medium';
  return explanations[0]?.level;
}

/**
 * One expandable topic explainer. `item` is generated upfront by App:
 * { topic, importance, explanations:[{ level, summary, detail, analogy,
 *   keyPoints, steps, visual }] }. Multi-depth topics get an Easy/Medium/Hard
 * switch; changing depth replays the reveal animation.
 */
export default function ConceptCard({ item, open, onToggle }) {
  const reduce = useReducedMotion();
  const explanations = item.explanations || [];
  const [level, setLevel] = useState(() => pickDefaultLevel(explanations));
  const ex = explanations.find((e) => e.level === level) || explanations[0];
  const imp = IMPORTANCE[item.importance];
  const levels = LEVEL_ORDER.filter((l) => explanations.some((e) => e.level === l));

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
  };
  const anim = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 18 } },
      };

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="truncate font-medium text-slate-900">{item.topic}</span>
          {ex?.level && <DifficultyTag difficulty={ex.level} />}
        </span>
        <span className="flex items-center gap-3">
          {levels.length > 1 && (
            <span className="hidden text-xs text-slate-400 sm:inline">{levels.length} depths</span>
          )}
          {imp && (
            <span
              className={`hidden rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset sm:inline ${imp.cls}`}
            >
              {imp.label}
            </span>
          )}
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5">
          {!ex ? (
            <p className="text-sm text-slate-500">No explanation was returned for this topic.</p>
          ) : (
            <>
              {levels.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Explanation depth"
                  className="mb-4 inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
                >
                  {levels.map((l) => {
                    const active = l === level;
                    return (
                      <button
                        key={l}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setLevel(l)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                          active ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {LEVEL_LABEL[l]}
                      </button>
                    );
                  })}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={level}
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="space-y-5"
                >
                  <motion.p variants={anim} className="text-sm leading-relaxed text-slate-700">
                    {ex.summary}
                  </motion.p>

                  {ex.detail && (
                    <motion.p variants={anim} className="text-sm leading-relaxed text-slate-600">
                      {ex.detail}
                    </motion.p>
                  )}

                  {ex.analogy && (
                    <motion.div
                      variants={anim}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        💡 Analogy
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-900">{ex.analogy}</p>
                    </motion.div>
                  )}

                  {ex.keyPoints?.length > 0 && (
                    <motion.ul variants={anim} className="space-y-2">
                      {ex.keyPoints.map((pt, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                          <span className="mt-1 text-indigo-400" aria-hidden="true">
                            ◆
                          </span>
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </motion.ul>
                  )}

                  {ex.visual?.nodes?.length > 0 && (
                    <motion.div variants={anim}>
                      <ConceptVisual visual={ex.visual} />
                    </motion.div>
                  )}

                  {ex.steps?.length > 0 && (
                    <motion.ol
                      variants={anim}
                      className="relative ml-1 space-y-4 border-l border-slate-200 pl-6"
                    >
                      {ex.steps.map((step, i) => (
                        <li key={i} className="relative">
                          <span
                            className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white"
                            aria-hidden="true"
                          >
                            {i + 1}
                          </span>
                          <p className="text-sm font-medium text-slate-900">{step.title}</p>
                          {step.detail && (
                            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                              {step.detail}
                            </p>
                          )}
                        </li>
                      ))}
                    </motion.ol>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
