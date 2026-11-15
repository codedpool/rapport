// Browser-side helpers for talking to the API through the Next.js bridge.

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || [];
  }
}

export async function api(path, { method = "GET", body, guestToken } = {}) {
  const headers = { "x-requested-with": "rapport" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (guestToken) headers["x-guest-token"] = guestToken;
  let res;
  try {
    res = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Network error. Check your connection.", 0);
  }
  // A sleeping API (free hosting) answers 502/503/504 until it wakes: let the status toast take over.
  if ([502, 503, 504].includes(res.status) && typeof window !== "undefined") {
    window.dispatchEvent(new Event("rapport:backend-down"));
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "Something went wrong.";
    const fields = (data?.errors || []).map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new ApiError(fields ? `${detail} ${fields}` : detail, res.status, data?.errors);
  }
  return data;
}

// Guest interview tokens let a visitor reopen results before signing in.
const GUEST_PREFIX = "rapport:guest:";
export function saveGuestToken(interviewId, token) {
  try {
    if (token) localStorage.setItem(GUEST_PREFIX + interviewId, token);
  } catch {}
}
export function getGuestToken(interviewId) {
  try {
    return localStorage.getItem(GUEST_PREFIX + interviewId);
  } catch {
    return null;
  }
}
export function clearGuestToken(interviewId) {
  try {
    localStorage.removeItem(GUEST_PREFIX + interviewId);
  } catch {}
}

// Keys stay in this tab only, and only if the user opts in.
const KEYS = "rapport:keys";
export function loadKeys() {
  try {
    const raw = sessionStorage.getItem(KEYS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function storeKeys(keys, remember) {
  try {
    if (remember) sessionStorage.setItem(KEYS, JSON.stringify(keys));
    else sessionStorage.removeItem(KEYS);
  } catch {}
}

// Hand-off from the setup page to the live page. One-time ticket, short-lived.
const LIVE = "rapport:live";
export function setLive(data) {
  try {
    sessionStorage.setItem(LIVE, JSON.stringify({ ...data, at: Date.now() }));
  } catch {}
}
export function peekLive() {
  try {
    const raw = sessionStorage.getItem(LIVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearLive() {
  try {
    sessionStorage.removeItem(LIVE);
  } catch {}
}
