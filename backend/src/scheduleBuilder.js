/**
 * Deterministic study-plan expansion.
 *
 * The LLM only *judges* each topic (difficulty + a 1-5 weight) and writes its
 * practice questions; the day-by-day calendar is built here, in code. That
 * keeps the model's output small and constant-size no matter how far off the
 * exam is — so generation is fast and never truncates on a distant exam date
 * (the old design asked the model to emit one JSON entry per study day, which
 * ballooned to tens of thousands of tokens and either timed out or got cut off
 * mid-object). Output matches the exact shape the UI renders.
 */

const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };
const DIFFICULTY_SESSIONS = { easy: 1, medium: 2, hard: 3 };

/** Round to the nearest 0.5 hour, floored at 0.5. Use for session sizes. */
function roundHalf(n) {
  const r = Math.round(n * 2) / 2;
  return r < 0.5 ? 0.5 : r;
}

/** Round to the nearest 0.5, NOT floored — use for running totals so a
 * budget or a topic's remaining hours can actually reach 0. */
function half(n) {
  return Math.round(n * 2) / 2;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Add `n` whole days to a YYYY-MM-DD string (treated as a plain UTC date). */
function addDays(isoDate, n) {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Light-revision days reserved at the end, scaled to the horizon. */
function bufferDayCount(days) {
  if (days >= 8) return 2;
  if (days >= 4) return 1;
  return 0;
}

/**
 * Expand a normalized compact plan ({ topics:[{name,difficulty,weight,
 * practiceQuestions}] }) into { totalDays, schedule, practiceQuestions }.
 */
export function buildStudyPlan(compact, { today, daysRemaining, hoursPerDay }) {
  const H = hoursPerDay;
  const D = daysRemaining;
  const buffer = bufferDayCount(D);
  const studyDays = Math.max(1, D - buffer);

  // Per-topic time budget is intrinsic to the topic (driven by its weight),
  // not by the length of the horizon — so a far-off exam yields a light,
  // spread-out plan rather than one that crams every day to the brim.
  const plans = compact.topics.map((t) => {
    const totalHours = roundHalf(clamp(t.weight * 1.5, 1, 8));
    const targetSessions = clamp(
      DIFFICULTY_SESSIONS[t.difficulty] ?? 2,
      1,
      Math.min(studyDays, Math.floor(totalHours / 0.5)),
    );
    return {
      name: t.name,
      difficulty: t.difficulty,
      weight: t.weight,
      remaining: totalHours,
      targetSessions,
      perSession: clamp(roundHalf(totalHours / targetSessions), 0.5, H),
      sessions: 0,
      introduced: false,
      nextDay: 0,
    };
  });

  const schedule = [];

  // --- Study days: greedily fill each day up to the hour budget. ---
  for (let d = 0; d < studyDays; d++) {
    const topics = [];
    let budget = H;
    const usedToday = new Set();

    let guard = plans.length + 2;
    while (budget >= 0.5 && guard-- > 0) {
      const candidates = plans
        .filter((p) => p.remaining > 0 && !usedToday.has(p.name))
        .sort((a, b) => {
          if (a.introduced !== b.introduced) return a.introduced ? 1 : -1; // new material first
          const ready = (p) => (p.nextDay <= d ? 0 : 1);
          if (ready(a) !== ready(b)) return ready(a) - ready(b); // cooled-down reviews next
          return b.remaining - a.remaining; // then the heaviest remaining
        });
      if (candidates.length === 0) break;

      const p = candidates[0];
      const hours = roundHalf(Math.min(p.perSession, p.remaining, budget));
      if (hours < 0.5) break;

      topics.push({
        name: p.name,
        difficulty: p.difficulty,
        estimatedHours: hours,
        isReview: p.introduced,
      });
      usedToday.add(p.name);
      p.remaining = Math.max(0, half(p.remaining - hours));
      budget = half(budget - hours);
      p.sessions += 1;
      p.introduced = true;

      // Spread this topic's remaining sessions across the days still left.
      const sessionsLeft = Math.max(1, p.targetSessions - p.sessions);
      const windowLeft = studyDays - 1 - d;
      p.nextDay = d + Math.max(1, Math.round(windowLeft / (sessionsLeft + 1)));
    }

    schedule.push({
      date: addDays(today, d),
      dayLabel: `Day ${d + 1}`,
      isBufferDay: false,
      topics,
    });
  }

  // --- Buffer days: light review of the heaviest topics. ---
  const reviewOrder = [...plans].sort((a, b) => b.weight - a.weight);
  for (let b = 0; b < buffer; b++) {
    const topics = [];
    let budget = H;
    for (const p of reviewOrder) {
      if (budget < 0.5) break;
      const hours = roundHalf(Math.min(1, budget));
      topics.push({
        name: p.name,
        difficulty: p.difficulty,
        estimatedHours: hours,
        isReview: true,
      });
      budget = half(budget - hours);
    }
    schedule.push({
      date: addDays(today, studyDays + b),
      dayLabel: `Day ${studyDays + b + 1}`,
      isBufferDay: true,
      topics,
    });
  }

  const practiceQuestions = compact.topics.map((t) => ({
    topic: t.name,
    questions: t.practiceQuestions,
  }));

  return { totalDays: schedule.length, schedule, practiceQuestions };
}

export { DIFFICULTY_WEIGHT };
