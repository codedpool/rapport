"use client";

import { useEffect, useState } from "react";
import { Plus, Star } from "lucide-react";
import { loadKeys } from "@/lib/api";
import { fmtDate, summarize } from "@/lib/resume";
import { addResume, deleteResume, listResumes, setDefaultResume, updateResume } from "@/lib/resumeStore";
import { Editor, Uploader } from "@/components/resume/ResumeTools";

const DEFAULT_KEYS = { gnani_api_key: "", llm_provider: "groq", llm_api_key: "", llm_model: "" };

export default function ResumesManager() {
  const [list, setList] = useState(null);
  const [defaultId, setDefaultId] = useState(null);
  const [mode, setMode] = useState("list"); // list | add | review | edit
  const [draft, setDraft] = useState(null);
  const [keys, setKeys] = useState(DEFAULT_KEYS);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadKeys();
    // Tab storage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setKeys((k) => ({ ...k, ...saved, llm_model: saved.llm_model || "" }));
    listResumes()
      .then((d) => { setList(d.resumes); setDefaultId(d.default_id); })
      .catch((e) => { setList([]); setError(e.message); });
    // "Delete my data" on this page removes every resume too.
    const wiped = () => { setList([]); setDefaultId(null); setMode("list"); };
    window.addEventListener("rapport:data-deleted", wiped);
    return () => window.removeEventListener("rapport:data-deleted", wiped);
  }, []);

  async function run(fn) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  }

  const makeDefault = (id) => run(async () => { await setDefaultResume("account", id); setDefaultId(id); });
  const remove = (r) => run(async () => {
    if (!window.confirm(`Delete "${r.label}"? This can't be undone.`)) return;
    const out = await deleteResume("account", r.id);
    setList(list.filter((x) => x.id !== r.id));
    setDefaultId(out.default_id);
  });
  const saveNew = () => run(async () => {
    const out = await addResume("account", draft);
    setList([...list, out.resume]);
    setDefaultId(out.default_id);
    setMode("list");
  });
  const saveEdit = () => run(async () => {
    const out = await updateResume("account", draft.id, draft);
    setList(list.map((x) => (x.id === draft.id ? out.resume : x)));
    setMode("list");
  });

  return (
    <section id="resumes" className="card p-6 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Your resumes</h2>
          <p className="mt-1 text-sm text-ink-2 max-w-xl">
            Keep a version for each kind of role. Pick one when you start a practice interview; scheduled interviews use
            your default. Only the short reviewed summary is stored, never the file.
          </p>
        </div>
        {mode === "list" && list && list.length < 10 && (
          <button type="button" className="btn btn-ghost !py-2" onClick={() => { setError(""); setMode("add"); }}><Plus size={16} /> Add a resume</button>
        )}
      </div>

      <div className="mt-5">
        {list === null && <p className="text-muted">Loading…</p>}

        {mode === "list" && list && (
          list.length === 0 ? (
            <p className="text-ink-2">No resumes yet. Add one and the interviewer will ask about your real projects and results.</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <li key={r.id} className="py-4 flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="flex-1 min-w-[14rem]">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-ink">{r.label}</span>
                      {r.id === defaultId && <span className="inline-flex items-center gap-1 text-xs font-medium text-violet"><Star size={12} fill="currentColor" aria-hidden /> Default</span>}
                    </div>
                    <p className="text-sm text-ink-2">{summarize(r) || "No details yet"}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {r.file_name ? `From ${r.file_name}, ` : ""}updated {fmtDate(r.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.id !== defaultId && (
                      <button type="button" className="btn btn-ghost !py-1.5 !px-3 text-sm" onClick={() => makeDefault(r.id)}>Set as default</button>
                    )}
                    <button type="button" className="btn btn-ghost !py-1.5 !px-3 text-sm" onClick={() => { setDraft(structuredClone(r)); setMode("edit"); }}>Edit</button>
                    <button type="button" className="btn btn-danger !py-1.5 !px-3 text-sm" onClick={() => remove(r)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {mode === "add" && (
          <Uploader keys={keys} setKeys={setKeys} onParsed={(r) => { setDraft(r); setMode("review"); }} onCancel={() => setMode("list")} />
        )}
        {mode === "review" && draft && (
          <Editor draft={draft} setDraft={setDraft} onDone={saveNew} onCancel={() => setMode("list")} doneLabel="Save resume" />
        )}
        {mode === "edit" && draft && (
          <Editor draft={draft} setDraft={setDraft} onDone={saveEdit} onCancel={() => setMode("list")} doneLabel="Save changes" />
        )}

        {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      </div>
    </section>
  );
}
