"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { pdfToText, scrub } from "@/lib/resume";
import Segmented from "@/components/ui/Segmented";

const PROVIDERS = [
  { id: "groq", label: "Groq" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "gemini", label: "Gemini" },
];

// Upload or paste a resume, ask for the LLM key if needed, and hand back the parsed summary.
export function Uploader({ keys, setKeys, onParsed, onCancel }) {
  const [mode, setMode] = useState("pick"); // pick | paste | needkey | reading
  const [paste, setPaste] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function read(text, fileName) {
    setError("");
    const clean = scrub(text);
    if (clean.length < 150) {
      setMode("pick");
      return setError("There isn't enough text to read. If it's a scanned image, paste the text instead.");
    }
    if (!keys.llm_api_key.trim()) {
      setPending({ text: clean, fileName });
      return setMode("needkey");
    }
    setMode("reading");
    try {
      const r = await api("resume/parse", {
        method: "POST",
        body: { text: clean, file_name: fileName, llm_provider: keys.llm_provider, llm_api_key: keys.llm_api_key.trim(), llm_model: keys.llm_model?.trim() || null },
      });
      const base = fileName && fileName !== "Pasted text" ? fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ") : "My resume";
      onParsed({ ...r, label: base.slice(0, 60) });
    } catch (e) {
      setError(e.message);
      setMode("pick");
    }
  }

  async function onFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("Upload a PDF, or paste the text instead.");
    if (file.size > 5 * 1024 * 1024) return setError("That file is over 5 MB. Upload a shorter PDF.");
    setError("");
    setMode("reading");
    try {
      await read(await pdfToText(file), file.name.slice(0, 120));
    } catch {
      setMode("pick");
      setError("That PDF couldn't be opened. Try another file, or paste the text instead.");
    }
  }

  return (
    <div>
      {mode === "pick" && (
        <div>
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
            className="w-full rounded-2xl border-2 border-dashed border-line hover:border-violet bg-paper/60 px-5 py-6 text-center transition-colors">
            <Upload size={20} className="mx-auto text-violet" aria-hidden />
            <span className="mt-2 block font-medium text-ink">Upload a resume (PDF)</span>
            <span className="block text-sm text-muted">Read in your browser. Contact details are removed before anything is sent.</span>
          </button>
          <div className="mt-3 flex gap-4">
            <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => setMode("paste")}>Paste the text instead</button>
            {onCancel && <button type="button" className="text-sm text-muted" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      )}
      {mode === "paste" && (
        <div>
          <label className="field-label" htmlFor="resume-text">Resume text</label>
          <textarea id="resume-text" className="field min-h-40" value={paste} maxLength={20000} onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste your resume here" />
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary !py-2" onClick={() => read(paste, "Pasted text")}>Read my resume</button>
            <button type="button" className="btn btn-ghost !py-2" onClick={() => setMode("pick")}>Back</button>
          </div>
        </div>
      )}
      {mode === "needkey" && (
        <div className="space-y-4">
          <p className="text-ink-2">Rapport reads your resume with your LLM key. It&apos;s used for this one request and isn&apos;t stored.</p>
          <Segmented label="LLM provider" size="sm" value={keys.llm_provider} options={PROVIDERS}
            onChange={(v) => setKeys((k) => ({ ...k, llm_provider: v }))} />
          <input type="password" autoComplete="off" spellCheck={false} className="field font-mono" placeholder="Your LLM key"
            value={keys.llm_api_key} onChange={(e) => setKeys((k) => ({ ...k, llm_api_key: e.target.value }))} />
          <button type="button" className="btn btn-primary !py-2" disabled={!keys.llm_api_key.trim()}
            onClick={() => pending && read(pending.text, pending.fileName)}>Read my resume</button>
        </div>
      )}
      {mode === "reading" && (
        <div className="flex items-center gap-3 text-ink-2 py-2">
          <motion.span className="h-2.5 w-2.5 rounded-full bg-violet" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }} />
          Reading your resume…
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }) {
  const [adding, setAdding] = useState("");
  return (
    <div>
      <p className="field-label">{label}</p>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <motion.li key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2">
              <input className="field !py-1.5 text-[0.95rem]" value={it} maxLength={140}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" aria-label={`Remove ${it}`} className="p-2 text-muted hover:text-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}><X size={16} /></button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-1.5 flex gap-2">
        <input className="field !py-1.5 text-[0.95rem]" value={adding} placeholder={placeholder} maxLength={140}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && adding.trim()) { e.preventDefault(); onChange([...items, adding.trim()]); setAdding(""); } }} />
        <button type="button" aria-label={`Add to ${label}`} className="p-2 text-violet" disabled={!adding.trim()}
          onClick={() => { onChange([...items, adding.trim()]); setAdding(""); }}><Plus size={18} /></button>
      </div>
    </div>
  );
}

