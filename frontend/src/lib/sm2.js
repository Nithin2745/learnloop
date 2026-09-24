/**
 * Spaced repetition (SM-2), pure and framework-free.
 *
 * The backend generates content statelessly with no stable ids, so a review
 * item is keyed by its TOPIC text: questions and flashcards are regenerated and
 * vary run-to-run, while the topic is the stable unit a student actually
 * revises. Grading any question for a topic advances that topic's schedule.
 *
 * All dates are computed in the CLIENT's local timezone, so "due today" lines up
 * with the student's own calendar rather than the server's.
 */

// djb2 string hash (same basis as useProgress.signature) -> short base36 id.
export function hashText(text) {
  let h = 5381;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// Normalize topic text so trivial variations map to the same review item.
export function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Stable review-item key for a topic, e.g. "t:1a2b3c".
export function itemKeyForTopic(topic) {
  return `t:${hashText(normalizeText(topic))}`;
}

// Map a 0-100 grade (from the AI grader) to an SM-2 quality 0-5.
// >= 3 counts as a successful recall; below resets the interval.
export function qualityFromScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  if (s >= 90) return 5;
  if (s >= 75) return 4;
  if (s >= 60) return 3;
  if (s >= 40) return 2;
  if (s >= 20) return 1;
  return 0;
}

// ---- client-local date helpers (no UTC, no library) ----

export function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(baseISO, days) {
  const [y, m, d] = String(baseISO).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1); // local midnight
  dt.setDate(dt.getDate() + days);
  return localDateISO(dt);
}

export function isDue(dueDateISO, today = localDateISO()) {
  return Boolean(dueDateISO) && dueDateISO <= today;
}

const DEFAULT_EASINESS = 2.5;
const MIN_EASINESS = 1.3;

/**
 * Advance an SM-2 state by one graded review.
 * @param {{easiness?:number, intervalDays?:number, repetitions?:number}} prev
 * @param {number} quality 0-5
 * @returns {{easiness:number, intervalDays:number, repetitions:number, dueDate:string, lastGrade:number}}
 */
export function sm2(prev, quality) {
  const q = Math.max(0, Math.min(5, Math.round(Number(quality) || 0)));
  let easiness = Number(prev?.easiness) || DEFAULT_EASINESS;
  let repetitions = Number(prev?.repetitions) || 0;
  let intervalDays;

  if (q < 3) {
    // Lapse: relearn from the start (interval resets to 1 day).
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round((Number(prev?.intervalDays) || 6) * easiness);
  }

  // Easiness factor is updated after every review, floored at 1.3.
  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < MIN_EASINESS) easiness = MIN_EASINESS;
  easiness = Math.round(easiness * 100) / 100;

  return {
    easiness,
    intervalDays,
    repetitions,
    dueDate: addDaysISO(localDateISO(), intervalDays),
    lastGrade: q,
  };
}
