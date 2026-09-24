import { runJsonCompletion } from './llmJson.js';
import { buildLearnMessages } from './learnPrompt.js';

const validLevel = new Set(['easy', 'medium', 'hard']);
const validImportance = new Set(['core', 'good-to-know']);
const validVisualKind = new Set(['flow', 'hierarchy', 'compare']);
const LEVEL_ORDER = ['easy', 'medium', 'hard'];

/**
 * Parse a topic string into a base name + requested depth levels.
 *   "OS(Easy, Medium, Hard)" -> { name: "OS", levels: ["easy","medium","hard"] }
 *   "TCP/IP"                 -> { name: "TCP/IP", levels: ["medium"] }
 * Unknown words inside the parens are ignored; if none are valid, we fall back
 * to a single "medium" explanation.
 */
export function parseTopicSpec(raw) {
  const str = String(raw ?? '').trim();
  const m = str.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { name: str, levels: ['medium'] };
  const name = m[1].trim() || str;
  const levels = [];
  for (const part of m[2].split(',')) {
    const lvl = part.trim().toLowerCase();
    if (validLevel.has(lvl) && !levels.includes(lvl)) levels.push(lvl);
  }
  levels.sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
  return { name, levels: levels.length ? levels : ['medium'] };
}

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertLearnShape(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
    throw new SyntaxError('Parsed JSON does not match the expected learn shape.');
  }
  return result;
}

function normalizeVisual(v) {
  const kind = validVisualKind.has(v?.kind) ? v.kind : 'flow';
  const nodes = Array.isArray(v?.nodes)
    ? v.nodes
        .map((n) => ({
          id: String(n?.id ?? '').trim(),
          label: String(n?.label ?? '').trim(),
          note: String(n?.note ?? '').trim(),
        }))
        .filter((n) => n.id && n.label)
    : [];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(v?.edges)
    ? v.edges
        .map((e) => ({
          from: String(e?.from ?? '').trim(),
          to: String(e?.to ?? '').trim(),
          label: String(e?.label ?? '').trim(),
        }))
        .filter((e) => ids.has(e.from) && ids.has(e.to))
    : [];
  return { kind, caption: String(v?.caption ?? '').trim(), nodes, edges };
}

function normalizeWorkedExample(w) {
  const problem = String(w?.problem ?? '').trim();
  const answer = String(w?.answer ?? '').trim();
  const steps = Array.isArray(w?.steps)
    ? w.steps.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];
  // Only surface an example that actually carries content.
  if (!problem && !answer && !steps.length) return null;
  return { problem, steps, answer };
}

function normalizeMisconceptions(list) {
  return Array.isArray(list)
    ? list
        .map((m) => ({
          myth: String(m?.myth ?? '').trim(),
          reality: String(m?.reality ?? '').trim(),
        }))
        .filter((m) => m.myth && m.reality)
    : [];
}

function normalizeExplanation(ex) {
  return {
    level: validLevel.has(ex?.level) ? ex.level : 'medium',
    summary: String(ex?.summary ?? '').trim(),
    detail: String(ex?.detail ?? '').trim(),
    prerequisites: Array.isArray(ex?.prerequisites)
      ? ex.prerequisites.map((p) => String(p ?? '').trim()).filter(Boolean)
      : [],
    analogy: String(ex?.analogy ?? '').trim(),
    keyPoints: Array.isArray(ex?.keyPoints)
      ? ex.keyPoints.map((k) => String(k ?? '').trim()).filter(Boolean)
      : [],
    steps: Array.isArray(ex?.steps)
      ? ex.steps.map((s) => ({
          title: String(s?.title ?? '').trim(),
          detail: String(s?.detail ?? '').trim(),
        }))
      : [],
    workedExample: normalizeWorkedExample(ex?.workedExample),
    misconceptions: normalizeMisconceptions(ex?.misconceptions),
    visual: normalizeVisual(ex?.visual),
  };
}

/** Coerce each explanation to the contract without second-guessing content. */
function normalizeLearn(result) {
  result.items = result.items.map((it) => {
    let explanations = Array.isArray(it?.explanations)
      ? it.explanations.map(normalizeExplanation)
      : [];
    // Resilience: if the model returned a flat single explanation instead of an
    // "explanations" array, wrap it so the UI contract still holds.
    if (!explanations.length && (it?.summary || it?.steps)) {
      explanations = [normalizeExplanation(it)];
    }
    return {
      topic: String(it?.topic ?? '').trim(),
      importance: validImportance.has(it?.importance) ? it.importance : 'core',
      explanations,
    };
  });
  return result;
}

/**
 * Generate leveled, plain-language explanations for the given topics.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generateLearning(topics) {
  const specs = topics.map(parseTopicSpec);
  return runJsonCompletion({
    messages: buildLearnMessages(specs),
    finalize: (parsed) => normalizeLearn(assertLearnShape(parsed)),
  });
}
