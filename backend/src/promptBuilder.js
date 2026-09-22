/**
 * Builds the chat messages for the study-plan request.
 *
 * The system prompt hard-constrains the model to emit ONLY the target JSON
 * object (no markdown fences, no prose). The exact schema is spelled out so
 * the model has no room to improvise field names.
 */

const SCHEMA_DESCRIPTION = `{
  "totalDays": number,                       // number of calendar days in the schedule
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "dayLabel": "Day 1",                  // "Day 1", "Day 2", ...
      "topics": [
        {
          "name": string,
          "difficulty": "easy" | "medium" | "hard",
          "estimatedHours": number            // hours to spend on this topic that day
        }
      ],
      "isBufferDay": boolean                  // true for light revision/buffer days
    }
  ],
  "practiceQuestions": [
    {
      "topic": string,
      "questions": [string, string, string]   // 3-5 questions, no answers
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop, an expert academic study planner.

You produce a day-by-day revision schedule and practice questions from a
student's topic list and exam date.

Follow these rules exactly:
1. Parse the topics from the free-text list. Topics may be one-per-line or
   comma-separated and may include difficulty hints (e.g. "Thermodynamics (hard)").
2. Estimate each topic's difficulty ("easy" | "medium" | "hard") and relative
   weight. If the student gave a hint, honour it; otherwise judge it yourself.
3. Distribute topics across the days remaining before the exam, respecting the
   student's available study hours per day. Harder / heavier topics get more
   total time and may be split across multiple days. Do not exceed the daily
   hour budget. It is fine for the sum of estimatedHours on a day to be at or
   below the budget.
4. Reserve the last 1-2 days before the exam as light revision / buffer days:
   mark them "isBufferDay": true, keep their load light, and use them for
   review rather than new material.
5. Produce 3-5 practice questions per topic — a mix of conceptual and applied.
   Questions only, never answers.
6. Every date must fall on or before the exam date and be a real calendar date.
   Label days sequentially ("Day 1", "Day 2", ...).

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary, no leading or trailing text. The very first character
of your response must be "{" and the last must be "}".

Schema:
${SCHEMA_DESCRIPTION}`;

export function buildMessages({ topics, examDate, hoursPerDay, today, daysRemaining }) {
  const userPrompt = `Create my study plan.

Today's date: ${today}
Exam date: ${examDate}
Days remaining until the exam (today counts as a study day): ${daysRemaining}
Study hours available per day: ${hoursPerDay}

Topics (free text):
"""
${topics}
"""

Remember: respond with ONLY the JSON object described in the schema.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

/** A nudge appended on the retry attempt when the first parse fails. */
export function retryNudge() {
  return {
    role: 'user',
    content:
      'Your previous response could not be parsed as JSON. Respond again with ' +
      'ONLY the JSON object — no markdown fences, no explanation.',
  };
}
