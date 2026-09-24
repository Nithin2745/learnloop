import { motion, useReducedMotion } from 'framer-motion';

/**
 * Renders a topic's small concept diagram from a structured spec the model
 * returns (never markup): { kind, caption, nodes:[{id,label,note}], edges:[...] }.
 *   flow      → nodes left-to-right with arrows (edge labels shown when present)
 *   hierarchy → first node on top, the rest as children beneath it
 *   compare   → nodes as side-by-side columns
 * Entrance is a framer-motion stagger that respects reduced-motion.
 */
const containerV = (reduce) => ({
  hidden: {},
  show: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
});
const nodeV = (reduce) =>
  reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 150, damping: 18 },
        },
      };

function Node({ label, note }) {
  return (
    <div className="h-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {note && <p className="mt-0.5 text-xs leading-snug text-slate-500">{note}</p>}
    </div>
  );
}

export default function ConceptVisual({ visual }) {
  const reduce = useReducedMotion();
  if (!visual || !visual.nodes?.length) return null;
  const { kind, caption, nodes, edges = [] } = visual;
  const edgeLabel = (a, b) => edges.find((e) => e.from === a && e.to === b)?.label || '';

  return (
    <figure className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <figcaption className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden="true">🧭</span> {caption || 'Concept map'}
      </figcaption>

      <motion.div variants={containerV(reduce)} initial="hidden" animate="show">
        {kind === 'compare' ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(nodes.length, 4)}, minmax(0,1fr))` }}
          >
            {nodes.map((n) => (
              <motion.div key={n.id} variants={nodeV(reduce)}>
                <Node label={n.label} note={n.note} />
              </motion.div>
            ))}
          </div>
        ) : kind === 'hierarchy' ? (
          <div className="flex flex-col items-center gap-3">
            <motion.div variants={nodeV(reduce)} className="min-w-[8rem] max-w-[15rem]">
              <Node label={nodes[0].label} note={nodes[0].note} />
            </motion.div>
            {nodes.length > 1 && <span className="h-4 w-px bg-indigo-200" aria-hidden="true" />}
            <div className="flex flex-wrap justify-center gap-3">
              {nodes.slice(1).map((n) => (
                <motion.div key={n.id} variants={nodeV(reduce)} className="min-w-[7rem] max-w-[12rem]">
                  <Node label={n.label} note={n.note} />
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-2">
            {nodes.map((n, i) => (
              <div key={n.id} className="flex items-stretch gap-2">
                <motion.div variants={nodeV(reduce)} className="min-w-[7rem] max-w-[13rem]">
                  <Node label={n.label} note={n.note} />
                </motion.div>
                {i < nodes.length - 1 && (
                  <motion.div
                    variants={nodeV(reduce)}
                    className="flex flex-col items-center justify-center px-0.5 text-indigo-400"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">→</span>
                    {edgeLabel(n.id, nodes[i + 1].id) && (
                      <span className="mt-0.5 max-w-[5rem] text-center text-[10px] leading-tight text-slate-400">
                        {edgeLabel(n.id, nodes[i + 1].id)}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </figure>
  );
}
