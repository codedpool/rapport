import Link from "next/link";
import { auth0 } from "@/lib/auth0";

export default async function Nav() {
  let user = null;
  try {
    user = (await auth0.getSession())?.user || null;
  } catch {
    user = null;
  }
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="display text-2xl font-semibold tracking-tight">
          Rapport<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link href="/practice" className="px-3 py-2 rounded-full hover:bg-paper-2 hidden sm:inline-flex">
            Practice
          </Link>
          {user ? (
            <>
              <Link href="/candidate" className="px-3 py-2 rounded-full hover:bg-paper-2">
                Interviewing
              </Link>
              <Link href="/recruiter" className="px-3 py-2 rounded-full hover:bg-paper-2">
                Hiring
              </Link>
              <Link href="/account" className="ml-1 flex items-center gap-2 rounded-full border border-line pl-1 pr-3 py-1 hover:border-ink-2">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-accent-soft grid place-items-center text-xs font-semibold">
                    {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="hidden md:inline max-w-[10rem] truncate">{user.name || user.email}</span>
              </Link>
            </>
          ) : (
            <a href="/auth/login?connection=google-oauth2" className="btn btn-primary !py-2 !px-4">
              Sign in with Google
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
