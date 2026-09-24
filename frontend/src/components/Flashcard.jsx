import { motion } from 'framer-motion';

/** One face of the flip card. `back` face is pre-rotated 180° behind the front. */
function Face({ children, back, className = '' }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6 text-center shadow-sm [backface-visibility:hidden] ${className}`}
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * A single 3D flip flashcard. Controlled by the parent deck:
 * `flipped` shows the answer; clicking calls `onFlip`.
 */
export default function Flashcard({ card, flipped, onFlip, reduce }) {
  return (
    <div className="[perspective:1200px]">
      <motion.button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? 'Show prompt' : 'Show answer'}
        className="relative block h-64 w-full cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <Face className="bg-white ring-1 ring-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
            Prompt
          </span>
          <p className="mt-3 text-lg font-medium text-slate-900">{card.front}</p>
          <span className="absolute bottom-4 text-xs text-slate-400">Tap to flip</span>
        </Face>
        <Face back className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
            Answer
          </span>
          <p className="mt-3 text-base leading-relaxed">{card.back}</p>
        </Face>
      </motion.button>
    </div>
  );
}
