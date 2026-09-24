import { runJsonCompletion } from './llmJson.js';
import { buildMessages } from './promptBuilder.js';

/** Minimal shape check so a malformed-but-parseable object triggers a retry. */
function assertPlanShape(plan) {
  if (
    !plan ||
    typeof plan !== 'object' ||
    !Array.isArray(plan.schedule) ||
    !Array.isArray(plan.practiceQuestions)
  ) {
    throw new SyntaxError('Parsed JSON does not match the expected plan shape.');
  }
  return plan;
}

/** Normalize obvious drift without second-guessing the model's content. */
function normalizePlan(plan) {
  const validDifficulty = new Set(['easy', 'medium', 'hard']);
  plan.totalDays =
    typeof plan.totalDays === 'number' ? plan.totalDays : plan.schedule.length;

  plan.schedule = plan.schedule.map((day) => ({
    date: String(day?.date ?? ''),
    dayLabel: String(day?.dayLabel ?? ''),
    isBufferDay: Boolean(day?.isBufferDay),
    topics: Array.isArray(day?.topics)
      ? day.topics.map((t) => ({
          name: String(t?.name ?? ''),
          difficulty: validDifficulty.has(t?.difficulty) ? t.difficulty : 'medium',
          estimatedHours: Number(t?.estimatedHours) || 0,
          isReview: Boolean(t?.isReview),
        }))
      : [],
  }));

  plan.practiceQuestions = plan.practiceQuestions.map((q) => ({
    topic: String(q?.topic ?? ''),
    questions: Array.isArray(q?.questions)
      ? q.questions.map((item) => {
          // Tolerate either a bare string or a { question, answer } object.
          if (item && typeof item === 'object') {
            return {
              question: String(item.question ?? item.q ?? ''),
              answer: String(item.answer ?? item.a ?? ''),
            };
          }
          return { question: String(item ?? ''), answer: '' };
        })
      : [],
  }));

  return plan;
}

/**
 * Generate and validate a study plan.
 * Retries once (with a nudge) if the model's output fails to parse.
 * Throws tagged errors: RATE_LIMIT | AUTH | LLM_ERROR | PARSE_FAILED.
 */
export async function generatePlan(input) {
  return runJsonCompletion({
    messages: buildMessages(input),
    finalize: (parsed) => normalizePlan(assertPlanShape(parsed)),
  });
}
