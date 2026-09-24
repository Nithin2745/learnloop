/**
 * Builds chat messages for POST /api/revise (Revision).
 *
 * For each requested topic the model returns quick-recall flashcards plus a few
 * important questions. Answers are full, clear explanations (not one-liners),
 * with optional key points and a concrete example, so revision actually teaches.
 */

const SCHEMA_DESCRIPTION = `{
  "items": [
    {
      "topic": string,                    // echo the requested topic
      "flashcards": [                     // 5-8 quick-recall cards
        { "front": string, "back": string }
      ],
      "questions": [                      // 4-6 important questions
        {
          "question": string,
          "answer": string,               // 3-6 sentences, clear and complete
          "keyPoints": [ string ],        // 0-4 optional bullet takeaways
          "example": string               // optional concrete example ("" if none)
        }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop's revision coach.

Given a list of study topics, produce revision material that helps a student
recall the essentials AND understand them before an exam.

Follow these rules exactly:
1. Produce one item per requested topic, in the same order, echoing the topic
   name back in "topic".
2. "flashcards": 5-8 cards. "front" is a short prompt (a term, question, or
   cue); "back" is a concise answer (1-2 sentences). Cover the most testable
   points of the topic.
3. "questions": 4-6 important exam-style questions. For each:
   - "answer": a clear, COMPLETE explanation in plain language (3-6 sentences).
     Explain the idea and the "why", not just a one-line definition.
   - "keyPoints": 0-4 short bullet takeaways that reinforce the answer (use []
     when extra bullets would not help).
   - "example": one short concrete example that makes it click, or "" if none
     fits naturally.
4. Use simple, clear language. Be accurate; do not fabricate specifics you are
   unsure of.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary. The first character must be "{" and the last "}".

Schema:
${SCHEMA_DESCRIPTION}`;

export function buildReviseMessages(topics) {
  const list = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const userPrompt = `Create revision material for these topics:

${list}

Remember: respond with ONLY the JSON object described in the schema, one item
per topic in order. Flashcards stay quick; question answers should be full,
clear explanations with optional key points and an example.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
