import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// pdf.js runs its parser in a web worker; Vite serves the bundled worker file
// via the ?url import above. Everything here executes in the browser, so the
// PDF binary never leaves the user's device — only extracted text is sent on.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/** Flatten one page's text items, inserting spaces / line breaks by position. */
function itemsToText(items) {
  let out = '';
  let lastY = null;
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    const y = it.transform?.[5];
    if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
      out += '\n';
    } else if (out && !/\s$/.test(out)) {
      out += ' ';
    }
    out += it.str;
    if (it.hasEOL) out += '\n';
    if (y !== undefined) lastY = y;
  }
  return out;
}

/**
 * Extract text from a PDF File/Blob, one string per page.
 * Throws a friendly Error if the file cannot be parsed.
 */
export async function extractPdfText(file) {
  let pdf;
  try {
    const data = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch {
    throw new Error('Could not read that PDF. Is the file valid and not password-protected?');
  }
  const pages = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items));
    }
  } finally {
    pdf.destroy();
  }
  return pages;
}

const norm = (line) => line.trim().replace(/\s+/g, ' ').toLowerCase();

/** Drop lines that repeat across most pages (headers/footers) and bare page numbers. */
export function dropRepeatedLines(pages) {
  const counts = new Map();
  for (const p of pages) {
    const seen = new Set();
    for (const line of p.split('\n')) {
      const k = norm(line);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.5));
  const isBoilerplate = (line) => {
    const k = norm(line);
    if (!k) return false;
    if (/^page\s*\d+/.test(k) || /^\d+$/.test(k)) return true;
    return k.length <= 80 && (counts.get(k) || 0) >= threshold;
  };
  return pages.map((p) => p.split('\n').filter((l) => !isBoilerplate(l)).join('\n'));
}

/**
 * Group page texts into chunks under ~maxChars, splitting only on page
 * boundaries so the backend extractor gets coherent, bounded slices.
 */
export function chunkPages(pages, maxChars = 12_000) {
  const chunks = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = '';
  };
  for (const p of pages) {
    const piece = p.trim();
    if (!piece) continue;
    if (cur && cur.length + piece.length + 2 > maxChars) flush();
    cur = cur ? `${cur}\n\n${piece}` : piece;
    if (cur.length >= maxChars) flush();
  }
  flush();
  return chunks;
}
