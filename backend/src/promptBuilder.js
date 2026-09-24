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
          "estimatedHours": number,           // hours to spend on this topic that day
          "isReview": boolean                 // true when this is a spaced-repetition revisit
        }
      ],
      "isBufferDay": boolean                  // true for light revision/buffer days
    }
  ],
  "practiceQuestions": [
    {
      "topic": string,
      "questions": [                          // 3-5 items per topic
        { "question": string, "answer": string }
      ]
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
   total time. Do not exceed the daily hour budget; the sum of estimatedHours
   on a day may be at or below the budget.
4. Use SPACED REPETITION. Schedule harder and heavier topics for MULTIPLE
   sessions on different days, with increasing gaps between revisits (e.g. a
   hard topic studied on Day 1 might be reviewed on Day 3, then Day 7).
   - The FIRST time a topic appears, set "isReview": false.
   - Every later revisit of that same topic sets "isReview": true and should be
     shorter than the first pass.
   - Easy topics may appear only once ("isReview": false).
5. Reserve the last 1-2 days before the exam as light revision / buffer days:
   mark them "isBufferDay": true, keep their load light, and use them for
   review rather than new material.
6. Produce 3-5 practice questions per topic — a mix of conceptual and applied.
   Each question includes a concise "answer" (1-3 sentences: the answer or a
   short explanation / worked idea, not a full essay).
7. Every date must fall on or before the exam date and be a real calendar date.
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

Remember: respond with ONLY the JSON object described in the schema. Use
spaced repetition for harder topics and give every practice question an answer.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
