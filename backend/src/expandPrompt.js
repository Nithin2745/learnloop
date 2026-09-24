/**
 * Builds chat messages for POST /api/expand-topics.
 *
 * Input is a list of short topics a student TYPED (e.g. "DSA", "OS",
 * "Thermodynamics") — not a syllabus PDF. Broad subjects and acronyms must be
 *   (1) DISAMBIGUATED to their most likely academic meaning (so "DSA" becomes
 *       "Data Structures & Algorithms", never "Digital Signature Algorithm"),
 *       using the sibling topics and an optional study level as context; and
 *   (2) DECOMPOSED into atomic, exam-relevant subtopics grouped into units.
 *
 * Output deliberately matches the /api/extract-topics schema
 * (subjects → units → topics) so the same SubjectTree picker renders it. This
 * is the fix for a broad subject flowing through the app as a single atomic
 * topic (which produced a plan that just repeated "DSA" every day, and let the
 * Learn and Revise modes disagree on what "DSA" even meant).
 */

const SCHEMA_DESCRIPTION = `{
  "subjects": [
    {
      "name": string,            // the disambiguated subject, e.g. "Data Structures & Algorithms"
      "code": string,            // always "" for typed input (no course codes)
      "units": [
        {
          "name": string,        // a logical grouping, e.g. "Trees & Graphs"
          "topics": [ string ]   // ATOMIC subtopics — one studyable concept each
        }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop's topic planner.

A student typed a short list of study topics. Some are broad subjects, some are
abbreviations or acronyms, and some are already specific. Turn this list into a
clean, exam-ready Subject → Unit → Topic outline they can pick from.

Follow these rules exactly:
1. DISAMBIGUATE every entry to its most likely ACADEMIC meaning. Resolve
   acronyms to the mainstream course/exam subject, using the OTHER entries and
   the study level as context. Examples: "DSA" → "Data Structures & Algorithms",
   "OS" → "Operating Systems", "DBMS" → "Database Management Systems", "OOP" →
   "Object-Oriented Programming". Prefer the interpretation that is consistent
   with the sibling topics. Never pick an obscure meaning when a common
   coursework meaning fits (e.g. "DSA" among CS topics is NOT the cryptographic
   "Digital Signature Algorithm").
2. DECOMPOSE each broad subject into ATOMIC subtopics — individual, studyable
   concepts, each specific enough to teach and quiz on its own ("Binary Search
   Trees", "Quicksort", "Deadlock detection"), grouped into 2-5 logical units.
   Produce roughly 8-16 subtopics for a broad subject. NEVER leave a broad
   subject as a single topic.
3. If an entry is ALREADY atomic/specific (e.g. "Bubble Sort", "TCP handshake"),
   keep it as-is: emit it as a subject whose single unit "Topics" holds just
   that one topic. Do not pad a narrow request with unrelated material.
4. Order units and topics in a sensible LEARNING order (prerequisites first).
5. Cover the standard exam syllabus for the subject; do not invent fringe or
   non-standard topics. Keep topic wording concise (no trailing punctuation).
6. Every subject's "code" is "".

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary. The first character must be "{" and the last "}".

Schema:
${SCHEMA_DESCRIPTION}`;

/**
 * @param {string[]} topics  Raw typed topics (already trimmed, non-empty).
 * @param {string}   [level] Optional study level hint (e.g. "undergraduate").
 */
export function buildExpandMessages(topics, level = '') {
  const list = topics.map((t) => `- ${t}`).join('\n');
  const levelLine = level
    ? `\nStudy level: ${level} — pitch the subtopics at this level.`
    : '';

  const userPrompt = `Turn my typed topics into a disambiguated, decomposed
Subject → Unit → Topic outline I can pick subtopics from.

Topics:
${list}
${levelLine}

Remember: resolve any acronyms to their mainstream academic meaning using the
other topics as context, break every broad subject into atomic exam-relevant
subtopics, and respond with ONLY the JSON object described in the schema.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
