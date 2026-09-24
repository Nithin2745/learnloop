import { useEffect, useState } from 'react';
import { extractPdfText, dropRepeatedLines, chunkPages } from '../lib/pdf.js';
import { extractTopics } from '../api.js';
import SubjectTree from './SubjectTree.jsx';

// Normalize for dedupe: lowercase, fold "&" → "and", collapse whitespace. The
// ampersand fold merges near-duplicates the extractor emits across chunks
// (e.g. "AR & VR" vs "AR and VR"). We deliberately don't strip other
// punctuation, so distinct topics like "C++" and "C#" stay separate.
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();

/** Merge freshly-extracted subjects into the accumulator, deduping by normalized name. */
function mergeSubjects(acc, incoming) {
  const out = acc.map((s) => ({ ...s, units: s.units.map((u) => ({ ...u, topics: [...u.topics] })) }));
  const byName = (list, name) => list.find((x) => norm(x.name) === norm(name));
  for (const sub of incoming || []) {
    if (!sub?.name) continue;
    let s = byName(out, sub.name);
    if (!s) {
      s = { name: sub.name, code: sub.code || '', units: [] };
      out.push(s);
    } else if (!s.code && sub.code) {
      s.code = sub.code;
    }
    for (const unit of sub.units || []) {
      if (!unit?.name) continue;
      let u = byName(s.units, unit.name);
      if (!u) {
        u = { name: unit.name, topics: [] };
        s.units.push(u);
      }
      const seen = new Set(u.topics.map(norm));
      for (const t of unit.topics || []) {
        if (t && !seen.has(norm(t))) {
          seen.add(norm(t));
          u.topics.push(t);
        }
      }
    }
  }
  return out;
}

/**
 * Upload a syllabus PDF and pick topics from it. The PDF is parsed entirely in
 * the browser (pdfjs) — only the extracted text is sent to the topic extractor,
 * never the file itself. Checked topics are lifted to the parent via onChange.
 */
export default function TopicPicker({ onChange }) {
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [subjects, setSubjects] = useState([]);
  const [checked, setChecked] = useState(() => new Set());
  const [openKeys, setOpenKeys] = useState(() => new Set());
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    onChange?.([...checked]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const toggleOpen = (key) =>
    setOpenKeys((cur) => {
      const next = new Set(cur);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleTopic = (t) =>
    setChecked((cur) => {
      const next = new Set(cur);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const setMany = (list, on) =>
    setChecked((cur) => {
      const next = new Set(cur);
      for (const t of list) on ? next.add(t) : next.delete(t);
      return next;
    });

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setStatus('working');
    setError('');
    setFileName(file.name);
    setSubjects([]);
    setProgress({ current: 0, total: 0 });
    try {
      const pages = await extractPdfText(file);
      const chunks = chunkPages(dropRepeatedLines(pages));
      if (!chunks.length) throw new Error('No readable text found in that PDF.');
      setProgress({ current: 0, total: chunks.length });
      let merged = [];
      for (let i = 0; i < chunks.length; i++) {
        const { subjects: found } = await extractTopics(chunks[i]);
        merged = mergeSubjects(merged, found);
        setSubjects(merged);
        setProgress({ current: i + 1, total: chunks.length });
      }
      if (merged[0]) setOpenKeys(new Set([`s:${merged[0].name}`]));
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Could not read topics from that PDF.');
      setStatus('error');
    }
  }

  const working = status === 'working';

  return (
    <div className="space-y-4">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          working
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
        }`}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleFile}
          disabled={working}
        />
        <span className="text-2xl" aria-hidden="true">📄</span>
        <span className="mt-2 text-sm font-medium text-slate-700">
          {fileName || 'Choose a syllabus PDF'}
        </span>
        <span className="mt-1 text-xs text-slate-400">
          Parsed on your device — only the extracted text is sent, never the file.
        </span>
      </label>

      {working && (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          {progress.total
            ? `Analyzing section ${progress.current} of ${progress.total}…`
            : 'Reading the PDF…'}
        </div>
      )}

      {status === 'error' && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {subjects.length > 0 && (
        <SubjectTree
          subjects={subjects}
          checked={checked}
          openKeys={openKeys}
          onToggleOpen={toggleOpen}
          onToggleTopic={toggleTopic}
          onSetMany={setMany}
        />
      )}
    </div>
  );
}
