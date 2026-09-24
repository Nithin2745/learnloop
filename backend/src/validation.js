/**
 * Input validation for POST /api/generate-plan.
 * Returns { valid, errors, value } where value carries derived fields
 * (today, daysRemaining) used downstream by the prompt builder.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function localTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True only for real calendar dates (rejects e.g. 2026-02-30). */
function isRealDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Whole-day difference between two YYYY-MM-DD strings (to - from). */
function dayDiff(fromStr, toStr) {
  const from = Date.parse(`${fromStr}T00:00:00Z`);
  const to = Date.parse(`${toStr}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function validateGeneratePlanInput(body) {
  const errors = [];
  const b = body || {};

  // topics
  const topics = typeof b.topics === 'string' ? b.topics.trim() : '';
  if (!topics) {
    errors.push('topics is required and must be a non-empty string.');
  }

  // examDate
  const today = localTodayStr();
  let daysRemaining = 0;
  const examDate = typeof b.examDate === 'string' ? b.examDate.trim() : '';
  if (!DATE_RE.test(examDate) || !isRealDate(examDate)) {
    errors.push('examDate is required and must be a valid date in YYYY-MM-DD format.');
  } else {
    const diff = dayDiff(today, examDate);
    if (diff < 1) {
      errors.push('examDate must be in the future (at least one day from today).');
    } else {
      // "today counts as a study day" -> inclusive day count up to the exam day
      daysRemaining = diff + 1;
    }
  }

  // hoursPerDay (default 3)
  let hoursPerDay = b.hoursPerDay;
  if (hoursPerDay === undefined || hoursPerDay === null || hoursPerDay === '') {
    hoursPerDay = 3;
  }
  hoursPerDay = Number(hoursPerDay);
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0 || hoursPerDay > 24) {
    errors.push('hoursPerDay must be a number between 1 and 24.');
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  return {
    valid: true,
    errors: [],
    value: { topics, examDate, hoursPerDay, today, daysRemaining },
  };
}

const MAX_EXTRACT_TEXT = 60_000;
const MAX_TOPICS = 25;
const MAX_TOPIC_LEN = 200;

/**
 * Validate POST /api/extract-topics: { text } is a non-empty string within a
 * hard length cap (the client sends the syllabus in page-boundary chunks).
 */
export function validateExtractInput(body) {
  const errors = [];
  const b = body || {};
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) {
    errors.push('text is required and must be a non-empty string.');
  } else if (text.length > MAX_EXTRACT_TEXT) {
    errors.push(
      `text must be at most ${MAX_EXTRACT_TEXT} characters (send it in smaller chunks).`
    );
  }
  if (errors.length > 0) return { valid: false, errors, value: null };
  return { valid: true, errors: [], value: { text } };
}

/**
 * Shared for POST /api/learn and /api/revise: topics is an array of 1-25
 * non-empty strings, each within a per-topic length cap. Trims and drops
 * blanks before the count/length checks.
 */
function validateTopicsList(body) {
  const errors = [];
  const b = body || {};
  let topics = [];
  if (!Array.isArray(b.topics)) {
    errors.push('topics is required and must be an array of strings.');
  } else {
    topics = b.topics
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean);
    if (topics.length === 0) {
      errors.push('topics must contain at least one non-empty string.');
    } else if (topics.length > MAX_TOPICS) {
      errors.push(`topics must contain at most ${MAX_TOPICS} items.`);
    } else if (topics.some((t) => t.length > MAX_TOPIC_LEN)) {
      errors.push(`each topic must be at most ${MAX_TOPIC_LEN} characters.`);
    }
  }
  if (errors.length > 0) return { valid: false, errors, value: null };
  return { valid: true, errors: [], value: { topics } };
}

export function validateLearnInput(body) {
  return validateTopicsList(body);
}

export function validateReviseInput(body) {
  return validateTopicsList(body);
}
