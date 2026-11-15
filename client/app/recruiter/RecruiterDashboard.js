"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import SpecFields, { EMPTY_SPEC } from "@/components/SpecFields";

const TYPE = { technical: "Technical", hr: "HR", mixed: "Mixed" };
const LANG = { en: "English", hi: "Hindi", hinglish: "Hinglish" };
const STATUS = {
  pending: { label: "Invited", cls: "bg-paper-2 text-ink-2" },
  in_progress: { label: "In progress", cls: "bg-accent-soft text-accent-ink" },
  completed: { label: "Completed", cls: "bg-sage-soft text-sage" },
};

export default function RecruiterDashboard() {
  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [editing, setEditing] = useState(null); // null | {…template} | "new"
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    api("templates").then((d) => setTemplates(d.templates)).catch((e) => setError(e.message));
    api("assignments").then((d) => setAssignments(d.assignments)).catch((e) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  return (
    <>
    <PageHeader image="/images/recruiter.webp" title="Hiring"
      subtitle="Build an interview once, invite candidates by email, and review scored transcripts." />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Tabs value={tab} onChange={(k) => { setTab(k); setEditing(null); }}
        tabs={[["templates", "Templates"], ["invite", "Invite"], ["results", "Results"]]} />
      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      {tab === "templates" && (
        editing ? (
          <TemplateForm initial={editing === "new" ? null : editing}
            onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
        ) : (
          <div className="mt-6 grid gap-4">
            <button className="card p-6 text-left hover:border-ink-2 flex items-center justify-between" onClick={() => setEditing("new")}>
              <span>
                <span className="font-semibold">New interview template</span>
                <span className="block text-sm text-muted">Role, job description, type, language and modes.</span>
              </span>
              <span className="btn btn-accent">Create</span>
            </button>
            {templates === null && <p className="text-muted">Loading…</p>}
            {templates?.map((t) => (
              <div key={t.id} className="card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{t.name}</div>
                  <div className="text-sm text-muted">
                    {[t.role, TYPE[t.interview_type], `${t.duration_min} min`, LANG[t.language],
                      t.fixed_questions?.length && `${t.fixed_questions.length} set ${t.fixed_questions.length === 1 ? "question" : "questions"}`,
                      t.pressure_mode && "pressure mode", t.deep_followups && "follow-ups"].filter(Boolean).join(", ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost !py-2" onClick={() => setEditing(t)}>Edit</button>
                  <button className="btn btn-primary !py-2" onClick={() => { setTab("invite"); setEditing({ inviteFor: t.id }); }}>Invite</button>
                  <button className="btn btn-danger !py-2" onClick={async () => {
                    if (!window.confirm(`Delete "${t.name}"? Pending invites for it are removed too.`)) return;
                    try { await api(`templates/${t.id}`, { method: "DELETE" }); refresh(); } catch (e) { setError(e.message); }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "invite" && (
        <InviteForm templates={templates || []} preselect={editing?.inviteFor} onDone={() => { refresh(); }} />
      )}

      {tab === "results" && <ResultsTable assignments={assignments} refresh={refresh} onError={setError} />}
    </div>
    </>
  );
}

function TemplateForm({ initial, onDone, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [spec, setSpec] = useState(() => {
    if (!initial) return EMPTY_SPEC;
    const s = {};
    for (const k of Object.keys(EMPTY_SPEC)) s[k] = initial[k] ?? EMPTY_SPEC[k];
    return s;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (name.trim().length < 2 || spec.role.trim().length < 2) return setError("Add a template name and a role.");
    const fixed = (spec.fixed_questions || []).map((q) => q.trim()).filter(Boolean);
    if (fixed.length > 6) return setError("Keep your questions to 6 or fewer.");
    setBusy(true);
    try {
      await api(initial ? `templates/${initial.id}` : "templates", { method: initial ? "PUT" : "POST", body: { name, ...spec, fixed_questions: fixed } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="card p-6 sm:p-8 mt-6 max-w-3xl space-y-5">
      <h2 className="font-semibold">{initial ? "Edit template" : "New template"}</h2>
      <div>
        <label className="field-label" htmlFor="tname">Template name</label>
        <input id="tname" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Backend screen, round one" />
      </div>
      <SpecFields spec={spec} onChange={setSpec} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-accent" disabled={busy}>{busy ? "Saving…" : "Save template"}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function InviteForm({ templates, preselect, onDone }) {
  const [picked, setTid] = useState(preselect || "");
  const tid = picked || templates[0]?.id || "";
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!templates.length) return <div className="card p-6 mt-6 text-ink-2">Create a template first.</div>;
  async function send(e) {
    e.preventDefault();
    setError(""); setResult(null); setBusy(true);
    try {
      const r = await api("assignments", { method: "POST", body: { template_id: tid, emails } });
      setResult(r); setEmails(""); onDone();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }
  return (
    <form onSubmit={send} className="card p-6 sm:p-8 mt-6 max-w-3xl space-y-5">
      <div>
        <label className="field-label" htmlFor="tpl">Template</label>
        <select id="tpl" className="field" value={tid} onChange={(e) => setTid(e.target.value)}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="emails">Candidate emails</label>
        <textarea id="emails" className="field min-h-36 font-mono text-sm" value={emails} onChange={(e) => setEmails(e.target.value)}
          placeholder={"asha@example.com, rohan@example.com\nmeera@example.com"} />
        <p className="hint">Comma- or newline-separated, up to 100. Candidates sign in with Google using this email to see the interview.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result && (
        <p className="text-sm text-sage">
          Invited {result.created}.{result.skipped_existing ? ` ${result.skipped_existing} already had an open invite.` : ""}
          {result.invalid?.length ? ` Skipped invalid: ${result.invalid.join(", ")}` : ""}
        </p>
      )}
      <button className="btn btn-accent" disabled={busy || !emails.trim()}>{busy ? "Inviting…" : "Send invites"}</button>
      <p className="text-xs text-muted">Rapport doesn&apos;t send email. Share the site link with candidates; the interview appears on their dashboard.</p>
    </form>
  );
}

function ResultsTable({ assignments, refresh, onError }) {
  if (assignments === null) return <p className="mt-6 text-muted">Loading…</p>;
  if (!assignments.length) return <div className="card p-6 mt-6 text-ink-2">No invites yet.</div>;
  async function toggle(a) {
    try { await api(`assignments/${a.id}/release`, { method: "PATCH", body: { released: !a.released } }); refresh(); } catch (e) { onError(e.message); }
  }
  async function remove(a) {
    if (!window.confirm(`Remove the invite for ${a.candidate_email}?`)) return;
    try { await api(`assignments/${a.id}`, { method: "DELETE" }); refresh(); } catch (e) { onError(e.message); }
  }
  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted border-b border-line">
          <tr>
            <th className="p-4 font-medium">Candidate</th>
            <th className="p-4 font-medium">Template</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Score</th>
            <th className="p-4 font-medium">Results visible</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {assignments.map((a) => (
            <tr key={a.id}>
              <td className="p-4 font-mono">{a.candidate_email}</td>
              <td className="p-4">{a.template_name}</td>
              <td className="p-4"><span className={`chip !border-transparent ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span></td>
              <td className="p-4 tabular-nums">{a.overall ? `${a.overall}/10` : "–"}</td>
              <td className="p-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--sage)]" checked={!!a.released} onChange={() => toggle(a)} />
                  {a.released ? "Released" : "Held"}
                </label>
              </td>
              <td className="p-4 text-right whitespace-nowrap">
                {a.interview_id && a.status === "completed" && (
                  <Link className="btn btn-ghost !py-1.5 !px-3" href={`/results/${a.interview_id}`}>Review</Link>
                )}
                <button className="ml-2 text-muted hover:text-danger" onClick={() => remove(a)} aria-label="Remove invite">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
