import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ConceptCard from './ConceptCard.jsx';
import LoadingState from './LoadingState.jsx';

/**
 * Learn mode: every selected topic is generated UPFRONT in one batch (by App)
 * and shown as an expandable explainer. Topics the student gave depth levels for
 * (e.g. "OS(Easy,Medium,Hard)") get an in-card Easy / Medium / Hard switch.
 * Props: state 'idle'|'loading'|'ready'|'error', items[], error, onRetry.
 */
export default function LearnMode({ state, items = [], error, onRetry }) {
  const [openIdx, setOpenIdx] = useState(0);

  if (state === 'idle' || state === 'loading') {
    return (
      <LoadingState
        title="Preparing your explanations…"
        subtitle="Explaining every topic clearly — with analogies, steps, and a concept map."
      />
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm">
        <p className="text-rose-700">{error || 'Could not prepare your topics.'}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Learn your topics</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Plain-language explanations with an analogy, a concept map, and a step-by-step
            walkthrough. Topics with several depths have an Easy / Medium / Hard switch.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Regenerate
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No explanations were returned. Try regenerating.</p>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <ConceptCard
                key={`${item.topic}-${i}`}
                item={item}
                open={openIdx === i}
                onToggle={() => setOpenIdx((cur) => (cur === i ? -1 : i))}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
