"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function DeleteData() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(await api("me", { method: "DELETE" }));
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (result) {
    return (
      <div className="card p-6">
        <h2 className="font-semibold">Your data was deleted</h2>
        <p className="mt-2 text-sm text-ink-2">
          Removed {result.deleted.interviews} interviews, {result.deleted.templates} templates and{" "}
          {result.deleted.assignments} invites.{" "}
          {result.auth0_profile_deleted
            ? "Your sign-in profile was deleted too."
            : "Your sign-in profile could not be removed automatically; it will be deleted on request within 30 days."}
        </p>
        <a href="/auth/logout" className="btn btn-primary mt-4">Sign out</a>
      </div>
    );
  }
  return (
    <div className="card p-6 border-danger/40">
      <h2 className="font-semibold text-danger">Delete my data</h2>
      <p className="mt-2 text-sm text-ink-2">
        Permanently deletes your interviews, templates and invites, and your sign-in profile. Interviews you took for a
        recruiter are deleted too. This can&apos;t be undone.
      </p>
      <label className="field-label mt-4" htmlFor="confirm">Type DELETE to confirm</label>
      <div className="flex flex-wrap gap-3">
        <input id="confirm" className="field !w-48" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button className="btn btn-danger" disabled={confirm !== "DELETE" || busy} onClick={run}>
          {busy ? "Deleting…" : "Delete everything"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
