/**
 * Builds chat messages for POST /api/practice-questions.
 *
 * Practice questions used to be baked into the study plan (one big LLM call
 * that rated every topic AND authored 4-6 questions each), which blew the token
 * budget on a full syllabus. They are now fetched per topic on demand — the
 * plan only rates topics — so this prompt mirrors revisePrompt.js: given a small
 * topic list, return a bounded set of mixed-type questions per topic.
 *
 * Questions are a MIX of three types so the student gets both instant,
 * deterministic self-checks (mcq / fill) and deeper open-ended recall (open):
 *   - "mcq":  multiple choice, 4 options, one correct — graded in the browser.
 *   - "fill": fill-in-the-blank, matched locally against answer + synonyms.
 *   - "open": free-text, graded by the AI (/api/grade).
 */

const SCHEMA_DESCRIPTION = `{
  "items": [
    {
      "topic": string,                          // echo the requested topic
      "questions": [                            // 4-6 items per topic, MIXED types
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

const SYSTEM_PROMPT = `You are LearnLoop, an expert academic tutor writing practice questions.

Given a list of study topics, produce practice questions that let a student
test themselves before an exam.

Follow these rules exactly:
1. Produce one item per requested topic, in the same order, echoing the topic
   name back in "topic".
2. For each topic produce 4-6 practice questions as a MIX of these three types,
   and include AT LEAST ONE "mcq" and AT LEAST ONE "fill" for every topic:
   - "mcq": a multiple-choice question with EXACTLY 4 "options". "correctIndex"
     is the 0-based position of the correct option in that array. Make the wrong
     options plausible, not obviously silly. Add a one-sentence "explanation".
   - "fill": a fill-in-the-blank sentence with the gap written as "_____" (five
     underscores). "answer" is the missing word or short phrase; "acceptable"
     lists any other spellings/synonyms that should also count (use [] if none).
   - "open": a conceptual or applied question with a concise "answer" (1-3
     sentences — the answer or a short worked idea, not a full essay).
   Every question object MUST include its "type" field.
3. Use simple, clear language. Be accurate; do not fabricate specifics you are
   unsure of.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary. The first character must be "{" and the last "}".

Schema:
${SCHEMA_DESCRIPTION}`;

export function buildQuestionsMessages(topics) {
  const list = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const userPrompt = `Create practice questions for these topics:

${list}

Remember: respond with ONLY the JSON object described in the schema, one item
per topic in order. 4-6 questions per topic as a MIX of multiple-choice ("mcq"),
fill-in-the-blank ("fill"), and open-ended ("open") — at least one "mcq" and one
"fill" each. Every question object MUST include its "type" field.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
