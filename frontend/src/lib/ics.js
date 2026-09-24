/**
 * Builds an RFC-5545 .ics calendar from a study plan and triggers a download.
 * Each schedule day becomes an all-day VEVENT so the plan drops straight into
 * Google / Apple Calendar. Frontend-only — no server round-trip.
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

/** UTC timestamp in iCalendar form: YYYYMMDDTHHMMSSZ */
function dstamp() {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** YYYY-MM-DD -> YYYYMMDD */
function dateVal(iso) {
  return String(iso).replaceAll('-', '');
}

/** All-day DTEND is exclusive, so it must be the day AFTER the event date. */
function nextDateVal(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Escape text for an iCalendar value. */
function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold long lines to <=75 octets with CRLF + leading space (RFC 5545). */
function fold(line) {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 72) {
    parts.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  parts.push(' ' + rest);
  return parts.join('\r\n');
}

export function buildIcs(plan) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LearnLoop//Study Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const stamp = dstamp();

  (plan?.schedule || []).forEach((day, i) => {
    const names = (day.topics || []).map((t) => t.name).filter(Boolean);
    const summary = day.isBufferDay
      ? 'LearnLoop: Revision / Buffer Day'
      : `LearnLoop ${day.dayLabel || `Day ${i + 1}`}: ${names.join(', ') || 'Study'}`;

    const descLines = (day.topics || []).map(
      (t) =>
        `• ${t.name} (${t.difficulty}, ~${t.estimatedHours}h)` +
        (t.isReview ? ' [review]' : ''),
    );
    if (day.isBufferDay && !descLines.length) {
      descLines.push('Light revision and rest before the exam.');
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${dateVal(day.date)}-${i}@learnloop`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateVal(day.date)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDateVal(day.date)}`);
    lines.push(fold(`SUMMARY:${esc(summary)}`));
    lines.push(fold(`DESCRIPTION:${esc(descLines.join('\n'))}`));
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(plan, filename = 'learnloop-study-plan.ics') {
  const blob = new Blob([buildIcs(plan)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
