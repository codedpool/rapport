import { Anek_Devanagari } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

// One variable family for Latin and Devanagari, so Hinglish lines read as one voice.
const anek = Anek_Devanagari({
  variable: "--font-anek",
  subsets: ["latin", "devanagari"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata = {
  title: "Rapport · Voice interviews in Hindi, English and Hinglish",
  description:
    "Practise or run spoken interviews in Hindi, English or Hinglish, with follow-up questions and feedback that quotes what you actually said.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${anek.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
