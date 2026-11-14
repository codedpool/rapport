"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const LINKS_OUT = [
  { href: "/practice", label: "Practise" },
  { href: "/#teams", label: "For teams" },
  { href: "/privacy", label: "Privacy" },
];
const LINKS_IN = [
  { href: "/practice", label: "Practise" },
  { href: "/candidate", label: "My interviews" },
  { href: "/recruiter", label: "Hiring" },
];

export default function HeaderShell({ user }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // The live interview room has its own chrome.
  if (pathname.startsWith("/interview/live")) return null;

  const clear = overHero && !scrolled && !open;
  const links = user ? LINKS_IN : LINKS_OUT;
  const loginHref = "/auth/login?connection=google-oauth2";

  return (
    <header className={`${overHero ? "fixed" : "sticky"} top-0 inset-x-0 z-40`}>
      <div
        className={`transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          clear ? "bg-transparent" : "bg-white/80 backdrop-blur-xl shadow-[0_1px_0_var(--line)]"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" onClick={() => setOpen(false)}>
            <Logo tone={clear ? "light" : "dark"} />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3.5 py-2 rounded-lg text-[0.97rem] font-medium transition-colors ${
                    clear ? "text-white/85 hover:text-white" : active ? "text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {l.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 rounded-full bg-haldi"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link
                href="/account"
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-colors ${
                  clear ? "border-white/30 text-white" : "border-line text-ink hover:border-ink-2 bg-white"
                }`}
              >
                <Avatar user={user} />
                <span className="max-w-[9rem] truncate text-sm font-medium">{user.name}</span>
              </Link>
            ) : (
              <>
                <a href={loginHref} className={`btn !py-2 ${clear ? "btn-glass" : "btn-ghost"}`}>
                  Sign in
                </a>
                <Link href="/practice" className="btn btn-accent !py-2">
                  Start practising
                </Link>
              </>
            )}
          </div>

          <button
            className={`md:hidden p-2 rounded-lg ${clear ? "text-white" : "text-ink"}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="md:hidden overflow-hidden border-t border-line bg-white"
              aria-label="Mobile"
            >
              <div className="px-4 py-3 flex flex-col">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-lg font-medium text-ink">
                    {l.label}
                  </Link>
                ))}
                {user ? (
                  <Link href="/account" onClick={() => setOpen(false)} className="py-3 text-lg font-medium text-ink">
                    Account
                  </Link>
                ) : (
                  <a href={loginHref} className="btn btn-primary mt-2">Sign in with Google</a>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Avatar({ user }) {
  if (user.picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="h-7 w-7 rounded-full bg-haldi text-accent-ink grid place-items-center text-xs font-bold">
      {(user.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
