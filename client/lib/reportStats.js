// Interview statistics derived from the saved transcript. Pure functions, no network.

const DEVANAGARI = /[ऀ-ॿ]/;
// Hesitation words, for awareness only. Never part of the score.
const FILLERS = ["um", "umm", "uh", "uhh", "hmm", "basically", "actually", "you know", "i mean", "matlab", "मतलब", "यानी"];

function words(text) {
  return (text || "").split(/\s+/).filter(Boolean);
}

export function fmtDuration(s) {
  if (!s && s !== 0) return "–";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

export function fmtClock(s) {
  const m = Math.floor((s || 0) / 60);
  return `${m}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;
}

export function computeStats(transcript = [], durationS = 0) {
  const turns = transcript || [];
  const you = turns.filter((t) => t.role === "candidate");
  const them = turns.filter((t) => t.role === "interviewer");
  const youWords = you.flatMap((t) => words(t.text));
  const themWords = them.flatMap((t) => words(t.text));

  // Time per answer: from the end of the question before it to the end of the answer.
  const answerTimes = [];
  turns.forEach((t, i) => {
    if (t.role !== "candidate") return;
    const prev = [...turns.slice(0, i)].reverse().find((p) => p.role === "interviewer");
    if (prev && t.t > prev.t) answerTimes.push(t.t - prev.t);
  });

  const hindi = youWords.filter((w) => DEVANAGARI.test(w)).length;
  const lower = ` ${you.map((t) => t.text.toLowerCase()).join(" ")} `;
  const fillers = FILLERS.reduce((n, f) => {
    const re = new RegExp(`(^|[\\s,.!?।])${f.replace(/ /g, "\\s+")}(?=[\\s,.!?।]|$)`, "g");
    return n + (lower.match(re) || []).length;
  }, 0);

  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const totalWords = youWords.length + themWords.length;
  return {
    duration: durationS || (turns.length ? turns[turns.length - 1].t : 0),
    answers: you.length,
    questions: them.length,
    youWords: youWords.length,
    themWords: themWords.length,
    talkShare: totalWords ? youWords.length / totalWords : 0,
    avgAnswerWords: Math.round(avg(you.map((t) => words(t.text).length))),
    longestAnswerWords: Math.max(0, ...you.map((t) => words(t.text).length)),
    avgAnswerTime: Math.round(avg(answerTimes)),
    hindiShare: youWords.length ? hindi / youWords.length : 0,
    interruptions: them.filter((t) => t.interrupted).length,
    fillers,
  };
}

export function verdict(overall) {
  if (overall >= 8) return { label: "Strong", tone: "good" };
  if (overall >= 6) return { label: "Promising", tone: "good" };
  if (overall >= 4) return { label: "Getting there", tone: "warn" };
  return { label: "Early days", tone: "warn" };
}
