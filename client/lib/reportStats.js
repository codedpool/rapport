// Coaching analysis derived from the saved transcript. Pure functions, no network.
// These are pattern checks on the candidate's own words, in English, Hindi and Hinglish.
// They are hints for practice, never part of the score.

const DEVANAGARI = /[ऀ-ॿ]/;
const WORDS_PER_SECOND = 2.3; // ~140 spoken words a minute
export const SWEET_SPOT = [100, 220]; // words: roughly 45 to 95 seconds aloud

const I_WORDS = ["i", "i'm", "i've", "i'd", "i'll", "my", "me", "myself", "maine", "mainne", "main", "mera", "meri", "mere", "mujhe",
  "मैंने", "मैं", "मेरा", "मेरी", "मेरे", "मुझे"];
const WE_WORDS = ["we", "we're", "we've", "we'd", "our", "us", "ourselves", "humne", "hamne", "hum", "hamara", "hamari", "hamare", "humein", "hume",
  "हमने", "हम", "हमारा", "हमारी", "हमारे", "हमें"];
const REASONS = ["because", "since", "so that", "trade-off", "tradeoff", "instead", "otherwise", "the reason", "kyunki", "kyonki", "isliye", "taaki",
  "क्योंकि", "इसलिए", "ताकि", "वरना"];
const SITUATIONS = ["for example", "for instance", "when i", "when we", "at my", "in my last", "in my previous", "once", "last year", "project",
  "jab", "pichhle", "pichle", "ek baar", "जब", "पिछले", "एक बार", "प्रोजेक्ट"];
const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "twenty", "thirty", "forty", "fifty", "hundred",
  "thousand", "lakh", "crore", "million", "percent", "half", "double", "ek", "do", "teen", "char", "paanch", "das", "bees", "sau", "hazaar",
  "एक", "दो", "तीन", "चार", "पांच", "पाँच", "दस", "बीस", "तीस", "पचास", "अस्सी", "सौ", "हज़ार", "हजार", "लाख", "करोड़", "प्रतिशत", "आधा", "दोगुना"];

