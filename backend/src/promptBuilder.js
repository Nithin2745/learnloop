/**
 * Builds the chat messages for the study-plan request.
 *
 * The model no longer authors the calendar. It only analyses each topic —
 * difficulty, a relative 1-5 weight, and practice questions — and returns a
 * small, bounded JSON object. scheduleBuilder.js turns that into the concrete
 * day-by-day schedule. Keeping the model's output constant-size (a handful of
 * topics rather than one entry per day to the exam) is what makes generation
 * fast and reliable regardless of how distant the exam is.
 *
 * Practice questions are a MIX of three types so the student gets both instant,
 * deterministic self-checks (mcq / fill) and deeper open-ended recall (open):
 *   - "mcq":  multiple choice, 4 options, one correct — graded in the browser.
 *   - "fill": fill-in-the-blank, matched locally against answer + synonyms.
 *   - "open": free-text, graded by the AI (/api/grade).
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
      "weight": number,                         // 1-5 relative study effort
                                                //   (harder / broader / heavier = higher)
      "practiceQuestions": [                    // 4-6 items per topic, MIXED types
                                                //   (at least one "mcq" and one "fill")
        { "type": "mcq",  "question": string,
          "options": [string, string, string, string],  // exactly 4 choices
          "correctIndex": number,                        // 0-based index of the correct option
          "explanation": string },                       // one sentence: why it is right
        { "type": "fill", "question": string,            // write the gap as "_____"
          "answer": string,                              // the word/phrase that fills the blank
          "acceptable": [string] },                      // other accepted spellings/synonyms ([] if none)
        { "type": "open", "question": string,
          "answer": string }                             // concise answer, 1-3 sentences
      ]
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop, an expert academic study planner.

You analyse a student's topic list so a scheduler can build their revision
calendar. You do NOT build the calendar or assign dates yourself.

Follow these rules exactly:
1. Parse the distinct topics from the free-text list. Topics may be one-per-line
   or comma-separated and may include difficulty hints (e.g. "Thermodynamics
   (hard)"). Clean up each topic name.
2. For each topic, judge its "difficulty" ("easy" | "medium" | "hard"). If the
   student gave a hint, honour it; otherwise decide yourself.
3. For each topic, give a "weight" from 1 to 5 — the relative amount of study
   effort it deserves. Harder, broader, or more foundational topics score
   higher; small or simple topics score lower.
4. Produce 4-6 practice questions per topic as a MIX of these three types, and
   include AT LEAST ONE "mcq" and AT LEAST ONE "fill" for every topic:
   - "mcq": a multiple-choice question with EXACTLY 4 "options". "correctIndex"
     is the 0-based position of the correct option in that array. Make the wrong
     options plausible, not obviously silly. Add a one-sentence "explanation".
   - "fill": a fill-in-the-blank sentence with the gap written as "_____" (five
     underscores). "answer" is the missing word or short phrase; "acceptable"
     lists any other spellings/synonyms that should also count (use [] if none).
   - "open": a conceptual or applied question with a concise "answer" (1-3
     sentences — the answer or a short worked idea, not a full essay).
   Every question object MUST include its "type" field.

Do NOT include dates, day numbers, a schedule, hours, or spaced-repetition
planning — those are computed separately from your ratings.

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

For each distinct topic give its difficulty, a 1-5 weight, and 4-6 practice
questions as a MIX of multiple-choice ("mcq"), fill-in-the-blank ("fill"), and
open-ended ("open") — at least one "mcq" and one "fill" each. Respond with ONLY
the JSON object described in the schema — no dates, no schedule, no prose.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