// Review and edit a resume summary. `saveChoice` shows a "keep it in my resumes" option.
export function Editor({ draft, setDraft, onDone, onCancel, doneLabel = "Save", saveChoice = false, save, setSave }) {
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const [skill, setSkill] = useState("");
  return (
    <div className="space-y-5">
      <div>
        <label className="field-label" htmlFor="resume-label">Name this resume</label>
        <input id="resume-label" className="field" value={draft.label || ""} maxLength={60} placeholder="e.g. Backend roles, Product roles"
          onChange={(e) => set("label")(e.target.value)} />
      </div>
      <p className="text-ink-2">Check what Rapport picked up. Remove anything you don&apos;t want to be asked about.</p>
      <ListEditor label="Roles" items={draft.roles} onChange={set("roles")} placeholder="Add a role" />
      <div>
        <p className="field-label">Projects</p>
        <ul className="space-y-2">
          {draft.projects.map((p, i) => (
            <li key={i} className="rounded-xl border border-line p-3 flex gap-2">
              <div className="flex-1 space-y-1.5">
                <input className="field !py-1.5 font-medium" value={p.title} maxLength={120} placeholder="Project name"
                  onChange={(e) => set("projects")(draft.projects.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <textarea className="field !py-1.5 text-[0.95rem] min-h-14" value={p.detail} maxLength={320} placeholder="What you built and your part"
                  onChange={(e) => set("projects")(draft.projects.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))} />
              </div>
              <button type="button" aria-label={`Remove ${p.title || "project"}`} className="p-2 self-start text-muted hover:text-danger"
                onClick={() => set("projects")(draft.projects.filter((_, j) => j !== i))}><X size={16} /></button>
            </li>
          ))}
        </ul>
        {draft.projects.length < 4 && (
          <button type="button" className="mt-2 text-sm text-violet flex items-center gap-1"
            onClick={() => set("projects")([...draft.projects, { title: "", detail: "" }])}><Plus size={15} /> Add a project</button>
        )}
      </div>
      <ListEditor label="Results with numbers" items={draft.numbers} onChange={set("numbers")} placeholder="e.g. Cut p99 latency from 300 ms to 80 ms" />
      <div>
        <p className="field-label">Skills and tools</p>
        <div className="flex flex-wrap gap-2">
          {draft.skills.map((s, i) => (
            <span key={`${s}-${i}`} className="chip !py-1 !pl-3 !pr-1.5">
              {s}
              <button type="button" aria-label={`Remove ${s}`} className="p-0.5 text-muted hover:text-danger" onClick={() => set("skills")(draft.skills.filter((_, j) => j !== i))}><X size={13} /></button>
            </span>
          ))}
          <input className="field !w-40 !py-1 text-sm" value={skill} placeholder="Add a skill" maxLength={40}
            onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && skill.trim()) { e.preventDefault(); set("skills")([...draft.skills, skill.trim()]); setSkill(""); } }} />
        </div>
      </div>
      {saveChoice && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span>
            <span className="font-medium text-ink">Keep it in my resumes</span>
            <span className="block text-sm text-muted">Only this short list is kept, never the file. Signed in, it&apos;s saved to your account; otherwise in this browser.</span>
          </span>
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary !py-2" disabled={!(draft.label || "").trim()} onClick={onDone}>{doneLabel}</button>
        <button type="button" className="btn btn-ghost !py-2" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
