/**
 * Builds chat messages for POST /api/extract-topics.
 *
 * Input is raw text extracted from a syllabus PDF — often positionally
 * scrambled and noisy (page headers/footers, credit tables, CO-PO-PSO
 * mappings, book lists). The model recovers a clean Subject → Unit → Topic
 * outline and emits ONLY the target JSON object.
 */

const SCHEMA_DESCRIPTION = `{
  "subjects": [
    {
      "name": string,            // course/subject title, e.g. "Deep Learning"
      "code": string,            // course code if present (e.g. "231CS7T01"), else ""
      "units": [
        {
          "name": string,        // clean unit label, e.g. "Unit I: Fundamentals"
          "topics": [ string ]   // atomic topics, one concept each
        }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT = `You are LearnLoop's syllabus parser.

You receive raw text extracted from a syllabus PDF. The extraction is messy:
lines may be out of order, spacing is irregular, and unit headings vary
("UNIT-I:", "UNIT  II:", "Unit I:"). Recover a clean outline of subjects, their
units, and the topics inside each unit.

Follow these rules exactly:
1. Identify each distinct SUBJECT / course. Capture its title and, if a course
   code appears near it (e.g. "231CS7T01"), its code; otherwise use "".
2. Within a subject, identify its UNITS (Unit I..V or similar). Normalize the
   heading to a clean readable label. If a subject has no unit structure, use a
   single unit named "Topics".
3. Split each unit's content into ATOMIC topics — individual concepts, not long
   comma-run sentences. Strip inline reference markers like "[Text Book 2]".
4. IGNORE all boilerplate: page headers/footers and college names, page numbers,
   "Course Objectives", "Course Outcomes"/CO descriptions, CO-PO-PSO mapping
   tables, credit ("L T P C") lines, "Text Books", "Reference Books", "Online &
   Web resources", and URLs. None of these are topics.
5. Do NOT invent topics not present in the text. Preserve the source wording of
   topics (lightly cleaned for spacing/casing).
6. If the text has only one subject with no clear title, name it "Syllabus".

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching this schema. No markdown code
fences, no commentary. The first character must be "{" and the last "}".

Schema:
${SCHEMA_DESCRIPTION}`;

export function buildExtractMessages(text) {
  const userPrompt = `Extract the subject → unit → topic outline from this syllabus text.

"""
${text}
"""

Remember: respond with ONLY the JSON object described in the schema. Ignore all
boilerplate and keep topics atomic.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
