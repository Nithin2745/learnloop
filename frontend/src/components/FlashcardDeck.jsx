import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Flashcard from './Flashcard.jsx';

/** Fisher-Yates shuffle producing a fresh index array of length n. */
function shuffledIndices(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A navigable deck of flip flashcards with shuffle and known/review marking. */
export default function FlashcardDeck({ cards }) {
  const reduce = useReducedMotion();
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(() => new Set());

  if (!cards?.length) {
    return <p className="text-sm text-slate-500">No flashcards for this topic.</p>;
  }

  const cardIdx = order[Math.min(pos, order.length - 1)];
  const card = cards[cardIdx];
  const isKnown = known.has(cardIdx);

  const go = (delta) => {
    setFlipped(false);
    setPos((p) => (p + delta + order.length) % order.length);
  };

  const shuffle = () => {
    setFlipped(false);
    setOrder(shuffledIndices(cards.length));
    setPos(0);
  };

  const mark = () => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(cardIdx)) next.delete(cardIdx);
      else next.add(cardIdx);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Card {pos + 1} / {cards.length}
        </span>
        <span>{known.size} marked known</span>
      </div>

      <Flashcard
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        reduce={reduce}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={mark}
          aria-pressed={isKnown}
          className={`rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition ${
            isKnown
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isKnown ? '✓ Known' : 'Mark known'}
        </button>
        <button
          type="button"
          onClick={shuffle}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          🔀 Shuffle
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
