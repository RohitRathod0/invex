import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invex AI — Your Intelligent Financial Advisor",
  description: "AI-powered investment platform. Get personalized portfolio analysis, real-time market insights, and predictive financial intelligence.",
  keywords: "AI investment, portfolio management, financial advisor, smart investing, Invex AI",
  openGraph: {
    title: "Invex AI — Your Intelligent Financial Advisor",
    description: "AI-powered investment platform for smart investors",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="bg-[#0A0A0A] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
