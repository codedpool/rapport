// Resume handling in the browser: the PDF is read here and never uploaded.
// Only scrubbed text goes to the server, and only the short reviewed summary is ever saved.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL_RE = /(https?:\/\/\S+|www\.\S+|\b(?:linkedin|github|gitlab|behance|leetcode)\.com\/\S*)/gi;
const PHONE = /(?:\+?\d[\d\s().-]{8,}\d)/g;

// Rebuild lines from pdf.js text items by their vertical position.
export async function pdfToText(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, 4); p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const rows = new Map();
    for (const it of items) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      rows.set(key, [...(rows.get(key) || []), { x: it.transform[4], s: it.str }]);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, cells]) => out.push(cells.sort((a, b) => a.x - b.x).map((c) => c.s).join(" ").replace(/\s{2,}/g, " ").trim()));
  }
  return out.join("\n");
}

export function scrub(text) {
  const lines = (text || "").split("\n");
  // The first short line without digits or punctuation is almost always the person's name.
  const first = lines.findIndex((l) => l.trim());
  if (first >= 0 && lines[first].trim().split(/\s+/).length <= 4 && !/[\d:@/|,]/.test(lines[first])) lines.splice(first, 1);
  return lines.join("\n").replace(EMAIL, " ").replace(URL_RE, " ").replace(PHONE, " ").replace(/[ \t]{2,}/g, " ").trim();
}

export function summarize(r) {
  if (!r) return "";
  const parts = [];
  if (r.roles?.[0]) parts.push(r.roles[0]);
  if (r.projects?.length) parts.push(`${r.projects.length} ${r.projects.length === 1 ? "project" : "projects"}`);
  if (r.skills?.length) parts.push(`${r.skills.length} skills`);
  return parts.join(", ");
}

export function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// Guests keep the summary in this browser only.
const LOCAL = "rapport:resume";
export function loadLocalResume() {
  try {
    const raw = localStorage.getItem(LOCAL);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveLocalResume(r) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(r));
  } catch {}
}
export function clearLocalResume() {
  try {
    localStorage.removeItem(LOCAL);
  } catch {}
}
