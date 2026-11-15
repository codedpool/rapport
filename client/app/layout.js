import { Anek_Devanagari, Fraunces, Outfit } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import BackendStatus from "@/components/BackendStatus";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });
// Devanagari glyphs for Hindi and Hinglish lines; Latin falls through to Outfit/Fraunces.
const deva = Anek_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], display: "swap" });

export const metadata = {
  title: "Rapport · Practise interviews in your own language",
  description:
    "An AI voice interview partner for Indian job seekers. Answer in Hindi, English or Hinglish and get feedback that quotes what you actually said.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable} ${deva.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <BackendStatus />
        </MotionProvider>
      </body>
    </html>
  );
}
