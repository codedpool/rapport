// One interface for the user's resumes: on the account when signed in, in this browser otherwise.
// Only the short reviewed summary of each resume is stored, never the file or full text.
import { ApiError, api } from "@/lib/api";

const LOCAL = "rapport:resumes";
const LEGACY = "rapport:resume";

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(LEGACY); // the earlier single saved resume
    if (legacy) {
      const r = { ...JSON.parse(legacy), id: newId(), label: "My resume" };
      const data = { resumes: [r], default_id: r.id };
      localStorage.setItem(LOCAL, JSON.stringify(data));
      localStorage.removeItem(LEGACY);
      return data;
    }
  } catch {}
  return { resumes: [], default_id: null };
}
function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(data));
  } catch {}
}
function clearLocal() {
  try {
    localStorage.removeItem(LOCAL);
    localStorage.removeItem(LEGACY);
  } catch {}
}
function newId() {
  return (crypto.randomUUID?.() || String(Date.now() + Math.random())).replace(/-/g, "");
}

export function content(r) {
  const { label = "My resume", file_name = "", roles = [], projects = [], skills = [], numbers = [] } = r || {};
  return { label, file_name, roles, projects, skills, numbers };
}

const isAuthError = (e) => e instanceof ApiError && e.status === 401;

// Returns { resumes, default_id, where: "account" | "browser" }.
export async function listResumes() {
  try {
    let data = await api("resumes");
    const local = readLocal();
    if (local.resumes.length) {
      // Just signed in: move this browser's resumes onto the account.
      for (const r of local.resumes) {
        try {
          await api("resumes", { method: "POST", body: content(r) });
        } catch {}
      }
      clearLocal();
      data = await api("resumes");
    }
    return { ...data, where: "account" };
  } catch (e) {
    if (!isAuthError(e)) throw e;
    return { ...readLocal(), where: "browser" };
  }
}

export async function addResume(where, item) {
  if (where === "account") return api("resumes", { method: "POST", body: content(item) });
  const data = readLocal();
  if (data.resumes.length >= 10) throw new Error("You can keep up to 10 resumes. Delete one to add another.");
  const r = { ...content(item), id: newId(), updated_at: new Date().toISOString() };
  data.resumes.push(r);
  data.default_id = data.default_id || r.id;
  writeLocal(data);
  return { resume: r, default_id: data.default_id };
}

export async function updateResume(where, id, item) {
  if (where === "account") return api(`resumes/${id}`, { method: "PUT", body: content(item) });
  const data = readLocal();
  const r = { ...content(item), id, updated_at: new Date().toISOString() };
  data.resumes = data.resumes.map((x) => (x.id === id ? r : x));
  writeLocal(data);
  return { resume: r };
}

export async function deleteResume(where, id) {
  if (where === "account") return api(`resumes/${id}`, { method: "DELETE" });
  const data = readLocal();
  data.resumes = data.resumes.filter((x) => x.id !== id);
  if (data.default_id === id) data.default_id = data.resumes[0]?.id || null;
  writeLocal(data);
  return { default_id: data.default_id };
}

export async function setDefaultResume(where, id) {
  if (where === "account") return api(`resumes/${id}/default`, { method: "POST" });
  const data = readLocal();
  data.default_id = id;
  writeLocal(data);
  return { default_id: id };
}