const tokens = (text) => (text || "").toLowerCase().replace(/[“”"(),.!?।:;]/g, " ").split(/\s+/).filter(Boolean);
const has = (text, phrases) => {
  const t = ` ${tokens(text).join(" ")} `;
  return phrases.some((p) => t.includes(` ${p} `));
};
const count = (toks, list) => toks.filter((w) => list.includes(w)).length;

function numbersIn(text) {
  // Runs of number words or digits become one phrase, plus the unit after them:
  // "तीन सौ milliseconds", "300 to 80 ms" style phrases stay together.
  const raw = (text || "").replace(/[“”"(),!?।:;]/g, " ").split(/\s+/).filter(Boolean).map((w) => w.replace(/\.$/, ""));
  const isNum = (w) => /\d/.test(w) || NUMBER_WORDS.includes(w.toLowerCase());
  const found = [];
  for (let i = 0; i < raw.length; i++) {
    if (!isNum(raw[i])) continue;
    if (raw[i].toLowerCase() === "do" && !(raw[i + 1] && /^(saal|sal|din|mahine|log|baar|hazaar|lakh)$/i.test(raw[i + 1]))) continue;
    let j = i;
    while (j + 1 < raw.length && isNum(raw[j + 1])) j++;
    const endsInUnit = /^(percent|lakh|crore|hazaar|thousand|million|प्रतिशत|लाख|करोड़|हज़ार|हजार)$/i.test(raw[j]);
    const unit = !endsInUnit && raw[j + 1] && raw[j + 1].length <= 14 ? ` ${raw[j + 1]}` : "";
    found.push(raw.slice(i, j + 1).join(" ") + unit);
    i = j;
  }
  return [...new Set(found)].slice(0, 6);
}

export const seconds = (words) => Math.round(words / WORDS_PER_SECOND);

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

// Rewrite a "we" sentence in the first person, keeping the speaker's own words and script.
const TO_I = [
  [/हमने/g, "मैंने"], [/हमारा/g, "मेरा"], [/हमारी/g, "मेरी"], [/हमारे/g, "मेरे"], [/हमें/g, "मुझे"], [/(^|\s)हम(?=\s)/g, "$1मैं"],
  [/\bhumne\b/gi, "maine"], [/\bhamne\b/gi, "maine"], [/\bhamara\b/gi, "mera"], [/\bhamari\b/gi, "meri"], [/\bhamare\b/gi, "mere"],
  [/\bwe've\b/gi, "I've"], [/\bwe're\b/gi, "I'm"], [/\bwe\b/gi, "I"], [/\bour\b/gi, "my"], [/\bus\b/gi, "me"],
];
function toFirstPerson(sentence) {
  return TO_I.reduce((s, [re, to]) => s.replace(re, to), sentence);
}

export function analyse(transcript = [], durationS = 0) {
  const turns = transcript || [];
  // Pair each answer with the question before it; consecutive answer turns merge.
  const qa = [];
  for (const t of turns) {
    if (t.role === "interviewer") qa.push({ q: t.text, qt: t.t, a: "", at: t.t, interrupted: false });
    else if (qa.length) {
      const cur = qa[qa.length - 1];
      cur.a = cur.a ? `${cur.a} ${t.text}` : t.text;
      cur.at = t.t;
    } else qa.push({ q: "", qt: 0, a: t.text, at: t.t });
  }
  const answered = qa.filter((x) => x.a);

  const items = answered.map((x, i) => {
    const toks = tokens(x.a);
    const iCount = count(toks, I_WORDS);
    const weCount = count(toks, WE_WORDS);
    const nums = numbersIn(x.a);
    return {
      n: i + 1,
      question: x.q,
      answer: x.a,
      words: toks.length,
      secs: seconds(toks.length),
      iCount,
      weCount,
      numbers: nums,
      checks: {
        situation: has(x.a, SITUATIONS),
        you: iCount > 0 && iCount >= weCount,
        number: nums.length > 0,
        reason: has(x.a, REASONS),
      },
    };
  });

  const allYou = answered.map((x) => x.a).join(" ");
  const youToks = tokens(allYou);
  const themToks = tokens(qa.map((x) => x.q).join(" "));
  const I = count(youToks, I_WORDS);
  const WE = count(youToks, WE_WORDS);
  const avgWords = items.length ? Math.round(items.reduce((s, x) => s + x.words, 0) / items.length) : 0;
  const missing = (k) => items.filter((x) => !x.checks[k]).length;

  // The ribbon: every turn in order, sized by words.
  const ribbon = turns.map((t) => ({ who: t.role === "candidate" ? "you" : "them", words: tokens(t.text).length, text: t.text, t: t.t }));

  // One sentence to rewrite in the first person, from the candidate's own words.
  const weSentence = (allYou.match(/[^.!?।]+[.!?।]?/g) || []).map((s) => s.trim())
    .find((s) => tokens(s).some((w) => WE_WORDS.includes(w)));

  return {
    items,
    I, WE,
    avgWords,
    avgSecs: seconds(avgWords),
    youShare: youToks.length + themToks.length ? youToks.length / (youToks.length + themToks.length) : 0,
    hindiShare: youToks.length ? youToks.filter((w) => DEVANAGARI.test(w)).length / youToks.length : 0,
    duration: durationS || (turns.length ? turns[turns.length - 1].t : 0),
    ribbon,
    missing: { situation: missing("situation"), you: missing("you"), number: missing("number"), reason: missing("reason") },
    weSentence: weSentence ? { before: weSentence, after: toFirstPerson(weSentence) } : null,
  };
}

// The single most useful change, chosen from the analysis in priority order.
export function oneThing(a, feedback) {
  const n = a.items.length || 1;
  if (a.WE >= 2 && a.WE > a.I * 1.5 && a.weSentence) {
    return {
      kind: "ownership",
      headline: "Say what you did, not what the team did.",
      why: `You said “we” ${a.WE} ${a.WE === 1 ? "time" : "times"} and “I” ${a.I} ${a.I === 1 ? "time" : "times"}. An interviewer is hiring you, not your team, so they need to hear your part.`,
      tryThis: a.weSentence,
    };
  }
  if (a.avgWords && a.avgWords < SWEET_SPOT[0] * 0.6) {
    return {
      kind: "length",
      headline: "Give each answer room to breathe.",
      why: `Your answers averaged ${a.avgWords} words, about ${a.avgSecs} seconds aloud. Strong spoken answers usually run 45 to 90 seconds: the situation, what you did, and how it turned out.`,
      tryThis: null,
    };
  }
  if (a.missing.number >= Math.ceil(n / 2)) {
    return {
      kind: "numbers",
      headline: "Put a number on the result.",
      why: `${a.missing.number} of your ${n} answers had no number in them. “Latency dropped from 300 to 80 milliseconds” lands harder than “it got faster”.`,
      tryThis: null,
    };
  }
  if (a.missing.reason >= Math.ceil(n / 2)) {
    return {
      kind: "reasons",
      headline: "Explain why, not just what.",
      why: `${a.missing.reason} of your ${n} answers described a choice without the reason behind it. The “because” is where interviewers see your judgement.`,
      tryThis: null,
    };
  }
  if (a.avgWords > SWEET_SPOT[1] * 1.4) {
    return {
      kind: "long",
      headline: "Land the point sooner.",
      why: `Your answers averaged ${a.avgWords} words, about ${a.avgSecs} seconds. Lead with the result, then give the detail if they ask.`,
      tryThis: null,
    };
  }
  const imp = feedback?.improvements?.[0];
  return {
    kind: "feedback",
    headline: imp ? imp.point : "Keep this shape and go one level deeper.",
    why: imp?.quote ? null : "Your answers had a clear shape. Next time, add one more concrete detail to each.",
    tryThis: null,
  };
}

export function verdict(overall) {
  if (overall >= 8) return "Strong";
  if (overall >= 6) return "Promising";
  if (overall >= 4) return "Getting there";
  return "Early days";
}
