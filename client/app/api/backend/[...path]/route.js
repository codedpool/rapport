// Server-side bridge from the browser to the Python API.
// The signed-in user's ID token is attached here and never reaches browser JavaScript.
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

// Every URL comes from the environment (API_URL in .env.local locally, project settings on Vercel).
const API_URL = (process.env.API_URL || "").replace(/\/$/, "");
const INTERNAL = process.env.INTERNAL_API_SECRET || "";
// A sleeping free-tier API can take most of a minute to wake; starting an interview also generates questions.
export const maxDuration = 60;
const UPSTREAM_TIMEOUT_MS = 55_000;
const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY = 64 * 1024;

function sameSite(request) {
  // Cross-site pages cannot set custom headers without a CORS preflight, which this route never grants.
  if (request.headers.get("x-requested-with") !== "rapport") return false;
  if (["GET", "HEAD"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function forward(request, { params }) {
  if (!sameSite(request)) return NextResponse.json({ detail: "Forbidden." }, { status: 403 });
  if (!API_URL) return NextResponse.json({ detail: "API_URL is not configured." }, { status: 500 });
  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0 || path.length > 4 || !path.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }
  const url = new URL(`${API_URL}/api/${path.join("/")}`);
  url.search = new URL(request.url).search;

  const headers = { accept: "application/json" };
  const session = await auth0.getSession();
  const idToken = session?.tokenSet?.idToken;
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const guest = request.headers.get("x-guest-token");
  if (guest && guest.length < 200) headers["x-guest-token"] = guest;
  if (INTERNAL) {
    headers["x-internal-secret"] = INTERNAL;
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    headers["x-client-ip"] = ip || request.headers.get("x-real-ip") || "local";
  }

  let body;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
    if (body.length > MAX_BODY) return NextResponse.json({ detail: "Request too large." }, { status: 413 });
    headers["content-type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(url, { method: request.method, headers, body, cache: "no-store", signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (e) {
    if (e?.name === "TimeoutError") {
      return NextResponse.json({ detail: "The interview server is still waking up. Try again in a moment." }, { status: 504 });
    }
    return NextResponse.json({ detail: "The interview server is not reachable." }, { status: 502 });
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json", "cache-control": "no-store" },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
