"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/interview/live")) return null;
  return (
    <footer className="relative overflow-hidden mt-10">
      <Image src="/images/sunset.webp" alt="" fill sizes="100vw" className="object-cover object-top opacity-70" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,var(--paper)_0%,rgba(244,242,250,0.55)_45%,rgba(244,242,250,0.35)_100%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-24 pb-10">
        <div className="rounded-[1.75rem] bg-white/75 backdrop-blur-md border border-white px-6 sm:px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <Logo size="lg" />
            <span className="hidden sm:block h-6 w-px bg-line" />
            <span className="text-ink-2">AI voice interviews for India</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-ink-2" aria-label="Footer">
            <Link href="/practice" className="hover:text-accent">Practise</Link>
            <Link href="/recruiter" className="hover:text-accent">For recruiters</Link>
            <Link href="/candidate" className="hover:text-accent">My interviews</Link>
            <Link href="/privacy" className="hover:text-accent">Privacy</Link>
            <Link href="/account" className="hover:text-accent">Delete my data</Link>
          </nav>
        </div>
        <p className="mt-6 text-center text-sm text-ink-2/80">
          Voice by Gnani. Built for the Gnani AI Voice AI Challenge. Illustrations made for Rapport.
        </p>
      </div>
    </footer>
  );
}
