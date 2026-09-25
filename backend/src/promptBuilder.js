/**
 * Builds the chat messages for the study-plan request.
 *
 * The model no longer authors the calendar OR the practice questions. It only
 * analyses each topic — difficulty and a relative 1-5 weight — and returns a
 * small, bounded JSON object. scheduleBuilder.js turns that into the concrete
 * day-by-day schedule, and practice questions are fetched per topic on demand
 * (questionsService.js). Keeping the model's plan output tiny and constant-size
 * (a difficulty + weight per topic, nothing more) is what makes generation fast
 * and reliable for a full syllabus regardless of how distant the exam is — the
 * old design also asked for 4-6 questions per topic here, which ballooned the
 * response and truncated large topic lists down to a handful.
 *
 * The system prompt hard-constrains the model to emit ONLY the target JSON
 * object (no markdown fences, no prose). The exact schema is spelled out so
 * the model has no room to improvise field names.
 */

const SCHEMA_DESCRIPTION = `{
  "topics": [
    {
      "name": string,                          // the topic, cleaned up
      "difficulty": "easy" | "medium" | "hard",
      "weight": number                          // 1-5 relative study effort
                                                //   (harder / broader / heavier = higher)
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop, an expert academic study planner.

You analyse a student's topic list so a scheduler can build their revision
calendar. You do NOT build the calendar, assign dates, or write practice
questions yourself.

Follow these rules exactly:
1. Parse the distinct topics from the free-text list. Topics may be one-per-line
   or comma-separated and may include difficulty hints (e.g. "Thermodynamics
   (hard)"). Clean up each topic name.
2. For each topic, judge its "difficulty" ("easy" | "medium" | "hard"). If the
   student gave a hint, honour it; otherwise decide yourself.
3. For each topic, give a "weight" from 1 to 5 — the relative amount of study
   effort it deserves. Harder, broader, or more foundational topics score
   higher; small or simple topics score lower.

Keep EVERY distinct topic from the list — do not merge, drop, or summarise them.
Do NOT include dates, day numbers, a schedule, hours, practice questions, or
spaced-repetition planning — those are handled separately.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary, no leading or trailing text. The very first character
of your response must be "{" and the last must be "}".

Schema:
${SCHEMA_DESCRIPTION}`;

export function buildMessages({ topics }) {
  const userPrompt = `Analyse my topics for a study plan.

Topics (free text):
"""
${topics}
"""

For each distinct topic give its difficulty and a 1-5 weight. Keep every topic.
Respond with ONLY the JSON object described in the schema — no dates, no
schedule, no practice questions, no prose.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
