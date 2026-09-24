import { useEffect, useMemo, useState } from 'react';
import TopicPicker from './TopicPicker.jsx';
import SubjectTree from './SubjectTree.jsx';
import { expandTopics } from '../api.js';

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Split on newlines and commas, but keep commas INSIDE parentheses together so a
// depth spec like "OS(Easy, Medium, Hard)" stays a single topic.
const splitTopics = (text) =>
  String(text || '')
    .split('\n')
    .flatMap((line) => line.split(/,(?![^(]*\))/))
    .map((t) => t.trim())
    .filter(Boolean);

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const t of list) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Shared setup for all modes: type or PDF-pick topics, set exam date + hours. */
export default function SetupScreen({ onConfirm, error }) {
  const [typedText, setTypedText] = useState('');
  const [picked, setPicked] = useState([]);
  const [removedPicked, setRemovedPicked] = useState(() => new Set());
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);

  // "Break into subtopics": disambiguate + decompose the typed list into a
  // Subject → Unit → Topic tree (same shape as the PDF picker) so a broad entry
  // like "DSA" becomes real, pickable subtopics instead of one atomic topic.
  const [expandSubjects, setExpandSubjects] = useState([]);
  const [expandChecked, setExpandChecked] = useState(() => new Set());
  const [expandOpen, setExpandOpen] = useState(() => new Set());
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState('');

  // Drop suppressions once a topic is no longer picked, so re-checking works.
  useEffect(() => {
    setRemovedPicked((s) => {
      const next = new Set([...s].filter((t) => picked.includes(t)));
      return next.size === s.size ? s : next;
    });
  }, [picked]);

  const allTopics = useMemo(
    () =>
      dedupe([
        ...splitTopics(typedText),
        ...picked.filter((t) => !removedPicked.has(t)),
        ...expandChecked,
      ]),
    [typedText, picked, removedPicked, expandChecked],
  );
  const min = todayStr();
  const canContinue = allTopics.length > 0 && examDate && Number(hoursPerDay) > 0;

  function removeTopic(t) {
    setTypedText((cur) => splitTopics(cur).filter((x) => x !== t).join('\n'));
    if (picked.includes(t)) setRemovedPicked((s) => new Set(s).add(t));
    if (expandChecked.has(t)) {
      setExpandChecked((s) => {
        const next = new Set(s);
        next.delete(t);
        return next;
      });
    }
  }

  async function handleExpand() {
    const topics = splitTopics(typedText);
    if (topics.length === 0 || expanding) return;
    setExpanding(true);
    setExpandError('');
    try {
      const { subjects } = await expandTopics(topics);
      setExpandSubjects(subjects);
      // Preselect everything the model returned; open every subject.
      const allSub = subjects.flatMap((s) => s.units.flatMap((u) => u.topics));
      setExpandChecked(new Set(allSub));
      setExpandOpen(new Set(subjects.map((s) => `s:${s.name}`)));
      setTypedText(''); // avoid double-counting the broad entry as its own topic
    } catch (err) {
      setExpandError(err.message || 'Could not expand those topics. Please try again.');
    } finally {
      setExpanding(false);
    }
  }

  function toggleExpandOpen(key) {
    setExpandOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExpandTopic(t) {
    setExpandChecked((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function setManyExpand(topics, value) {
    setExpandChecked((s) => {
      const next = new Set(s);
      for (const t of topics) {
        if (value) next.add(t);
        else next.delete(t);
      }
      return next;
    });
  }

  function clearExpansion() {
    setExpandSubjects([]);
    setExpandChecked(new Set());
    setExpandOpen(new Set());
    setExpandError('');
  }

  function handleContinue() {
    if (canContinue) onConfirm({ topics: allTopics, examDate, hoursPerDay: Number(hoursPerDay) });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Set up your study session
        </h2>
        <p className="mt-2 text-slate-500">
          Type your topics or pull them from a syllabus PDF, then plan, learn, and revise.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <label htmlFor="topics" className="mb-1.5 block text-sm font-medium text-slate-700">
            Topics
          </label>
          <textarea
            id="topics"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            rows={5}
            placeholder={'One per line or comma-separated, e.g.\n\nOverfitting\nGradient Descent, Backpropagation\nOperating Systems(Easy, Medium, Hard)'}
            className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Tip: add depth levels in parentheses —{' '}
            <span className="font-medium text-slate-500">DBMS(Easy, Medium, Hard)</span> — and Learn
            will explain that topic at each depth.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExpand}
              disabled={expanding || splitTopics(typedText).length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {expanding ? 'Breaking down…' : '✨ Break into subtopics'}
            </button>
            {expandSubjects.length > 0 && (
              <button
                type="button"
                onClick={clearExpansion}
                className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Broad subjects or acronyms — <span className="font-medium text-slate-500">DSA</span>,{' '}
            <span className="font-medium text-slate-500">OS</span> — become a full subtopic tree you
            can pick from, so your plan, lessons, and revision all cover the real syllabus.
          </p>
          {expandError && (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              {expandError}
            </p>
          )}
          {expandSubjects.length > 0 && (
            <div className="mt-3">
              <SubjectTree
                subjects={expandSubjects}
                checked={expandChecked}
                openKeys={expandOpen}
                onToggleOpen={toggleExpandOpen}
                onToggleTopic={toggleExpandTopic}
                onSetMany={setManyExpand}
              />
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Or import from a syllabus PDF</p>
          <TopicPicker onChange={setPicked} />
        </div>

        {allTopics.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {allTopics.length} topic{allTopics.length === 1 ? '' : 's'} selected
            </p>
            <div className="flex flex-wrap gap-2">
              {allTopics.map((t) => (
                <span
                  key={t}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1.5 text-sm text-indigo-700"
                >
                  <span className="truncate">{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTopic(t)}
                    aria-label={`Remove ${t}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="examDate" className="mb-1.5 block text-sm font-medium text-slate-700">
              Exam date
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              min={min}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label htmlFor="hoursPerDay" className="mb-1.5 block text-sm font-medium text-slate-700">
              Study hours per day
            </label>
            <input
              id="hoursPerDay"
              type="number"
              min={1}
              max={24}
              step={1}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
