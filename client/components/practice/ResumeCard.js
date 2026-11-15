"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { fmtDate, summarize } from "@/lib/resume";
import { addResume, content, listResumes, updateResume } from "@/lib/resumeStore";
import { Editor, Uploader } from "@/components/resume/ResumeTools";

// Pick which resume (if any) this interview should use.
// value: the chosen resume summary or null. onChange(value) updates it.
export default function ResumeCard({ value, onChange, keys, setKeys }) {
  const [list, setList] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [where, setWhere] = useState(null);
  const [selected, setSelected] = useState(null); // resume id, "none", or "once"
  const [once, setOnce] = useState(null); // a resume used for this interview only
  const [mode, setMode] = useState("loading"); // loading | list | add | review | edit
  const [draft, setDraft] = useState(null);
  const [save, setSave] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listResumes()
      .then((d) => {
        if (!alive) return;
        setList(d.resumes);
        setDefaultId(d.default_id);
        setWhere(d.where);
        const def = d.resumes.find((r) => r.id === d.default_id);
        setSelected(def ? def.id : "none");
        onChange(def ? content(def) : null);
        setMode(d.resumes.length ? "list" : "add");
      })
      .catch(() => alive && setMode("add"));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(id) {
    setSelected(id);
    if (id === "none") return onChange(null);
    if (id === "once") return onChange(content(once));
    const r = list.find((x) => x.id === id);
    onChange(r ? content(r) : null);
  }

  async function finishNew() {
    setError("");
    if (!save) {
      setOnce(draft);
      setSelected("once");
      onChange(content(draft));
      return setMode("list");
    }
    try {
      const out = await addResume(where || "browser", draft);
      const next = [...list, out.resume];
      setList(next);
      setDefaultId(out.default_id);
      setSelected(out.resume.id);
      onChange(content(out.resume));
      setMode("list");
    } catch (e) {
      setError(e.message);
    }
  }

  async function finishEdit() {
    setError("");
    try {
      const out = await updateResume(where, draft.id, draft);
      setList(list.map((r) => (r.id === draft.id ? out.resume : r)));
      if (selected === draft.id) onChange(content(out.resume));
      setMode("list");
    } catch (e) {
      setError(e.message);
    }
  }

  const rows = [...list, ...(once ? [{ ...once, id: "once", label: `${once.label} (this interview only)` }] : [])];

  return (
    <div className="mt-10 rounded-[1.5rem] border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-violet-soft text-violet grid place-items-center"><FileText size={19} aria-hidden /></span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink">Your resume <span className="font-normal text-muted">(optional)</span></h3>
          <p className="text-[0.95rem] text-ink-2">The interviewer will ask about your real projects and results.</p>
        </div>
        {where === "account" && list.length > 0 && (
          <Link href="/account#resumes" className="text-sm text-accent underline underline-offset-4 whitespace-nowrap">Manage resumes</Link>
        )}
      </div>

      <div className="mt-5">
        {mode === "loading" && <p className="text-muted">Loading your resumes…</p>}

        {mode === "list" && (
          <fieldset>
            <legend className="sr-only">Resume for this interview</legend>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <label className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${selected === r.id ? "border-violet bg-violet-soft/60" : "border-line hover:border-ink-2"}`}>
                    <input type="radio" name="resume" className="mt-1 accent-[var(--violet)]" checked={selected === r.id} onChange={() => choose(r.id)} />
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-ink">{r.label}</span>
                        {r.id === defaultId && <span className="text-xs text-violet font-medium">Default</span>}
                        {r.updated_at && <span className="text-xs text-muted">updated {fmtDate(r.updated_at)}</span>}
                      </span>
                      <span className="block text-sm text-ink-2 truncate">{summarize(r)}</span>
                    </span>
                    {r.id !== "once" && (
                      <button type="button" className="text-sm text-accent underline underline-offset-4"
                        onClick={(e) => { e.preventDefault(); setDraft(structuredClone(r)); setMode("edit"); }}>Edit</button>
                    )}
                  </label>
                </li>
              ))}
              <li>
                <label className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer ${selected === "none" ? "border-violet bg-violet-soft/60" : "border-line hover:border-ink-2"}`}>
                  <input type="radio" name="resume" className="accent-[var(--violet)]" checked={selected === "none"} onChange={() => choose("none")} />
                  <span className="text-ink">None for this interview</span>
                </label>
              </li>
            </ul>
            <button type="button" className="mt-3 flex items-center gap-1.5 text-violet font-medium" onClick={() => { setError(""); setMode("add"); }}>
              <Plus size={17} /> Add a resume
            </button>
            {where === "browser" && list.length > 0 && (
              <p className="mt-2 text-sm text-muted">Saved in this browser only. Sign in to keep your resumes on your account.</p>
            )}
          </fieldset>
        )}

        {mode === "add" && (
          <Uploader keys={keys} setKeys={setKeys}
            onParsed={(r) => { setDraft(r); setSave(true); setMode("review"); }}
            onCancel={list.length || once ? () => setMode("list") : undefined} />
        )}

        {mode === "review" && draft && (
          <Editor draft={draft} setDraft={setDraft} onDone={finishNew} onCancel={() => setMode(list.length || once ? "list" : "add")}
            doneLabel="Use this resume" saveChoice save={save} setSave={setSave} />
        )}

        {mode === "edit" && draft && (
          <Editor draft={draft} setDraft={setDraft} onDone={finishEdit} onCancel={() => setMode("list")} doneLabel="Save changes" />
        )}

        {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      </div>
    </div>
  );
}
