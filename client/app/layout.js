import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata = {
  title: "Rapport — voice interviews in your language",
  description:
    "Practice or run spoken interviews in Hindi, English or Hinglish, with follow-ups and feedback that quotes what you actually said.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 justify-between text-sm text-muted">
            <span>Rapport · voice by Gnani · built for the Gnani AI Voice AI Challenge</span>
            <a href="/privacy" className="hover:text-ink underline-offset-4 hover:underline">
              Privacy and data
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
