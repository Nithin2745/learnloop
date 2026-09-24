import { useState } from 'react';

/**
 * Collapsible panel list — the show/hide pattern shared by Practice Questions
 * and Revision Q&A. Each item: { id?, title, meta?, render() }.
 *   mode="single" keeps one panel open at a time (defaultOpen index).
 *   mode="multi"  toggles panels independently.
 */
export default function Accordion({ items, mode = 'single', defaultOpen = 0 }) {
  const [openSingle, setOpenSingle] = useState(mode === 'single' ? defaultOpen : -1);
  const [openSet, setOpenSet] = useState(() => new Set());

  if (!items?.length) return null;

  const isOpen = (i) => (mode === 'single' ? openSingle === i : openSet.has(i));

  const toggle = (i) => {
    if (mode === 'single') {
      setOpenSingle((cur) => (cur === i ? -1 : i));
    } else {
      setOpenSet((cur) => {
        const next = new Set(cur);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const open = isOpen(i);
        return (
          <div
            key={item.id ?? i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{item.title}</span>
              <span className="flex items-center gap-3">
                {item.meta && <span className="text-xs text-slate-400">{item.meta}</span>}
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>
            {open && (
              <div className="border-t border-slate-100 px-5 py-4">{item.render()}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
