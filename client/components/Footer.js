"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/interview/live")) return null;
  return (
    <footer className="bg-night text-white/70 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-4 text-[0.95rem] leading-relaxed">
            Spoken interviews in Hindi, English and Hinglish. Voice by Gnani. Built for the Gnani AI Voice AI Challenge.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-[0.95rem]" aria-label="Product">
          <span className="text-white font-semibold mb-1">Product</span>
          <Link href="/practice" className="hover:text-white">Practise an interview</Link>
          <Link href="/recruiter" className="hover:text-white">Screen candidates</Link>
          <Link href="/candidate" className="hover:text-white">My interviews</Link>
        </nav>
        <nav className="flex flex-col gap-2 text-[0.95rem]" aria-label="Trust">
          <span className="text-white font-semibold mb-1">Trust</span>
          <Link href="/privacy" className="hover:text-white">Privacy and data</Link>
          <Link href="/account" className="hover:text-white">Delete my data</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 sm:px-6 py-5 text-sm text-white/50">Photography from Unsplash.</p>
      </div>
    </footer>
  );
}
