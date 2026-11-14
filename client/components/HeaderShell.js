"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const LINKS_OUT = [
  { href: "/#how", label: "How it works" },
  { href: "/#feedback", label: "Features" },
  { href: "/#teams", label: "For Recruiters" },
  { href: "/#faqs", label: "FAQs" },
];
const LINKS_IN = [
  { href: "/practice", label: "Practise" },
  { href: "/candidate", label: "My interviews" },
  { href: "/recruiter", label: "Hiring" },
];

// A floating rounded box, centred at the top: always light, it narrows a touch on scroll.
export default function HeaderShell({ user }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (pathname.startsWith("/interview/live")) return null;

  const overHero = pathname === "/";
  const links = user ? LINKS_IN : LINKS_OUT;
  const loginHref = "/auth/login?connection=google-oauth2";

  return (
    <header className={`${overHero ? "fixed" : "sticky"} top-0 inset-x-0 z-40 px-3 sm:px-4 pt-3 sm:pt-4 pointer-events-none`}>
      <motion.div
        className="pointer-events-auto mx-auto max-w-4xl rounded-[1.75rem] bg-white/85 backdrop-blur-xl border border-white shadow-[0_12px_40px_-18px_rgba(74,26,20,0.35)]"
        animate={{ maxWidth: scrolled ? 820 : 896 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div className="h-14 pl-5 pr-2 flex items-center justify-between gap-3">
          <Link href="/" onClick={() => setOpen(false)}><Logo /></Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link key={l.href} href={l.href}
                  className={`relative px-3 py-1.5 rounded-full text-[0.95rem] transition-colors ${active ? "text-accent" : "text-ink-2 hover:text-accent"}`}>
                  {active && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-haldi-soft"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link href="/account" className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-line hover:border-ink-2 bg-white">
                <Avatar user={user} />
                <span className="max-w-[8rem] truncate text-sm">{user.name}</span>
              </Link>
            ) : (
              <>
                <a href={loginHref} className="px-3 py-1.5 text-[0.95rem] text-ink-2 hover:text-accent">Sign in</a>
                <Link href="/practice" className="btn btn-accent !py-2 !px-5">Get Started</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-full text-ink" aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }} className="md:hidden overflow-hidden" aria-label="Mobile">
              <div className="px-5 pb-5 pt-1 flex flex-col">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-lg text-ink">{l.label}</Link>
                ))}
                {user ? (
                  <Link href="/account" onClick={() => setOpen(false)} className="py-2.5 text-lg text-ink">Account</Link>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <a href={loginHref} className="btn btn-ghost flex-1">Sign in</a>
                    <Link href="/practice" onClick={() => setOpen(false)} className="btn btn-accent flex-1">Get Started</Link>
                  </div>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}

function Avatar({ user }) {
  if (user.picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="h-7 w-7 rounded-full bg-haldi text-white grid place-items-center text-xs font-semibold">
      {(user.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
